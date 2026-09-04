import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import ContactActions from '../components/ContactActions';
import DirectoryOverview from '../components/DirectoryOverview';
import {
  ChipMultiSelect, SUBJECTS, BOARDS, CLASSES, EXPERIENCE, INDIAN_STATES, CITIES, COUNTRIES,
} from '../components/FieldControls';

const STATUS_LABEL = { active: 'Active', pending: 'Pending', inactive: 'Inactive' };

export default function Teachers() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [registration, setRegistration] = useState('');
  const [countryF, setCountryF] = useState('');
  const [stateF, setStateF] = useState('');
  const [cityF, setCityF] = useState('');
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [telecallers, setTelecallers] = useState([]);

  useEffect(() => {
    if (isAdmin) api.get('/users/telecallers').then((d) => setTelecallers(d.users || [])).catch(() => {});
  }, [isAdmin]);

  const assign = async (id, assignedTo) => {
    setError('');
    try {
      await api.patch(`/teachers/${id}/assign`, { assigned_to: assignedTo || null });
      setTeachers((prev) => prev.map((x) => (x.id === id ? { ...x, assigned_to: assignedTo || null } : x)));
    } catch (e) {
      setError(e.message);
    }
  };
  const [params, setParams] = useSearchParams();
  const subject = params.get('subject') || '';
  const klass = params.get('class') || '';
  const regParam = params.get('registration') || '';
  const followupTitle = regParam === 'registered'
    ? 'Registration Followup — Teachers'
    : regParam === 'unregistered'
    ? 'Unregistration Followup — Teachers'
    : 'Teachers';

  // Apply the registration filter when opened from a sidebar follow-up link.
  useEffect(() => { setRegistration(regParam); }, [regParam]);

  const load = useCallback(async () => {
    setError('');
    try {
      const q = new URLSearchParams();
      if (status) q.set('status', status);
      if (search) q.set('search', search);
      if (subject) q.set('subject', subject);
      if (klass) q.set('class', klass);
      if (registration) q.set('registration', registration);
      if (stateF) q.set('state', stateF);
      if (cityF) q.set('city', cityF);
      if (countryF) q.set('country', countryF);
      const { teachers } = await api.get(`/teachers?${q.toString()}`);
      setTeachers(teachers);
    } catch (e) {
      setError(e.message);
    }
  }, [status, search, subject, registration, stateF, cityF, countryF]);

  useEffect(() => { load(); }, [load]);

  const setReg = async (id, registration) => {
    setError('');
    try {
      await api.patch(`/teachers/${id}/registration`, { registration });
      setTeachers((prev) => prev.map((x) => (x.id === id ? { ...x, registration } : x)));
    } catch (e) {
      setError(e.message);
    }
  };


  const clearSubject = () => {
    const next = new URLSearchParams(params);
    next.delete('subject');
    setParams(next);
  };

  const clearClass = () => {
    const next = new URLSearchParams(params);
    next.delete('class');
    setParams(next);
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>{followupTitle}</h2>
          <p className="muted">{teachers.length} shown</p>
        </div>
        <div className="head-actions">
          <button className="btn-ghost" onClick={() => navigate('/import?type=teachers')}>⭳ Import</button>
          <button className="btn-primary" onClick={() => setAdding(true)}>+ Add teacher</button>
        </div>
      </div>

      {subject && (
        <div className="active-filter">
          Showing subject: <strong>{subject}</strong>
          <button className="chip-clear" onClick={clearSubject} aria-label="Clear subject filter">✕</button>
        </div>
      )}

      {klass && (
        <div className="active-filter">
          Showing class: <strong>{klass}</strong>
          <button className="chip-clear" onClick={clearClass} aria-label="Clear class filter">✕</button>
        </div>
      )}

      <div className="filter-bar">
        <label className="filter filter-grow">
          <span>Search</span>
          <input
            className="search"
            placeholder="Search name, subject, city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="filter">
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <label className="filter">
          <span>Registration</span>
          <select value={registration} onChange={(e) => setRegistration(e.target.value)}>
            <option value="">Registration</option>
            <option value="registered">Registered</option>
            <option value="unregistered">Unregistered</option>
          </select>
        </label>
        <label className="filter">
          <span>Country</span>
          <select value={countryF} onChange={(e) => setCountryF(e.target.value)}>
            <option value="">Country</option>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="filter">
          <span>State</span>
          <select value={stateF} onChange={(e) => setStateF(e.target.value)}>
            <option value="">State</option>
            {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="filter">
          <span>City</span>
          <select value={cityF} onChange={(e) => setCityF(e.target.value)}>
            <option value="">City</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <div className="filter-actions">
          <button
            className="btn-ghost"
            onClick={() => { setSearch(''); setStatus(''); setRegistration(''); setCountryF(''); setStateF(''); setCityF(''); }}
          >
            Reset
          </button>
        </div>
      </div>

      <DirectoryOverview
        type="teachers"
        filters={{ search, registration, country: countryF, state: stateF, city: cityF }}
      />

      {error && <div className="alert">{error}</div>}

      <div className="record-grid">
        {teachers.map((t) => (
          <div key={t.id} className={`record-card acc-${t.registration || 'none'}`}>
            <div className="record-head">
              <div className="record-id">
                <div className="record-avatar">{(t.name || '?').charAt(0).toUpperCase()}</div>
                <div>
                  <div className="record-title">{t.name}</div>
                  <div className="record-sub">{STATUS_LABEL[t.status]}</div>
                </div>
              </div>
              <span className={`reg-badge reg-${t.registration || 'none'}`}>
                {t.registration === 'registered' ? 'Registered' : t.registration === 'unregistered' ? 'Unregistered' : '—'}
              </span>
            </div>
            <div className="record-fields">
              {isAdmin && (
                <>
                  <div className="rf"><span className="rf-label">Phone</span><span className="rf-value">{t.phone || '—'}</span></div>
                  <div className="rf"><span className="rf-label">Email</span><span className="rf-value">{t.email || '—'}</span></div>
                </>
              )}
              <div className="rf"><span className="rf-label">Subjects</span><span className="rf-value">{t.subjects || '—'}</span></div>
              <div className="rf"><span className="rf-label">Boards</span><span className="rf-value">{t.boards || '—'}</span></div>
              <div className="rf"><span className="rf-label">Classes</span><span className="rf-value">{t.classes || '—'}</span></div>
              <div className="rf"><span className="rf-label">Experience</span><span className="rf-value">{t.experience || '—'}</span></div>
              <div className="rf"><span className="rf-label">City</span><span className="rf-value">{t.city || '—'}</span></div>
              <div className="rf"><span className="rf-label">State</span><span className="rf-value">{t.state || '—'}</span></div>
              <div className="rf"><span className="rf-label">Previous school/college</span><span className="rf-value">{t.previous_institution || '—'}</span></div>
              <div className="rf"><span className="rf-label">Registration</span><span className="rf-value">{t.registration || '—'}</span></div>
              <div className="rf block"><span className="rf-label">Note</span><span className="rf-value">{t.note || '—'}</span></div>
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
            <ContactActions type="teachers" id={t.id} registration={t.registration} onRegistrationChange={(v) => setReg(t.id, v)} />
          </div>
        ))}
        {teachers.length === 0 && <div className="record-empty">No teachers found.</div>}
      </div>

      {adding && (
        <TeacherForm onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

const EMPTY = {
  name: '', phone: '', email: '', city: '', state: '',
  subjects: [], boards: [], classes: [], experience: '',
  registration: 'registered', note: '', previous_institution: '',
};

function TeacherForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setVal = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setError('');
    if (!form.name || !form.phone || !form.city || !form.state) {
      return setError('Name, phone, city and state are required.');
    }
    if (form.subjects.length === 0) return setError('Please select at least one subject.');
    if (form.boards.length === 0) return setError('Please select at least one board.');
    if (form.classes.length === 0) return setError('Please select at least one class.');
    if (!form.experience) return setError('Please choose an experience level.');
    if (!form.previous_institution) return setError('Previous school / college is required.');

    setBusy(true);
    try {
      await api.post('/teachers', form);
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Add teacher</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {error && <div className="alert">{error}</div>}

        <div className="modal-body">
          <div className="grid-2">
            <label className="field"><span>Name *</span>
              <input value={form.name} onChange={set('name')} /></label>
            <label className="field"><span>Phone number *</span>
              <input value={form.phone} onChange={set('phone')} /></label>
            <label className="field"><span>Gmail ID</span>
              <input value={form.email} onChange={set('email')} placeholder="name@gmail.com" /></label>
            <label className="field"><span>City *</span>
              <input value={form.city} onChange={set('city')} /></label>
            <label className="field"><span>State *</span>
              <input value={form.state} onChange={set('state')} /></label>
            <label className="field"><span>Experience *</span>
              <select value={form.experience} onChange={set('experience')}>
                <option value="">Select…</option>
                {EXPERIENCE.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </label>
          </div>

          <div className="field"><span>Subject * (choose up to 3)</span></div>
          <ChipMultiSelect options={SUBJECTS} value={form.subjects} onChange={setVal('subjects')} max={3} />

          <div className="field mt"><span>Boards * (choose up to 3)</span></div>
          <ChipMultiSelect options={BOARDS} value={form.boards} onChange={setVal('boards')} max={3} />

          <div className="field mt"><span>Class * (choose up to 3)</span></div>
          <ChipMultiSelect options={CLASSES} value={form.classes} onChange={setVal('classes')} max={3} />

          <div className="field mt"><span>Previous school / college *</span>
            <input value={form.previous_institution} onChange={set('previous_institution')} /></div>

          <label className="field mt"><span>Note</span>
            <textarea rows={3} value={form.note} onChange={set('note')} /></label>

          <div className="field mt"><span>Registration *</span></div>
          <div className="radio-row">
            <label className={`radio ${form.registration === 'registered' ? 'on' : ''}`}>
              <input type="radio" name="treg" checked={form.registration === 'registered'}
                onChange={() => setForm((f) => ({ ...f, registration: 'registered' }))} />
              Register
            </label>
            <label className={`radio ${form.registration === 'unregistered' ? 'on' : ''}`}>
              <input type="radio" name="treg" checked={form.registration === 'unregistered'}
                onChange={() => setForm((f) => ({ ...f, registration: 'unregistered' }))} />
              Unregister
            </label>
          </div>
        </div>

        <div className="modal-foot">
          <div className="spacer" />
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Add teacher'}
          </button>
        </div>
      </div>
    </div>
  );
}
