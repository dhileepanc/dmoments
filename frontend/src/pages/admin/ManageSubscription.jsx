import { useCallback, useEffect, useState } from 'react'
import Modal from '../../components/Modal.jsx'
import { api } from '../../api.js'
import { COUNTRIES, CURRENCY_CODES, currencyFor } from '../../countries.js'

const EMPTY = {
  country: '',
  currency_code: '',
  price: '',
  title: '',
  description: '',
  duration_days: '30',
  events_limit: '20',
}

export default function ManageSubscription() {
  const [rows, setRows] = useState([])
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(
    () =>
      api('/admin/country-plans', { role: 'admin' })
        .then(setRows)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false)),
    []
  )

  useEffect(() => {
    load()
  }, [load])

  const save = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (editing.id) {
        await api(`/admin/country-plans/${editing.id}`, {
          method: 'PUT',
          body: editing,
          role: 'admin',
        })
      } else {
        await api('/admin/country-plans', { method: 'POST', body: editing, role: 'admin' })
      }
      setEditing(null)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const remove = async (row) => {
    if (!window.confirm(`Delete plan for ${row.country}?`)) return
    await api(`/admin/country-plans/${row.id}`, { method: 'DELETE', role: 'admin' })
    load()
  }

  const setField = (name, value) => setEditing((prev) => ({ ...prev, [name]: value }))

  const onCountryChange = (value) => {
    const code = currencyFor(value)
    setEditing((prev) => ({ ...prev, country: value, currency_code: code || prev.currency_code }))
  }

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Manage Subscription</h1>
        <button type="button" className="btn btn-primary" onClick={() => setEditing({ ...EMPTY })}>
          + Add Country Plan
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="muted">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="muted">No subscription plans yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Country</th>
                <th>Title</th>
                <th>Description</th>
                <th>Currency Code</th>
                <th>Price</th>
                <th>Duration</th>
                <th>Event Limit</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.country}</td>
                  <td>{row.title || '—'}</td>
                  <td className="muted">{row.description || '—'}</td>
                  <td>{row.currency_code}</td>
                  <td>{Number(row.price).toFixed(2)}</td>
                  <td>{row.duration_days ? `${row.duration_days} days` : '—'}</td>
                  <td>{row.events_limit || '—'}</td>
                  <td className="actions-col">
                    <button type="button" className="btn btn-sm" onClick={() => setEditing({ ...row })}>
                      Edit
                    </button>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(row)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal title={editing.id ? 'Edit Subscription Plan' : 'Add Subscription Plan'} onClose={() => setEditing(null)}>
          <form className="form-grid" onSubmit={save}>
            <label className="field">
              Country
              <select value={editing.country || ''} onChange={(e) => onCountryChange(e.target.value)} required>
                <option value="">Select country...</option>
                {COUNTRIES.map((c) => (
                  <option key={c.country} value={c.country}>
                    {c.country}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Currency Code
              <select
                value={editing.currency_code || ''}
                onChange={(e) => setField('currency_code', e.target.value)}
                required
              >
                <option value="">Select currency...</option>
                {CURRENCY_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Price
              <input
                type="number"
                step="0.01"
                min="0"
                value={editing.price ?? ''}
                onChange={(e) => setField('price', e.target.value)}
                required
              />
            </label>
            <label className="field">
              Plan Title
              <input
                type="text"
                maxLength="80"
                placeholder="e.g. Monthly Plan"
                value={editing.title || ''}
                onChange={(e) => setField('title', e.target.value)}
                required
              />
            </label>
            <label className="field">
              Plan Description
              <textarea
                rows={3}
                placeholder="What is included in this plan?"
                value={editing.description || ''}
                onChange={(e) => setField('description', e.target.value)}
              />
            </label>
            <label className="field">
              Duration (days)
              <input
                type="number"
                min="1"
                value={editing.duration_days ?? '30'}
                onChange={(e) => setField('duration_days', e.target.value)}
                required
              />
              <small className="hint">How many days the subscription stays active.</small>
            </label>
            <label className="field">
              Event Count Limit
              <input
                type="number"
                min="1"
                value={editing.events_limit ?? '20'}
                onChange={(e) => setField('events_limit', e.target.value)}
                required
              />
              <small className="hint">Events a subscribed user can create with this plan.</small>
            </label>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="btn btn-primary">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
