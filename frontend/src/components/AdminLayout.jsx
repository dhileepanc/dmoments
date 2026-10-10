import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth.js'
import AdminLogin from '../pages/admin/AdminLogin.jsx'

const MENU = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '▤' },
  { to: '/admin/photographers', label: 'Photographers', icon: '◍' },
  { to: '/admin/events', label: 'Events', icon: '◈' },
  { to: '/admin/photos', label: 'Photos', icon: '▣' },
]

export default function AdminLayout() {
  const { isAdmin, admin, adminLogout } = useAuth()
  const [openHelps, setOpenHelps] = useState(true)
  const [openSettings, setOpenSettings] = useState(true)
  const [openSubs, setOpenSubs] = useState(true)
  const navigate = useNavigate()

  if (!isAdmin) return <AdminLogin />

  const logout = () => {
    adminLogout()
    navigate('/admin')
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">AI Photo · Admin</div>
        <nav className="admin-nav">
          {MENU.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `admin-link${isActive ? ' active' : ''}`}
            >
              <span className="admin-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          <button
            type="button"
            className="admin-group"
            onClick={() => setOpenSubs((v) => !v)}
          >
            <span className="admin-icon">★</span> Subscriptions
            <span className="chev">{openSubs ? '▾' : '▸'}</span>
          </button>
          {openSubs && (
            <div className="admin-submenu">
              <NavLink to="/admin/subscriptions/add" className="admin-link sub">
                Add Subscription
              </NavLink>
              <NavLink to="/admin/subscriptions/manage" className="admin-link sub">
                Manage Subscription
              </NavLink>
              <NavLink to="/admin/transactions" className="admin-link sub">
                Transactions
              </NavLink>
            </div>
          )}

          <button
            type="button"
            className="admin-group"
            onClick={() => setOpenHelps((v) => !v)}
          >
            <span className="admin-icon">?</span> Helps
            <span className="chev">{openHelps ? '▾' : '▸'}</span>
          </button>
          {openHelps && (
            <div className="admin-submenu">
              <NavLink to="/admin/helps/add" className="admin-link sub">
                Add Help Pages
              </NavLink>
              <NavLink to="/admin/helps/manage" className="admin-link sub">
                Manage Help Pages
              </NavLink>
            </div>
          )}

          <button
            type="button"
            className="admin-group"
            onClick={() => setOpenSettings((v) => !v)}
          >
            <span className="admin-icon">⚙</span> Settings
            <span className="chev">{openSettings ? '▾' : '▸'}</span>
          </button>
          {openSettings && (
            <div className="admin-submenu">
              <NavLink to="/admin/settings/general" className="admin-link sub">
                General Settings
              </NavLink>
              <NavLink to="/admin/settings/payment" className="admin-link sub">
                Payment Settings
              </NavLink>
            </div>
          )}
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <span>Welcome back, {admin?.name || 'Admin'}</span>
          <button type="button" className="btn btn-ghost" onClick={logout}>
            Logout
          </button>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
