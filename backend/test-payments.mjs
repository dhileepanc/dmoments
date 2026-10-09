import crypto from 'node:crypto'
import { pool } from './db.js'

const BASE = 'http://localhost:4000/api'

async function req(path, { method = 'GET', token, body } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

function sign(secret, orderId, paymentId) {
  return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex')
}

async function run() {
  const email = `dual_${Date.now()}@test.com`
  const secret = 'rzp_test_secret_123'

  await pool.query(`
    INSERT INTO settings (key, value) VALUES
      ('razorpay_key_id', 'rzp_test_xxxxxxxx'),
      ('razorpay_key_secret', '${secret}'),
      ('razorpay_currency', 'INR'),
      ('max_events', '3'),
      ('event_fee', '250'),
      ('event_pricing', 'free')
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`)

  await pool.query(`DELETE FROM transactions WHERE photographer_id IS NULL`)

  const signup = await req('/auth/photographer/signup', {
    method: 'POST',
    body: { name: 'Dual Tester', email, password: 'pass1234', phone: '9000000002' },
  })
  const token = signup.data.token

  let r = await req('/photographer/subscription', { token })
  console.log('FREE MODE sub', r.status, 'pricing:', r.data.pricing, 'max:', r.data.max)

  r = await req('/photographer/events', { method: 'POST', token, body: { name: 'No sub' } })
  console.log('free: event without sub', r.status, r.data.message)

  const plan = (await req('/photographer/plans', { token })).data[0]
  const orderId = 'order_sim_free'
  const payId = 'pay_sim_free'
  await pool.query(
    `INSERT INTO transactions (razorpay_order_id, photographer_id, plan_id, plan_title, type, amount, currency, status)
     VALUES ($1, (SELECT id FROM photographers WHERE email=$2), $3, $4, 'subscription', $5, $6, 'pending')`,
    [orderId, email, plan.id, plan.title, plan.price, plan.currency_code]
  )
  r = await req('/photographer/subscribe', {
    method: 'POST', token,
    body: { payment_id: payId, order_id: orderId, signature: sign(secret, orderId, payId) },
  })
  console.log('subscribe', r.status, r.data.plan)

  for (let i = 1; i <= 2; i++) {
    r = await req('/photographer/events', { method: 'POST', token, body: { name: `E${i}` } })
    console.log(`free create #${i}`, r.status, 'used:', r.data.subscription?.used)
  }
  r = await req(`/photographer/events/${r.data.event.id}`, { method: 'DELETE', token })
  console.log('delete last', r.status)
  r = await req('/photographer/subscription', { token })
  console.log('free: after delete used:', r.data.used, 'remaining:', r.data.remaining)

  r = await req('/photographer/events', { method: 'POST', token, body: { name: 'E3' } })
  console.log('free create #3', r.status)
  r = await req('/photographer/events', { method: 'POST', token, body: { name: 'E4 over' } })
  console.log('free create over limit', r.status, r.data.message)

  await pool.query(`UPDATE settings SET value='fee' WHERE key='event_pricing'`)

  r = await req('/photographer/subscription', { token })
  console.log('FEE MODE sub', r.status, 'pricing:', r.data.pricing, 'eventFee:', r.data.eventFee)

  r = await req('/photographer/events', { method: 'POST', token, body: { name: 'No payment' } })
  console.log('fee: event without payment', r.status, r.data.message)

  const orderId2 = 'order_sim_evt'
  const payId2 = 'pay_sim_evt'
  await pool.query(
    `INSERT INTO transactions (razorpay_order_id, photographer_id, type, amount, currency, status)
     VALUES ($1, (SELECT id FROM photographers WHERE email=$2), 'event', 250, 'INR', 'pending')`,
    [orderId2, email]
  )
  r = await req('/photographer/events', {
    method: 'POST', token,
    body: {
      name: 'Paid Event',
      payment_id: payId2,
      order_id: orderId2,
      signature: sign(secret, orderId2, payId2),
    },
  })
  console.log('fee: paid event created', r.status, r.data.event?.name, 'tx:', r.data.transaction?.status)

  const login = await req('/auth/admin/login', { method: 'POST', body: { email: 'admin@practiceai.com', password: 'admin123' } })
  const adminToken = login.data.token
  r = await req('/admin/photographers', { token: adminToken })
  const me = r.data.find((p) => p.email === email)
  console.log('admin row', me && JSON.stringify({ sub_plan: me.sub_plan, events_used: me.events_used, max_events: me.max_events }))
  r = await req('/admin/transactions', { token: adminToken })
  console.log('admin transactions', r.data.length, r.data.map((t) => `${t.type}:${t.status}`).join(', '))
  const s = await req('/admin/settings', { token: adminToken })
  console.log('settings', JSON.stringify({ pricing: s.data.event_pricing, fee: s.data.event_fee, max: s.data.max_events }))

  await pool.query(`DELETE FROM photographers WHERE email=$1`, [email])
  await pool.query(`DELETE FROM transactions WHERE photographer_id IS NULL`)
  await pool.end()
}

run().catch((err) => {
  console.error('FAILED:', err)
  process.exit(1)
})