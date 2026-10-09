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
  const email = `limit_${Date.now()}@test.com`
  const secret = 'rzp_test_secret_123'

  await pool.query(`
    INSERT INTO settings (key, value) VALUES
      ('razorpay_key_id', 'rzp_test_xxxxxxxx'),
      ('razorpay_key_secret', '${secret}'),
      ('razorpay_currency', 'INR'),
      ('free_event_limit', '3'),
      ('event_fee', '250'),
      ('event_pricing', 'free')
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`)

  await pool.query(`DELETE FROM transactions WHERE photographer_id IS NULL`)

  const signup = await req('/auth/photographer/signup', {
    method: 'POST',
    body: { name: 'Limit Tester', email, password: 'pass1234', phone: '9000000004' },
  })
  const token = signup.data.token

  let r = await req('/photographer/subscription', { token })
  console.log('no plan: pricing', r.data.pricing, 'max (free limit):', r.data.max, 'remaining:', r.data.remaining)

  const plan = (await req('/photographer/plans', { token })).data[0]
  console.log('plan', plan.title, 'events_limit:', plan.events_limit)

  const orderId = 'order_lim_sub'
  const payId = 'pay_lim_sub'
  await pool.query(
    `INSERT INTO transactions (razorpay_order_id, photographer_id, plan_id, plan_title, type, amount, currency, status)
     VALUES ($1, (SELECT id FROM photographers WHERE email=$2), $3, $4, 'subscription', $5, $6, 'pending')`,
    [orderId, email, plan.id, plan.title, plan.price, plan.currency_code]
  )
  r = await req('/photographer/subscribe', {
    method: 'POST', token,
    body: { payment_id: payId, order_id: orderId, signature: sign(secret, orderId, payId) },
  })
  console.log('subscribed plan:', r.data.plan, 'max (plan limit):', r.data.max, 'remaining:', r.data.remaining)

  r = await req('/photographer/events', { method: 'POST', token, body: { name: 'E1' } })
  console.log('create', r.status, 'used:', r.data.subscription?.used, 'max:', r.data.subscription?.max)

  const login = await req('/auth/admin/login', { method: 'POST', body: { email: 'admin@practiceai.com', password: 'admin123' } })
  const adminToken = login.data.token
  r = await req('/admin/photographers', { token: adminToken })
  const me = r.data.find((p) => p.email === email)
  console.log('admin row', me && JSON.stringify({ sub_plan: me.sub_plan, events_used: me.events_used, max_events: me.max_events }))
  const s = await req('/admin/settings', { token: adminToken })
  console.log('settings free_event_limit:', s.data.free_event_limit)

  await pool.query(`DELETE FROM photographers WHERE email=$1`, [email])
  await pool.query(`DELETE FROM transactions WHERE photographer_id IS NULL`)
  await pool.end()
}

run().catch((err) => {
  console.error('FAILED:', err)
  process.exit(1)
})