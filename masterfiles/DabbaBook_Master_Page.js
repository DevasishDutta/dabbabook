'use client';

import { useState, useEffect } from 'react';

/* ════════════════════════════════════════════════════════════════
   ███  CLIENT CONFIG — EDIT ONLY THIS BLOCK FOR NEW CLIENTS  ███
   ════════════════════════════════════════════════════════════════
   Note: API_URL, API_TOKEN, USERNAME, PASSWORD live in Vercel env vars
   (NEXT_PUBLIC_API_URL etc.) — not here.
   ════════════════════════════════════════════════════════════════ */
const CLIENT_CONFIG = {
  // ─── Identity ───────────────────────────────────────────────
  BUSINESS_NAME: 'Protein Baba',
  TAGLINE: 'Order Dashboard',
  LOGO_EMOJI: '🥗',                       // shown in header + login
  CSV_FILENAME_PREFIX: 'ProteinBaba',     // used in kitchen list export

  // ─── Brand colours (dark theme — green/gold by default) ────
  COLORS: {
    primary: '#2d4a2b',
    primaryDark: '#1f3520',
    accent: '#c9a961',
    accentLight: '#e0c885',
    bg: '#1a1f1a',
    card: '#252b25',
    cardLight: '#2f362f',
    text: '#e8e4d8',
    textMuted: '#9a9789',
    border: '#3a423a',
    danger: '#a04545',
  },

  // ─── Session storage key (must be unique per client) ───────
  AUTH_KEY: 'pb_authed',                  // change to 'nb_authed', 'mp07_authed', etc.

  // ─── Feature toggles ────────────────────────────────────────
  // Must match server-side CLIENT_CONFIG.FEATURES
  FEATURES: {
    dabbaTracker: true,
  },
};
/* ════════════════════════════════════════════════════════════════
   ███  END CONFIG — DO NOT EDIT BELOW THIS LINE  ███
   ════════════════════════════════════════════════════════════════ */

const COLORS = CLIENT_CONFIG.COLORS;

