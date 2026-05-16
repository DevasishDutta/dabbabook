'use client';

import { useState, useEffect } from 'react';

/* ════════════════════════════════════════════════════════════════
   ███  CLIENT CONFIG — MUST MATCH page.js  ███
   ════════════════════════════════════════════════════════════════ */
const CLIENT_CONFIG = {
  BUSINESS_NAME: 'Protein Baba',
  LOGO_EMOJI: '🥗',
  COLORS: {
    primary: '#2d4a2b',
    primaryDark: '#1f3520',
    accent: '#c9a961',
    bg: '#1a1f1a',
    card: '#252b25',
    cardLight: '#2f362f',
    text: '#e8e4d8',
    textMuted: '#9a9789',
    border: '#3a423a',
    danger: '#a04545',
    success: '#7fb87f',
  },
};
/* ════════════════════════════════════════════════════════════════ */

const C = CLIENT_CONFIG.COLORS;

export default function PickupPage() {
  const [pin, setPin] = useState('');
  const [verified, setVerified] = useState(false);
  const [pickupList, setPickupList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  async function apiCall(action, params = {}) {
    const qs = new URLSearchParams({ action, ...params });
    const res = await fetch(`/api/proxy?${qs.toString()}`);
    return res.json();
  }

  async function handleVerify(e) {
    if (e) e.preventDefault();
    if (!/^\d{4}$/.test(pin)) { setError('PIN must be 4 digits'); return; }
    setLoading(true);
    setError('');
    try {
      const data = await apiCall('verifyPin', { pin });
      if (data.valid) {
        setVerified(true);
        loadList();
      } else {
        setError('Invalid PIN. Ask the kitchen for today\'s PIN.');
      }
    } catch (err) { setError(err.message); }
    setLoading(false);
  }

  async function loadList() {
    setLoading(true);
    setError('');
    try {
      const today = new Date().toISOString().split('T')[0];
      const data = await apiCall('getDabbaPickupListByPin', { pin, date: today });
      if (data.error) setError(data.error);
      else setPickupList(data.list || []);
    } catch (err) { setError(err.message); }
    setLoading(false);
  }

  async function markReturned(orderNumber, count) {
    if (!confirm(`Mark all ${count} dabba${count === 1 ? '' : 's'} from ${orderNumber} as collected?`)) return;
    setLoading(true);
    try {
      const data = await apiCall('markDabbasReturnedByOrderByPin', { pin, orderNumber });
      if (data.error) setError(data.error);
      else {
        showToast(data.message || 'Marked');
        loadList();
      }
    } catch (err) { setError(err.message); }
    setLoading(false);
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  if (!verified) {
    return (
      <div style={s.wrap}>
        <div style={s.card}>
          <div style={s.logo}>{CLIENT_CONFIG.LOGO_EMOJI}</div>
          <h1 style={s.h1}>{CLIENT_CONFIG.BUSINESS_NAME}</h1>
          <p style={s.tagline}>Dabba Pickup</p>
          <form onSubmit={handleVerify}>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={4}
              placeholder="Enter 4-digit PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              style={s.pinInput}
              autoFocus
            />
            {error && <div style={s.err}>{error}</div>}
            <button type="submit" style={s.btnPrimary} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify PIN'}
            </button>
          </form>
          <div style={s.footer}>Ask kitchen for today's PIN</div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.app}>
      <header style={s.header}>
        <div>
          <div style={s.brandSm}>{CLIENT_CONFIG.LOGO_EMOJI} {CLIENT_CONFIG.BUSINESS_NAME}</div>
          <div style={s.taglineSm}>Dabba Pickup · {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>
        </div>
        <button onClick={() => { setVerified(false); setPin(''); setPickupList([]); }} style={s.btnGhost}>Exit</button>
      </header>

      <main style={s.main}>
        {toast && <div style={s.toast}>{toast}</div>}
        {error && <div style={s.errBanner}>{error}</div>}

        <div style={s.summary}>
          <div style={s.summaryNum}>{pickupList.length}</div>
          <div style={s.summaryLabel}>customers with pending dabbas</div>
        </div>

        <button onClick={loadList} style={s.btnSecondary} disabled={loading}>
          {loading ? 'Loading...' : '↻ Refresh List'}
        </button>

        {pickupList.length === 0 && !loading && (
          <div style={s.empty}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div>All clear! No pending pickups.</div>
          </div>
        )}

        {pickupList.map((cust, i) => (
          <div key={i} style={{ ...s.custCard, borderColor: cust.oldestDays >= 3 ? C.danger : C.border }}>
            <div style={s.custHeader}>
              <div>
                <div style={s.custName}>{cust.customerName}</div>
                <div style={s.custMeta}>{cust.orderNumber} · {cust.phone}</div>
              </div>
              <div style={{ ...s.dabbaCount, background: cust.oldestDays >= 3 ? C.danger : C.primary }}>
                {cust.dabbaCount}
              </div>
            </div>
            <div style={s.custAddr}>📍 {cust.address}</div>
            <div style={s.dabbaList}>
              {cust.items.map((item, j) => (
                <div key={j} style={s.dabbaItem}>
                  <span style={{ color: item.daysPending >= 3 ? '#ff7b7b' : C.textMuted }}>
                    {item.session} · {item.issuedDate} · {item.daysPending}d ago
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => markReturned(cust.orderNumber, cust.dabbaCount)}
              style={s.btnCollect}
              disabled={loading}
            >
              ✓ Collected {cust.dabbaCount} dabba{cust.dabbaCount === 1 ? '' : 's'}
            </button>
          </div>
        ))}
      </main>

      <footer style={s.footerBar}>Powered by DabbaBook</footer>
    </div>
  );
}

const s = {
  wrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${C.bg} 0%, ${C.primary} 100%)`, padding: 16 },
  card: { background: C.card, padding: 32, borderRadius: 16, width: '100%', maxWidth: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: `1px solid ${C.border}`, textAlign: 'center' },
  logo: { fontSize: 56, marginBottom: 8 },
  h1: { color: C.accent, fontSize: 24, margin: '8px 0 4px', letterSpacing: 0.5 },
  tagline: { color: C.textMuted, fontSize: 13, marginBottom: 28, textTransform: 'uppercase', letterSpacing: 1 },
  pinInput: { width: '100%', padding: '20px 14px', marginBottom: 12, background: C.cardLight, border: `2px solid ${C.border}`, borderRadius: 12, color: C.accent, fontSize: 32, textAlign: 'center', letterSpacing: 12, fontFamily: 'monospace', boxSizing: 'border-box' },
  btnPrimary: { width: '100%', padding: 16, background: C.primary, color: C.accent, border: `1px solid ${C.accent}`, borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: 'pointer', letterSpacing: 0.5 },
  btnSecondary: { width: '100%', padding: 12, background: C.cardLight, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, cursor: 'pointer', marginBottom: 16 },
  btnGhost: { padding: '8px 12px', background: 'transparent', color: C.textMuted, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, cursor: 'pointer' },
  btnCollect: { width: '100%', padding: 14, background: C.success, color: '#0a1f0a', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 12, letterSpacing: 0.3 },
  err: { color: '#ff7b7b', fontSize: 13, marginBottom: 12 },
  errBanner: { background: '#3d1f1f', color: '#ff7b7b', padding: 12, borderRadius: 8, marginBottom: 16, border: '1px solid #5a2929' },
  toast: { position: 'fixed', top: 16, left: 16, right: 16, background: C.success, color: '#0a1f0a', padding: 14, borderRadius: 8, fontSize: 14, fontWeight: 600, zIndex: 100, textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' },
  footer: { marginTop: 24, fontSize: 11, color: C.textMuted, letterSpacing: 0.5 },
  app: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: C.bg },
  header: { padding: 16, background: C.primaryDark, borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 },
  brandSm: { color: C.accent, fontSize: 16, fontWeight: 600 },
  taglineSm: { color: C.textMuted, fontSize: 11 },
  main: { flex: 1, padding: 16, maxWidth: 600, width: '100%', margin: '0 auto', boxSizing: 'border-box' },
  summary: { background: C.card, padding: 20, borderRadius: 12, border: `1px solid ${C.border}`, textAlign: 'center', marginBottom: 16 },
  summaryNum: { fontSize: 48, fontWeight: 700, color: C.accent, lineHeight: 1 },
  summaryLabel: { fontSize: 12, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
  empty: { textAlign: 'center', padding: 40, color: C.textMuted, background: C.card, borderRadius: 12, border: `1px dashed ${C.border}` },
  custCard: { background: C.card, padding: 16, borderRadius: 12, border: `2px solid ${C.border}`, marginBottom: 12 },
  custHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  custName: { color: C.text, fontSize: 16, fontWeight: 600 },
  custMeta: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  custAddr: { color: C.textMuted, fontSize: 13, marginBottom: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` },
  dabbaCount: { width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.accent, fontSize: 20, fontWeight: 700, border: `2px solid ${C.accent}`, flexShrink: 0 },
  dabbaList: { background: C.cardLight, borderRadius: 6, padding: 8, marginTop: 8 },
  dabbaItem: { fontSize: 12, padding: '2px 0' },
  footerBar: { padding: 16, textAlign: 'center', color: C.textMuted, fontSize: 11, borderTop: `1px solid ${C.border}`, letterSpacing: 0.5 },
};
