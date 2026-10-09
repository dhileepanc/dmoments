import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api.js'

function fileBase(photo) {
  const name = photo.title || photo.image.split('/').pop() || 'photo'
  return name.replace(/\.[^./\\]+$/, '') || 'photo'
}

async function downloadImage(url, filename) {
  try {
    const res = await fetch(url, { mode: 'cors' })
    const blob = await res.blob()
    const objUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(objUrl)
  } catch {
    window.open(url, '_blank')
  }
}

async function downloadMany(photos) {
  for (const photo of photos) {
    await downloadImage(photo.image, fileBase(photo))
    await new Promise((r) => setTimeout(r, 400))
  }
}

export default function PublicGallery() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [active, setActive] = useState(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState([])

  useEffect(() => {
    Promise.all([api(`/events/${id}`), api(`/events/${id}/photos`)])
      .then(([ev, ph]) => {
        setEvent(ev)
        setPhotos(ph)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  const selectedPhotos = useMemo(
    () => photos.filter((p) => selected.includes(p.id)),
    [photos, selected]
  )

  const toggle = (photoId) => {
    setSelected((prev) =>
      prev.includes(photoId) ? prev.filter((x) => x !== photoId) : [...prev, photoId]
    )
  }

  const toggleSelectMode = () => {
    setSelectMode((v) => !v)
    setSelected([])
  }

  const allSelected = photos.length > 0 && selected.length === photos.length
  const toggleAll = () => setSelected(allSelected ? [] : photos.map((p) => p.id))

  if (loading) return <div className="gallery-page center-note">Loading gallery...</div>
  if (notFound) return <div className="gallery-page center-note">Event not found.</div>

  return (
    <div className="gallery-page">
      <header className="gallery-header">
        <h1>{event.name}</h1>
        <p>
          {formatDate(event.event_date)} · {event.location || 'TBA'}
        </p>
      </header>

      {photos.length > 0 && (
        <div className="gallery-toolbar">
          {selectMode ? (
            <>
              <button type="button" className="gbtn" onClick={toggleAll}>
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
              <span className="gallery-count">{selected.length} selected</span>
              <button
                type="button"
                className="gbtn gbtn-primary"
                disabled={selected.length === 0}
                onClick={() => downloadMany(selectedPhotos)}
              >
                Download ({selected.length})
              </button>
              <button type="button" className="gbtn" onClick={toggleSelectMode}>
                Done
              </button>
            </>
          ) : (
            <>
              <span className="gallery-count">{photos.length} photos</span>
              <button type="button" className="gbtn" onClick={toggleSelectMode}>
                Select
              </button>
            </>
          )}
        </div>
      )}

      <div className="gallery-body">
        {photos.length === 0 ? (
          <p className="muted">No photos have been uploaded yet.</p>
        ) : (
          <div className="photo-grid">
            {photos.map((photo) => {
              const isSelected = selected.includes(photo.id)
              return (
                <button
                  type="button"
                  className={`photo-tile${isSelected ? ' selected' : ''}`}
                  key={photo.id}
                  onClick={() => (selectMode ? toggle(photo.id) : setActive(photo))}
                >
                  <img src={photo.image} alt={photo.title || ''} loading="lazy" />
                  {selectMode && (
                    <span className={`tile-check${isSelected ? ' on' : ''}`}>
                      {isSelected ? '✓' : ''}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {active && (
        <div className="lightbox" onClick={() => setActive(null)}>
          <img src={active.image} alt={active.title || ''} onClick={(e) => e.stopPropagation()} />
          <div className="lightbox-actions" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="gbtn gbtn-primary"
              onClick={() => downloadImage(active.image, fileBase(active))}
            >
              Download
            </button>
            <button type="button" className="gbtn" onClick={() => setActive(null)}>
              Close
            </button>
          </div>
        </div>
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
