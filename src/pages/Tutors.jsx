import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import ContactActions from '../components/ContactActions';
import DirectoryOverview from '../components/DirectoryOverview';
import DirectoryFilters from '../components/DirectoryFilters';
import {
  ChipMultiSelect, SUBJECTS, BOARDS, CLASSES, TIMINGS,
} from '../components/FieldControls';

const STATUS_LABEL = { active: 'Active', pending: 'Pending', inactive: 'Inactive' };

export default function Tutors() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [tutors, setTutors] = useState([]);
  const [f, setF] = useState({ search: '', status: '', registration: '', country: '', state: '', city: '' });
  const [error, setError] = useState('');
  const [telecallers, setTelecallers] = useState([]);

  useEffect(() => {
    if (isAdmin) api.get('/users/telecallers').then((d) => setTelecallers(d.users || [])).catch(() => {});
  }, [isAdmin]);

  const assign = async (id, assignedTo) => {
    setError('');
    try {
      await api.patch(`/tutors/${id}/assign`, { assigned_to: assignedTo || null });
      setTutors((prev) => prev.map((x) => (x.id === id ? { ...x, assigned_to: assignedTo || null } : x)));
    } catch (e) {
      setError(e.message);
    }
  };
  const [adding, setAdding] = useState(false);
  const [params, setParams] = useSearchParams();
  const subject = params.get('subject') || '';
  const klass = params.get('class') || '';
  const regParam = params.get('registration') || '';
  const followupTitle = regParam === 'registered'
    ? 'Registration Followup — Tutors'
    : regParam === 'unregistered'
    ? 'Unregistration Followup — Tutors'
    : 'Tutors';

  // Apply the registration filter when opened from a sidebar follow-up link.
  useEffect(() => { setF((prev) => ({ ...prev, registration: regParam })); }, [regParam]);

  const load = useCallback(async () => {
    setError('');
    try {
      const q = new URLSearchParams();
      if (f.status) q.set('status', f.status);
      if (f.search) q.set('search', f.search);
      if (f.registration) q.set('registration', f.registration);
      if (f.state) q.set('state', f.state);
      if (f.city) q.set('city', f.city);
      if (f.country) q.set('country', f.country);
      if (subject) q.set('subject', subject);
      if (klass) q.set('class', klass);
      const { tutors } = await api.get(`/tutors?${q.toString()}`);
      setTutors(tutors);
    } catch (e) {
      setError(e.message);
    }
  }, [f, subject, klass]);

  useEffect(() => { load(); }, [load]);

  const setReg = async (id, registration) => {
    setError('');
    try {
      await api.patch(`/tutors/${id}/registration`, { registration });
      setTutors((prev) => prev.map((x) => (x.id === id ? { ...x, registration } : x)));
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
          <p className="muted">{tutors.length} shown</p>
        </div>
        <div className="head-actions">
          <button className="btn-ghost" onClick={() => navigate('/import?type=tutors')}>⭳ Import</button>
          <button className="btn-primary" onClick={() => setAdding(true)}>+ Add tutor</button>
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

      <DirectoryFilters value={f} onChange={setF} />

      <DirectoryOverview
        type="tutors"
        filters={{ search: f.search, registration: f.registration, country: f.country, state: f.state, city: f.city }}
      />

      {error && <div className="alert">{error}</div>}

      <div className="record-grid">
        {tutors.map((t) => (
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
              <div className="rf"><span className="rf-label">Timing</span><span className="rf-value">{t.timing || '—'}</span></div>
              <div className="rf"><span className="rf-label">City</span><span className="rf-value">{t.city || '—'}</span></div>
              <div className="rf"><span className="rf-label">State</span><span className="rf-value">{t.state || '—'}</span></div>
              <div className="rf"><span className="rf-label">Registration</span><span className="rf-value">{t.registration || '—'}</span></div>
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
            <ContactActions type="tutors" id={t.id} registration={t.registration} onRegistrationChange={(v) => setReg(t.id, v)} />
          </div>
        ))}
        {tutors.length === 0 && <div className="record-empty">No tutors found.</div>}
      </div>

      {adding && (
        <TutorForm onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

const EMPTY = {
  name: '', phone: '', email: '', city: '', state: '',
  subjects: [], boards: [], classes: [], timing: [], registration: 'registered',
};

function TutorForm({ onClose, onSaved }) {
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
    if (form.timing.length === 0) return setError('Please select at least one timing.');

    setBusy(true);
    try {
      await api.post('/tutors', form);
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
          <h3>Add tutor</h3>
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
          </div>

          <div className="field"><span>Subject * (choose up to 3)</span></div>
          <ChipMultiSelect options={SUBJECTS} value={form.subjects} onChange={setVal('subjects')} max={3} />

          <div className="field mt"><span>Boards * (choose up to 3)</span></div>
          <ChipMultiSelect options={BOARDS} value={form.boards} onChange={setVal('boards')} max={3} />

          <div className="field mt"><span>Class * (choose up to 3)</span></div>
          <ChipMultiSelect options={CLASSES} value={form.classes} onChange={setVal('classes')} max={3} />

          <div className="field mt"><span>Timing * (choose any)</span></div>
          <ChipMultiSelect options={TIMINGS} value={form.timing} onChange={setVal('timing')} />

          <div className="field mt"><span>Registration *</span></div>
          <div className="radio-row">
            <label className={`radio ${form.registration === 'registered' ? 'on' : ''}`}>
              <input type="radio" name="reg" checked={form.registration === 'registered'}
                onChange={() => setForm((f) => ({ ...f, registration: 'registered' }))} />
              Register
            </label>
            <label className={`radio ${form.registration === 'unregistered' ? 'on' : ''}`}>
              <input type="radio" name="reg" checked={form.registration === 'unregistered'}
                onChange={() => setForm((f) => ({ ...f, registration: 'unregistered' }))} />
              Unregister
            </label>
          </div>
        </div>

        <div className="modal-foot">
          <div className="spacer" />
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Add tutor'}
          </button>
        </div>
      </div>
    </div>
  );
}
