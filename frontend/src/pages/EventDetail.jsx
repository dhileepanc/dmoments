import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import TopBar from '../components/TopBar.jsx'
import { api } from '../api.js'
import usePublicUrl from '../usePublicUrl.js'

export default function EventDetail() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [photoCount, setPhotoCount] = useState(null)
  const [appName, setAppName] = useState('AI Photo Platform')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const galleryUrl = usePublicUrl(`/e/${id}`)

  useEffect(() => {
    Promise.all([api(`/events/${id}`), api(`/events/${id}/photos`), api('/settings')])
      .then(([ev, ph, st]) => {
        setEvent(ev)
        setPhotoCount(ph.length)
        setAppName(st.app_name || 'AI Photo Platform')
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div className="landing detail-page">
      <TopBar appName={appName} />

      <section className="events-section">
        <p className="breadcrumb">
          <Link to="/">← Back to events</Link>
        </p>

        {loading ? (
          <p className="muted">Loading event...</p>
        ) : notFound || !event ? (
          <p className="error">Event not found.</p>
        ) : (
          <>
            <div className="detail-box">
              <div className="detail-hero">
                {event.image ? (
                  <img src={event.image} alt={event.name} />
                ) : (
                  <div className="event-card-placeholder">No image</div>
                )}
              </div>

              <div className="detail-info">
                <h1 className="page-title">{event.name}</h1>
                <p className="detail-meta">
                  <span>📅 {formatDate(event.event_date)}</span>
                  <span>·</span>
                  <span>📍 {event.location || 'TBA'}</span>
                </p>
                {event.description && (
                  <p className="detail-desc">{event.description}</p>
                )}
                <p className="muted small">
                  {photoCount !== null && `${photoCount} photo${photoCount === 1 ? '' : 's'} available`}
                </p>
              </div>
            </div>

            <div className="detail-qr card">
              <div>
                <h3>Scan to get the photos</h3>
                <p className="muted small">
                  Point your phone camera at the QR code to open and download this event's gallery.
                </p>
              </div>
              <div className="qr-box">
                <QRCodeCanvas value={galleryUrl} size={200} style={{ display: 'block' }} />
              </div>
              <Link className="btn btn-primary" to={`/e/${id}`}>
                View & Download Photos
              </Link>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function formatDate(value) {
  if (!value) return 'Date TBA'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}