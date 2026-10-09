import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import TopBar from '../components/TopBar.jsx'
import { useAuth } from '../context/auth.js'
import { api } from '../api.js'
import { buildPhotoPoster } from '../qrPoster.js'

export default function EventManage() {
  const { user } = useAuth()
  const { id } = useParams()
  const fileRef = useRef(null)
  const qrCanvasRef = useRef(null)
  const [event, setEvent] = useState(null)
  const [photos, setPhotos] = useState([])
  const [me, setMe] = useState(null)
  const [appName, setAppName] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [posterBusy, setPosterBusy] = useState(false)
  const [error, setError] = useState('')
  const [lanHost, setLanHost] = useState('')

  const load = useCallback(
    () =>
      Promise.all([
        api(`/photographer/events/${id}`),
        api(`/photographer/events/${id}/photos`),
      ])
        .then(([ev, ph]) => {
          setEvent(ev)
          setPhotos(ph)
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false)),
    [id]
  )

  useEffect(() => {
    if (user) load()
  }, [user, load])

  useEffect(() => {
    api('/network')
      .then((data) => setLanHost(data.addresses?.[0] || ''))
      .catch(() => {})
    api('/photographer/me')
      .then(setMe)
      .catch(() => {})
    api('/settings')
      .then((data) => setAppName(data.app_name || 'AI Photo Platform'))
      .catch(() => {})
  }, [])

  if (!user) return <Navigate to="/login" replace />

  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  const host =
    isLocal && lanHost
      ? `${lanHost}${window.location.port ? `:${window.location.port}` : ''}`
      : window.location.host
  const publicUrl = `${window.location.protocol}//${host}/e/${id}`

  const upload = async (files) => {
    if (!files.length) return
    setError('')
    setUploading(true)
    try {
      const fd = new FormData()
      Array.from(files).forEach((file) => fd.append('images', file))
      await api(`/photographer/events/${id}/photos`, { method: 'POST', body: fd })
      if (fileRef.current) fileRef.current.value = ''
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const removePhoto = async (photo) => {
    if (!window.confirm('Delete this photo?')) return
    await api(`/photographer/photos/${photo.id}`, { method: 'DELETE' })
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
  }

  const downloadPoster = async () => {
    if (!event || !qrCanvasRef.current) return
    setError('')
    setPosterBusy(true)
    try {
      const qrDataUrl = qrCanvasRef.current.toDataURL('image/png')
      const dataUrl = await buildPhotoPoster({
        qrDataUrl,
        eventName: event.name,
        appName: appName || 'AI Photo Platform',
        photographerName: me?.name,
        phone: me?.phone,
        email: me?.email,
      })
      const slug = event.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `${slug || 'event'}-qr.png`
      link.click()
    } catch (err) {
      setError(err.message)
    } finally {
      setPosterBusy(false)
    }
  }

  return (
    <div className="landing">
      <TopBar appName="AI Photo Platform" />
      <section className="events-section">
        <p className="breadcrumb">
          <Link to="/home">← My Events</Link>
        </p>

        {loading ? (
          <p className="muted">Loading...</p>
        ) : !event ? (
          <p className="error">{error || 'Event not found'}</p>
        ) : (
          <>
            <div className="event-manage-head">
              <div>
                <h1 className="page-title">{event.name}</h1>
                <p className="muted">
                  {formatDate(event.event_date)} · {event.location || 'TBA'}
                </p>
              </div>
            </div>

            <div className="event-manage-grid">
              <div className="card qr-card">
                <h3>Event QR Code</h3>
                <p className="muted small">
                  Scan with a mobile camera to open the gallery. The phone must be on the same Wi-Fi.
                </p>
                <div className="qr-box">
                  <QRCodeCanvas value={publicUrl} size={180} style={{ display: 'block' }} />
                </div>
                <QRCodeCanvas
                  ref={qrCanvasRef}
                  value={publicUrl}
                  size={640}
                  style={{ display: 'none' }}
                />
                <a href={publicUrl} target="_blank" rel="noreferrer" className="small">
                  {publicUrl}
                </a>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ alignSelf: 'center', marginTop: 12 }}
                  disabled={posterBusy}
                  onClick={downloadPoster}
                >
                  {posterBusy ? 'Generating...' : '⬇ Download QR'}
                </button>
              </div>

              <div className="card">
                <h3>Upload Photos</h3>
                <p className="muted small">Select one or more images from your device.</p>
                {error && <p className="error">{error}</p>}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploading}
                  onChange={(e) => upload(e.target.files)}
                />
                {uploading && <p className="muted small">Uploading...</p>}
              </div>
            </div>

            <h2 className="section-subtitle">Photos ({photos.length})</h2>
            {photos.length === 0 ? (
              <p className="muted">No photos uploaded yet.</p>
            ) : (
              <div className="photo-grid">
                {photos.map((photo) => (
                  <div className="photo-tile" key={photo.id}>
                    <img src={photo.image} alt={photo.title || ''} />
                    <button
                      type="button"
                      className="photo-delete"
                      title="Delete"
                      onClick={() => removePhoto(photo)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
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
