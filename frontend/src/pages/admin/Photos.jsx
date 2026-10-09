import CrudPage from '../../components/CrudPage.jsx'

const columns = [
  { key: 'image', label: 'Image', render: (r) => (r.image ? <img className="thumb" src={r.image} alt="" /> : '—') },
  { key: 'title', label: 'Title' },
  { key: 'event_name', label: 'Event' },
]

const fields = [
  {
    name: 'event_id',
    label: 'Event',
    type: 'select',
    optionsFrom: { endpoint: '/admin/events', valueKey: 'id', labelKey: 'name' },
  },
  { name: 'title', label: 'Title' },
  { name: 'image', label: 'Photo', type: 'image' },
]

export default function Photos() {
  return (
    <CrudPage
      title="Photos"
      endpoint="/admin/photos"
      columns={columns}
      fields={fields}
    />
  )
}
