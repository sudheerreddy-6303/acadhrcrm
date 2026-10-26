import { useState } from 'react';
import { api } from '../api/client';
import LocationFields from './LocationFields';
import { ChipMultiSelect, BOARDS, CLASSES, LEADERSHIP } from './FieldControls';

// "Add teacher" form — same fields as the acadhr.com teacher registration
// (Your Info + Details steps), without the password:
//   Full name*, Email*, Phone*, City*, State*, Country*,
//   Subject specialization* (one or more), Experience, Qualification (one or more), Short bio*
// The older CRM-only fields are kept in an optional "More details" section.
// Saves to POST /api/teachers/register.

// Same options, same order as acadhr.com.
export const ACADHR_SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi',
  'Social Science', 'Computer Science', 'Economics', 'Commerce',
  'Physical Education', 'Sanskrit', 'French', 'Telugu', 'Kannada', 'Tamil',
  'History', 'Geography', 'Civics', 'Accountancy', 'Business Studies', 'Zoology',
];
export const ACADHR_QUALIFICATIONS = [
  'B.Sc', 'M.Sc', 'B.Tech', 'M.Tech', 'B.Ed', 'M.Ed', 'PhD', 'Diploma', 'B.A', 'M.A',
  'B.Com', 'M.Com', 'B.E', 'BCA', 'MCA', 'BBA', 'MBA', 'M.Phil', 'MBBS', 'BDS',
  'B.Pharm', 'M.Pharm', 'B.Arch', 'LLB', 'LLM', 'CA', 'CS', 'CMA', 'B.Sc Nursing',
];
export const ACADHR_EXPERIENCE = [
  'Fresher (0-1 year)', '1-3 years', '3-5 years', '5-10 years', '10+ years',
];

const EMPTY = {
  name: '', email: '', phone: '', country: 'India', state: '', city: '',
  subjects: [], experience: ACADHR_EXPERIENCE[0], qualification: [], bio: '',
  // optional CRM extras
  pincode: '', boards: [], classes: [], leadership: '', previous_institution: '', note: '',
};

function toast(message, type = 'success') {
  try { window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } })); } catch (_) { /* ignore */ }
}

const sectionTitle = {
  fontSize: 12.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
  color: '#4a5164', margin: '6px 0 8px',
};
const chipBox = {
  border: '1px solid var(--border, #e6e8ef)', background: '#f8f9fb', borderRadius: 12, padding: 10, marginBottom: 14,
};

export default function TeacherRegisterForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ ...EMPTY });
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setVal = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const fail = (msg) => { setError(msg); toast(msg, 'error'); };

  const save = async () => {
    setError('');
    if (!form.name.trim()) return fail('Full name is required.');
    if (!form.email.trim()) return fail('Email address is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return fail('Please enter a valid email address.');
    const digits = form.phone.replace(/\D/g, '');
    if (!form.phone.trim()) return fail('Phone number is required.');
    if (digits.length < 10 || digits.length > 13) return fail('Please enter a valid phone number.');
    if (!form.country) return fail('Please select a country.');
    if (!form.state) return fail('Please select a state.');
    if (!form.city) return fail('Please select a city.');
    if (!form.subjects.length) return fail('Please select at least one subject specialization.');
    if (!form.bio.trim()) return fail('Short bio is required.');
    if (form.pincode && form.country === 'India' && !/^\d{6}$/.test(form.pincode)) {
      return fail('Please enter a valid 6-digit pincode.');
    }

    setBusy(true);
    try {
      await api.post('/teachers/register', form); // "Saved" popup comes from the API client
      // Refresh the Courses / Subjects count tiles on the page.
      try { window.dispatchEvent(new Event('app:directory-refresh')); } catch (_) { /* ignore */ }
      onSaved();
    } catch (e) {
      fail(e.message || 'Could not add teacher');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop">{/* closes only via ✕ or Cancel, like the original form */}
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Add teacher</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {error && <div className="alert">{error}</div>}

        <div className="modal-body">
          {/* ---- Your Info ---- */}
          <div style={sectionTitle}>Your info</div>
          <label className="field"><span>Full name *</span>
            <input value={form.name} onChange={set('name')} placeholder="e.g. Priya Sharma" /></label>
          <label className="field"><span>Email address *</span>
            <input type="email" value={form.email} onChange={set('email')} placeholder="name@example.com" /></label>
          <div className="grid-2">
            <label className="field"><span>Phone number *</span>
              <input
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/[^0-9+\s-]/g, '') }))}
                placeholder="+91 98765 43210"
                maxLength={16}
              />
            </label>
            <LocationFields form={form} setForm={setForm} />
          </div>

          {/* ---- Details ---- */}
          <div style={{ ...sectionTitle, marginTop: 10 }}>Subject specialization * (select one or more)</div>
          <div style={chipBox}>
            <ChipMultiSelect options={ACADHR_SUBJECTS} value={form.subjects} onChange={setVal('subjects')} />
          </div>

          <div className="grid-2">
            <label className="field"><span>Experience</span>
              <select value={form.experience} onChange={set('experience')}>
                {ACADHR_EXPERIENCE.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </label>
          </div>

          <div style={sectionTitle}>Qualification (select one or more)</div>
          <div style={chipBox}>
            <ChipMultiSelect options={ACADHR_QUALIFICATIONS} value={form.qualification} onChange={setVal('qualification')} />
          </div>

          <label className="field"><span>Short bio *</span>
            <textarea rows={4} value={form.bio} onChange={set('bio')} placeholder="Tell schools about yourself..." /></label>

          {/* ---- Optional CRM-only details (from the earlier form) ---- */}
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setMore((m) => !m)}
            style={{ width: '100%', marginTop: 4 }}
            aria-expanded={more}
          >
            {more ? '▾ Hide more details' : '▸ More details (optional) — pincode, boards, classes, leadership, previous school, note'}
          </button>

          {more && (
            <div style={{ marginTop: 14 }}>
              <div className="grid-2">
                <label className="field"><span>Pincode</span>
                  <input
                    value={form.pincode}
                    onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value.replace(/[^0-9A-Za-z -]/g, '') }))}
                    inputMode="numeric" maxLength={10} placeholder="e.g. 500081"
                  />
                </label>
                <label className="field"><span>Leadership</span>
                  <select value={form.leadership} onChange={set('leadership')}>
                    <option value="">Select…</option>
                    {LEADERSHIP.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </label>
              </div>
              <div className="field"><span>Boards</span></div>
              <ChipMultiSelect options={BOARDS} value={form.boards} onChange={setVal('boards')} />
              <div className="field mt"><span>Classes</span></div>
              <ChipMultiSelect options={CLASSES} value={form.classes} onChange={setVal('classes')} />
              <label className="field mt"><span>Previous school / college</span>
                <input value={form.previous_institution} onChange={set('previous_institution')} /></label>
              <label className="field"><span>Note</span>
                <textarea rows={3} value={form.note} onChange={set('note')} /></label>
            </div>
          )}
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
