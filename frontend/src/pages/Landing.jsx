import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar.jsx'
import EventCard from '../components/EventCard.jsx'
import { api } from '../api.js'

export default function Landing() {
  const navigate = useNavigate()
  const [todayEvents, setTodayEvents] = useState([])
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api('/events'), api('/settings')])
      .then(([data, st]) => {
        const serverToday = data.today || ''
        const todayList = (data.events || []).filter((e) => e.event_date === serverToday)
        const upcomingList = (data.events || []).filter(
          (e) => !e.event_date || e.event_date > serverToday
        )
        setTodayEvents(todayList)
        setUpcomingEvents(upcomingList)
        setSettings(st)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const renderSection = (title, events) =>
    events.length > 0 ? (
      <section className="events-section">
        <h2>{title}</h2>
        <div className="event-grid">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onGo={(e) => navigate(`/event/${e.id}`)}
            />
          ))}
        </div>
      </section>
    ) : null

  return (
    <div className="landing">
      <TopBar appName={settings.app_name || 'AI Photo Platform'} />

      <section className="hero-section">
        <h1>{settings.app_name || 'AI Photo Platform'}</h1>
        <p>Discover and book photography events near you.</p>
      </section>

      {loading ? (
        <section className="events-section">
          <p className="muted">Loading events...</p>
        </section>
      ) : todayEvents.length === 0 && upcomingEvents.length === 0 ? (
        <section className="events-section">
          <p className="muted">No events yet.</p>
        </section>
      ) : (
        <>
          {renderSection(todayEvents.length > 1 ? `Today's Events` : `Today's Event`, todayEvents)}
          {renderSection('Upcoming Events', upcomingEvents)}
        </>
      )}

      <footer className="landing-footer">
        <div>
          {settings.playstore_url && (
            <a href={settings.playstore_url} target="_blank" rel="noreferrer">
              Google Play
            </a>
          )}
          {settings.appstore_url && (
            <a href={settings.appstore_url} target="_blank" rel="noreferrer">
              App Store
            </a>
          )}
        </div>
      </footer>
    </div>
  )
}
