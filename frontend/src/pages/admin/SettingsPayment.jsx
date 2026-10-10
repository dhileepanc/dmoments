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
      const body = {
        razorpay_key_id: form.razorpay_key_id.trim(),
        razorpay_key_secret: form.razorpay_key_secret.trim(),
        razorpay_currency: form.razorpay_currency.trim(),
      }
      await api('/admin/settings', { method: 'PUT', body, role: 'admin' })
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
            placeholder="rzp_test_xxxxxxxxxxxx"
            value={form.razorpay_key_id}
            onChange={(e) => setForm({ ...form, razorpay_key_id: e.target.value })}
          />
          <small className="hint">
            From Razorpay Dashboard &gt; Settings &gt; API Keys. Use test keys while testing and live
            keys for real payments.
          </small>
        </label>
        <label className="field">
          Razorpay Key Secret
          <input
            type="password"
            placeholder="Your key secret"
            value={form.razorpay_key_secret}
            onChange={(e) => setForm({ ...form, razorpay_key_secret: e.target.value })}
          />
          <small className="hint">
            Must belong to the same mode (test/live) as the Key ID above, otherwise Razorpay returns
            "Authentication failed".
          </small>
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
