import crypto from 'node:crypto'
import { Router } from 'express'
import { query } from '../db.js'
import { requirePhotographer } from '../middleware.js'
import { upload } from '../upload.js'

const router = Router()
router.use(requirePhotographer)

async function getSettings() {
  const { rows } = await query('SELECT key, value FROM settings')
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}

async function subscriptionInfo(photographerId) {
  const [subRes, countRes, freeRes, settingsRes] = await Promise.all([
    query(
      `SELECT id, plan, amount, status, events_limit, started_at, expires_at
         FROM subscriptions WHERE photographer_id = $1 AND status = 'active'
         ORDER BY id DESC LIMIT 1`,
      [photographerId]
    ),
    query('SELECT COUNT(*) FROM events WHERE photographer_id = $1', [photographerId]),
    query("SELECT value FROM settings WHERE key = 'free_event_limit'"),
    query("SELECT key, value FROM settings WHERE key = ANY($1)", [['event_pricing', 'event_fee']]),
  ])
  const sub = subRes.rows[0]
  const used = Number(countRes.rows[0].count) || 0
  const freeLimit = Number.parseInt(freeRes.rows[0]?.value, 10) || 10
  const s = Object.fromEntries(settingsRes.rows.map((r) => [r.key, r.value]))
  const pricing = s.event_pricing || 'free'
  let max
  if (sub && Number(sub.events_limit) > 0) max = Number(sub.events_limit)
  else if (pricing === 'fee') max = 0
  else max = freeLimit
  return {
    hasSubscription: Boolean(sub),
    plan: sub?.plan || null,
    status: sub?.status || null,
    amount: sub?.amount != null ? Number(sub.amount) : null,
    startedAt: sub?.started_at || null,
    expiresAt: sub?.expires_at || null,
    used,
    max,
    remaining: Math.max(0, max - used),
    pricing,
    eventFee: Number(s.event_fee) || 0,
  }
}

async function getRazorpayConfig() {
  const settings = await getSettings()
  const keyId = (settings.razorpay_key_id || '').trim()
  const keySecret = (settings.razorpay_key_secret || '').trim()
  if (!keyId || !keySecret) {
    throw new PaymentNotConfiguredError()
  }
  return { keyId, keySecret, currency: (settings.razorpay_currency || 'INR').trim() }
}

class PaymentNotConfiguredError extends Error {
  constructor() {
    super('Razorpay payment is not configured yet. Please ask the admin.')
  }
}

async function createRazorpayOrder({ amount, currency, receipt }) {
  const { keyId, keySecret } = await getRazorpayConfig()
  const auth = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify({
      amount: Math.round(Number(amount) * 100),
      currency,
      receipt,
      payment_capture: 1,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    let detail = text
    try {
      const parsed = JSON.parse(text)
      detail = parsed?.error?.description || parsed?.error?.reason || text
    } catch {
      // keep raw text
    }
    if (/authentication failed/i.test(detail)) {
      throw new Error(
        'Razorpay authentication failed. Please check the Key ID and Key Secret in Admin > Settings > Payment.'
      )
    }
    throw new Error(`Razorpay order failed: ${detail}`)
  }
  return res.json()
}

function verifySignature({ orderId, paymentId, signature, secret }) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')
  return expected === signature
}

async function markTransactionPaid(orderId, paymentId) {
  const { rows } = await query(
    `UPDATE transactions SET status='paid', razorpay_payment_id=$2, updated_at=now()
     WHERE razorpay_order_id=$1 RETURNING *`,
    [orderId, paymentId]
  )
  return rows[0]
}

router.get('/me', async (req, res) => {
  const { rows } = await query(
    'SELECT id, name, email, phone, status FROM photographers WHERE id = $1',
    [req.user.id]
  )
  if (rows.length === 0) return res.status(404).json({ message: 'Not found' })
  const subscription = await subscriptionInfo(req.user.id)
  res.json({ ...rows[0], subscription })
})

router.get('/subscription', async (req, res) => {
  res.json(await subscriptionInfo(req.user.id))
})

router.get('/plans', async (req, res) => {
  const { rows } = await query(
    `SELECT id, country, currency_code, price, title, description, duration_days, events_limit
       FROM country_plans ORDER BY id DESC`
  )
  res.json(rows)
})

