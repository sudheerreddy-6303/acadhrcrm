import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { INDIAN_STATES, CITIES, SUBJECTS, COURSES } from '../components/FieldControls';

const STATUS_META = {
  new: { label: 'New', tone: 'blue' },
  contacted: { label: 'Contacted', tone: 'indigo' },
  follow_up: { label: 'Follow-up', tone: 'amber' },
  converted: { label: 'Converted', tone: 'green' },
  lost: { label: 'Lost', tone: 'slate' },
};

const CLASS_LEVELS = ['6th', '7th', '8th', '9th', '10th', '11th', '12th'];

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [chooser, setChooser] = useState(null); // subject/class/course being opened
  const [results, setResults] = useState(null); // { teachers, tutors, loading, error } for the opened item
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  // Directory counts + filters
  const [dir, setDir] = useState(null);
  const [subjects, setSubjects] = useState(null);
  const [classes, setClasses] = useState(null);
  const [filters, setFilters] = useState({ type: '', registration: '', status: '', city: '', state: '' });
  const [dirError, setDirError] = useState('');

  useEffect(() => {
    api.get('/dashboard/stats').then(setStats).catch((e) => setError(e.message));
  }, []);

  const loadDirectory = useCallback(async () => {
    setDirError('');
    try {
      const q = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) q.set(k, v); });
      const qs = q.toString();
      const [dirData, subjData, classData] = await Promise.all([
        api.get(`/dashboard/directory?${qs}`),
        api.get(`/dashboard/subjects?${qs}`),
        api.get(`/dashboard/classes?${qs}`),
      ]);
      setDir(dirData);
      setSubjects(subjData || { teachers: {}, tutors: {} });
      setClasses((classData && classData.counts) || {});
    } catch (e) {
      setDirError(e.message);
    }
  }, [filters]);

  useEffect(() => { loadDirectory(); }, [loadDirectory]);

  // When a Course/Subject/Class card is opened, fetch its teachers AND tutors
  // directly (no "which list?" prompt). Subjects/courses filter server-side via
  // ?subject=; classes have no server filter, so we match the row's classes list
  // on the client.
  useEffect(() => {
    if (!chooser) { setResults(null); return; }
    let cancelled = false;
    const isClass = [...CLASS_LEVELS, ...Object.keys(classes || {})].includes(chooser);
    setResults({ teachers: [], tutors: [], leads: [], loading: true, error: '' });

    (async () => {
      try {
        const q = isClass ? '' : `?subject=${encodeURIComponent(chooser)}`;
        // Subject/Course card counts also include matching leads (their
        // `requirement`), so fetch those too — otherwise a subject whose count
        // comes only from leads opens an empty modal. Classes aren't counted
        // from leads, so skip the leads fetch for a class.
        const calls = [
          api.get(`/teachers${q}`),
          api.get(`/tutors${q}`),
        ];
        if (!isClass) calls.push(api.get(`/leads?subject=${encodeURIComponent(chooser)}`));
        const [td, ud, ld] = await Promise.all(calls);
        let teachers = td.teachers || [];
        let tutors = ud.tutors || [];
        let leads = (ld && ld.leads) || [];
        if (isClass) {
          const hasClass = (row) =>
            String(row.classes || '').split(',').map((s) => s.trim()).includes(chooser);
          teachers = teachers.filter(hasClass);
          tutors = tutors.filter(hasClass);
        }
        if (!cancelled) setResults({ teachers, tutors, leads, loading: false, error: '' });
      } catch (e) {
        if (!cancelled) setResults({ teachers: [], tutors: [], leads: [], loading: false, error: e.message });
      }
    })();

    return () => { cancelled = true; };
  }, [chooser, classes]);

  const setF = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const resetFilters = () => setFilters({ type: '', registration: '', status: '', city: '', state: '' });

  const allSubjectKeys = subjects
    ? Array.from(new Set([
        ...SUBJECTS,
        ...Object.keys(subjects.tutors || {}),
        ...Object.keys(subjects.teachers || {}),
      ]))
    : [];
  const courseKeys = COURSES;
  const subjectKeys = allSubjectKeys.filter((s) => !COURSES.includes(s));

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Welcome back, Main Dashboard</h2>
          <p className="muted">{isAdmin ? 'Org-wide overview' : 'Your assigned leads'}</p>
        </div>
      </div>

      {/* ---------------- Directory (teachers / tutors / schools) ---------------- */}
      <h3 className="section-title">Directory</h3>

      <div className="filter-bar">
        <label className="filter">
          <span>Registration</span>
          <select value={filters.registration} onChange={setF('registration')}>
            <option value="">Registration</option>
            <option value="registered">Registered</option>
            <option value="unregistered">Unregistered</option>
          </select>
        </label>
        <label className="filter">
          <span>State</span>
          <select value={filters.state} onChange={setF('state')}>
            <option value="">State</option>
            {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="filter">
          <span>City</span>
          <select value={filters.city} onChange={setF('city')}>
            <option value="">City</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <div className="filter-actions">
          <button className="btn-ghost" onClick={resetFilters}>Reset</button>
        </div>
      </div>

      {dirError && <div className="alert">{dirError}</div>}

      {dir && (
        <>
          <div className="total-hero-wrap">
            <div className="stat-card feature total-hero">
              <div className="hero-total">
                <div className="stat-num">{dir.total}</div>
                <div className="stat-label">Total (teachers + tutors + schools + tuitions)</div>
              </div>
              <div className="hero-breakdown">
                <div className="hb clickable" role="button" tabIndex={0} title="Open teachers"
                     onClick={() => navigate('/teachers')}
                     onKeyDown={(e) => { if (e.key === 'Enter') navigate('/teachers'); }}>
                  <span className="hb-num">{dir.teachers}</span><span className="hb-lab">Teachers</span>
                </div>
                <div className="hb clickable" role="button" tabIndex={0} title="Open tutors"
                     onClick={() => navigate('/tutors')}
                     onKeyDown={(e) => { if (e.key === 'Enter') navigate('/tutors'); }}>
                  <span className="hb-num">{dir.tutors}</span><span className="hb-lab">Tutors</span>
                </div>
                <div className="hb clickable" role="button" tabIndex={0} title="Open schools"
                     onClick={() => navigate('/schools')}
                     onKeyDown={(e) => { if (e.key === 'Enter') navigate('/schools'); }}>
                  <span className="hb-num">{dir.schools}</span><span className="hb-lab">Schools</span>
                </div>
                <div className="hb clickable" role="button" tabIndex={0} title="Open tuitions"
                     onClick={() => navigate('/tuitions')}
                     onKeyDown={(e) => { if (e.key === 'Enter') navigate('/tuitions'); }}>
                  <span className="hb-num">{dir.tuitions ?? 0}</span><span className="hb-lab">Tuitions</span>
                </div>
              </div>
            </div>
          </div>

        </>
      )}

      {/* ---------------- Courses ---------------- */}
      {subjects && (
        <>
          <h3 className="section-title mt-lg">Courses</h3>
          <div className="subject-grid">
            {courseKeys.map((s) => {
              const total = ((subjects.tutors || {})[s] || 0) + ((subjects.teachers || {})[s] || 0);
              return (
                <div
                  key={s}
                  className="subject-card clickable"
                  role="button"
                  tabIndex={0}
                  onClick={() => setChooser(s)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setChooser(s); }}
                >
                  <div className="subject-count">{total}</div>
                  <div className="subject-name">{s}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ---------------- Subjects ---------------- */}
      {subjects && (
        <>
          <h3 className="section-title mt-lg">Subjects</h3>
          <div className="subject-grid">
            {subjectKeys.map((s) => {
              const total = ((subjects.tutors || {})[s] || 0) + ((subjects.teachers || {})[s] || 0);
              return (
                <div
                  key={s}
                  className="subject-card clickable"
                  role="button"
                  tabIndex={0}
                  onClick={() => setChooser(s)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setChooser(s); }}
                >
                  <div className="subject-count">{total}</div>
                  <div className="subject-name">{s}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ---------------- Classes ---------------- */}
      {classes && (
        <>
          <h3 className="section-title mt-lg">Classes</h3>
          <div className="subject-grid">
            {Array.from(new Set([...CLASS_LEVELS, ...Object.keys(classes)])).map((c) => (
              <div
                key={c}
                className="subject-card clickable"
                role="button"
                tabIndex={0}
                onClick={() => setChooser(c)}
                onKeyDown={(e) => { if (e.key === 'Enter') setChooser(c); }}
              >
                <div className="subject-count">{classes[c] || 0}</div>
                <div className="subject-name">{c}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ---------------- Leads ---------------- */}
      {error && <div className="alert">{error}</div>}

      {stats && (
        <>
          <h3 className="section-title mt-lg">Leads</h3>
          <div className="stat-grid">
            <div className="stat-card feature">
              <div className="stat-num">{stats.total}</div>
              <div className="stat-label">Total leads</div>
            </div>
            <div className="stat-card">
              <div className="stat-num">{stats.followUpsDue}</div>
              <div className="stat-label">Follow-ups due</div>
            </div>
            <div className="stat-card">
              <div className="stat-num">{stats.byStatus.converted}</div>
              <div className="stat-label">Converted</div>
            </div>
          </div>

          <h4 className="section-title">Leads by registration</h4>
          <div className="status-row">
            <div className="status-chip-card tone-amber">
              <div className="chip-num">{(stats.byRegistration && stats.byRegistration.unregistered) || 0}</div>
              <div className="chip-label">Unregistered</div>
            </div>
            <div className="status-chip-card tone-green">
              <div className="chip-num">{(stats.byRegistration && stats.byRegistration.registered) || 0}</div>
              <div className="chip-label">Registered</div>
            </div>
          </div>

          <h4 className="section-title">Leads by status</h4>
          <div className="status-row">
            {Object.entries(STATUS_META).map(([key, meta]) => (
              <div key={key} className={`status-chip-card tone-${meta.tone}`}>
                <div className="chip-num">{stats.byStatus[key]}</div>
                <div className="chip-label">{meta.label}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ---------------- Direct results: Teachers + Tutors for the item ---------------- */}
      {chooser && (
        <div className="modal-backdrop" onClick={() => setChooser(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 820, width: '96%' }}>
            <div className="modal-head">
              <h3>{chooser}</h3>
              <button className="icon-btn" onClick={() => setChooser(null)} aria-label="Close">✕</button>
            </div>
            <div className="modal-body">
              {results?.error && <div className="alert">{results.error}</div>}
              {(!results || results.loading) && <p className="muted">Loading…</p>}
              {results && !results.loading && !results.error && (
                <>
                  <h4 className="section-title" style={{ marginTop: 0 }}>
                    Teachers ({results.teachers.length})
                  </h4>
                  <RosterTable rows={results.teachers} />

                  <h4 className="section-title mt-lg">
                    Tutors ({results.tutors.length})
                  </h4>
                  <RosterTable rows={results.tutors} />

                  {results.leads && (
                    <>
                      <h4 className="section-title mt-lg">
                        Leads ({results.leads.length})
                      </h4>
                      <LeadRosterTable rows={results.leads} />
                    </>
                  )}
                </>
              )}
            </div>
            <div className="modal-foot">
              <div className="spacer" />
              <button className="btn-ghost" onClick={() => setChooser(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compact roster table used inside the direct Teachers/Tutors results modal.
// Additive helper — nothing above depends on it being absent.
// ---------------------------------------------------------------------------
function RosterTable({ rows, emptyLabel }) {
  if (!rows || rows.length === 0) {
    return <p className="muted">{emptyLabel || 'None found.'}</p>;
  }
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr><th>Name</th><th>Phone</th><th>City</th><th>Subjects</th><th>Reg.</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td data-label="Name"><strong>{r.name}</strong></td>
              <td data-label="Phone">{r.phone || '—'}</td>
              <td data-label="City">{r.city || '—'}</td>
              <td data-label="Subjects">{r.subjects || '—'}</td>
              <td data-label="Reg."><span className="badge">{r.registration || '—'}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compact roster table for LEADS shown inside the subject/course results modal.
// Leads keep their subject/course in `requirement` (not `subjects`) and their
// kind in `source`. Additive helper — nothing above depends on it being absent.
// ---------------------------------------------------------------------------
function LeadRosterTable({ rows, emptyLabel }) {
  if (!rows || rows.length === 0) {
    return <p className="muted">{emptyLabel || 'None found.'}</p>;
  }
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr><th>Name</th><th>Phone</th><th>City</th><th>Requirement</th><th>Source</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td data-label="Name"><strong>{r.name}</strong></td>
              <td data-label="Phone">{r.phone || '—'}</td>
              <td data-label="City">{r.city || '—'}</td>
              <td data-label="Requirement">{r.requirement || '—'}</td>
              <td data-label="Source"><span className="badge">{r.source || '—'}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
