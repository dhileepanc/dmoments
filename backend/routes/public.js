import { Router } from 'express'
import os from 'os'
import { query } from '../db.js'

const router = Router()

router.get('/network', (req, res) => {
  const addresses = []
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) addresses.push(net.address)
    }
  }
  res.json({ addresses })
})

router.get('/events', async (req, res) => {
  const today = new Date()
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`
  const { rows } = await query(
    `SELECT id, name, TO_CHAR(event_date, 'YYYY-MM-DD') AS event_date, location, image,
            description, photographer_id, created_at
       FROM events ORDER BY event_date ASC NULLS LAST, id DESC`
  )
  res.json({ events: rows, today: iso })
})

router.get('/events/:id', async (req, res) => {
  const { rows } = await query('SELECT * FROM events WHERE id = $1', [req.params.id])
  if (rows.length === 0) return res.status(404).json({ message: 'Event not found' })
  res.json(rows[0])
})

router.get('/events/:id/photos', async (req, res) => {
  const { rows } = await query(
    'SELECT id, title, image, created_at FROM photos WHERE event_id = $1 ORDER BY id DESC',
    [req.params.id]
  )
  res.json(rows)
})

router.get('/help', async (req, res) => {
  const { rows } = await query(
    'SELECT id, title, created_at FROM help_pages ORDER BY created_at DESC'
  )
  res.json(rows)
})

router.get('/help/:id', async (req, res) => {
  const { rows } = await query('SELECT * FROM help_pages WHERE id = $1', [req.params.id])
  if (rows.length === 0) return res.status(404).json({ message: 'Help page not found' })
  res.json(rows[0])
})

router.get('/country-plans', async (req, res) => {
  const { rows } = await query('SELECT * FROM country_plans ORDER BY country')
  res.json(rows)
})

router.get('/settings', async (req, res) => {
  const keys = ['app_name', 'playstore_url', 'appstore_url']
  const { rows } = await query(
    'SELECT key, value FROM settings WHERE key = ANY($1)',
    [keys]
  )
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  res.json(settings)
})

export default router