router.post('/pay/event-order', async (req, res) => {
  try {
    const settings = await getSettings()
    const amount = Number(settings.event_fee) || 0
    if (amount <= 0) {
      return res.status(400).json({ message: 'Per event fee is not configured.' })
    }
    const keyId = settings.razorpay_key_id
    const keySecret = settings.razorpay_key_secret
    if (!keyId || !keySecret) {
      return res.status(400).json({ message: 'Razorpay payment is not configured yet.' })
    }
    const currency = settings.razorpay_currency || 'INR'
    const order = await createRazorpayOrder({
      amount,
      currency,
      receipt: `event_${req.user.id}_${Date.now()}`,
    })
    await query(
      `INSERT INTO transactions (razorpay_order_id, photographer_id, type, amount, currency, status)
       VALUES ($1, $2, 'event', $3, $4, 'pending')`,
      [order.id, req.user.id, amount, currency]
    )
    res.json({ order_id: order.id, key_id: keyId, amount, currency })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

router.post('/pay/subscription-order', async (req, res) => {
  const { planId } = req.body
  const { rows } = await query(
    'SELECT id, country, currency_code, price, title, description, duration_days FROM country_plans WHERE id = $1',
    [planId]
  )
  if (rows.length === 0) return res.status(404).json({ message: 'Plan not found' })
  const plan = rows[0]
  try {
    const settings = await getSettings()
    const keyId = settings.razorpay_key_id
    const keySecret = settings.razorpay_key_secret
    if (!keyId || !keySecret) {
      return res.status(400).json({ message: 'Razorpay payment is not configured yet.' })
    }
    const amount = Number(plan.price)
    const currency = plan.currency_code
    const order = await createRazorpayOrder({
      amount,
      currency,
      receipt: `sub_${req.user.id}_${Date.now()}`,
    })
    await query(
      `INSERT INTO transactions (razorpay_order_id, photographer_id, plan_id, plan_title, type, amount, currency, status)
       VALUES ($1, $2, $3, $4, 'subscription', $5, $6, 'pending')`,
      [order.id, req.user.id, plan.id, plan.title, amount, currency]
    )
    res.json({ order_id: order.id, key_id: keyId, amount, currency })
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

router.post('/subscribe', async (req, res) => {
  const { payment_id: paymentId, order_id: orderId, signature } = req.body
  if (!paymentId || !orderId || !signature) {
    return res.status(400).json({ message: 'Missing payment details' })
  }
  const { keySecret } = await getRazorpayConfig().catch(() => ({}))
  if (!keySecret) {
    return res.status(400).json({ message: 'Razorpay payment is not configured yet.' })
  }
  if (!verifySignature({ orderId, paymentId, signature, secret: keySecret })) {
    return res.status(400).json({ message: 'Payment verification failed' })
  }

  const { rows: txRows } = await query(
    `SELECT * FROM transactions WHERE razorpay_order_id = $1 AND photographer_id = $2 AND type = 'subscription'`,
    [orderId, req.user.id]
  )
  const tx = txRows[0]
  if (!tx) return res.status(404).json({ message: 'Order not found' })
  if (tx.status === 'pending') {
    const { rows: planRows } = await query(
      'SELECT * FROM country_plans WHERE id = $1',
      [tx.plan_id]
    )
    const plan = planRows[0]
    const days = plan?.duration_days || 30
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + days)
    const expiresIso = expiresAt.toISOString().slice(0, 10)
    await query(
      `INSERT INTO subscriptions (photographer_id, plan, amount, events_limit, status, started_at, expires_at)
       VALUES ($1, $2, $3, $4, 'active', CURRENT_DATE, $5)`,
      [
        req.user.id,
        plan?.title || tx.plan_title || 'Subscription',
        tx.amount,
        Number(plan?.events_limit) > 0 ? Number(plan.events_limit) : 0,
        expiresIso,
      ]
    )
    await markTransactionPaid(orderId, paymentId)
  }
  res.json(await subscriptionInfo(req.user.id))
})

router.post('/events', async (req, res) => {
  const { name, event_date, location, image, description } = req.body
  if (!name) return res.status(400).json({ message: 'Event name is required' })

  const subscription = await subscriptionInfo(req.user.id)

  if (subscription.used >= subscription.max) {
    const payment_id = req.body.payment_id
    const order_id = req.body.order_id
    const signature = req.body.signature
    if (!payment_id || !order_id || !signature) {
      return res.status(402).json({
        message: subscription.hasSubscription
          ? 'Subscription event limit reached. Payment is required to add another event.'
          : 'Free event limit reached. Payment is required to add another event.',
        requiresPayment: true,
        subscription,
      })
    }
    const settings = await getSettings()
    const keySecret = settings.razorpay_key_secret
    if (!keySecret) return res.status(400).json({ message: 'Razorpay is not configured.' })
    if (!verifySignature({ orderId: order_id, paymentId: payment_id, signature, secret: keySecret })) {
      return res.status(400).json({ message: 'Payment verification failed' })
    }
    const { rows: txRows } = await query(
      `SELECT * FROM transactions WHERE razorpay_order_id = $1 AND photographer_id = $2 AND type = 'event'`,
      [order_id, req.user.id]
    )
    const tx = txRows[0]
    if (!tx) return res.status(404).json({ message: 'Order not found' })
    if (tx.status !== 'pending') {
      return res.status(400).json({ message: 'This payment was already used.' })
    }
    const { rows } = await query(
      `INSERT INTO events (name, event_date, location, image, description, photographer_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, event_date || null, location, image, description, req.user.id]
    )
    await query(
      `UPDATE transactions SET status='paid', razorpay_payment_id=$2, event_id=$3, updated_at=now()
       WHERE razorpay_order_id=$1`,
      [order_id, payment_id, rows[0].id]
    )
    return res.status(201).json({
      event: rows[0],
      transaction: tx,
      subscription: {
        ...subscription,
        used: subscription.used + 1,
        remaining: Math.max(0, subscription.max - subscription.used - 1),
      },
    })
  }

  const { rows } = await query(
    `INSERT INTO events (name, event_date, location, image, description, photographer_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [name, event_date || null, location, image, description, req.user.id]
  )
  res.status(201).json({
    event: rows[0],
    subscription: {
      ...subscription,
      used: subscription.used + 1,
      remaining: Math.max(0, subscription.max - subscription.used - 1),
    },
  })
})

router.get('/transactions', async (req, res) => {
  const { rows } = await query(
    `SELECT id, type, amount, currency, status, plan_title, razorpay_order_id, razorpay_payment_id, event_id, created_at
       FROM transactions WHERE photographer_id = $1 ORDER BY id DESC`,
    [req.user.id]
  )
  res.json(rows)
})

async function getOwnedEvent(id, photographerId) {
  const { rows } = await query(
    'SELECT * FROM events WHERE id = $1 AND photographer_id = $2',
    [id, photographerId]
  )
  return rows[0]
}

router.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' })
  res.json({ url: `/uploads/${req.file.filename}` })
})

router.get('/events', async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM events WHERE photographer_id = $1 ORDER BY id DESC',
    [req.user.id]
  )
  res.json(rows)
})

router.put('/events/:id', async (req, res) => {
  const { name, event_date, location, image, description } = req.body
  const { rows } = await query(
    `UPDATE events SET name=$1, event_date=$2, location=$3, image=$4, description=$5
     WHERE id=$6 AND photographer_id=$7 RETURNING *`,
    [name, event_date || null, location, image, description, req.params.id, req.user.id]
  )
  if (rows.length === 0) return res.status(404).json({ message: 'Event not found' })
  res.json(rows[0])
})

router.delete('/events/:id', async (req, res) => {
  const { rowCount } = await query(
    'DELETE FROM events WHERE id=$1 AND photographer_id=$2',
    [req.params.id, req.user.id]
  )
  if (rowCount === 0) return res.status(404).json({ message: 'Event not found' })
  res.json({ ok: true })
})

router.get('/events/:id', async (req, res) => {
  const event = await getOwnedEvent(req.params.id, req.user.id)
  if (!event) return res.status(404).json({ message: 'Event not found' })
  res.json(event)
})

router.get('/events/:id/photos', async (req, res) => {
  const event = await getOwnedEvent(req.params.id, req.user.id)
  if (!event) return res.status(404).json({ message: 'Event not found' })
  const { rows } = await query(
    'SELECT * FROM photos WHERE event_id = $1 ORDER BY id DESC',
    [req.params.id]
  )
  res.json(rows)
})

router.post('/events/:id/photos', upload.array('images', 50), async (req, res) => {
  const event = await getOwnedEvent(req.params.id, req.user.id)
  if (!event) return res.status(404).json({ message: 'Event not found' })
  const files = req.files || []
  if (files.length === 0) return res.status(400).json({ message: 'No images uploaded' })
  const created = []
  for (const file of files) {
    const { rows } = await query(
      'INSERT INTO photos (event_id, title, image) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, file.originalname, `/uploads/${file.filename}`]
    )
    created.push(rows[0])
  }
  res.status(201).json(created)
})

router.delete('/photos/:id', async (req, res) => {
  const { rowCount } = await query(
    `DELETE FROM photos WHERE id = $1
       AND event_id IN (SELECT id FROM events WHERE photographer_id = $2)`,
    [req.params.id, req.user.id]
  )
  if (rowCount === 0) return res.status(404).json({ message: 'Photo not found' })
  res.json({ ok: true })
})

export default router