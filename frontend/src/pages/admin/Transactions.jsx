import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api.js'

function fmtDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Transactions() {
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    api('/admin/transactions', { role: 'admin' })
      .then(setRows)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Transactions</h1>
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="muted">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="muted">No transactions yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Photographer</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Event</th>
                <th>Plan</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>#{row.id}</td>
                  <td>
                    {row.photographer_name || '—'}
                    {row.photographer_email ? <br /> : null}
                    {row.photographer_email && <span className="muted">{row.photographer_email}</span>}
                  </td>
                  <td>{row.type}</td>
                  <td>
                    {Number(row.amount).toFixed(2)} {row.currency}
                  </td>
                  <td>
                    <span className={`badge badge-${row.status}`}>{row.status}</span>
                  </td>
                  <td>{row.event_name || '—'}</td>
                  <td>{row.plan_title || '—'}</td>
                  <td>{fmtDate(row.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}