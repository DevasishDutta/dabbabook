'use client'

import { useState } from 'react'
import { TypeBadge } from './Badges'

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export default function KitchenPage({ orders }) {
  const [date, setDate]       = useState(todayStr())
  const [session, setSession] = useState('All')
  const [food, setFood]       = useState('All')
  const [generated, setGenerated] = useState(false)
  const [kitchenRows, setKitchenRows] = useState([])

  function generate() {
    let rows = orders.filter(o => o.status === 'Active' || o.status === 'New')

    if (session !== 'All') {
      rows = rows.filter(o =>
        o.session === session ||
        o.session === 'Lunch + Dinner' ||
        (session === 'Lunch'  && o.session.includes('Lunch')) ||
        (session === 'Dinner' && o.session.includes('Dinner'))
      )
    }

    if (food !== 'All') {
      rows = rows.filter(o => o.type === food)
    }

    rows.sort((a, b) => {
      if (a.type === b.type) return 0
      return a.type === 'Veg' ? -1 : 1
    })

    setKitchenRows(rows)
    setGenerated(true)
  }

  const vegCount = kitchenRows.filter(o => o.type === 'Veg').length
  const nvCount  = kitchenRows.filter(o => o.type === 'Non-Veg').length

  const dateLabel = date
    ? new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
    : 'Today'
  const sessionLabel = session === 'All' ? 'All Sessions' : session

  let rowIndex = 0
  let lastType = ''

  return (
    <>
      <div className="kitchen-controls">
        <div className="kitchen-form">
          <div className="kitchen-form-group">
            <label>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="kitchen-form-group">
            <label>Session</label>
            <select value={session} onChange={e => setSession(e.target.value)}>
              <option value="All">All Sessions</option>
              <option value="Lunch">Lunch</option>
              <option value="Dinner">Dinner</option>
            </select>
          </div>
          <div className="kitchen-form-group">
            <label>Food Type</label>
            <select value={food} onChange={e => setFood(e.target.value)}>
              <option value="All">Veg + Non-Veg</option>
              <option value="Veg">Veg Only</option>
              <option value="Non-Veg">Non-Veg Only</option>
            </select>
          </div>
          <button className="generate-btn" onClick={generate}>
            Generate Kitchen List
          </button>
        </div>
      </div>

      {!generated && (
        <div className="kitchen-empty-state">
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📋</div>
          <div style={{ fontSize: '15px', fontWeight: 500, marginBottom: '6px', color: 'var(--text)' }}>
            Generate Kitchen List
          </div>
          <div style={{ fontSize: '13px' }}>Select date and session, then click Generate</div>
        </div>
      )}

      {generated && (
        <>
          <div className="kitchen-header">
            <div className="section-title">
              Kitchen List — {dateLabel} · {sessionLabel}
            </div>
            <div className="kitchen-summary">
              <div className="kitchen-stat veg">
                <div className="kitchen-stat-val">{vegCount}</div>
                <div className="kitchen-stat-label">🟢 Veg</div>
              </div>
              <div className="kitchen-stat nv">
                <div className="kitchen-stat-val">{nvCount}</div>
                <div className="kitchen-stat-label">🔴 Non-Veg</div>
              </div>
              <div className="kitchen-stat total">
                <div className="kitchen-stat-val">{kitchenRows.length}</div>
                <div className="kitchen-stat-label">Total</div>
              </div>
            </div>
          </div>

          <div className="kitchen-list-wrap">
            {kitchenRows.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>
                No active orders for the selected filters.
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Address</th>
                    <th>Session</th>
                    <th>Type</th>
                    <th>Meal Plan</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {kitchenRows.map(o => {
                    rowIndex++
                    const showHeader = o.type !== lastType
                    lastType = o.type
                    return (
                      <>
                        {showHeader && (
                          <tr key={`header-${o.type}`}>
                            <td
                              colSpan={9}
                              className="kitchen-section-header"
                            >
                              {o.type === 'Veg' ? '🟢 Vegetarian' : '🔴 Non-Vegetarian'}
                            </td>
                          </tr>
                        )}
                        <tr
                          key={o.id}
                          className={o.type === 'Veg' ? 'kitchen-row-veg' : 'kitchen-row-nv'}
                        >
                          <td style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '13px' }}>{rowIndex}</td>
                          <td><span className="order-num">{o.id}</span></td>
                          <td style={{ fontWeight: 500 }}>{o.name}</td>
                          <td style={{ fontSize: '12px', color: 'var(--muted)' }}>{o.phone}</td>
                          <td style={{ fontSize: '12px', color: 'var(--muted)', maxWidth: '130px' }}>{o.address}</td>
                          <td style={{ fontSize: '12px', color: 'var(--muted)' }}>{o.session}</td>
                          <td><TypeBadge type={o.type} /></td>
                          <td style={{ fontSize: '12px' }}>{o.combo}</td>
                          <td style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: o.notes ? 'normal' : 'italic' }}>
                            {o.notes || '—'}
                          </td>
                        </tr>
                      </>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </>
  )
}
