import { Link } from 'react-router-dom'
import { useAuth } from '../context/auth.js'

export default function TopBar({ appName = 'AI Photo Platform' }) {
  const { user, logout } = useAuth()

  return (
    <header className="topbar">
      <Link to={user ? '/home' : '/'} className="brand">
        {appName}
      </Link>
      <nav className="topbar-actions">
        {user ? (
          <>
            <span className="welcome">Hi, {user.name}</span>
            <button type="button" className="btn btn-ghost" onClick={logout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/signup" className="btn btn-primary">
              Signup
            </Link>
            <Link to="/login" className="btn btn-ghost">
              Login
            </Link>
          </>
        )}
      </nav>
    </header>
  )
}
