import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import ContactActions from '../components/ContactActions';
import DirectoryOverview from '../components/DirectoryOverview';
import DirectoryFilters from '../components/DirectoryFilters';
import { INDIAN_STATES, CITIES } from '../components/FieldControls';

const STATUS_LABEL = { active: 'Active', pending: 'Pending', inactive: 'Inactive' };

export default function Schools() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  const [f, setF] = useState({ search: '', status: '', registration: '', state: '', city: '' });
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const q = new URLSearchParams();
      if (f.status) q.set('status', f.status);
      if (f.search) q.set('search', f.search);
      if (f.registration) q.set('registration', f.registration);
      if (f.state) q.set('state', f.state);
      if (f.city) q.set('city', f.city);
      const { schools } = await api.get(`/schools?${q.toString()}`);
      setSchools(schools);
    } catch (e) {
      setError(e.message);
    }
  }, [f]);

  useEffect(() => { load(); }, [load]);

  const setReg = async (id, registration) => {
    setError('');
    try {
      await api.patch(`/schools/${id}/registration`, { registration });
      setSchools((prev) => prev.map((x) => (x.id === id ? { ...x, registration } : x)));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Schools / Institutions</h2>
          <p className="muted">{schools.length} shown</p>
        </div>
        <div className="head-actions">
          <button className="btn-ghost" onClick={() => navigate('/import?type=schools')}>⭳ Import</button>
          <button className="btn-primary" onClick={() => setAdding(true)}>+ Add school</button>
        </div>
      </div>

      <DirectoryOverview
        type="schools"
        filters={{ search: f.search, registration: f.registration, state: f.state, city: f.city }}
      />

      <DirectoryFilters value={f} onChange={setF} />

      {error && <div className="alert">{error}</div>}

      <div className="record-grid">
        {schools.map((s) => (
          <div key={s.id} className={`record-card acc-${s.registration || 'none'}`}>
            <div className="record-head">
              <div className="record-id">
                <div className="record-avatar">{(s.name || '?').charAt(0).toUpperCase()}</div>
                <div>
                  <div className="record-title">{s.name}</div>
                  <div className="record-sub">{STATUS_LABEL[s.status]}</div>
                </div>
              </div>
              <span className={`reg-badge reg-${s.registration || 'none'}`}>
                {s.registration === 'registered' ? 'Registered' : s.registration === 'unregistered' ? 'Unregistered' : '—'}
              </span>
            </div>
            <div className="record-fields">
              <div className="rf"><span className="rf-label">Location</span><span className="rf-value">{s.location || '—'}</span></div>
              <div className="rf"><span className="rf-label">Contact</span><span className="rf-value">{s.contact_person || '—'}</span></div>
              <div className="rf"><span className="rf-label">Designation</span><span className="rf-value">{s.designation || '—'}</span></div>
              {isAdmin && (
                <>
                  <div className="rf"><span className="rf-label">Phone</span><span className="rf-value">{s.phone || '—'}</span></div>
                  <div className="rf"><span className="rf-label">Mail ID</span><span className="rf-value">{s.email || '—'}</span></div>
                  <div className="rf"><span className="rf-label">School mail ID</span><span className="rf-value">{s.school_email || '—'}</span></div>
                  <div className="rf"><span className="rf-label">School number</span><span className="rf-value">{s.school_number || '—'}</span></div>
                  {s.contact_person2 && (
                    <>
                      <div className="rf"><span className="rf-label">2nd contact</span><span className="rf-value">{s.contact_person2}</span></div>
                      <div className="rf"><span className="rf-label">2nd phone</span><span className="rf-value">{s.phone2 || '—'}</span></div>
                    </>
                  )}
                </>
              )}
              <div className="rf"><span className="rf-label">City</span><span className="rf-value">{s.city || '—'}</span></div>
              <div className="rf"><span className="rf-label">State</span><span className="rf-value">{s.state || '—'}</span></div>
              <div className="rf"><span className="rf-label">Registration</span><span className="rf-value">{s.registration || '—'}</span></div>
              <div className="rf block"><span className="rf-label">Note</span><span className="rf-value">{s.note || '—'}</span></div>
            </div>
            <ContactActions phone={s.phone} email={s.email} registration={s.registration} onRegistrationChange={(v) => setReg(s.id, v)} />
          </div>
        ))}
        {schools.length === 0 && <div className="record-empty">No schools found.</div>}
      </div>

      {adding && (
        <SchoolForm onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

const EMPTY = {
  name: '', location: '', state: '', city: '',
  school_email: '', school_number: '',
  contact_person: '', phone: '', email: '', designation: '',
  contact_person2: '', phone2: '', email2: '', designation2: '',
  registration: 'registered', note: '',
};

function SchoolForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setError('');
    if (!form.name || !form.location || !form.state || !form.city ||
        !form.contact_person || !form.phone || !form.email || !form.designation) {
      return setError('Please fill all required (*) fields.');
    }
    setBusy(true);
    try {
      await api.post('/schools', form);
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
          <h3>Add school</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {error && <div className="alert">{error}</div>}

        <div className="modal-body">
          <div className="grid-2">
            <label className="field"><span>School name *</span>
              <input value={form.name} onChange={set('name')} /></label>
            <label className="field"><span>Location *</span>
              <input value={form.location} onChange={set('location')} placeholder="Area / landmark" /></label>

            <label className="field"><span>State *</span>
              <select value={form.state} onChange={set('state')}>
                <option value="">Select state…</option>
                {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="field"><span>City *</span>
              <select value={form.city} onChange={set('city')}>
                <option value="">Select city…</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            <label className="field"><span>School mail ID</span>
              <input value={form.school_email} onChange={set('school_email')} placeholder="school@example.com" /></label>
            <label className="field"><span>School number</span>
              <input value={form.school_number} onChange={set('school_number')} /></label>

            <label className="field"><span>Contact person name *</span>
              <input value={form.contact_person} onChange={set('contact_person')} /></label>
            <label className="field"><span>Phone number *</span>
              <input value={form.phone} onChange={set('phone')} /></label>

            <label className="field"><span>Mail ID *</span>
              <input value={form.email} onChange={set('email')} placeholder="contact@example.com" /></label>
            <label className="field"><span>Designation *</span>
              <input value={form.designation} onChange={set('designation')} placeholder="Principal, Admin…" /></label>
          </div>

          <div className="field mt"><span>Second contact person (optional)</span></div>
          <div className="grid-2">
            <label className="field"><span>Contact person name</span>
              <input value={form.contact_person2} onChange={set('contact_person2')} /></label>
            <label className="field"><span>Phone number</span>
              <input value={form.phone2} onChange={set('phone2')} /></label>

            <label className="field"><span>Mail ID</span>
              <input value={form.email2} onChange={set('email2')} placeholder="contact@example.com" /></label>
            <label className="field"><span>Designation</span>
              <input value={form.designation2} onChange={set('designation2')} placeholder="Vice Principal, Admin…" /></label>
          </div>

          <div className="field mt"><span>Registration *</span></div>
          <div className="radio-row">
            <label className={`radio ${form.registration === 'registered' ? 'on' : ''}`}>
              <input type="radio" name="sreg" checked={form.registration === 'registered'}
                onChange={() => setForm((f) => ({ ...f, registration: 'registered' }))} />
              Register
            </label>
            <label className={`radio ${form.registration === 'unregistered' ? 'on' : ''}`}>
              <input type="radio" name="sreg" checked={form.registration === 'unregistered'}
                onChange={() => setForm((f) => ({ ...f, registration: 'unregistered' }))} />
              Unregister
            </label>
          </div>

          <label className="field mt"><span>Note</span>
            <textarea rows={3} value={form.note} onChange={set('note')} /></label>
        </div>

        <div className="modal-foot">
          <div className="spacer" />
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Add school'}
          </button>
        </div>
      </div>
    </div>
  );
}
