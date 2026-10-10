import { useEffect, useState } from 'react'
import { api } from '../../api.js'

export default function SettingsGeneral() {
  const [form, setForm] = useState({
    app_name: '',
    playstore_url: '',
    appstore_url: '',
    event_pricing: 'free',
    free_event_limit: '',
    event_fee: '',
  })
  const [status, setStatus] = useState('')

  useEffect(() => {
    api('/admin/settings', { role: 'admin' })
      .then((data) =>
        setForm({
          app_name: data.app_name || '',
          playstore_url: data.playstore_url || '',
          appstore_url: data.appstore_url || '',
          event_pricing: data.event_pricing || 'free',
          free_event_limit: data.free_event_limit || '',
          event_fee: data.event_fee || '',
        })
      )
      .catch(() => {})
  }, [])

  const save = async (e) => {
    e.preventDefault()
    setStatus('')
    try {
      await api('/admin/settings', { method: 'PUT', body: form, role: 'admin' })
      setStatus('General settings saved.')
    } catch (err) {
      setStatus(err.message)
    }
  }

  return (
    <div>
      <h1 className="page-title">General Settings</h1>
      {status && <p className="success">{status}</p>}
      <form className="card form-grid narrow" onSubmit={save}>
        <label className="field">
          App Name
          <input
            value={form.app_name}
            onChange={(e) => setForm({ ...form, app_name: e.target.value })}
          />
        </label>
        <label className="field">
          Play Store URL
          <input
            value={form.playstore_url}
            onChange={(e) => setForm({ ...form, playstore_url: e.target.value })}
          />
        </label>
        <label className="field">
          App Store URL
          <input
            value={form.appstore_url}
            onChange={(e) => setForm({ ...form, appstore_url: e.target.value })}
          />
        </label>
        <label className="field">
          Event Creation Pricing
          <select
            value={form.event_pricing || 'free'}
            onChange={(e) => setForm({ ...form, event_pricing: e.target.value })}
          >
            <option value="free">Free (included events, then per-event fee)</option>
            <option value="fee">Fee per event (no free events)</option>
          </select>
          <small className="hint">
            How photographers pay when creating an event. Once a photographer uses up their included
            events, each new event requires the per-event fee.
          </small>
        </label>
        {form.event_pricing === 'free' && (
          <label className="field">
            Free User Event Limit
            <input
              type="number"
              min="1"
              value={form.free_event_limit}
              onChange={(e) => setForm({ ...form, free_event_limit: e.target.value })}
            />
            <small className="hint">
              Events a photographer without an active plan can create for free before the per-event
              fee applies. Subscribed users instead get their plan's event limit. Deleted events
              free up the count.
            </small>
          </label>
        )}
        <label className="field">
          Per Event Fee
          <input
            type="number"
            step="0.01"
            min="1"
            value={form.event_fee}
            onChange={(e) => setForm({ ...form, event_fee: e.target.value })}
          />
          <small className="hint">
            Amount charged (in the Razorpay currency) for each event once a photographer's included
            events are used up. Also the fee when pricing is set to fee per event.
          </small>
        </label>
        <div className="form-actions">
          <button className="btn btn-primary">Save Settings</button>
        </div>
      </form>
    </div>
  )
}