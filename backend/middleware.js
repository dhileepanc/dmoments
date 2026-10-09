import { verifyToken } from './auth.js'

export function requireAdmin(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  const user = verifyToken(token)
  if (!user || user.role !== 'admin') {
    return res.status(401).json({ message: 'Admin authentication required' })
  }
  req.user = user
  next()
}

export function requirePhotographer(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  const user = verifyToken(token)
  if (!user || user.role !== 'photographer') {
    return res.status(401).json({ message: 'Photographer authentication required' })
  }
  req.user = user
  next()
}
