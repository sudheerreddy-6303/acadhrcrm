import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DirectoryOverview from '../components/DirectoryOverview';
import DirectoryFilters from '../components/DirectoryFilters';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import ContactActions from '../components/ContactActions';
import Loader from '../components/Loader';

const fmtDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d) ? String(v) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function Tuitions() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ search: '', status: '', registration: '', country: '', state: '', city: '' });
  const [params] = useSearchParams();
  const regParam = params.get('registration') || '';
  const followupTitle = regParam === 'registered'
    ? 'Registration Followup — Tuitions'
    : regParam === 'unregistered'
    ? 'Unregistration Followup — Tuitions'
    : 'Tuitions';

  // Tuitions fetched from AcadHr (see "Fetch from AcadHr" under Tuitions).
  const [tuitions, setTuitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [telecallers, setTelecallers] = useState([]);
  const loadSeq = useRef(0);

  // Apply the registration filter when opened from a sidebar follow-up link.
  useEffect(() => { setF((prev) => ({ ...prev, registration: regParam })); }, [regParam]);

  useEffect(() => {
    if (isAdmin) api.get('/users/telecallers').then((d) => setTelecallers(d.users || [])).catch(() => {});
  }, [isAdmin]);

  const load = useCallback(async () => {
    setError('');
    const seq = ++loadSeq.current;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (f.search) q.set('search', f.search);
      if (f.registration) q.set('registration', f.registration);
      if (f.country) q.set('country', f.country);
      if (f.state) q.set('state', f.state);
      if (f.city) q.set('city', f.city);
      const d = await api.get(`/tuitions?${q.toString()}`);
      if (seq === loadSeq.current) setTuitions(d.tuitions || []);
    } catch (e) {
      if (seq === loadSeq.current) setError(e.message);
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [f.search, f.registration, f.country, f.state, f.city]);

  useEffect(() => { load(); }, [load]);

  const assign = async (id, assignedTo) => {
    setError('');
    try {
      await api.patch(`/tuitions/${id}/assign`, { assigned_to: assignedTo || null });
      setTuitions((prev) => prev.map((x) => (x.id === id ? { ...x, assigned_to: assignedTo || null } : x)));
    } catch (e) {
      setError(e.message);
    }
  };

  const field = (label, value) => (
    <div className="rf"><span className="rf-label">{label}</span><span className="rf-value">{value || '—'}</span></div>
  );

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>{followupTitle}</h2>
          <p className="muted">Tuition requirements and matches.</p>
        </div>
        {isAdmin && (
          <div>
            <button className="btn-primary" onClick={() => navigate('/fetch-tuitions')}>Fetch from AcadHr</button>
          </div>
        )}
      </div>

      <DirectoryFilters value={f} onChange={setF} showStatus={false} />

      <DirectoryOverview
        type="tuitions"
        filters={{ search: f.search, registration: f.registration, country: f.country, state: f.state, city: f.city }}
      />

      {error && <div className="alert">{error}</div>}

      <div className="record-grid">
        {tuitions.map((t) => (
          <div key={t.id} className={`record-card acc-${t.registration || 'none'}`}>
            <div className="record-head">
              <div className="record-id">
                <div className="record-avatar">{(t.name || '?').charAt(0).toUpperCase()}</div>
                <div>
                  <div className="record-title">{t.name}</div>
                  <div className="record-sub">
                    {t.subjects || 'Tuition'}{t.classes ? ` · ${t.classes}` : ''}
                  </div>
                </div>
              </div>
              <span className={`reg-badge reg-${t.registration || 'none'}`}>
                {t.registration === 'registered' ? 'Registered' : t.registration === 'unregistered' ? 'Unregistered' : '—'}
              </span>
            </div>
            <div className="record-fields">
              {isAdmin && (
                <>
                  {field('Phone', t.phone)}
                  {field('Email', t.email)}
                </>
              )}
              {field('Student', t.student_name)}
              {field('Subjects', t.subjects)}
              {field('Class', t.classes)}
              {field('Board', t.boards)}
              {field('Mode', t.mode)}
              {field('Timing', t.timing)}
              {field('Budget', t.budget)}
              {field('Tutor gender', t.gender_pref)}
              {field('Area', t.location)}
              {field('City', t.city)}
              {field('State', t.state)}
              {field('AcadHr status', t.acadhr_status)}
              {field('Posted', fmtDate(t.posted_at))}
              {t.requirement && field('Details', t.requirement)}
            </div>
            {isAdmin && (
              <div className="assign-row">
                <span className="rf-label">Assign to</span>
                <select value={t.assigned_to || ''} onChange={(e) => assign(t.id, e.target.value)}>
                  <option value="">Unassigned</option>
                  {telecallers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            )}
            <ContactActions type="tuitions" id={t.id} registration={t.registration} />
          </div>
        ))}
        {loading && tuitions.length === 0 && <div className="record-empty"><Loader label="Loading tuitions…" /></div>}
      </div>

      {!loading && tuitions.length === 0 && (
        <div className="record-empty">
          This section is ready to be set up — tell us what it should show.
          {isAdmin && <> No tuitions yet: use <strong>Tuitions → Fetch from AcadHr</strong> to bring them in.</>}
        </div>
      )}
    </div>
  );
}
