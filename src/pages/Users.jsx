import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';

const EMPTY = { name: '', email: '', password: '', role: 'telecaller' };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [perf, setPerf] = useState(null); // telecaller whose performance is open

  const load = useCallback(async () => {
    setError('');
    try {
      const { users } = await api.get('/users');
      setUsers(users);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (u) => {
    try {
      await api.patch(`/users/${u.id}`, { is_active: !u.is_active });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Users</h2>
          <p className="muted">Admins and AcadHrs</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing({ ...EMPTY })}>+ New user</button>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td data-label="Name"><strong>{u.name}</strong></td>
                <td data-label="Email">{u.email}</td>
                <td data-label="Role"><span className={`badge r-${u.role}`}>{u.role === 'telecaller' ? 'AcadHr' : u.role}</span></td>
                <td data-label="Status">
                  <span className={`badge ${u.is_active ? 's-converted' : 's-lost'}`}>
                    {u.is_active ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td data-label="" className="row-actions">
                  <button className="btn-ghost sm" onClick={() => setPerf(u)}>Performance</button>
                  <button className="btn-ghost sm" onClick={() => setEditing(u)}>Edit</button>
                  <button className="btn-ghost sm" onClick={() => toggleActive(u)}>
                    {u.is_active ? 'Disable' : 'Enable'}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={5} className="empty">No users yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <UserModal user={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}

      {perf && (
        <PerformanceModal user={perf} onClose={() => setPerf(null)} />
      )}
    </div>
  );
}

function UserModal({ user, onClose, onSaved }) {
  const isNew = !user.id;
  const [form, setForm] = useState({ ...EMPTY, ...user, password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setError(''); setBusy(true);
    try {
      if (isNew) {
        await api.post('/users', form);
      } else {
        const payload = { name: form.name, role: form.role };
        if (form.password) payload.password = form.password;
        await api.patch(`/users/${user.id}`, payload);
      }
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal narrow" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{isNew ? 'New user' : `Edit ${user.name}`}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {error && <div className="alert">{error}</div>}

        <div className="modal-body">
          <label className="field"><span>Name *</span>
            <input value={form.name} onChange={set('name')} /></label>
          <label className="field"><span>Email *</span>
            <input value={form.email} onChange={set('email')} disabled={!isNew} /></label>
          <label className="field">
            <span>{isNew ? 'Password *' : 'New password (leave blank to keep)'}</span>
            <input type="password" value={form.password} onChange={set('password')} />
          </label>
          <label className="field"><span>Role</span>
            <select value={form.role} onChange={set('role')}>
              <option value="telecaller">AcadHr</option>
              <option value="admin">Admin</option>
            </select>
          </label>
        </div>

        <div className="modal-foot">
          <div className="spacer" />
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : isNew ? 'Create user' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Admin-only performance view for a single telecaller/user.
// Reads the existing endpoints:
//   GET /users/:id/stats
//   GET /users/:id/activities?type=all|call|note|follow_up|due
//   GET /users/:id/leads?status=
// Purely additive — nothing above is changed.
// ---------------------------------------------------------------------------

const ACT_TABS = [
  { key: 'all', label: 'All' },
  { key: 'call', label: 'Calls' },
  { key: 'note', label: 'Notes' },
  { key: 'follow_up', label: 'Follow-ups' },
  { key: 'due', label: 'Due now' },
];

const STATUS_LABELS = {
  new: 'New', contacted: 'Contacted', follow_up: 'Follow-up',
  converted: 'Converted', lost: 'Lost',
};

function PerformanceModal({ user, onClose }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [view, setView] = useState('activity'); // 'activity' | 'leads'
  const [actType, setActType] = useState('all');
  const [activities, setActivities] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  // Load the headline stats once.
  useEffect(() => {
    setError('');
    api.get(`/users/${user.id}/stats`)
      .then(setStats)
      .catch((e) => setError(e.message));
  }, [user.id]);

  // Load "what they wrote" whenever the activity tab changes.
  useEffect(() => {
    if (view !== 'activity') return;
    setLoadingList(true);
    api.get(`/users/${user.id}/activities?type=${actType}`)
      .then((d) => setActivities(d.activities || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoadingList(false));
  }, [user.id, actType, view]);

  // Load assigned leads when switching to the leads tab.
  useEffect(() => {
    if (view !== 'leads') return;
    setLoadingList(true);
    api.get(`/users/${user.id}/leads`)
      .then((d) => setLeads(d.leads || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoadingList(false));
  }, [user.id, view]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 860, width: '96%' }}>
        <div className="modal-head">
          <h3>Performance · {user.name}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {error && <div className="alert">{error}</div>}

        <div className="modal-body">
          {/* Headline numbers */}
          {stats ? (
            <>
              <div className="stat-grid">
                <div className="stat-card feature">
                  <div className="stat-num">{stats.assigned}</div>
                  <div className="stat-label">Assigned leads</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num">{stats.byStatus?.converted || 0}</div>
                  <div className="stat-label">Converted</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num">{stats.totalActivities}</div>
                  <div className="stat-label">Total activity</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num">{stats.followUpsDue}</div>
                  <div className="stat-label">Follow-ups due</div>
                </div>
              </div>

              <h4 className="section-title">Work logged</h4>
              <div className="status-row">
                <div className="status-chip-card tone-indigo">
                  <div className="chip-num">{stats.calls}</div>
                  <div className="chip-label">Calls</div>
                </div>
                <div className="status-chip-card tone-blue">
                  <div className="chip-num">{stats.notes}</div>
                  <div className="chip-label">Notes</div>
                </div>
                <div className="status-chip-card tone-amber">
                  <div className="chip-num">{stats.followUps}</div>
                  <div className="chip-label">Follow-ups</div>
                </div>
              </div>

              <h4 className="section-title">Assigned leads by status</h4>
              <div className="status-row">
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <div key={key} className="status-chip-card">
                    <div className="chip-num">{stats.byStatus?.[key] || 0}</div>
                    <div className="chip-label">{label}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            !error && <p className="muted">Loading…</p>
          )}

          {/* Tab switch: what they wrote vs their leads */}
          <div className="toolbar" style={{ marginTop: 18 }}>
            <button
              className={view === 'activity' ? 'btn-primary' : 'btn-ghost'}
              onClick={() => setView('activity')}
            >
              What they wrote
            </button>
            <button
              className={view === 'leads' ? 'btn-primary' : 'btn-ghost'}
              onClick={() => setView('leads')}
            >
              Assigned leads
            </button>
          </div>

          {view === 'activity' && (
            <>
              <div className="toolbar" style={{ marginTop: 8 }}>
                {ACT_TABS.map((t) => (
                  <button
                    key={t.key}
                    className={actType === t.key ? 'btn-secondary' : 'btn-ghost'}
                    onClick={() => setActType(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {loadingList ? (
                <p className="muted">Loading…</p>
              ) : (
                <ul className="activity-list">
                  {activities.map((a) => (
                    <li key={a.id}>
                      <span className={`badge s-${a.activity_type}`}>{a.activity_type}</span>
                      <span className="act-notes">{a.notes || <em className="muted">(no text)</em>}</span>
                      {a.lead_name && <span className="act-meta">on {a.lead_name}</span>}
                      {a.follow_up_date && (
                        <span className="act-follow">⏰ {new Date(a.follow_up_date).toLocaleString()}</span>
                      )}
                      <span className="act-meta">{new Date(a.created_at).toLocaleString()}</span>
                    </li>
                  ))}
                  {activities.length === 0 && <li className="muted">Nothing logged for this filter.</li>}
                </ul>
              )}
            </>
          )}

          {view === 'leads' && (
            <div className="table-wrap" style={{ marginTop: 8 }}>
              <table className="data-table">
                <thead>
                  <tr><th>Name</th><th>Phone</th><th>Requirement</th><th>Status</th><th>Updated</th></tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
                    <tr key={l.id}>
                      <td data-label="Name"><strong>{l.name}</strong>
                        <div className="sub">{[l.city, l.source].filter(Boolean).join(' · ')}</div>
                      </td>
                      <td data-label="Phone">{l.phone}</td>
                      <td data-label="Requirement">{l.requirement || '—'}</td>
                      <td data-label="Status"><span className={`badge s-${l.status}`}>{STATUS_LABELS[l.status] || l.status}</span></td>
                      <td data-label="Updated">{new Date(l.updated_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {!loadingList && leads.length === 0 && (
                    <tr><td colSpan={5} className="empty">No leads assigned.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="modal-foot">
          <div className="spacer" />
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
