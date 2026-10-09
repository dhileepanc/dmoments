import { useEffect, useState } from 'react'
import { api } from '../../api.js'

const CARDS = [
  { key: 'photographers', label: 'Photographers' },
  { key: 'events', label: 'Events' },
  { key: 'photos', label: 'Photos' },
  { key: 'subscriptions', label: 'Subscriptions' },
  { key: 'helpPages', label: 'Help Pages' },
]

export default function Dashboard() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api('/admin/dashboard', { role: 'admin' })
      .then(setStats)
      .catch(() => setStats({}))
  }, [])

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <div className="stat-grid">
        {CARDS.map((c) => (
          <div className="stat-card" key={c.key}>
            <span className="stat-value">{stats ? stats[c.key] ?? 0 : '—'}</span>
            <span className="stat-label">{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
