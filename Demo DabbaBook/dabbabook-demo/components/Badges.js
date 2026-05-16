'use client'

export function PlanBadge({ plan }) {
  const cls = plan === 'Monthly' ? 'plan-badge plan-monthly'
            : plan === 'Weekly'  ? 'plan-badge plan-weekly'
            : 'plan-badge plan-trial'
  return <span className={cls}>{plan}</span>
}

export function TypeBadge({ type }) {
  if (type === 'Veg') return (
    <span className="food-veg">
      <span className="veg-dot veg" />Veg
    </span>
  )
  return (
    <span className="food-nonveg">
      <span className="veg-dot nv" />Non-Veg
    </span>
  )
}

export function StatusBadge({ status }) {
  const cls = status === 'Active'    ? 'status-badge status-active'
            : status === 'New'       ? 'status-badge status-new'
            : status === 'Completed' ? 'status-badge status-completed'
            : 'status-badge status-pending'
  return <span className={cls}>{status}</span>
}

export function PayBadge({ payment }) {
  return (
    <span className={`pay-badge ${payment === 'Paid' ? 'pay-paid' : 'pay-pending'}`}>
      {payment}
    </span>
  )
}

export function fmtAmount(a) {
  return '₹' + Number(a).toLocaleString('en-IN')
}
