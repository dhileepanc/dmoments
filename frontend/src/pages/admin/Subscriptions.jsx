import CrudPage from '../../components/CrudPage.jsx'

const columns = [
  { key: 'photographer_name', label: 'Photographer' },
  { key: 'plan', label: 'Plan' },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status' },
  { key: 'started_at', label: 'Started' },
  { key: 'expires_at', label: 'Expires' },
]

const fields = [
  {
    name: 'photographer_id',
    label: 'Photographer',
    type: 'select',
    optionsFrom: { endpoint: '/admin/photographers', valueKey: 'id', labelKey: 'name' },
  },
  { name: 'plan', label: 'Plan', required: true },
  { name: 'amount', label: 'Amount', type: 'number' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'expired', label: 'Expired' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
  },
  { name: 'started_at', label: 'Started At', type: 'date' },
  { name: 'expires_at', label: 'Expires At', type: 'date' },
]

export default function Subscriptions() {
  return (
    <CrudPage
      title="Subscriptions"
      endpoint="/admin/subscriptions"
      columns={columns}
      fields={fields}
      emptyItem={{ status: 'active' }}
    />
  )
}
