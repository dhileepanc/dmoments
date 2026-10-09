import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar.jsx'
import Modal from '../components/Modal.jsx'
import { useAuth } from '../context/auth.js'
import { api } from '../api.js'
import { startPayment, formatMoney } from '../razorpay.js'

const EMPTY = { name: '', event_date: '', location: '', image: '', description: '' }

function todayISO() {
  const d = new Date()
  const offset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - offset).toISOString().slice(0, 10)
}

export default function PhotographerHome() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [sub, setSub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  const [showPlans, setShowPlans] = useState(false)
  const [plans, setPlans] = useState([])
  const [subscribing, setSubscribing] = useState(-1)

  const load = () => {
    setLoading(true)
    return Promise.all([api('/photographer/events'), api('/photographer/subscription')])
      .then(([eventRows, subInfo]) => {
        setEvents(eventRows)
        setSub(subInfo)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (user) {
      Promise.all([api('/photographer/events'), api('/photographer/subscription')])
        .then(([eventRows, subInfo]) => {
          setEvents(eventRows)
          setSub(subInfo)
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false))
    }
  }, [user])

  if (!user) return <Navigate to="/login" replace />

  const save = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (editing.id) {
        await api(`/photographer/events/${editing.id}`, { method: 'PUT', body: editing })
        setEditing(null)
        load()
        return
      }

      if (sub?.pricing === 'fee') {
        const order = await api('/photographer/pay/event-order', { method: 'POST' })
        const payment = await startPayment({
          key_id: order.key_id,
          order_id: order.order_id,
          amount: order.amount,
          currency: order.currency,
          name: 'AI Photo Platform',
          description: 'Event creation fee',
          email: user.email,
          contact: user.phone,
        })
        const result = await api('/photographer/events', {
          method: 'POST',
          body: { ...editing, ...payment },
        })
        setEditing(null)
        navigate(`/home/events/${result.event.id}`)
      } else {
        const result = await api('/photographer/events', { method: 'POST', body: editing })
        setEditing(null)
        if (result.subscription) setSub(result.subscription)
        navigate(`/home/events/${result.event.id}`)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const onAddClick = () => {
    setError('')
    if (!sub) return
    if (sub.pricing === 'fee') {
      setEditing({ ...EMPTY })
      return
    }
    if (sub.remaining <= 0) {
      setError(`Free event limit reached (${sub.used}/${sub.max}).`)
      return
    }
    setEditing({ ...EMPTY })
  }

  const remove = async (event) => {
    if (!window.confirm(`Delete "${event.name}"?`)) return
    await api(`/photographer/events/${event.id}`, { method: 'DELETE' })
    load()
  }

  const uploadImage = async (file) => {
    const fd = new FormData()
    fd.append('image', file)
    const { url } = await api('/photographer/upload', { method: 'POST', body: fd })
    setEditing((prev) => ({ ...prev, image: url }))
  }

  const setField = (name, value) => setEditing((prev) => ({ ...prev, [name]: value }))

  const openPlans = () => {
    api('/photographer/plans').then(setPlans).catch((err) => setError(err.message))
    setShowPlans(true)
  }

  const subscribe = async (plan) => {
    setSubscribing(plan.id)
    setError('')
    try {
      const order = await api('/photographer/pay/subscription-order', {
        method: 'POST',
        body: { planId: plan.id },
      })
      const payment = await startPayment({
        key_id: order.key_id,
        order_id: order.order_id,
        amount: order.amount,
        currency: order.currency,
        name: plan.title || 'Subscription',
        description: `${plan.country} · ${plan.duration_days} days`,
        email: user.email,
        contact: user.phone,
      })
      const info = await api('/photographer/subscribe', {
        method: 'POST',
        body: payment,
      })
      setSub(info)
      setShowPlans(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubscribing(-1)
    }
  }

  return (
    <div className="landing">
      <TopBar appName="AI Photo Platform" />

      <section className="events-section">
        <div className="page-head">
          <h2>My Events</h2>
          <button type="button" className="btn btn-primary" onClick={onAddClick}>
            + Add Event
          </button>
        </div>

        {sub && (
          <div className={`subscription-bar${!sub.hasSubscription ? ' subscription-bar-warn' : ''}`}>
            {sub.hasSubscription ? (
              <>
                <span>
                  <strong>Subscription:</strong> {sub.plan}
                </span>
                <span className="muted">
                  {sub.expiresAt ? `Valid until ${sub.expiresAt}` : 'Active'}
                </span>
              </>
            ) : (
              <>
                <span>
                  <strong>No active plan</strong>
                  {sub.pricing === 'fee'
                    ? ' — you can add events by paying per event, or subscribe for a plan.'
                    : ' — subscribe to get started.'}
                </span>
                <button type="button" className="btn btn-sm btn-primary" onClick={openPlans}>
                  Subscribe Now
                </button>
              </>
            )}
          </div>
        )}

        {error && <p className="error">{error}</p>}

        {loading ? (
          <p className="muted">Loading events...</p>
        ) : events.length === 0 ? (
          <div className="empty-state">
            <p>You haven't created any events yet.</p>
            <button type="button" className="btn btn-primary" onClick={onAddClick}>
              Add Event
            </button>
          </div>
        ) : (
          <div className="event-grid">
            {events.map((event) => (
              <article className="event-card" key={event.id}>
                <div className="event-card-image">
                  {event.image ? (
                    <img src={event.image} alt={event.name} />
                  ) : (
                    <div className="event-card-placeholder">No image</div>
                  )}
                </div>
                <div className="event-card-body">
                  <h3 className="event-card-title">{event.name}</h3>
                  <p className="event-card-meta">
                    <span>{formatDate(event.event_date)}</span>
                    <span className="dot">•</span>
                    <span>{event.location || 'TBA'}</span>
                  </p>
                  <div className="card-actions">
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => navigate(`/home/events/${event.id}`)}
                    >
                      Photos & QR
                    </button>
                    <button type="button" className="btn btn-sm" onClick={() => setEditing({ ...event })}>
                      Edit
                    </button>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(event)}>
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {editing && (
        <Modal title={editing.id ? 'Edit Event' : 'Add Event'} onClose={() => setEditing(null)}>
          <form className="form-grid" onSubmit={save}>
            {!editing.id && sub?.pricing === 'fee' && (
              <p className="muted">
                A payment of {Number(sub.eventFee || 0).toFixed(2)} is required before the event is created.
              </p>
            )}
            <label className="field">
              Event Name
              <input value={editing.name} onChange={(e) => setField('name', e.target.value)} required />
            </label>
            <label className="field">
              Event Date
              <input
                type="date"
                min={todayISO()}
                value={editing.event_date || ''}
                onChange={(e) => setField('event_date', e.target.value)}
              />
            </label>
            <label className="field">
              Location
              <input value={editing.location || ''} onChange={(e) => setField('location', e.target.value)} />
            </label>
            <label className="field">
              Event Image
              <div className="image-field">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files[0] && uploadImage(e.target.files[0])}
                />
                <input
                  type="text"
                  placeholder="or paste image URL"
                  value={editing.image || ''}
                  onChange={(e) => setField('image', e.target.value)}
                />
                {editing.image && <img className="thumb" src={editing.image} alt="" />}
              </div>
            </label>
            <label className="field">
              Description
              <textarea
                rows={3}
                value={editing.description || ''}
                onChange={(e) => setField('description', e.target.value)}
              />
            </label>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="btn btn-primary">{editing.id ? 'Save' : 'Add Event'}</button>
            </div>
          </form>
        </Modal>
      )}

      {showPlans && (
        <Modal title="Choose a Subscription Plan" onClose={() => setShowPlans(false)}>
          {plans.length === 0 ? (
            <p className="muted">No plans available yet.</p>
          ) : (
            <div className="plan-grid">
              {plans.map((plan) => (
                <div className="plan-card" key={plan.id}>
                  <h3>{plan.title || 'Subscription'}</h3>
                  <p className="plan-price">{formatMoney(Number(plan.price).toFixed(2), plan.currency_code)}</p>
                  <p className="muted">{plan.country}</p>
                  <p className="plan-desc">{plan.description}</p>
                  <p className="muted">Duration: {plan.duration_days} days · Up to {plan.events_limit} events</p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={subscribing === plan.id}
                    onClick={() => subscribe(plan)}
                  >
                    {subscribing === plan.id ? 'Paying...' : 'Subscribe'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}

function formatDate(value) {
  if (!value) return 'Date TBA'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}