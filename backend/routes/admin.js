import { Router } from 'express'
import { query } from '../db.js'
import { requireAdmin } from '../middleware.js'
import { hashPassword } from '../auth.js'
import { upload } from '../upload.js'

const router = Router()
router.use(requireAdmin)

router.get('/dashboard', async (req, res) => {
  const one = async (sql) => Number((await query(sql)).rows[0].count)
  const [photographers, events, photos, subscriptions, helpPages] = await Promise.all([
    one('SELECT COUNT(*) FROM photographers'),
    one('SELECT COUNT(*) FROM events'),
    one('SELECT COUNT(*) FROM photos'),
    one('SELECT COUNT(*) FROM subscriptions'),
    one('SELECT COUNT(*) FROM help_pages'),
  ])
  res.json({ photographers, events, photos, subscriptions, helpPages })
})

router.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' })
  res.json({ url: `/uploads/${req.file.filename}` })
})

// Photographers
router.get('/photographers', async (req, res) => {
  const { rows } = await query(
    `SELECT p.id, p.name, p.email, p.phone, p.status, p.created_at,
            s.plan AS sub_plan, s.status AS sub_status, s.amount AS sub_amount,
            s.expires_at AS sub_expires_at,
            (SELECT COUNT(*) FROM events e WHERE e.photographer_id = p.id) AS events_used,
            COALESCE(
              NULLIF(s.events_limit, 0),
              (SELECT NULLIF(NULLIF(value, ''), '')::int FROM settings WHERE key = 'free_event_limit'),
              10
            ) AS max_events
       FROM photographers p
       LEFT JOIN LATERAL (
         SELECT plan, status, amount, expires_at, events_limit FROM subscriptions
         WHERE photographer_id = p.id AND status = 'active'
         ORDER BY id DESC LIMIT 1
       ) s ON TRUE
       ORDER BY p.id DESC`
  )
  res.json(rows)
})

router.get('/transactions', async (req, res) => {
  const { rows } = await query(
    `SELECT t.id, t.type, t.amount, t.currency, t.status, t.plan_title,
            t.razorpay_order_id, t.razorpay_payment_id, t.created_at,
            p.name AS photographer_name, p.email AS photographer_email,
            e.name AS event_name
       FROM transactions t
       LEFT JOIN photographers p ON p.id = t.photographer_id
       LEFT JOIN events e ON e.id = t.event_id
       ORDER BY t.id DESC`
  )
  res.json(rows)
})
router.post('/photographers', async (req, res) => {
  const { name, email, phone, password, status } = req.body
  const { rows } = await query(
    `INSERT INTO photographers (name, email, phone, password, status)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, phone, status`,
    [name, email, phone || null, hashPassword(password || 'changeme'), status || 'active']
  )
  res.status(201).json(rows[0])
})
router.put('/photographers/:id', async (req, res) => {
  const { name, email, phone, status } = req.body
  const { rows } = await query(
    `UPDATE photographers SET name=$1, email=$2, phone=$3, status=$4
     WHERE id=$5 RETURNING id, name, email, phone, status`,
    [name, email, phone, status, req.params.id]
  )
  res.json(rows[0])
})
router.delete('/photographers/:id', async (req, res) => {
  await query('DELETE FROM photographers WHERE id=$1', [req.params.id])
  res.json({ ok: true })
})