export default function Dashboard() {
  const [authed, setAuthed] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginErr, setLoginErr] = useState('');

  const [tab, setTab] = useState('today');
  const [stats, setStats] = useState(null);
  const [kitchenList, setKitchenList] = useState([]);
  const [kitchenConfirmed, setKitchenConfirmed] = useState(false);
  const [skippedSet, setSkippedSet] = useState(new Set());
  const [orders, setOrders] = useState([]);
  const [dabbaData, setDabbaData] = useState(null);
  const [dailyPin, setDailyPin] = useState('');
  const [pinEdit, setPinEdit] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSession, setSelectedSession] = useState('Lunch');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = CLIENT_CONFIG.BUSINESS_NAME + ' | DabbaBook';
      if (sessionStorage.getItem(CLIENT_CONFIG.AUTH_KEY) === '1') setAuthed(true);
    }
  }, []);

  useEffect(() => {
    if (authed && tab === 'today') loadDashboard();
    if (authed && tab === 'orders') loadOrders();
    if (authed && tab === 'dabba') loadDabba();
  }, [authed, tab]);

  function handleLogin(e) {
    e.preventDefault();
    const u = process.env.NEXT_PUBLIC_USERNAME;
    const p = process.env.NEXT_PUBLIC_PASSWORD;
    if (loginUser === u && loginPass === p) {
      sessionStorage.setItem(CLIENT_CONFIG.AUTH_KEY, '1');
      setAuthed(true);
      setLoginErr('');
    } else {
      setLoginErr('Invalid credentials');
    }
  }

  function logout() {
    sessionStorage.removeItem(CLIENT_CONFIG.AUTH_KEY);
    setAuthed(false);
  }

  async function apiCall(action, extraParams = {}) {
    const token = process.env.NEXT_PUBLIC_API_TOKEN;
    const params = new URLSearchParams({ action, token, ...extraParams });
    const res = await fetch(`/api/proxy?${params.toString()}`);
    return res.json();
  }

  async function loadDashboard() {
    setLoading(true);
    setError('');
    try {
      const data = await apiCall('getDashboard');
      if (data.error) setError(data.error);
      else setStats(data);
    } catch (err) { setError(err.message); }
    setLoading(false);
  }

  async function loadOrders() {
    setLoading(true);
    setError('');
    try {
      const data = await apiCall('getOrders');
      if (data.error) setError(data.error);
      else setOrders(data.orders || []);
    } catch (err) { setError(err.message); }
    setLoading(false);
  }

  async function loadDabba() {
    setLoading(true);
    setError('');
    try {
      const [tracker, pin] = await Promise.all([
        apiCall('getDabbaTracker'),
        apiCall('getDailyPin'),
      ]);
      if (tracker.error) setError(tracker.error);
      else setDabbaData(tracker);
      if (pin.pin) setDailyPin(pin.pin);
    } catch (err) { setError(err.message); }
    setLoading(false);
  }

  async function handleMarkReturned(logId) {
    if (!confirm('Mark this dabba as returned?')) return;
    setLoading(true);
    try {
      const data = await apiCall('markDabbaReturned', { logId });
      if (data.error) setError(data.error);
      else { showToast(data.message || 'Marked returned'); loadDabba(); }
    } catch (err) { setError(err.message); }
    setLoading(false);
  }

  async function handleMarkAllReturned(orderNumber, count) {
    if (!confirm(`Mark all ${count} dabba${count === 1 ? '' : 's'} for ${orderNumber} as returned?`)) return;
    setLoading(true);
    try {
      const data = await apiCall('markDabbasReturnedByOrder', { orderNumber });
      if (data.error) setError(data.error);
      else { showToast(data.message || 'Marked'); loadDabba(); }
    } catch (err) { setError(err.message); }
    setLoading(false);
  }

  async function handleSetPin() {
    if (!/^\d{4}$/.test(pinEdit)) { setError('PIN must be 4 digits'); return; }
    setLoading(true);
    try {
      const data = await apiCall('setDailyPin', { pin: pinEdit });
      if (data.error) setError(data.error);
      else { setDailyPin(data.pin); setPinEdit(''); showToast('PIN updated'); }
    } catch (err) { setError(err.message); }
    setLoading(false);
  }

  async function previewKitchen() {
    setLoading(true);
    setError('');
    setKitchenConfirmed(false);
    setSkippedSet(new Set());
    try {
      const data = await apiCall('previewKitchenList', { date: selectedDate, session: selectedSession });
      if (data.error) setError(data.error);
      else {
        setKitchenList(data.list || []);
        if ((data.list || []).length === 0) showToast('No orders match this date and session.');
      }
    } catch (err) { setError(err.message); }
    setLoading(false);
  }

  async function confirmKitchen() {
    if (kitchenList.length === 0) return;
    setLoading(true);
    setError('');
    try {
      for (const orderNumber of skippedSet) {
        await apiCall('skipMeal', { orderNumber, session: selectedSession });
      }
      const data = await apiCall('getKitchenList', { date: selectedDate, session: selectedSession });
      if (data.error) setError(data.error);
      else {
        setKitchenList(data.list || []);
        setKitchenConfirmed(true);
        showToast(`List confirmed — ${(data.list || []).length} orders, ${skippedSet.size} skipped`);
      }
    } catch (err) { setError(err.message); }
    setLoading(false);
  }

  function toggleSkip(orderNumber) {
    if (kitchenConfirmed) return;
    const next = new Set(skippedSet);
    if (next.has(orderNumber)) next.delete(orderNumber);
    else next.add(orderNumber);
    setSkippedSet(next);
  }

  async function skipMeal(orderNumber, session) {
    if (!confirm(`Skip ${session} for ${orderNumber} today? This will remove them from today's kitchen list for that session. Counter stays preserved.`)) return;
    setLoading(true);
    try {
      const data = await apiCall('skipMeal', { orderNumber, session });
      if (data.error) setError(data.error);
      else {
        showToast(data.message || 'Skipped');
        loadOrders();
      }
    } catch (err) { setError(err.message); }
    setLoading(false);
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  function downloadCSV() {
    if (kitchenList.length === 0) return;
    const headers = ['Order #', 'Customer', 'Phone', 'Address', 'Session', 'Food Type', 'Meals Left (after today)', 'Special Instructions'];
    const rows = kitchenList.filter(r => !skippedSet.has(r.orderNumber)).map(r => [
      r.orderNumber, r.customerName, r.phone, r.address, r.session, r.foodType, r.mealsRemaining, r.specialInstructions || ''
    ]);
    const escape = (val) => {
      const s = String(val ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers, ...rows].map(row => row.map(escape).join(',')).join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${CLIENT_CONFIG.CSV_FILENAME_PREFIX}_${selectedSession}_${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function formatDate(d) {
    if (!d) return '—';
    const date = new Date(d);
    if (isNaN(date.getTime())) return d.toString();
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatCurrency(n) {
    if (n == null || n === '') return '—';
    return '₹' + Number(n).toLocaleString('en-IN');
  }

  if (!authed) {
    return (
      <div style={styles.loginWrap}>
        <div style={styles.loginCard}>
          <div style={styles.logoCircle}><span style={{ fontSize: 32 }}>{CLIENT_CONFIG.LOGO_EMOJI}</span></div>
          <h1 style={styles.brand}>{CLIENT_CONFIG.BUSINESS_NAME}</h1>
          <p style={styles.tagline}>{CLIENT_CONFIG.TAGLINE}</p>
          <form onSubmit={handleLogin}>
            <input type="text" placeholder="Username" value={loginUser} onChange={(e) => setLoginUser(e.target.value)} style={styles.input} />
            <input type="password" placeholder="Password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} style={styles.input} />
            {loginErr && <div style={styles.errText}>{loginErr}</div>}
            <button type="submit" style={styles.btnPrimary}>Sign In</button>
          </form>
          <div style={styles.footer}>Powered by DabbaBook</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={{ fontSize: 24 }}>{CLIENT_CONFIG.LOGO_EMOJI}</span>
          <div>
            <div style={styles.brandSm}>{CLIENT_CONFIG.BUSINESS_NAME}</div>
            <div style={styles.taglineSm}>{CLIENT_CONFIG.TAGLINE}</div>
          </div>
        </div>
        <button onClick={logout} style={styles.btnGhost}>Logout</button>
      </header>

      <nav style={styles.tabs}>
        <button onClick={() => setTab('today')} style={{ ...styles.tab, ...(tab === 'today' ? styles.tabActive : {}) }}>Today's Overview</button>
        <button onClick={() => setTab('kitchen')} style={{ ...styles.tab, ...(tab === 'kitchen' ? styles.tabActive : {}) }}>Generate Kitchen List</button>
        <button onClick={() => setTab('orders')} style={{ ...styles.tab, ...(tab === 'orders' ? styles.tabActive : {}) }}>Orders</button>
        {CLIENT_CONFIG.FEATURES?.dabbaTracker && (
          <button onClick={() => setTab('dabba')} style={{ ...styles.tab, ...(tab === 'dabba' ? styles.tabActive : {}) }}>Dabba Tracker</button>
        )}
      </nav>

      <main style={styles.main}>
        {error && <div style={styles.errBanner}>{error}</div>}
        {toast && <div style={styles.toast}>{toast}</div>}

        {tab === 'today' && (
          <>
            <h2 style={styles.h2}>Today's Overview</h2>
            {loading && <div style={styles.loading}>Loading...</div>}
            {stats && (
              <>
                <div style={styles.statGrid}>
                  <StatCard label="Total Orders" value={stats.totalOrders} icon="📋" />
                  <StatCard label="Active Orders" value={stats.activeOrders} icon="✅" />
                  <StatCard label="Total Revenue" value={formatCurrency(stats.totalRevenue)} icon="💰" />
                </div>
                <h3 style={styles.h3}>Today's Sessions</h3>
                <div style={styles.statGrid}>
                  <StatCard label="Breakfast" value={stats.todayBreakfast} icon="🍳" />
                  <StatCard label="Lunch" value={stats.todayLunch} icon="🍱" />
                  <StatCard label="Dinner" value={stats.todayDinner} icon="🌙" />
                </div>
              </>
            )}
            <button onClick={loadDashboard} style={styles.btnSecondary}>↻ Refresh</button>
          </>
        )}

        {tab === 'kitchen' && (
          <>
            <h2 style={styles.h2}>Generate Kitchen List</h2>
            <div style={styles.controls}>
              <div style={styles.field}>
                <label style={styles.label}>Date</label>
                <input type="date" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setKitchenList([]); setKitchenConfirmed(false); setSkippedSet(new Set()); }} style={styles.input} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Session</label>
                <select value={selectedSession} onChange={(e) => { setSelectedSession(e.target.value); setKitchenList([]); setKitchenConfirmed(false); setSkippedSet(new Set()); }} style={styles.input}>
                  <option>Breakfast</option>
                  <option>Lunch</option>
                  <option>Dinner</option>
                </select>
              </div>
              <div style={styles.field}>
                <label style={{ ...styles.label, opacity: 0 }}>.</label>
                <button onClick={previewKitchen} style={styles.btnPrimary} disabled={loading}>
                  {loading ? 'Loading...' : 'Preview Orders'}
                </button>
              </div>
            </div>

            {kitchenList.length > 0 && !kitchenConfirmed && (
              <div style={{ ...styles.errBanner, background: '#3d3520', color: COLORS.accent, border: `1px solid ${COLORS.accent}` }}>
                ⚠ Preview only — counters not deducted yet. Click Skip on any rows to exclude, then Confirm & Deduct.
              </div>
            )}

            {kitchenList.length > 0 && (
              <div style={styles.tableWrap}>
                <div style={styles.tableHeadRow}>
                  <div style={styles.tableHead}>
                    {kitchenConfirmed
                      ? `✅ Confirmed — ${kitchenList.length} orders for ${selectedSession} on ${selectedDate}`
                      : `${kitchenList.length} orders preview · ${skippedSet.size} marked to skip`}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {!kitchenConfirmed && (
                      <button onClick={confirmKitchen} style={styles.btnDownload} disabled={loading}>
                        ✓ Confirm & Deduct
                      </button>
                    )}
                    {kitchenConfirmed && (
                      <button onClick={downloadCSV} style={styles.btnDownload}>⬇ Download Excel</button>
                    )}
                  </div>
                </div>
                <div style={styles.tableScroll}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Order #</th>
                        <th style={styles.th}>Customer</th>
                        <th style={styles.th}>Phone</th>
                        <th style={styles.th}>Address</th>
                        <th style={styles.th}>Food Type</th>
                        <th style={styles.th}>Meals Left After Today</th>
                        <th style={styles.th}>Notes</th>
                        {!kitchenConfirmed && <th style={styles.th}>Skip?</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {kitchenList.map((row, i) => {
                        const isSkipped = skippedSet.has(row.orderNumber);
                        return (
                          <tr key={i} style={{ borderBottom: `1px solid ${COLORS.border}`, opacity: isSkipped ? 0.4 : 1, textDecoration: isSkipped ? 'line-through' : 'none' }}>
                            <td style={styles.td}><strong>{row.orderNumber}</strong></td>
                            <td style={styles.td}>{row.customerName}</td>
                            <td style={styles.td}>{row.phone}</td>
                            <td style={styles.td}>{row.address}</td>
                            <td style={styles.td}>
                              <span style={{ ...styles.badge, ...(row.foodType === 'Non-Veg' ? styles.badgeNV : row.foodType === 'Veg' ? styles.badgeVeg : styles.badgeNeutral) }}>
                                {row.foodType || '—'}
                              </span>
                            </td>
                            <td style={styles.td}>{skippedSet.has(row.orderNumber) ? row.currentRemaining : row.mealsRemaining}</td>
                            <td style={styles.td}>{row.specialInstructions || '—'}</td>
                            {!kitchenConfirmed && (
                              <td style={styles.td}>
                                <button onClick={() => toggleSkip(row.orderNumber)} style={isSkipped ? styles.btnUnskip : styles.btnSkip}>
                                  {isSkipped ? '↺ Undo' : 'Skip'}
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {kitchenList.length === 0 && !loading && (
              <div style={styles.empty}>Pick a date and session above, then click Preview Orders.</div>
            )}
          </>
        )}

        {tab === 'orders' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <h2 style={styles.h2}>All Orders</h2>
              <button onClick={loadOrders} style={styles.btnSecondary}>↻ Refresh</button>
            </div>
            {loading && <div style={styles.loading}>Loading...</div>}
            {!loading && orders.length === 0 && <div style={styles.empty}>No orders yet.</div>}
            {orders.length > 0 && (
              <div style={styles.tableWrap}>
                <div style={styles.tableHeadRow}>
                  <div style={styles.tableHead}>{orders.length} total orders</div>
                </div>
                <div style={styles.tableScroll}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Order #</th>
                        <th style={styles.th}>Customer</th>
                        <th style={styles.th}>Plan</th>
                        <th style={styles.th}>Combo</th>
                        <th style={styles.th}>Pref</th>
                        <th style={styles.th}>Start</th>
                        <th style={styles.th}>B</th>
                        <th style={styles.th}>L</th>
                        <th style={styles.th}>D</th>
                        <th style={styles.th}>Total</th>
                        <th style={styles.th}>Pay</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Skip Today</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                          <td style={styles.td}><strong>{o.orderNumber}</strong></td>
                          <td style={styles.td}>{o.customerName}<br /><span style={styles.muted}>{o.phone}</span></td>
                          <td style={styles.td}>{o.planDuration}</td>
                          <td style={styles.td}>{o.mealCombo}</td>
                          <td style={styles.td}>{o.foodPreference}</td>
                          <td style={styles.td}>{formatDate(o.startDate)}</td>
                          <td style={styles.td}>{o.breakfastTotal > 0 ? `${o.breakfastRemaining}/${o.breakfastTotal}` : '—'}</td>
                          <td style={styles.td}>{o.lunchTotal > 0 ? `${o.lunchRemaining}/${o.lunchTotal}` : '—'}</td>
                          <td style={styles.td}>{o.dinnerTotal > 0 ? `${o.dinnerRemaining}/${o.dinnerTotal}` : '—'}</td>
                          <td style={styles.td}>{formatCurrency(o.totalAmount)}</td>
                          <td style={styles.td}>
                            <div style={{ fontSize: 11 }}>{o.paymentMethod}</div>
                            <span style={{ ...styles.badge, ...(o.paymentStatus === 'Paid' ? styles.badgeVeg : styles.badgeNeutral) }}>{o.paymentStatus}</span>
                          </td>
                          <td style={styles.td}>
                            <span style={{ ...styles.badge, ...(o.status === 'Active' ? styles.badgeVeg : styles.badgeNeutral) }}>{o.status}</span>
                          </td>
                          <td style={styles.td}>
                            {o.status === 'Active' && (
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {o.breakfastRemaining > 0 && <button onClick={() => skipMeal(o.orderNumber, 'Breakfast')} style={styles.btnSkip}>B</button>}
                                {o.lunchRemaining > 0 && <button onClick={() => skipMeal(o.orderNumber, 'Lunch')} style={styles.btnSkip}>L</button>}
                                {o.dinnerRemaining > 0 && <button onClick={() => skipMeal(o.orderNumber, 'Dinner')} style={styles.btnSkip}>D</button>}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'dabba' && CLIENT_CONFIG.FEATURES?.dabbaTracker && (
          <>
            <h2 style={styles.h2}>Dabba Tracker</h2>

            <div style={styles.statGrid}>
              <StatCard label="Pending Returns" value={dabbaData?.summary?.pending ?? '—'} icon="📦" />
              <StatCard label="Overdue (3+ days)" value={dabbaData?.summary?.overdue ?? '—'} icon="⚠️" />
              <StatCard label="Total Returned" value={dabbaData?.summary?.returned ?? '—'} icon="✅" />
            </div>

            <div style={{ ...styles.tableWrap, marginTop: 24, marginBottom: 24 }}>
              <div style={styles.tableHeadRow}>
                <div style={styles.tableHead}>📱 Today's Pickup PIN</div>
              </div>
              <div style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: COLORS.accent, letterSpacing: 4, fontFamily: 'monospace' }}>
                  {dailyPin || '----'}
                </div>
                <div style={{ flex: 1, minWidth: 200, color: COLORS.textMuted, fontSize: 12 }}>
                  Share with delivery boy. They'll enter this on the /pickup page to mark dabbas returned.
                </div>
                <input type="text" maxLength={4} placeholder="New 4-digit PIN" value={pinEdit} onChange={(e) => setPinEdit(e.target.value.replace(/\D/g, ''))} style={{ ...styles.input, marginBottom: 0, width: 140 }} />
                <button onClick={handleSetPin} style={styles.btnDownload}>Update PIN</button>
              </div>
            </div>

            <button onClick={loadDabba} style={styles.btnSecondary}>↻ Refresh</button>

            {loading && <div style={styles.loading}>Loading...</div>}

            {dabbaData?.logs?.length === 0 && !loading && (
              <div style={styles.empty}>No dabbas issued yet. They'll start logging when you Confirm a Kitchen List for Lunch or Dinner.</div>
            )}

            {dabbaData?.logs?.length > 0 && (
              <div style={{ ...styles.tableWrap, marginTop: 16 }}>
                <div style={styles.tableHeadRow}>
                  <div style={styles.tableHead}>{dabbaData.logs.length} dabba records</div>
                </div>
                <div style={styles.tableScroll}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Order #</th>
                        <th style={styles.th}>Customer</th>
                        <th style={styles.th}>Phone</th>
                        <th style={styles.th}>Address</th>
                        <th style={styles.th}>Session</th>
                        <th style={styles.th}>Issued</th>
                        <th style={styles.th}>Days</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dabbaData.logs.map((row, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${COLORS.border}`, background: row.isOverdue ? '#3d2520' : 'transparent' }}>
                          <td style={styles.td}><strong>{row.orderNumber}</strong></td>
                          <td style={styles.td}>{row.customerName}</td>
                          <td style={styles.td}>{row.phone}</td>
                          <td style={styles.td}>{row.address}</td>
                          <td style={styles.td}>{row.session}</td>
                          <td style={styles.td}>{formatDate(row.issuedDate)}</td>
                          <td style={styles.td}>
                            {row.status === 'Pending' ? (
                              <span style={{ color: row.isOverdue ? '#ff7b7b' : COLORS.text, fontWeight: row.isOverdue ? 700 : 400 }}>
                                {row.daysPending}d
                              </span>
                            ) : '—'}
                          </td>
                          <td style={styles.td}>
                            <span style={{ ...styles.badge, ...(row.status === 'Returned' ? styles.badgeVeg : (row.isOverdue ? styles.badgeNV : styles.badgeNeutral)) }}>
                              {row.isOverdue ? 'OVERDUE' : row.status}
                            </span>
                          </td>
                          <td style={styles.td}>
                            {row.status === 'Pending' && (
                              <button onClick={() => handleMarkReturned(row.logId)} style={styles.btnDownload}>✓ Returned</button>
                            )}
                            {row.status === 'Returned' && row.returnedDate && (
                              <span style={styles.muted}>{formatDate(row.returnedDate)}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <footer style={styles.footerBar}>Powered by DabbaBook · Ready-To-Eat ADs</footer>
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statIcon}>{icon}</div>
      <div style={styles.statValue}>{value ?? '—'}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

const styles = {
  loginWrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${COLORS.bg} 0%, ${COLORS.primary} 100%)`, padding: 20 },
  loginCard: { background: COLORS.card, padding: 40, borderRadius: 16, width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: `1px solid ${COLORS.border}`, textAlign: 'center' },
  logoCircle: { width: 72, height: 72, borderRadius: '50%', background: COLORS.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: `2px solid ${COLORS.accent}` },
  brand: { color: COLORS.accent, fontSize: 28, margin: '8px 0 4px', letterSpacing: 0.5 },
  tagline: { color: COLORS.textMuted, fontSize: 13, marginBottom: 28, textTransform: 'uppercase', letterSpacing: 1 },
  brandSm: { color: COLORS.accent, fontSize: 18, fontWeight: 600 },
  taglineSm: { color: COLORS.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  input: { width: '100%', padding: '12px 14px', marginBottom: 12, background: COLORS.cardLight, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontSize: 14, boxSizing: 'border-box' },
  btnPrimary: { width: '100%', padding: '12px', background: COLORS.primary, color: COLORS.accent, border: `1px solid ${COLORS.accent}`, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', letterSpacing: 0.5 },
  btnSecondary: { padding: '10px 20px', background: COLORS.cardLight, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 13, cursor: 'pointer', marginTop: 16 },
  btnGhost: { padding: '8px 16px', background: 'transparent', color: COLORS.textMuted, border: `1px solid ${COLORS.border}`, borderRadius: 6, fontSize: 13, cursor: 'pointer' },
  btnSkip: { padding: '4px 8px', background: 'transparent', color: COLORS.danger, border: `1px solid ${COLORS.danger}`, borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  btnUnskip: { padding: '4px 8px', background: COLORS.danger, color: '#fff', border: `1px solid ${COLORS.danger}`, borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  errText: { color: '#ff7b7b', fontSize: 13, marginBottom: 12, textAlign: 'left' },
  errBanner: { background: '#3d1f1f', color: '#ff7b7b', padding: 12, borderRadius: 8, marginBottom: 16, border: '1px solid #5a2929' },
  toast: { position: 'fixed', top: 16, left: 16, right: 16, textAlign: 'center', background: COLORS.primary, color: COLORS.accent, padding: '12px 20px', borderRadius: 8, border: `1px solid ${COLORS.accent}`, fontSize: 13, fontWeight: 600, zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' },
  footer: { marginTop: 24, fontSize: 11, color: COLORS.textMuted, letterSpacing: 0.5 },
  app: { minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  header: { padding: '12px 16px', background: COLORS.primaryDark, borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  tabs: { display: 'flex', background: COLORS.card, borderBottom: `1px solid ${COLORS.border}`, padding: '0 16px', overflowX: 'auto' },
  tab: { padding: '12px 14px', background: 'transparent', border: 'none', color: COLORS.textMuted, fontSize: 13, cursor: 'pointer', borderBottom: '2px solid transparent', whiteSpace: 'nowrap' },
  tabActive: { color: COLORS.accent, borderBottom: `2px solid ${COLORS.accent}` },
  main: { flex: 1, padding: '16px', maxWidth: 1400, width: '100%', margin: '0 auto', boxSizing: 'border-box' },
  h2: { color: COLORS.accent, fontSize: 20, marginBottom: 20, fontWeight: 600 },
  h3: { color: COLORS.accent, fontSize: 15, marginTop: 24, marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 8 },
  statCard: { background: COLORS.card, padding: 20, borderRadius: 12, border: `1px solid ${COLORS.border}`, textAlign: 'center' },
  statIcon: { fontSize: 28, marginBottom: 8 },
  statValue: { fontSize: 28, fontWeight: 700, color: COLORS.accent, marginBottom: 4 },
  statLabel: { fontSize: 12, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  controls: { display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'flex-end' },
  field: { flex: '1 1 180px', display: 'flex', flexDirection: 'column' },
  label: { color: COLORS.textMuted, fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
  tableWrap: { background: COLORS.card, borderRadius: 12, border: `1px solid ${COLORS.border}`, overflow: 'hidden' },
  tableHeadRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: COLORS.cardLight, borderBottom: `1px solid ${COLORS.border}`, gap: 12, flexWrap: 'wrap' },
  tableHead: { color: COLORS.accent, fontSize: 13, fontWeight: 600 },
  btnDownload: { padding: '8px 16px', background: COLORS.primary, color: COLORS.accent, border: `1px solid ${COLORS.accent}`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', letterSpacing: 0.5 },
  tableScroll: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '12px', textAlign: 'left', background: COLORS.cardLight, color: COLORS.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `1px solid ${COLORS.border}`, whiteSpace: 'nowrap' },
  td: { padding: '10px 8px', color: COLORS.text, verticalAlign: 'top', fontSize: 13 },
  muted: { color: COLORS.textMuted, fontSize: 11 },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, letterSpacing: 0.5 },
  badgeVeg: { background: '#1f3520', color: '#7fb87f', border: '1px solid #2d4a2b' },
  badgeNV: { background: '#3d1f1f', color: '#d99e9e', border: '1px solid #5a2929' },
  badgeNeutral: { background: COLORS.cardLight, color: COLORS.textMuted, border: `1px solid ${COLORS.border}` },
  empty: { textAlign: 'center', padding: 40, color: COLORS.textMuted, background: COLORS.card, borderRadius: 12, border: `1px dashed ${COLORS.border}` },
  loading: { padding: 20, color: COLORS.textMuted, textAlign: 'center' },
  footerBar: { padding: 16, textAlign: 'center', color: COLORS.textMuted, fontSize: 11, borderTop: `1px solid ${COLORS.border}`, letterSpacing: 0.5 },
};
