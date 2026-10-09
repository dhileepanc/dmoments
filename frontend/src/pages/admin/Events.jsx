import CrudPage from '../../components/CrudPage.jsx'

const columns = [
  { key: 'image', label: 'Image', render: (r) => (r.image ? <img className="thumb" src={r.image} alt="" /> : '—') },
  { key: 'name', label: 'Event Name' },
  { key: 'event_date', label: 'Date' },
  { key: 'location', label: 'Location' },
]

const fields = [
  { name: 'name', label: 'Event Name', required: true },
  { name: 'event_date', label: 'Event Date', type: 'date', min: 'today' },
  { name: 'location', label: 'Location' },
  { name: 'image', label: 'Event Image', type: 'image' },
  { name: 'description', label: 'Description', type: 'textarea' },
]

export default function Events() {
  return (
    <CrudPage
      title="Events"
      endpoint="/admin/events"
      columns={columns}
      fields={fields}
    />
  )
}
