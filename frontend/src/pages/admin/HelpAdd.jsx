import { useState } from 'react'
import HelpForm from '../../components/HelpForm.jsx'

export default function HelpAdd() {
  const [saved, setSaved] = useState(false)

  return (
    <div>
      <h1 className="page-title">Add Help Page</h1>
      {saved && <p className="success">Help page saved successfully.</p>}
      <div className="card">
        <HelpForm
          onSaved={() => {
            setSaved(true)
            window.setTimeout(() => setSaved(false), 2500)
          }}
        />
      </div>
    </div>
  )
}