// Events
router.get('/events', async (req, res) => {
  const { rows } = await query('SELECT * FROM events ORDER BY id DESC')
  res.json(rows)
})
router.post('/events', async (req, res) => {
  const { name, event_date, location, image, description } = req.body
  const { rows } = await query(
    `INSERT INTO events (name, event_date, location, image, description)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [name, event_date || null, location, image, description]
  )
  res.status(201).json(rows[0])
})
router.put('/events/:id', async (req, res) => {
  const { name, event_date, location, image, description } = req.body
  const { rows } = await query(
    `UPDATE events SET name=$1, event_date=$2, location=$3, image=$4, description=$5
     WHERE id=$6 RETURNING *`,
    [name, event_date || null, location, image, description, req.params.id]
  )
  res.json(rows[0])
})
router.delete('/events/:id', async (req, res) => {
  await query('DELETE FROM events WHERE id=$1', [req.params.id])
  res.json({ ok: true })
})

// Photos
router.get('/photos', async (req, res) => {
  const { rows } = await query(
    `SELECT p.*, e.name AS event_name FROM photos p
     LEFT JOIN events e ON e.id = p.event_id
     ORDER BY p.id DESC`
  )
  res.json(rows)
})
router.post('/photos', async (req, res) => {
  const { event_id, title, image } = req.body
  const { rows } = await query(
    'INSERT INTO photos (event_id, title, image) VALUES ($1, $2, $3) RETURNING *',
    [event_id || null, title, image]
  )
  res.status(201).json(rows[0])
})
router.put('/photos/:id', async (req, res) => {
  const { event_id, title, image } = req.body
  const { rows } = await query(
    'UPDATE photos SET event_id=$1, title=$2, image=$3 WHERE id=$4 RETURNING *',
    [event_id || null, title, image, req.params.id]
  )
  res.json(rows[0])
})
router.delete('/photos/:id', async (req, res) => {
  await query('DELETE FROM photos WHERE id=$1', [req.params.id])
  res.json({ ok: true })
})

// Subscriptions
router.get('/subscriptions', async (req, res) => {
  const { rows } = await query(
    `SELECT s.*, p.name AS photographer_name FROM subscriptions s
     LEFT JOIN photographers p ON p.id = s.photographer_id
     ORDER BY s.id DESC`
  )
  res.json(rows)
})
router.post('/subscriptions', async (req, res) => {
  const { photographer_id, plan, amount, status, started_at, expires_at } = req.body
  const { rows } = await query(
    `INSERT INTO subscriptions (photographer_id, plan, amount, status, started_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [photographer_id || null, plan, amount || 0, status || 'active', started_at || null, expires_at || null]
  )
  res.status(201).json(rows[0])
})
router.put('/subscriptions/:id', async (req, res) => {
  const { photographer_id, plan, amount, status, started_at, expires_at } = req.body
  const { rows } = await query(
    `UPDATE subscriptions SET photographer_id=$1, plan=$2, amount=$3, status=$4,
       started_at=$5, expires_at=$6 WHERE id=$7 RETURNING *`,
    [photographer_id || null, plan, amount || 0, status, started_at || null, expires_at || null, req.params.id]
  )
  res.json(rows[0])
})
router.delete('/subscriptions/:id', async (req, res) => {
  await query('DELETE FROM subscriptions WHERE id=$1', [req.params.id])
  res.json({ ok: true })
})

// Help pages
router.get('/help', async (req, res) => {
  const { rows } = await query('SELECT * FROM help_pages ORDER BY id DESC')
  res.json(rows)
})
router.get('/help/:id', async (req, res) => {
  const { rows } = await query('SELECT * FROM help_pages WHERE id=$1', [req.params.id])
  if (rows.length === 0) return res.status(404).json({ message: 'Not found' })
  res.json(rows[0])
})
router.post('/help', async (req, res) => {
  const { title, content } = req.body
  if (!title) return res.status(400).json({ message: 'Title is required' })
  const { rows } = await query(
    'INSERT INTO help_pages (title, content) VALUES ($1, $2) RETURNING *',
    [title, content || '']
  )
  res.status(201).json(rows[0])
})
router.put('/help/:id', async (req, res) => {
  const { title, content } = req.body
  const { rows } = await query(
    'UPDATE help_pages SET title=$1, content=$2 WHERE id=$3 RETURNING *',
    [title, content || '', req.params.id]
  )
  res.json(rows[0])
})
router.delete('/help/:id', async (req, res) => {
  await query('DELETE FROM help_pages WHERE id=$1', [req.params.id])
  res.json({ ok: true })
})

// Country plans (country-based subscription pricing)
router.get('/country-plans', async (req, res) => {
  const { rows } = await query('SELECT * FROM country_plans ORDER BY country')
  res.json(rows)
})
router.post('/country-plans', async (req, res) => {
  const { country, currency_code, price, title, description, duration_days, events_limit } = req.body
  if (!country || !currency_code) {
    return res.status(400).json({ message: 'Country and currency code are required' })
  }
  const { rows } = await query(
    `INSERT INTO country_plans (country, currency_code, price, title, description, duration_days, events_limit)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [country, currency_code.toUpperCase(), price || 0, title || null, description || null, duration_days || 30, events_limit || 0]
  )
  res.status(201).json(rows[0])
})
router.put('/country-plans/:id', async (req, res) => {
  const { country, currency_code, price, title, description, duration_days, events_limit } = req.body
  const { rows } = await query(
    `UPDATE country_plans SET country=$1, currency_code=$2, price=$3, title=$4, description=$5,
            duration_days=$6, events_limit=$7
     WHERE id=$8 RETURNING *`,
    [country, currency_code.toUpperCase(), price || 0, title || null, description || null, duration_days || 30, events_limit || 0, req.params.id]
  )
  if (rows.length === 0) return res.status(404).json({ message: 'Not found' })
  res.json(rows[0])
})
router.delete('/country-plans/:id', async (req, res) => {
  await query('DELETE FROM country_plans WHERE id=$1', [req.params.id])
  res.json({ ok: true })
})

// Settings
router.get('/settings', async (req, res) => {
  const { rows } = await query('SELECT key, value FROM settings')
  res.json(Object.fromEntries(rows.map((r) => [r.key, r.value])))
})
router.put('/settings', async (req, res) => {
  const entries = Object.entries(req.body || {})
  for (const [key, value] of entries) {
    await query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, String(value ?? '')]
    )
  }
  res.json({ ok: true })
})

export default router
