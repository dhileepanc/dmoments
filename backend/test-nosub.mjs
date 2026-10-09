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

async function run() {
  await pool.query(`
    INSERT INTO settings (key, value) VALUES
      ('max_events', '3'), ('event_pricing', 'free')
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`)

  const email = `nosub_${Date.now()}@test.com`
  const signup = await req('/auth/photographer/signup', {
    method: 'POST',
    body: { name: 'No Sub', email, password: 'pass1234', phone: '9000000003' },
  })
  const token = signup.data.token

  let r = await req('/photographer/subscription', { token })
  console.log('sub', r.status, 'hasSub:', r.data.hasSubscription, 'pricing:', r.data.pricing, 'remaining:', r.data.remaining)

  for (let i = 1; i <= 3; i++) {
    r = await req('/photographer/events', { method: 'POST', token, body: { name: `Free${i}` } })
    console.log(`create #${i}`, r.status, 'used:', r.data.subscription?.used)
  }
  r = await req('/photographer/events', { method: 'POST', token, body: { name: 'Over' } })
  console.log('over limit', r.status, r.data.message)

  await pool.query(`DELETE FROM photographers WHERE email=$1`, [email])
  await pool.end()
}

run().catch((err) => {
  console.error('FAILED:', err)
  process.exit(1)
})