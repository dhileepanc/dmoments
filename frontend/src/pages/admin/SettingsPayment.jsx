import { useEffect, useState } from 'react'
import { api } from '../../api.js'

export default function SettingsPayment() {
  const [form, setForm] = useState({
    razorpay_key_id: '',
    razorpay_key_secret: '',
    razorpay_currency: 'INR',
  })
  const [status, setStatus] = useState('')

  useEffect(() => {
    api('/admin/settings', { role: 'admin' })
      .then((data) =>
        setForm({
          razorpay_key_id: data.razorpay_key_id || '',
          razorpay_key_secret: data.razorpay_key_secret || '',
          razorpay_currency: data.razorpay_currency || 'INR',
        })
      )
      .catch(() => {})
  }, [])

  const save = async (e) => {
    e.preventDefault()
    setStatus('')
    try {
      await api('/admin/settings', { method: 'PUT', body: form, role: 'admin' })
      setStatus('Payment settings saved.')
    } catch (err) {
      setStatus(err.message)
    }
  }

  return (
    <div>
      <h1 className="page-title">Payment Settings</h1>
      {status && <p className="success">{status}</p>}
      <form className="card form-grid narrow" onSubmit={save}>
        <label className="field">
          Razorpay Key ID
          <input
            value={form.razorpay_key_id}
            onChange={(e) => setForm({ ...form, razorpay_key_id: e.target.value })}
          />
        </label>
        <label className="field">
          Razorpay Key Secret
          <input
            type="password"
            value={form.razorpay_key_secret}
            onChange={(e) => setForm({ ...form, razorpay_key_secret: e.target.value })}
          />
        </label>
        <label className="field">
          Currency
          <input
            value={form.razorpay_currency}
            onChange={(e) => setForm({ ...form, razorpay_currency: e.target.value })}
          />
        </label>
        <div className="form-actions">
          <button className="btn btn-primary">Save Settings</button>
        </div>
      </form>
    </div>
  )
}
