import crypto from 'crypto'

const SECRET = process.env.JWT_SECRET || 'change-me-in-production'

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false
  const [salt, hash] = stored.split(':')
  const check = crypto.scryptSync(password, salt, 64).toString('hex')
  const a = Buffer.from(hash, 'hex')
  const b = Buffer.from(check, 'hex')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

function sign(payload) {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url')
}

export function createToken(data) {
  const payload = Buffer.from(
    JSON.stringify({ ...data, iat: Date.now() })
  ).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function verifyToken(token) {
  if (!token || !token.includes('.')) return null
  const [payload, signature] = token.split('.')
  if (sign(payload) !== signature) return null
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString())
  } catch {
    return null
  }
}
