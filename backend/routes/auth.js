import { Router } from 'express'
import { query } from '../db.js'
import { hashPassword, verifyPassword, createToken } from '../auth.js'

const router = Router()

router.post('/admin/login', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' })
  }
  const { rows } = await query('SELECT * FROM admins WHERE email = $1', [email])
  const admin = rows[0]
  if (!admin || !verifyPassword(password, admin.password)) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }
  const token = createToken({ id: admin.id, role: 'admin', email: admin.email })
  res.json({ token, user: { id: admin.id, name: admin.name, email: admin.email } })
})

router.post('/photographer/signup', async (req, res) => {
  const { name, email, phone, password } = req.body || {}
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' })
  }
  const exists = await query('SELECT id FROM photographers WHERE email = $1', [email])
  if (exists.rows.length > 0) {
    return res.status(409).json({ message: 'Email already registered' })
  }
  const { rows } = await query(
    `INSERT INTO photographers (name, email, phone, password)
     VALUES ($1, $2, $3, $4) RETURNING id, name, email, phone`,
    [name, email, phone || null, hashPassword(password)]
  )
  const user = rows[0]
  const token = createToken({ id: user.id, role: 'photographer', email: user.email })
  res.status(201).json({ token, user })
})

router.post('/photographer/login', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' })
  }
  const { rows } = await query('SELECT * FROM photographers WHERE email = $1', [email])
  const user = rows[0]
  if (!user || !verifyPassword(password, user.password)) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }
  const token = createToken({ id: user.id, role: 'photographer', email: user.email })
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } })
})

export default router
