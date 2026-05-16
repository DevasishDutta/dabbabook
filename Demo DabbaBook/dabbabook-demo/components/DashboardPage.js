'use client'

import { PlanBadge, TypeBadge, StatusBadge, PayBadge, fmtAmount } from './Badges'

export default function DashboardPage({ orders }) {
  const total      = orders.length
  const active     = orders.filter(o => o.status === 'Active').length
  const pendingPay = orders.filter(o => o.payment === 'Pending').length
  const todayMeals = orders.filter(o => o.status === 'Active' || o.status === 'New').length
  const recent     = [...orders].slice(-8).reverse()

  return (
    <>
      <div className="stat-grid">
        <div className="stat-card red-accent">
          <div className="stat-label">Total Orders</div>
          <div className="stat-value">{total}</div>
          <div className="stat-sub">All time</div>
        </div>
        <div className="stat-card green-accent">
          <div className="stat-label">Active Orders</div>
          <div className="stat-value">{active}</div>
          <div className="stat-sub">Currently running</div>
        </div>
        <div className="stat-card amber-accent">
          <div className="stat-label">Pending Payments</div>
          <div className="stat-value">{pendingPay}</div>
          <div className="stat-sub">Awaiting collection</div>
        </div>
        <div className="stat-card blue-accent">
          <div className="stat-label">Today's Meals</div>
          <div className="stat-value">{todayMeals}</div>
          <div className="stat-sub">To be delivered</div>
        </div>
      </div>

      <div className="section-header">
        <div>
          <span className="section-title">Recent Orders</span>
          <span className="section-count">({recent.length} recent)</span>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Plan</th>
              <th>Type</th>
              <th>Session</th>
              <th>Amount</th>
              <th>Payment</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recent.map(o => (
              <tr key={o.id}>
                <td><span className="order-num">{o.id}</span></td>
                <td>
                  <div className="customer-name">{o.name}</div>
                  <div className="customer-phone">{o.phone}</div>
                </td>
                <td><PlanBadge plan={o.plan} /></td>
                <td><TypeBadge type={o.type} /></td>
                <td style={{ fontSize: '12px', color: 'var(--muted)' }}>{o.session}</td>
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
