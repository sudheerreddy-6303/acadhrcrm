import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import Loader from './Loader';

// Dashboard card (admin): automatic sync of new acadhr.com registrations
// (teachers, tutors, schools, tuitions) into the CRM. Shows on/off, when it last
// checked, when it checks next, what arrived today, and a "Sync now" button.

function toast(message, type = 'success') {
  try { window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } })); } catch (_) { /* ignore */ }
}

// "2 teachers, 1 school" — only the non-zero parts.
export function summarize(r) {
  if (!r) return '';
  const parts = [];
  const add = (n, one, many) => { if (Number(n) > 0) parts.push(`${n} ${Number(n) === 1 ? one : many}`); };
  add(r.teachers, 'teacher', 'teachers');
  add(r.tutors, 'tutor', 'tutors');
  add(r.schools, 'school', 'schools');
  add(r.tuitions, 'tuition', 'tuitions');
  return parts.join(', ');
}

const ago = (ts, now) => {
  if (!ts) return '—';
  const s = Math.max(0, Math.round((now - new Date(ts).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  return new Date(ts).toLocaleString();
};
const until = (ts, now) => {
  if (!ts) return '—';
  const s = Math.round((new Date(ts).getTime() - now) / 1000);
  if (s <= 30) return 'any moment';
  const m = Math.ceil(s / 60);
  return `in ${m} min`;
};
const fmtTime = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const wrap = {
  background: 'var(--surface, #fff)', border: '1px solid var(--border, #e6e8ef)',
  borderRadius: 'var(--radius, 12px)', boxShadow: 'var(--shadow-sm)', padding: 18, marginBottom: 24,
};
const tile = { background: '#f4f6fb', borderRadius: 10, padding: '10px 12px', minWidth: 0 };
const tileNum = { fontSize: 22, fontWeight: 800, lineHeight: 1.1 };
const tileLabel = { fontSize: 12.5, color: 'var(--muted, #7a8194)', marginTop: 2 };

export default function AutoSyncCard() {
  const [st, setSt] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [showLog, setShowLog] = useState(false);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    try {
      const s = await api.get('/acadhr-sync/auto/status');
      // Align "x min ago" with the server clock.
      s._offset = s.serverTime ? Date.now() - new Date(s.serverTime).getTime() : 0;
      setSt(s);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
    const poll = setInterval(load, 30 * 1000);
    const clock = setInterval(() => setNow(Date.now()), 15 * 1000);
    return () => { clearInterval(poll); clearInterval(clock); };
  }, [load]);

  const toggle = async () => {
    if (!st) return;
    setBusy('toggle');
    try {
      const s = await api.patch('/acadhr-sync/auto', { enabled: !st.enabled });
      s._offset = st._offset;
      setSt(s);
      toast(s.enabled ? 'Auto-sync turned ON' : 'Auto-sync turned OFF', s.enabled ? 'success' : 'info');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const syncNow = async () => {
    setBusy('sync');
    try {
      const { result, status } = await api.post('/acadhr-sync/auto/fetch', {});
      status._offset = st ? st._offset : 0;
      setSt(status);
      const what = summarize(result);
      if (what) {
        toast(`Added from AcadHr: ${what}`, 'success');
        try { window.dispatchEvent(new Event('app:directory-refresh')); } catch (_) { /* ignore */ }
        try { localStorage.setItem('acadhr_autosync_seen', String(result.id || '')); } catch (_) { /* ignore */ }
      } else if (result.errors && result.errors.length) {
        toast(`Sync finished with problems: ${result.errors[0]}`, 'error');
      } else {
        toast('Up to date — no new registrations on AcadHr', 'info');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const serverNow = now - ((st && st._offset) || 0);
  const last = st && st.lastRun;
  const lastErrors = last && last.errors;

  return (
    <section style={wrap} aria-label="Auto-sync from AcadHr">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: '1 1 240px' }}>
          <h3 style={{ fontSize: 17, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span aria-hidden="true">🔄</span> Auto-sync from AcadHr
            {st && (
              <span style={{
                fontSize: 12, fontWeight: 700, borderRadius: 999, padding: '3px 10px',
                background: st.enabled ? '#dcfce7' : '#eef0f3', color: st.enabled ? '#166534' : '#4b5263',
              }}>
                {st.running ? 'SYNCING…' : st.enabled ? 'ON' : 'OFF'}
              </span>
            )}
          </h3>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: 13.5 }}>
            New teachers, tutors, schools and tuitions registered on acadhr.com are added here automatically
            {st ? ` every ${st.intervalMinutes} minute${st.intervalMinutes === 1 ? '' : 's'}` : ''} (Registration Followup).
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, minHeight: 40 }}>
            <input
              type="checkbox"
              role="switch"
              checked={!!(st && st.enabled)}
              onChange={toggle}
              disabled={!st || busy === 'toggle'}
              style={{ width: 20, height: 20 }}
              aria-label="Turn auto-sync on or off"
            />
            Auto
          </label>
          <button className="btn-primary" onClick={syncNow} disabled={busy === 'sync' || (st && st.running)} style={{ whiteSpace: 'nowrap' }}>
            {busy === 'sync' || (st && st.running) ? 'Syncing…' : 'Sync now'}
          </button>
        </div>
      </div>

      {error && <div className="alert" style={{ marginTop: 12 }}>{error}</div>}

      {st && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', gap: 10, marginTop: 14 }}>
            <div style={tile}>
              <div style={{ ...tileNum, fontSize: 16 }}>{ago(last && last.finished_at, serverNow)}</div>
              <div style={tileLabel}>Last checked</div>
            </div>
            <div style={tile}>
              <div style={{ ...tileNum, fontSize: 16 }}>{st.enabled ? until(st.nextRunAt, serverNow) : 'Paused'}</div>
              <div style={tileLabel}>Next check</div>
            </div>
            <div style={tile}><div style={tileNum}>{st.today.teachers}</div><div style={tileLabel}>New teachers today</div></div>
            <div style={tile}><div style={tileNum}>{st.today.tutors}</div><div style={tileLabel}>New tutors today</div></div>
            <div style={tile}><div style={tileNum}>{st.today.schools}</div><div style={tileLabel}>New schools today</div></div>
            <div style={tile}><div style={tileNum}>{st.today.tuitions}</div><div style={tileLabel}>New tuitions today</div></div>
          </div>

          {lastErrors && (
            <div className="muted" style={{ marginTop: 10, fontSize: 13, color: '#b45309' }}>
              ⚠ Last check had a problem: {String(lastErrors).slice(0, 220)}
            </div>
          )}

          <button
            type="button"
            className="btn-ghost sm"
            onClick={() => setShowLog((v) => !v)}
            style={{ marginTop: 12 }}
            aria-expanded={showLog}
          >
            {showLog ? '▾ Hide recent activity' : '▸ Recent activity'}
          </button>

          {showLog && (
            <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'grid', gap: 6 }}>
              {st.recent.length === 0 && <li className="muted" style={{ fontSize: 13.5 }}>No checks yet — the first one runs shortly after the server starts.</li>}
              {st.recent.map((r) => (
                <li key={r.id} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 13.5, borderBottom: '1px solid var(--border, #e6e8ef)', paddingBottom: 6 }}>
                  <span style={{ color: 'var(--muted, #7a8194)', minWidth: 120 }}>{fmtTime(r.started_at)}</span>
                  <span style={{ fontWeight: 600 }}>{r.trigger_type === 'manual' ? 'Sync now' : 'Auto'}</span>
                  <span style={{ flex: '1 1 160px', minWidth: 0 }}>
                    {summarize(r) ? `+ ${summarize(r)}` : 'Nothing new'}
                    {Number(r.tuitions_updated) > 0 ? ` · ${r.tuitions_updated} tuition(s) updated` : ''}
                    {r.errors ? <span style={{ color: '#b45309' }}> · problem: {String(r.errors).slice(0, 120)}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {!st && !error && <div style={{ marginTop: 10 }}><Loader size="sm" inline label="Loading…" /></div>}
    </section>
  );
}
