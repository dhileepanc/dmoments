import { useCallback, useEffect, useState } from 'react'
import Modal from '../../components/Modal.jsx'
import HelpForm from '../../components/HelpForm.jsx'
import { api } from '../../api.js'

export default function HelpManage() {
  const [pages, setPages] = useState([])
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(
    () =>
      api('/admin/help', { role: 'admin' })
        .then(setPages)
        .catch(() => {})
        .finally(() => setLoading(false)),
    []
  )

  useEffect(() => {
    load()
  }, [load])

  const remove = async (page) => {
    if (!window.confirm(`Delete "${page.title}"?`)) return
    await api(`/admin/help/${page.id}`, { method: 'DELETE', role: 'admin' })
    load()
  }

  return (
    <div>
      <h1 className="page-title">Manage Help Pages</h1>

      {loading ? (
        <p className="muted">Loading...</p>
      ) : pages.length === 0 ? (
        <p className="muted">No help pages yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Preview</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.id}>
                  <td>{page.title}</td>
                  <td
                    className="html-preview"
                    dangerouslySetInnerHTML={{ __html: page.content?.slice(0, 120) || '' }}
                  />
                  <td className="actions-col">
                    <button type="button" className="btn btn-sm" onClick={() => setEditing(page)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => remove(page)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal title="Edit Help Page" onClose={() => setEditing(null)}>
          <HelpForm
            initial={editing}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null)
              load()
            }}
          />
        </Modal>
      )}
    </div>
  )
}
