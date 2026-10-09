export default function EventCard({ event, onGo }) {
  return (
    <article className="event-card">
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
        <button type="button" className="btn btn-primary" onClick={() => onGo?.(event)}>
          Go
        </button>
      </div>
    </article>
  )
}

function formatDate(value) {
  if (!value) return 'Date TBA'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
