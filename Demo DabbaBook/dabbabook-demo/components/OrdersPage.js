'use client'

import { useState } from 'react'
import { PlanBadge, TypeBadge, StatusBadge, PayBadge, fmtAmount } from './Badges'

const FILTERS = ['All', 'Active', 'New', 'Pending', 'Completed']

export default function OrdersPage({ orders }) {
  const [filter, setFilter] = useState('All')

  const filtered = orders.filter(o => {
    if (filter === 'All')       return true
    if (filter === 'Active')    return o.status === 'Active'
    if (filter === 'New')       return o.status === 'New'
    if (filter === 'Pending')   return o.payment === 'Pending'
    if (filter === 'Completed') return o.status === 'Completed'
    return true
  })

  const displayed = [...filtered].reverse()

  return (
    <>
      <div className="section-header">
        <div>
          <span className="section-title">All Orders</span>
          <span className="section-count">({displayed.length} orders)</span>
        </div>
      </div>

      <div className="table-wrap">
        <div className="orders-filter">
          {FILTERS.map(f => (
            <button
              key={f}
              className={`filter-btn${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'Pending' ? 'Pending Payment' : f}
            </button>
          ))}
        </div>
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Address</th>
              <th>Plan</th>
              <th>Type</th>
              <th>Session</th>
              <th>Start Date</th>
              <th>Amount</th>
              <th>Payment</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map(o => (
              <tr key={o.id}>
                <td><span className="order-num">{o.id}</span></td>
                <td>
                  <div className="customer-name">{o.name}</div>
                  <div className="customer-phone">{o.phone}</div>
                </td>
                <td style={{ fontSize: '12px', color: 'var(--muted)', maxWidth: '140px' }}>{o.address}</td>
                <td><PlanBadge plan={o.plan} /></td>
                <td><TypeBadge type={o.type} /></td>
                <td style={{ fontSize: '12px', color: 'var(--muted)' }}>{o.session}</td>
                <td style={{ fontSize: '12px', color: 'var(--muted)' }}>{o.start}</td>
                <td className="amount">{fmtAmount(o.amount)}</td>
                <td><PayBadge payment={o.payment} /></td>
                <td><StatusBadge status={o.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
