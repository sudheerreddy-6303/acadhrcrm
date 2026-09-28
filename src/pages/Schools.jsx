import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import LocationFields from '../components/LocationFields';
import ContactActions from '../components/ContactActions';
import DirectoryOverview from '../components/DirectoryOverview';
import DirectoryFilters from '../components/DirectoryFilters';
import { INDIAN_STATES, CITIES, COUNTRIES } from '../components/FieldControls';

const STATUS_LABEL = { active: 'Active', pending: 'Pending', inactive: 'Inactive' };

export default function Schools() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  // true while the list is being fetched, so we show "Loading…" instead of "No schools found".
  const [loading, setLoading] = useState(true);
  const loadSeq = useRef(0);
  const [f, setF] = useState({ search: '', status: '', registration: '', country: '', state: '', city: '' });
  const [error, setError] = useState('');
  const [telecallers, setTelecallers] = useState([]);

  useEffect(() => {
    if (isAdmin) api.get('/users/telecallers').then((d) => setTelecallers(d.users || [])).catch(() => {});
  }, [isAdmin]);

  const assign = async (id, assignedTo) => {
    setError('');
    try {
      await api.patch(`/schools/${id}/assign`, { assigned_to: assignedTo || null });
      setSchools((prev) => prev.map((x) => (x.id === id ? { ...x, assigned_to: assignedTo || null } : x)));
    } catch (e) {
      setError(e.message);
    }
  };
  const [adding, setAdding] = useState(false);
  const [params] = useSearchParams();
  const regParam = params.get('registration') || '';
  const followupTitle = regParam === 'registered'
    ? 'Registration Followup — Schools / Institutions'
    : regParam === 'unregistered'
    ? 'Unregistration Followup — Schools / Institutions'
    : 'Schools / Institutions';

  // Apply the registration filter when opened from a sidebar follow-up link.
  useEffect(() => { setF((prev) => ({ ...prev, registration: regParam })); }, [regParam]);

  const load = useCallback(async () => {
    setError('');
    const seq = ++loadSeq.current; // ignore replies from older requests
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (f.status) q.set('status', f.status);
      if (f.search) q.set('search', f.search);
      if (f.registration) q.set('registration', f.registration);
      if (f.state) q.set('state', f.state);
      if (f.city) q.set('city', f.city);
      if (f.country) q.set('country', f.country);
      const { schools } = await api.get(`/schools?${q.toString()}`);
      if (seq === loadSeq.current) setSchools(schools);
    } catch (e) {
      if (seq === loadSeq.current) setError(e.message);
    } finally {
      if (seq === loadSeq.current) setLoading(false);
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
          <h2>{followupTitle}</h2>
          <p className="muted">{loading ? 'Loading…' : `${schools.length} shown`}</p>
        </div>
        <div className="head-actions">
          <button className="btn-ghost" onClick={() => navigate('/import?type=schools')}>⭳ Import</button>
          <button className="btn-primary" onClick={() => setAdding(true)}>+ Add school</button>
        </div>
      </div>

      <DirectoryFilters value={f} onChange={setF} />

      <DirectoryOverview
        type="schools"
        filters={{ search: f.search, registration: f.registration, country: f.country, state: f.state, city: f.city }}
      />

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
              <div className="rf"><span className="rf-label">Country</span><span className="rf-value">{s.country || '—'}</span></div>
              <div className="rf"><span className="rf-label">Pincode</span><span className="rf-value">{s.pincode || '—'}</span></div>
              <div className="rf"><span className="rf-label">Registration</span><span className="rf-value">{s.registration || '—'}</span></div>
              <div className="rf block"><span className="rf-label">Note</span><span className="rf-value">{s.note || '—'}</span></div>
            </div>
            {isAdmin && (
              <div className="assign-row">
                <span className="rf-label">Assign to</span>
                <select value={s.assigned_to || ''} onChange={(e) => assign(s.id, e.target.value)}>
                  <option value="">Unassigned</option>
                  {telecallers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            )}
            <ContactActions type="schools" id={s.id} registration={s.registration} onRegistrationChange={(v) => setReg(s.id, v)} />
          </div>
        ))}
        {loading && schools.length === 0 && (
          <div className="record-empty">Loading schools…</div>
        )}
        {!loading && schools.length === 0 && <div className="record-empty">No schools found.</div>}
      </div>

      {adding && (
        <SchoolForm onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

const EMPTY = {
  name: '', location: '', country: 'India', state: '', city: '', pincode: '',
  school_email: '', school_number: '',
  contact_person: '', phone: '', email: '', designation: '',
  contact_person2: '', phone2: '', email2: '', designation2: '',
  registration: 'unregistered', note: '',
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
    if (!form.country) return setError('Please select a country.');
    if (!form.pincode) return setError('Pincode is required.');
    if (form.country === 'India' && !/^\d{6}$/.test(form.pincode)) {
      return setError('Please enter a valid 6-digit pincode.');
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
    <div className="modal-backdrop">{/* closes only via ✕ or Cancel — clicking outside no longer closes the form */}
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

            <LocationFields form={form} setForm={setForm} />
            <label className="field"><span>Pincode *</span>
              <input value={form.pincode} onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value.replace(/[^0-9A-Za-z -]/g, '') }))}
                inputMode="numeric" maxLength={10} placeholder="e.g. 500081" /></label>

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
