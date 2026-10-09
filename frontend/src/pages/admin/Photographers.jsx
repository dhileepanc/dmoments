import CrudPage from '../../components/CrudPage.jsx'

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'status', label: 'Status' },
  {
    key: 'sub',
    label: 'Subscription',
    render: (r) =>
      r.sub_plan
        ? `${r.sub_plan} (${r.sub_status})${r.sub_expires_at ? ` · till ${r.sub_expires_at}` : ''}`
        : '—',
  },
  {
    key: 'usage',
    label: 'Events Used / Max',
    render: (r) => `${r.events_used ?? 0} / ${r.max_events ?? 10}`,
  },
]

const fields = [
  { name: 'name', label: 'Name', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phone', label: 'Phone' },
  { name: 'password', label: 'Password (new only)' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ],
  },
]

export default function Photographers() {
  return (
    <CrudPage
      title="Photographers"
      endpoint="/admin/photographers"
      columns={columns}
      fields={fields}
      emptyItem={{ status: 'active' }}
    />
  )
}
