import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Loader from './Loader';

// Shared page for Sidebar -> WhatsApp -> Meta WhatsApp / Bulk WhatsApp.
//   channel="bulk" -> Telecaller name, Project(s), Count, Sending date
//   channel="meta" -> same + Read / Delivered / Failed (optional) and Read + Delivered
// "Continue" saves the entry; the History list below shows saved entries as
// cards, with filters.

const GREEN = '#1f5132';
const GREEN_BRIGHT = '#25d366';

// Default project choices; projects added with "Add" are offered from history too.
export const WA_PROJECTS = ['AcadHr', 'Teachers', 'Tutors', 'Schools', 'Tuitions', 'Leads', 'Business Associates'];

const pad = (n) => String(n).padStart(2, '0');
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const fmtDate = (s) => {
  if (!s) return '—';
  const [y, m, d] = String(s).slice(0, 10).split('-');
  return `${d}-${m}-${y}`;
};
// "25/10/2026, 12:58 pm"
const fmtSaved = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  let h = d.getHours();
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${h}:${pad(d.getMinutes())} ${ampm}`;
};
const num = (v) => (v === '' || v === null || v === undefined ? 0 : Number(v) || 0);
const splitProjects = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);

// Date badge: Date passed / Today / Upcoming
const dateState = (s) => {
  const t = today();
  const d = String(s || '').slice(0, 10);
  if (!d) return 'passed';
  if (d < t) return 'passed';
  if (d === t) return 'today';
  return 'upcoming';
};
const DATE_BADGE = {
  passed: { label: 'Date passed', bg: '#eef0f3', color: '#4b5263' },
  today: { label: 'Today', bg: '#dcfce7', color: '#166534' },
  upcoming: { label: 'Upcoming', bg: '#dbeafe', color: '#1d4ed8' },
};

function toast(message, type = 'success') {
  try { window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } })); } catch (_) { /* ignore */ }
}

const card = {
  background: 'var(--surface, #fff)', border: '1px solid var(--border, #e6e8ef)',
  borderRadius: 'var(--radius, 12px)', boxShadow: 'var(--shadow-sm)', padding: '22px 22px 18px',
};
const grid4 = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '0 18px' };
const req = <span style={{ color: '#dc2626' }}>*</span>;
const greenBtn = { background: GREEN, color: '#fff', border: 0, borderRadius: 9, padding: '10px 20px', fontWeight: 650, cursor: 'pointer', fontSize: 15 };
const chip = { display: 'inline-block', background: '#d7eedf', color: '#1f5132', fontWeight: 700, fontSize: 13, borderRadius: 999, padding: '4px 12px' };

const EMPTY_FILTERS = { user_id: '', project: '', when: '', from: '', to: '' };

export default function WhatsAppCampaign({ channel }) {
  const isMeta = channel === 'meta';
  const { user, isAdmin } = useAuth();
  const [senders, setSenders] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [hf, setHf] = useState(EMPTY_FILTERS); // history filters

  const blank = useCallback(() => ({
    user_id: user && user.id ? String(user.id) : '',
    projects: [], message_count: '', send_date: today(),
    read_count: '', delivered_count: '', failed_count: '',
  }), [user]);
  const [form, setForm] = useState(blank);

  useEffect(() => {
    api.get('/whatsapp/senders').then((d) => setSenders(d.users || [])).catch(() => {});
  }, []);

  // Server-side filters: telecaller, project, date range. "When" is applied below.
  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ channel });
      if (hf.user_id) q.set('user_id', hf.user_id);
      if (hf.project) q.set('project', hf.project);
      if (hf.from) q.set('from', hf.from);
      if (hf.to) q.set('to', hf.to);
      const { campaigns } = await api.get(`/whatsapp/campaigns?${q.toString()}`);
      setHistory(campaigns || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [channel, hf.user_id, hf.project, hf.from, hf.to]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Project choices = defaults + anything used before (kept when a filter narrows the list).
  const [knownProjects, setKnownProjects] = useState(WA_PROJECTS);
  useEffect(() => {
    setKnownProjects((prev) => Array.from(new Set([...prev, ...history.flatMap((h) => splitProjects(h.project))])));
  }, [history]);

  const shown = useMemo(
    () => (hf.when ? history.filter((h) => dateState(h.send_date) === hf.when) : history),
    [history, hf.when]
  );

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const fail = (msg) => { setError(msg); toast(msg, 'error'); };

  const save = async () => {
    setError('');
    if (!form.user_id) return fail('Please select the telecaller name.');
    if (!form.projects.length) return fail('Please select at least one project.');
    const count = Number(form.message_count);
    if (!Number.isInteger(count) || count < 1) return fail('Count must be a number of 1 or more.');
    if (!form.send_date) return fail('Please choose the sending date.');
    if (isMeta) {
      const total = num(form.read_count) + num(form.delivered_count) + num(form.failed_count);
      if (total > count) return fail(`Read + Delivered + Failed (${total}) cannot be more than Count (${count}).`);
    }
    setBusy(true);
    try {
      const payload = {
        channel, user_id: Number(form.user_id), projects: form.projects,
        message_count: count, send_date: form.send_date,
      };
      if (isMeta) Object.assign(payload, {
        read_count: form.read_count, delivered_count: form.delivered_count, failed_count: form.failed_count,
      });
      await api.post('/whatsapp/campaigns', payload); // client shows "Saved" popup
      setForm(blank());
      loadHistory();
    } catch (e) {
      fail(e.message || 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (h) => {
    if (!window.confirm(`Delete this entry (${h.user_name || ''}, ${h.message_count} messages on ${fmtDate(h.send_date)})?`)) return;
    try {
      await api.del(`/whatsapp/campaigns/${h.id}`); // "Deleted" popup
      setHistory((prev) => prev.filter((x) => x.id !== h.id));
    } catch (e) {
      fail(e.message || 'Could not delete');
    }
  };

  const totals = shown.reduce((t, h) => ({
    count: t.count + num(h.message_count),
    read: t.read + num(h.read_count),
    delivered: t.delivered + num(h.delivered_count),
    failed: t.failed + num(h.failed_count),
  }), { count: 0, read: 0, delivered: 0, failed: 0 });

  const readPlusDelivered = num(form.read_count) + num(form.delivered_count);
  const filtersOn = Object.values(hf).some(Boolean);

  return (
    <div>
      <div className="page-head">
        <div>
          <h2><span aria-hidden="true">{isMeta ? '💬' : '📢'}</span> {isMeta ? 'Meta WhatsApp' : 'Bulk WhatsApp'}</h2>
          <p className="muted">{isMeta ? 'Official WhatsApp Business (Meta) messaging' : 'Send one WhatsApp message to many contacts'}</p>
        </div>
        {!isMeta && (
          <a
            href="https://web.whatsapp.com/"
            target="_blank"
            rel="noreferrer"
            title="Open WhatsApp Web"
            aria-label="Open WhatsApp Web"
            style={{ width: 56, height: 56, borderRadius: '50%', background: GREEN_BRIGHT, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 26, textDecoration: 'none', boxShadow: '0 6px 18px rgba(37,211,102,0.35)' }}
          >
            ✆
          </a>
        )}
      </div>

      {error && <div className="alert">{error}</div>}

      {/* ---------- Entry form ---------- */}
      <div style={card}>
        <div style={grid4}>
          <label className="field"><span>Telecaller name {req}</span>
            <select value={form.user_id} onChange={set('user_id')}>
              <option value="">Select telecaller / admin</option>
              {senders.map((u) => (
                <option key={u.id} value={u.id}>{u.name}{u.role === 'admin' ? ' (Admin)' : ''}</option>
              ))}
            </select>
          </label>

          <div className="field"><span>Project {req}</span>
            <ProjectPicker
              options={knownProjects}
              value={form.projects}
              onChange={(projects) => setForm((f) => ({ ...f, projects }))}
              onAdd={(p) => setKnownProjects((prev) => (prev.includes(p) ? prev : [...prev, p]))}
            />
          </div>

          <label className="field"><span>Count {req}</span>
            <input type="number" min="1" step="1" inputMode="numeric" value={form.message_count} onChange={set('message_count')} placeholder="Enter number" />
          </label>

          <label className="field"><span>Sending date {req}</span>
            <input type="date" value={form.send_date} onChange={set('send_date')} />
          </label>
        </div>

        {isMeta && (
          <div style={{ border: '1px dashed #b7d8c3', background: '#f3f9f5', borderRadius: 12, padding: '16px 16px 6px', marginTop: 4 }}>
            <div style={grid4}>
              <label className="field"><span>✓✓ Read</span>
                <input type="number" min="0" value={form.read_count} onChange={set('read_count')} placeholder="0" /></label>
              <label className="field"><span>✓ Delivered</span>
                <input type="number" min="0" value={form.delivered_count} onChange={set('delivered_count')} placeholder="0" /></label>
              <label className="field"><span>✕ Failed</span>
                <input type="number" min="0" value={form.failed_count} onChange={set('failed_count')} placeholder="0" /></label>
              <div className="field"><span>Read + Delivered</span>
                <div style={{ background: GREEN_BRIGHT, color: '#fff', fontWeight: 800, fontSize: 20, borderRadius: 9, padding: '10px 16px', minHeight: 46, display: 'flex', alignItems: 'center' }}>
                  {readPlusDelivered}
                </div>
              </div>
            </div>
            <p className="muted" style={{ margin: '0 0 10px', fontSize: 13.5 }}>
              Optional - you can also fill these later from the History card ("Update status").
            </p>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button style={{ ...greenBtn, opacity: busy ? 0.7 : 1 }} onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Continue'}
          </button>
        </div>
      </div>

      {/* ---------- History ---------- */}
      <div style={{ ...card, marginTop: 22 }}>
        <h3 style={{ fontSize: 17, marginBottom: 14 }}>History</h3>

        {/* Filters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0 12px', alignItems: 'end', marginBottom: 6 }}>
          {isAdmin && (
            <label className="field"><span>Telecaller</span>
              <select value={hf.user_id} onChange={(e) => setHf((p) => ({ ...p, user_id: e.target.value }))}>
                <option value="">All telecallers</option>
                {senders.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </label>
          )}
          <label className="field"><span>Project</span>
            <select value={hf.project} onChange={(e) => setHf((p) => ({ ...p, project: e.target.value }))}>
              <option value="">All projects</option>
              {knownProjects.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className="field"><span>Date status</span>
            <select value={hf.when} onChange={(e) => setHf((p) => ({ ...p, when: e.target.value }))}>
              <option value="">All</option>
              <option value="today">Today</option>
              <option value="upcoming">Upcoming</option>
              <option value="passed">Date passed</option>
            </select>
          </label>
          <label className="field"><span>From date</span>
            <input type="date" value={hf.from} onChange={(e) => setHf((p) => ({ ...p, from: e.target.value }))} />
          </label>
          <label className="field"><span>To date</span>
            <input type="date" value={hf.to} onChange={(e) => setHf((p) => ({ ...p, to: e.target.value }))} />
          </label>
          <div className="field">
            <button className="btn-ghost" onClick={() => setHf(EMPTY_FILTERS)} disabled={!filtersOn}>Reset</button>
          </div>
        </div>

        <div className="status-row" style={{ marginBottom: 16 }}>
          <div className="status-chip-card"><div className="chip-num">{shown.length}</div><div className="chip-label">Entries</div></div>
          <div className="status-chip-card"><div className="chip-num">{totals.count}</div><div className="chip-label">Messages sent</div></div>
          {isMeta && (
            <>
              <div className="status-chip-card"><div className="chip-num">{totals.read}</div><div className="chip-label">Read</div></div>
              <div className="status-chip-card"><div className="chip-num">{totals.delivered}</div><div className="chip-label">Delivered</div></div>
              <div className="status-chip-card"><div className="chip-num">{totals.failed}</div><div className="chip-label">Failed</div></div>
              <div className="status-chip-card"><div className="chip-num">{totals.read + totals.delivered}</div><div className="chip-label">Read + Delivered</div></div>
            </>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: 16 }}>
          {shown.map((h) => (
            <HistoryCard key={h.id} h={h} isMeta={isMeta} isAdmin={isAdmin} onChanged={loadHistory} onDelete={() => remove(h)} />
          ))}
        </div>
        {loading && shown.length === 0 && <div className="record-empty"><Loader label="Loading history…" /></div>}
        {!loading && shown.length === 0 && (
          <div className="record-empty">{filtersOn ? 'No entries match these filters.' : 'No entries yet.'}</div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Multi-select project dropdown with tick boxes and "add another project".

function ProjectPicker({ options, value, onChange, onAdd }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const toggle = (p) => onChange(value.includes(p) ? value.filter((x) => x !== p) : [...value, p]);
  const add = () => {
    const p = typed.trim();
    if (!p) return;
    if (p.includes(',')) { toast('Project name cannot contain a comma', 'error'); return; }
    onAdd(p);
    if (!value.includes(p)) onChange([...value, p]);
    setTyped('');
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', textAlign: 'left', background: '#fff', border: '1px solid var(--border, #e6e8ef)',
          borderRadius: 9, padding: '10px 32px 10px 14px', fontSize: 15, fontFamily: 'inherit', cursor: 'pointer',
          color: value.length ? 'var(--text, #1f2433)' : '#9aa1b2', position: 'relative', minHeight: 44,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}
      >
        {value.length ? value.join(', ') : 'Select project'}
        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#4b5263' }}>▼</span>
      </button>

      {open && (
        <div style={{ position: 'absolute', zIndex: 30, top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1px solid var(--border, #e6e8ef)', borderRadius: 10, boxShadow: 'var(--shadow-md)', padding: 8 }}>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {options.map((p) => (
              <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', borderRadius: 7, cursor: 'pointer', fontSize: 14 }}>
                <input type="checkbox" checked={value.includes(p)} onChange={() => toggle(p)} style={{ width: 'auto' }} />
                {p}
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, borderTop: '1px solid var(--border, #e6e8ef)', paddingTop: 8, marginTop: 4 }}>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
              placeholder="Add another project"
              style={{ flex: 1, minWidth: 0 }}
            />
            <button type="button" className="btn-ghost sm" onClick={add}>Add</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// History card — name + date badge, Sending date / Count boxes, project chips,
// (Meta: Read / Delivered / Failed + Update status), "Saved … by …" footer.

function HistoryCard({ h, isMeta, isAdmin, onChanged, onDelete }) {
  const [more, setMore] = useState(false); // shows the Delete option inside the card
  const [editing, setEditing] = useState(false);
  const [s, setS] = useState({ read_count: '', delivered_count: '', failed_count: '' });
  const [busy, setBusy] = useState(false);

  const open = () => {
    setS({ read_count: h.read_count ?? '', delivered_count: h.delivered_count ?? '', failed_count: h.failed_count ?? '' });
    setEditing(true);
  };

  const saveStatus = async () => {
    const total = num(s.read_count) + num(s.delivered_count) + num(s.failed_count);
    if (total > num(h.message_count)) {
      toast(`Read + Delivered + Failed (${total}) cannot be more than Count (${h.message_count}).`, 'error');
      return;
    }
    setBusy(true);
    try {
      await api.patch(`/whatsapp/campaigns/${h.id}/status`, s); // "Saved" popup
      setEditing(false);
      onChanged();
    } catch (e) {
      toast(e.message || 'Could not update status', 'error');
    } finally {
      setBusy(false);
    }
  };

  const projects = splitProjects(h.project);
  const badge = DATE_BADGE[dateState(h.send_date)];
  const rd = num(h.read_count) + num(h.delivered_count);
  const pct = num(h.message_count) ? Math.round((rd / num(h.message_count)) * 100) : 0;
  const box = { background: '#f2f4f3', borderRadius: 12, padding: '10px 12px' };
  const boxLabel = { fontSize: 13.5, color: '#5b6272' };
  const boxValue = { fontSize: 18, fontWeight: 800, color: 'var(--text, #1f2433)', marginTop: 2, whiteSpace: 'nowrap' };

  return (
    <div style={{ background: '#fff', border: '1px solid var(--border, #e6e8ef)', borderRadius: 14, boxShadow: '0 2px 10px rgba(20,25,45,0.06)', padding: 14 }}>
      {/* Header: name + date badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 17 }}>
          <span aria-hidden="true">👤</span>{h.user_name || '—'}
        </div>
        <span style={{ background: badge.bg, color: badge.color, fontSize: 12.5, fontWeight: 650, borderRadius: 999, padding: '3px 10px', whiteSpace: 'nowrap' }}>
          {badge.label}
        </span>
      </div>

      {/* Sending date / Count */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={box}>
          <div style={boxLabel}>Sending date</div>
          <div style={boxValue}><span aria-hidden="true">📅</span> {fmtDate(h.send_date)}</div>
        </div>
        <div style={box}>
          <div style={boxLabel}>Count</div>
          <div style={boxValue}>{h.message_count}</div>
        </div>
      </div>

      {/* Projects */}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#4b5263', marginBottom: 6 }}>Projects ({projects.length})</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {projects.map((p) => <span key={p} style={chip}>{p}</span>)}
        </div>
      </div>

      {/* Meta delivery status */}
      {isMeta && !editing && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 12, textAlign: 'center' }}>
          {[['✓✓ Read', h.read_count], ['✓ Delivered', h.delivered_count], ['✕ Failed', h.failed_count], ['Read + Del.', `${rd} (${pct}%)`]].map(([l, v]) => (
            <div key={l} style={{ background: '#f3f9f5', borderRadius: 9, padding: '6px 4px' }}>
              <div style={{ fontSize: 11.5, color: '#5b6272' }}>{l}</div>
              <div style={{ fontWeight: 750, fontSize: 14 }}>{v ?? '—'}</div>
            </div>
          ))}
        </div>
      )}
      {isMeta && editing && (
        <div className="grid-2" style={{ marginTop: 12 }}>
          <label className="field"><span>✓✓ Read</span>
            <input type="number" min="0" value={s.read_count} onChange={(e) => setS((p) => ({ ...p, read_count: e.target.value }))} /></label>
          <label className="field"><span>✓ Delivered</span>
            <input type="number" min="0" value={s.delivered_count} onChange={(e) => setS((p) => ({ ...p, delivered_count: e.target.value }))} /></label>
          <label className="field"><span>✕ Failed</span>
            <input type="number" min="0" value={s.failed_count} onChange={(e) => setS((p) => ({ ...p, failed_count: e.target.value }))} /></label>
          <div className="field"><span>Read + Delivered</span>
            <div style={{ background: GREEN_BRIGHT, color: '#fff', fontWeight: 800, borderRadius: 9, padding: '9px 14px' }}>
              {num(s.read_count) + num(s.delivered_count)}
            </div>
          </div>
        </div>
      )}

      {/* Inside the card (admins): Delete, opened from "⋯ More" */}
      {isAdmin && more && !editing && (
        <div style={{ marginTop: 12, padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13.5, color: '#7f1d1d' }}>Delete this entry permanently?</span>
          <span style={{ display: 'flex', gap: 6 }}>
            <button className="btn-ghost sm" onClick={() => setMore(false)}>Cancel</button>
            <button className="btn-danger sm" onClick={onDelete}>Delete</button>
          </span>
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--border, #e6e8ef)', marginTop: 14, paddingTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13.5, color: '#5b6272' }}>
          Saved {fmtSaved(h.created_at)}{h.created_by_name ? ` by ${h.created_by_name}` : ''}
        </span>
        <span style={{ display: 'flex', gap: 6 }}>
          {isMeta && !editing && <button className="btn-ghost sm" onClick={open}>Update status</button>}
          {isMeta && editing && (
            <>
              <button className="btn-ghost sm" onClick={() => setEditing(false)}>Cancel</button>
              <button className="btn-primary sm" style={{ background: GREEN }} onClick={saveStatus} disabled={busy}>{busy ? 'Saving…' : 'Save status'}</button>
            </>
          )}
          {isAdmin && !editing && <button className="btn-ghost sm" onClick={() => setMore((m) => !m)} aria-expanded={more}>{more ? '✕ Close' : '⋯ More'}</button>}
        </span>
      </div>
    </div>
  );
}
