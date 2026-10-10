const BASE = '/api'

export function getToken(role = 'photographer') {
  return localStorage.getItem(role === 'admin' ? 'admin_token' : 'token')
}

export function setToken(token, role = 'photographer') {
  const key = role === 'admin' ? 'admin_token' : 'token'
  if (token) localStorage.setItem(key, token)
  else localStorage.removeItem(key)
}

export async function api(path, { method = 'GET', body, role = 'photographer' } = {}) {
  const headers = {}
  const token = getToken(role)
  if (token) headers.Authorization = `Bearer ${token}`
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const error = new Error(data.message || `Request failed (${res.status})`)
    error.status = res.status
    error.data = data
    throw error
  }
  return data
}
