import { useMemo, useState } from 'react'
import { api } from '../../api.js'
import { COUNTRIES, currencyFor } from '../../countries.js'

const emptyPrices = () => Object.fromEntries(COUNTRIES.map((c) => [c.country, '']))

const EMPTY_META = { title: '', description: '', duration_days: '30', events_limit: '20' }

export default function AddSubscription() {
  const [meta, setMeta] = useState(EMPTY_META)
  const [prices, setPrices] = useState(emptyPrices)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return COUNTRIES
    return COUNTRIES.filter((c) => c.country.toLowerCase().includes(q))
  }, [search])

  const setField = (name, value) => setMeta((prev) => ({ ...prev, [name]: value }))
  const setPrice = (country, value) => setPrices((prev) => ({ ...prev, [country]: value }))

  const priced = COUNTRIES.filter((c) => prices[c.country] !== '' && prices[c.country] != null)

  const save = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    const list = priced.map((c) => ({
      country: c.country,
      currency_code: currencyFor(c.country),
      price: prices[c.country],
    }))
    if (list.length === 0) {
      setError('Enter a price for at least one country.')
      return
    }
    setSaving(true)
    try {
      await api('/admin/country-plans/bulk', {
        method: 'POST',
        role: 'admin',
        body: { ...meta, prices: list },
      })
      setSuccess(`Saved subscription plan with prices for ${list.length} countr${list.length === 1 ? 'y' : 'ies'}.`)
      setMeta(EMPTY_META)
      setPrices(emptyPrices())
      setSearch('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Add Subscription</h1>
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      <form onSubmit={save}>
        <div className="card form-grid">
          <label className="field">
            Title
            <input
              type="text"
              maxLength="80"
              placeholder="e.g. Pro Plan"
              value={meta.title}
              onChange={(e) => setField('title', e.target.value)}
              required
            />
          </label>
          <label className="field">
            Description
            <textarea
              rows={3}
              placeholder="What is included in this subscription?"
              value={meta.description}
              onChange={(e) => setField('description', e.target.value)}
            />
          </label>
          <div className="form-row">
            <label className="field">
              Duration (days)
              <input
                type="number"
                min="1"
                value={meta.duration_days}
                onChange={(e) => setField('duration_days', e.target.value)}
                required
              />
              <small className="hint">How many days the subscription stays active.</small>
            </label>
            <label className="field">
              Event Count Limit
              <input
                type="number"
                min="1"
                value={meta.events_limit}
                onChange={(e) => setField('events_limit', e.target.value)}
                required
              />
              <small className="hint">Events a subscriber can create with this plan.</small>
            </label>
          </div>
        </div>

        <div className="page-head price-head">
          <div>
            <h2 className="section-title">Country Pricing</h2>
            <p className="muted small">
              {priced.length} of {COUNTRIES.length} countries priced. Leave a price blank to skip that country.
            </p>
          </div>
          <input
            type="search"
            className="search-input"
            placeholder="Search country..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="table-wrap country-price-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Country</th>
                <th>Currency Code</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.country}>
                  <td>{c.country}</td>
                  <td className="muted">{currencyFor(c.country)}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="price-input"
                      placeholder="0.00"
                      value={prices[c.country] ?? ''}
                      onChange={(e) => setPrice(c.country, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="form-actions sticky-actions">
          <button type="button" className="btn btn-ghost" onClick={() => { setMeta(EMPTY_META); setPrices(emptyPrices()); setSearch('') }}>
            Reset
          </button>
          <button className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
