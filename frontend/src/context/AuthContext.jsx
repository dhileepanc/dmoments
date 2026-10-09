import { useState } from 'react'
import { api, setToken, getToken } from '../api.js'
import { AuthContext } from './auth.js'

function loadUser(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null')
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => loadUser('user'))
  const [admin, setAdmin] = useState(() => loadUser('admin'))

  const login = async (email, password) => {
    const data = await api('/auth/photographer/login', {
      method: 'POST',
      body: { email, password },
    })
    setToken(data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  const signup = async (payload) => {
    const data = await api('/auth/photographer/signup', {
      method: 'POST',
      body: payload,
    })
    setToken(data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    setToken(null)
    localStorage.removeItem('user')
    setUser(null)
  }

  const adminLogin = async (email, password) => {
    const data = await api('/auth/admin/login', {
      method: 'POST',
      body: { email, password },
    })
    setToken(data.token, 'admin')
    localStorage.setItem('admin', JSON.stringify(data.user))
    setAdmin(data.user)
    return data.user
  }

  const adminLogout = () => {
    setToken(null, 'admin')
    localStorage.removeItem('admin')
    setAdmin(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        admin,
        isAuthed: Boolean(getToken()),
        isAdmin: Boolean(getToken('admin')),
        login,
        signup,
        logout,
        adminLogin,
        adminLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
