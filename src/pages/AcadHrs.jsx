import { useEffect, useState } from 'react';
import { api } from '../api/client';

const STATUS_LABEL = { new: 'New', contacted: 'Contacted', follow_up: 'Follow-up', converted: 'Converted', lost: 'Lost' };

export default function AcadHrs() {
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // drill-down detail
  const [detail, setDetail] = useState(null); // { title, kind: 'leads'|'activities', rows|null }

  useEffect(() => {
    api.get('/users/telecallers').then((d) => setList(d.users)).catch((e) => setError(e.message));
  }, []);

  const openStats = async (id) => {
    setSelected(id); setStats(null); setDetail(null); setError(''); setLoading(true);
    try {
      const d = await api.get(`/users/${id}/stats`);
      setStats(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (title, kind, endpoint) => {
    setDetail({ title, kind, rows: null });
    setError('');
    try {
      const d = await api.get(endpoint);
      setDetail({ title, kind, rows: kind === 'leads' ? d.leads : d.activities });
    } catch (e) {
      setError(e.message);
      setDetail(null);
    }
  };

  // helpers to build card click configs
  const leadsDetail = (title, status) =>
    openDetail(title, 'leads', `/users/${selected}/leads${status ? `?status=${status}` : ''}`);
  const actDetail = (title, type) =>
    openDetail(title, 'activities', `/users/${selected}/activities?type=${type}`);

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>AcadHrs</h2>
          <p className="muted">Telecaller performance — click a name, then click any card to drill in</p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="acadhr-names">
        {list.map((t) => (
          <button
            key={t.id}
            className={`acadhr-chip ${selected === t.id ? 'on' : ''}`}
            onClick={() => openStats(t.id)}
          >
            {t.name}
          </button>
        ))}
        {list.length === 0 && !error && <p className="muted">No telecallers yet. Add them in Users.</p>}
      </div>

      {loading && <p className="muted" style={{ marginTop: 20 }}>Loading…</p>}

      {/* ---------- Detail drill-down view ---------- */}
      {stats && detail && (
        <div style={{ marginTop: 22 }}>
          <button className="btn-ghost" onClick={() => setDetail(null)}>← Back to {stats.user.name}</button>
          <h3 className="section-title mt-lg">{detail.title}</h3>
          {detail.rows === null ? (
            <p className="muted">Loading…</p>
          ) : detail.rows.length === 0 ? (
            <div className="record-empty">Nothing to show here.</div>
          ) : detail.kind === 'leads' ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Name</th><th>Phone</th><th>Requirement</th><th>Status</th><th>City</th></tr></thead>
                <tbody>
                  {detail.rows.map((l) => (
                    <tr key={l.id}>
                      <td data-label="Name"><strong>{l.name}</strong></td>
                      <td data-label="Phone">{l.phone}</td>
                      <td data-label="Requirement">{l.requirement || '—'}</td>
                      <td data-label="Status"><span className={`badge s-${l.status}`}>{STATUS_LABEL[l.status]}</span></td>
                      <td data-label="City">{l.city || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Lead</th><th>Type</th><th>Notes</th><th>Follow-up</th><th>Date</th></tr></thead>
                <tbody>
                  {detail.rows.map((a) => (
                    <tr key={a.id}>
                      <td data-label="Lead"><strong>{a.lead_name || '—'}</strong></td>
                      <td data-label="Type"><span className={`badge s-${a.activity_type}`}>{a.activity_type}</span></td>
                      <td data-label="Notes">{a.notes || '—'}</td>
                      <td data-label="Follow-up">{a.follow_up_date ? new Date(a.follow_up_date).toLocaleString() : '—'}</td>
                      <td data-label="Date">{new Date(a.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---------- Stat cards (buttons) ---------- */}
      {stats && !detail && (
        <>
          <h3 className="section-title mt-lg">{stats.user.name} <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>· {stats.user.email}</span></h3>

          <div className="stat-grid">
            <button className="stat-card feature card-btn" onClick={() => leadsDetail('Leads assigned')}>
              <div className="stat-num">{stats.assigned}</div>
              <div className="stat-label">Leads assigned</div>
            </button>
            <button className="stat-card card-btn" onClick={() => actDetail('Calls made', 'call')}>
              <div className="stat-num">{stats.calls}</div>
              <div className="stat-label">Calls made</div>
            </button>
            <button className="stat-card card-btn" onClick={() => actDetail('Follow-ups due', 'due')}>
              <div className="stat-num">{stats.followUpsDue}</div>
              <div className="stat-label">Follow-ups due</div>
            </button>
          </div>

          <div className="stat-grid">
            <button className="stat-card card-btn" onClick={() => actDetail('Notes logged', 'note')}>
              <div className="stat-num">{stats.notes}</div>
              <div className="stat-label">Notes logged</div>
            </button>
            <button className="stat-card card-btn" onClick={() => actDetail('Follow-ups set', 'follow_up')}>
              <div className="stat-num">{stats.followUps}</div>
              <div className="stat-label">Follow-ups set</div>
            </button>
            <button className="stat-card card-btn" onClick={() => actDetail('All activities', 'all')}>
              <div className="stat-num">{stats.totalActivities}</div>
              <div className="stat-label">Total activities</div>
            </button>
          </div>

          <h4 className="section-title">Assigned leads by status</h4>
          <div className="status-row">
            {Object.entries(STATUS_LABEL).map(([k, label]) => (
              <button key={k} className="status-chip-card card-btn" onClick={() => leadsDetail(`${label} leads`, k)}>
                <div className="chip-num">{stats.byStatus[k]}</div>
                <div className="chip-label">{label}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
