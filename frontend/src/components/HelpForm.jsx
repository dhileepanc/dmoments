import { useState } from 'react'
import RichEditor from './RichEditor.jsx'
import { api } from '../api.js'

export default function HelpForm({ initial, onSaved, onCancel }) {
  const [title, setTitle] = useState(initial?.title || '')
  const [content, setContent] = useState(initial?.content || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      if (initial?.id) {
        await api(`/admin/help/${initial.id}`, {
          method: 'PUT',
          body: { title, content },
          role: 'admin',
        })
      } else {
        await api('/admin/help', {
          method: 'POST',
          body: { title, content },
          role: 'admin',
        })
      }
      if (!initial?.id) {
        setTitle('')
        setContent('')
      }
      onSaved?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="help-form" onSubmit={submit}>
      {error && <p className="error">{error}</p>}
      <label className="field">
        Title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter help page title"
          required
        />
      </label>
      <label className="field">
        Content
        <RichEditor value={content} onChange={setContent} placeholder="Write help content..." />
      </label>
      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : initial?.id ? 'Update' : 'Save Help Page'}
        </button>
      </div>
    </form>
  )
}
