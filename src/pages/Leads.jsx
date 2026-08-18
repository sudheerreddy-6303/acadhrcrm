import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const STATUSES = ['new', 'contacted', 'follow_up', 'converted', 'lost'];
const STATUS_LABEL = {
  new: 'New', contacted: 'Contacted', follow_up: 'Follow-up',
  converted: 'Converted', lost: 'Lost',
};

const EMPTY_LEAD = {
  name: '', phone: '', email: '', city: '', source: '',
  requirement: '', status: 'new', registration: 'unregistered', notes: '', assigned_to: '',
};

export default function Leads() {
  const { isAdmin } = useAuth();
  const [leads, setLeads] = useState([]);
  const [telecallers, setTelecallers] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // lead object or EMPTY_LEAD for new
  const [assignFilter, setAssignFilter] = useState(''); // '' | 'unassigned' | 'assigned'
  const [sourceFilter, setSourceFilter] = useState(''); // '' | source value
  const [assigneeFilter, setAssigneeFilter] = useState(''); // '' | 'unassigned' | telecaller id

  const load = useCallback(async () => {
    setError('');
    try {
      const q = new URLSearchParams();
      if (status) q.set('status', status);
      if (search) q.set('search', search);
      const { leads } = await api.get(`/leads?${q.toString()}`);
      setLeads(leads);
    } catch (e) {
      setError(e.message);
    }
  }, [status, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get('/users/telecallers').then((d) => setTelecallers(d.users)).catch(() => {});
  }, []);

  // Admin: assign a lead directly from the list.
  const assign = async (id, assignedTo) => {
    setError('');
    try {
      await api.patch(`/leads/${id}/assign`, { assigned_to: assignedTo || null });
      const name = telecallers.find((t) => String(t.id) === String(assignedTo))?.name || null;
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, assigned_to: assignedTo || null, assigned_name: name } : l)));
    } catch (e) {
      setError(e.message);
    }
  };

  const sources = [...new Set(leads.map((l) => l.source).filter(Boolean))];

  const shown = leads.filter((l) => {
    if (assignFilter === 'unassigned' && l.assigned_to) return false;
    if (assignFilter === 'assigned' && !l.assigned_to) return false;
    if (sourceFilter && l.source !== sourceFilter) return false;
    if (assigneeFilter === 'unassigned' && l.assigned_to) return false;
    if (assigneeFilter && assigneeFilter !== 'unassigned' && String(l.assigned_to) !== String(assigneeFilter)) return false;
    return true;
  });

  // ---- multi-select + bulk assign (admin) ----
  const [selected, setSelected] = useState(() => new Set());
  const [bulkAssignee, setBulkAssignee] = useState('');

  const toggleSelect = (id) => setSelected((prev) => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const allShownSelected = shown.length > 0 && shown.every((l) => selected.has(l.id));
  const toggleSelectAll = () => {
    setSelected(allShownSelected ? new Set() : new Set(shown.map((l) => l.id)));
  };

  const bulkAssign = async () => {
    if (!selected.size) return;
    setError('');
    try {
      const ids = [...selected];
      await api.patch('/leads/bulk-assign', { ids, assigned_to: bulkAssignee || null });
      const name = telecallers.find((t) => String(t.id) === String(bulkAssignee))?.name || null;
      setLeads((prev) => prev.map((l) => (selected.has(l.id)
        ? { ...l, assigned_to: bulkAssignee || null, assigned_name: name }
        : l)));
      setSelected(new Set());
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Leads</h2>
          <p className="muted">{shown.length} shown</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing({ ...EMPTY_LEAD })}>
          + New lead
        </button>
      </div>

      <div className="toolbar">
        <input
          className="search"
          placeholder="Search name, phone, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        {isAdmin && (
          <select value={assignFilter} onChange={(e) => setAssignFilter(e.target.value)}>
            <option value="">Assignment</option>
            <option value="unassigned">Unassigned</option>
            <option value="assigned">Assigned</option>
          </select>
        )}
        {sources.length > 0 && (
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
            <option value="">Source</option>
            {sources.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        {isAdmin && (
          <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
            <option value="">Assignee</option>
            <option value="unassigned">Unassigned</option>
            {telecallers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>

      {error && <div className="alert">{error}</div>}

      {isAdmin && selected.size > 0 && (
        <div className="bulk-bar">
          <span>{selected.size} selected</span>
          <select value={bulkAssignee} onChange={(e) => setBulkAssignee(e.target.value)}>
            <option value="">Unassigned</option>
            {telecallers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button className="btn-primary" onClick={bulkAssign}>Assign selected</button>
          <button className="btn-ghost" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {isAdmin && (
                <th className="check-col">
                  <input type="checkbox" checked={allShownSelected} onChange={toggleSelectAll} aria-label="Select all" />
                </th>
              )}
              <th>Name</th><th>Phone</th><th>Requirement</th>
              <th>Status</th><th>Assigned</th><th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((l) => (
              <tr key={l.id} onClick={() => setEditing(l)} className="clickable">
                {isAdmin && (
                  <td className="check-col" data-label="" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleSelect(l.id)} aria-label="Select lead" />
                  </td>
                )}
                <td data-label="Name">
                  <strong>{l.name}</strong>
                  <div className="sub">{[l.city, l.source].filter(Boolean).join(' · ')}</div>
                </td>
                <td data-label="Phone">{l.phone}</td>
                <td data-label="Requirement">{l.requirement || '—'}</td>
                <td data-label="Status"><span className={`badge s-${l.status}`}>{STATUS_LABEL[l.status]}</span></td>
                <td data-label="Assigned" onClick={(e) => e.stopPropagation()}>
                  {isAdmin ? (
                    <select
                      className="assign-select"
                      value={l.assigned_to || ''}
                      onChange={(e) => assign(l.id, e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {telecallers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  ) : (
                    l.assigned_name || <span className="muted">Unassigned</span>
                  )}
                </td>
                <td data-label="Updated">{new Date(l.updated_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr><td colSpan={isAdmin ? 7 : 6} className="empty">No leads to show.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <LeadModal
          lead={editing}
          isAdmin={isAdmin}
          telecallers={telecallers}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function LeadModal({ lead, isAdmin, telecallers, onClose, onSaved }) {
  const isNew = !lead.id;
  const [form, setForm] = useState({ ...EMPTY_LEAD, ...lead, assigned_to: lead.assigned_to || '' });
  const [activities, setActivities] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Activity form
  const [act, setAct] = useState({ activity_type: 'call', notes: '', follow_up_date: '' });

  useEffect(() => {
    if (!isNew) {
      api.get(`/leads/${lead.id}`).then((d) => setActivities(d.activities)).catch(() => {});
    }
  }, [isNew, lead.id]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setError(''); setBusy(true);
    try {
      const payload = { ...form };
      if (payload.assigned_to === '') payload.assigned_to = null;
      if (isNew) await api.post('/leads', payload);
      else await api.put(`/leads/${lead.id}`, payload);
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const logActivity = async () => {
    if (!act.notes && !act.follow_up_date) return;
    try {
      await api.post(`/leads/${lead.id}/activities`, act);
      const d = await api.get(`/leads/${lead.id}`);
      setActivities(d.activities);
      setAct({ activity_type: 'call', notes: '', follow_up_date: '' });
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async () => {
    if (!confirm('Delete this lead permanently?')) return;
    try {
      await api.del(`/leads/${lead.id}`);
      onSaved();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{isNew ? 'New lead' : form.name}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {error && <div className="alert">{error}</div>}

        <div className="modal-body">
          <div className="grid-2">
            <label className="field"><span>Name *</span>
              <input value={form.name} onChange={set('name')} /></label>
            <label className="field"><span>Phone *</span>
              <input value={form.phone} onChange={set('phone')} /></label>
            <label className="field"><span>Email</span>
              <input value={form.email || ''} onChange={set('email')} /></label>
            <label className="field"><span>City</span>
              <input value={form.city || ''} onChange={set('city')} /></label>
            <label className="field"><span>Source</span>
              <input value={form.source || ''} onChange={set('source')} placeholder="website, referral…" /></label>
            <label className="field"><span>Requirement</span>
              <input value={form.requirement || ''} onChange={set('requirement')} placeholder="Class 10 Maths…" /></label>
            <label className="field"><span>Status</span>
              <select value={form.status} onChange={set('status')}>
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </label>
            <label className="field"><span>Registration</span>
              <select value={form.registration || 'unregistered'} onChange={set('registration')}>
                <option value="unregistered">Unregistered</option>
                <option value="registered">Registered</option>
              </select>
            </label>
            {isAdmin && (
              <label className="field"><span>Assigned to</span>
                <select value={form.assigned_to || ''} onChange={set('assigned_to')}>
                  <option value="">Unassigned</option>
                  {telecallers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
            )}
          </div>
          <label className="field"><span>Notes</span>
            <textarea rows={3} value={form.notes || ''} onChange={set('notes')} /></label>

          {!isNew && (
            <div className="activity-section">
              <h4>Activity</h4>
              <div className="activity-form">
                <select value={act.activity_type} onChange={(e) => setAct({ ...act, activity_type: e.target.value })}>
                  <option value="call">Call</option>
                  <option value="note">Note</option>
                  <option value="follow_up">Follow-up</option>
                </select>
                <input
                  placeholder="What happened?"
                  value={act.notes}
                  onChange={(e) => setAct({ ...act, notes: e.target.value })}
                />
                <input
                  type="datetime-local"
                  value={act.follow_up_date}
                  onChange={(e) => setAct({ ...act, follow_up_date: e.target.value })}
                  title="Optional follow-up reminder"
                />
                <button className="btn-secondary" onClick={logActivity}>Log</button>
              </div>

              <ul className="activity-list">
                {activities.map((a) => (
                  <li key={a.id}>
                    <span className={`badge s-${a.activity_type}`}>{a.activity_type}</span>
                    <span className="act-notes">{a.notes}</span>
                    {a.follow_up_date && (
                      <span className="act-follow">⏰ {new Date(a.follow_up_date).toLocaleString()}</span>
                    )}
                    <span className="act-meta">{a.user_name} · {new Date(a.created_at).toLocaleDateString()}</span>
                  </li>
                ))}
                {activities.length === 0 && <li className="muted">No activity logged yet.</li>}
              </ul>
            </div>
          )}
        </div>

        <div className="modal-foot">
          {isAdmin && !isNew && (
            <button className="btn-danger" onClick={remove}>Delete</button>
          )}
          <div className="spacer" />
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : isNew ? 'Create lead' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
