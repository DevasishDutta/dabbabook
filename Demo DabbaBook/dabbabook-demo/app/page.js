'use client'

import { useState } from 'react'
import { ORDERS } from '../lib/orders'
import DashboardPage from '../components/DashboardPage'
import OrdersPage from '../components/OrdersPage'
import KitchenPage from '../components/KitchenPage'

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [user, setUser] = useState('')
  const [pwd, setPwd] = useState('')
  const [error, setError] = useState('')
  const [tab, setTab] = useState('dashboard')

  function doLogin() {
    if (user.trim() === 'demo' && pwd.trim() === 'demo123') {
      setLoggedIn(true)
      setError('')
    } else {
      setError('Invalid credentials. Try demo / demo123')
    }
  }

  if (!loggedIn) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-logo">
            <div className="login-logo-icon">🍱</div>
            <div className="logo-text">Dabba<span>Book</span></div>
          </div>
          <div className="login-sub">Operator Dashboard · Demo Instance</div>

          <div className="login-label">Username</div>
          <input
            className="login-input"
            type="text"
            placeholder="demo"
            value={user}
            onChange={e => setUser(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doLogin()}
          />

          <div className="login-label">Password</div>
          <input
            className="login-input"
            type="password"
            placeholder="••••••••"
            value={pwd}
            onChange={e => setPwd(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doLogin()}
          />

          <button className="login-btn" onClick={doLogin}>Sign In</button>
          <div className="login-error">{error}</div>
          <div className="demo-hint">Demo credentials: <strong>demo / demo123</strong></div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-logo">
          <div className="topbar-logo-icon">🍱</div>
          <div className="logo-text">Dabba<span>Book</span></div>
        </div>
        <div className="topbar-right">
          <span className="topbar-client">Premium Tiffin Services</span>
          <span className="topbar-badge">DEMO</span>
          <button className="logout-btn" onClick={() => { setLoggedIn(false); setUser(''); setPwd('') }}>
            Sign out
          </button>
        </div>
      </div>

      <div className="nav-tabs">
        {['dashboard', 'orders', 'kitchen'].map(t => (
          <a
            key={t}
            className={`nav-tab${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'dashboard' ? 'Dashboard' : t === 'orders' ? 'All Orders' : 'Kitchen List'}
          </a>
        ))}
      </div>

      <div className="main">
        {tab === 'dashboard' && <DashboardPage orders={ORDERS} />}
        {tab === 'orders'    && <OrdersPage orders={ORDERS} />}
        {tab === 'kitchen'   && <KitchenPage orders={ORDERS} />}
      </div>
    </>
  )
}
