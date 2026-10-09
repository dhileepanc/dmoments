import { useCallback, useEffect, useState } from 'react'
import { api } from '../api.js'
import Modal from './Modal.jsx'

function todayISO() {
  const d = new Date()
  const offset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - offset).toISOString().slice(0, 10)
}

export default function CrudPage({ title, endpoint, columns, fields, emptyItem = {} }) {
  const [rows, setRows] = useState([])
  const [optionsMap, setOptionsMap] = useState({})
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(
    () =>
      api(endpoint, { role: 'admin' })
        .then(setRows)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false)),
    [endpoint]
  )

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const sources = fields.filter((f) => f.type === 'select' && f.optionsFrom)
    Promise.all(
      sources.map((f) =>
        api(f.optionsFrom.endpoint, { role: 'admin' })
          .then((data) =>
            data.map((item) => ({
              value: item[f.optionsFrom.valueKey || 'id'],
              label: item[f.optionsFrom.labelKey || 'name'],
            }))
          )
          .catch(() => [])
      )
    ).then((results) => {
      const map = {}
      sources.forEach((f, i) => {
        map[f.name] = results[i]
      })
      setOptionsMap(map)
    })
  }, [fields])

  const save = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (editing.id) {
        await api(`${endpoint}/${editing.id}`, { method: 'PUT', body: editing, role: 'admin' })
      } else {
        await api(endpoint, { method: 'POST', body: editing, role: 'admin' })
      }
      setEditing(null)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const remove = async (row) => {
    if (!window.confirm('Delete this record?')) return
    await api(`${endpoint}/${row.id}`, { method: 'DELETE', role: 'admin' })
    load()
  }

  const setField = (name, value) => setEditing((prev) => ({ ...prev, [name]: value }))

  const uploadImage = async (name, file) => {
    const fd = new FormData()
    fd.append('image', file)
    const { url } = await api('/admin/upload', { method: 'POST', body: fd, role: 'admin' })
    setField(name, url)
  }

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">{title}</h1>
        <button type="button" className="btn btn-primary" onClick={() => setEditing({ ...emptyItem })}>
          + Add New
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="muted">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="muted">No records found.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {columns.map((c) => (
                    <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>
                  ))}
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
        <Modal title={editing.id ? `Edit ${title}` : `Add ${title}`} onClose={() => setEditing(null)}>
          <form className="form-grid" onSubmit={save}>
            {fields.map((f) => (
              <label key={f.name} className="field">
                {f.label}
                {f.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    value={editing[f.name] || ''}
                    onChange={(e) => setField(f.name, e.target.value)}
                  />
                ) : f.type === 'select' ? (
                  <select
                    value={editing[f.name] || ''}
                    onChange={(e) => setField(f.name, e.target.value)}
                  >
                    <option value="">Select...</option>
                    {(f.options || optionsMap[f.name] || []).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : f.type === 'image' ? (
                  <div className="image-field">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files[0] && uploadImage(f.name, e.target.files[0])}
                    />
                    <input
                      type="text"
                      placeholder="or paste image URL"
                      value={editing[f.name] || ''}
                      onChange={(e) => setField(f.name, e.target.value)}
                    />
                    {editing[f.name] && <img className="thumb" src={editing[f.name]} alt="" />}
                  </div>
                ) : (
                  <input
                    type={f.type || 'text'}
                    value={editing[f.name] ?? ''}
                    onChange={(e) => setField(f.name, e.target.value)}
                    required={f.required}
                    placeholder={f.placeholder}
                    min={f.min === 'today' ? todayISO() : f.min}
                    step={f.step}
                  />
                )}
              </label>
            ))}
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
