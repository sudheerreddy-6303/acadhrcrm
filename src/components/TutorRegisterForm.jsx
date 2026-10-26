import { useRef, useState } from 'react';
import { api } from '../api/client';
import LocationFields from './LocationFields';
import { ChipMultiSelect, BOARDS } from './FieldControls';
import { ACADHR_SUBJECTS, ACADHR_QUALIFICATIONS, ACADHR_EXPERIENCE } from './TeacherRegisterForm';

// "Add tutor" form — same fields as the acadhr.com tutor registration, without
// password / OTP. Saves to POST /api/tutors/register (photo + resume included).
// The older CRM-only field (boards) is kept under "More details".

export const ACADHR_TUTOR_CLASSES = [
  'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8',
  'Class 9', 'Class 10', 'Class 11', 'Class 12', 'JEE', 'NEET', 'FOUNDATION', 'IPMAT', 'CA FOUNDATION',
];
export const ACADHR_TIMINGS = ['Morning', 'Afternoon', 'Evening', 'Any Time'];
export const ACADHR_GENDERS = ['Male', 'Female', 'Other'];
export const ACADHR_TEACHING_MODES = ['Online', 'Offline', 'Both'];

const TERMS = [
  'I confirm that the information provided during registration is true and accurate.',
  'I agree to upload only valid and genuine documents.',
  'My profile will be reviewed and approved by the AcadHR team before it becomes active.',
  'Registering on AcadHR does not guarantee job placement or student assignments.',
];

const PHOTO_TYPES = ['image/jpeg', 'image/png'];
const RESUME_TYPES = [
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg', 'image/png',
];
const MB = 1024 * 1024;

const EMPTY = {
  name: '', email: '', phone: '', country: 'India', state: '', city: '',
  classes: [], subjects: [], qualification: [], experience: '', hourly_charges: '',
  gender: '', teaching_mode: 'Both', timing: [],
  address: '', location: '', pincode: '', class_link: '', demo_link: '', bio: '',
  terms_accepted: false, boards: [],
};

function toast(message, type = 'success') {
  try { window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } })); } catch (_) { /* ignore */ }
}
const readAsDataUrl = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(new Error('Could not read the file'));
  r.readAsDataURL(file);
});
const wordCount = (s) => (String(s || '').trim() ? String(s).trim().split(/\s+/).length : 0);

const sectionTitle = {
  fontSize: 12.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
  color: '#4a5164', margin: '6px 0 8px',
};
const chipBox = {
  border: '1px solid var(--border, #e6e8ef)', background: '#f8f9fb', borderRadius: 12, padding: 10, marginBottom: 6,
};
const dropZone = {
  width: '100%', border: '1.5px dashed #c7cdf5', background: '#f6f7ff', borderRadius: 12,
  padding: '18px 12px', textAlign: 'center', cursor: 'pointer', display: 'block', color: 'var(--text, #1f2433)',
};

function FilePicker({ label, hint, icon, accept, types, max, value, onChange, preview }) {
  const ref = useRef(null);
  const pick = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!types.includes(file.type)) { toast(`${label}: please choose ${hint}`, 'error'); return; }
    if (file.size > max) { toast(`${label} is too large (max ${Math.round(max / MB)} MB)`, 'error'); return; }
    try {
      const data = await readAsDataUrl(file);
      onChange({ name: file.name, type: file.type, size: file.size, data });
      toast(`${label} added: ${file.name}`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };
  return (
    <div style={{ marginBottom: 14 }}>
      <input ref={ref} type="file" accept={accept} onChange={pick} style={{ display: 'none' }} />
      <button type="button" style={dropZone} onClick={() => ref.current && ref.current.click()}>
        {value ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {preview && value.type.startsWith('image/') && (
              <img src={value.data} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 10 }} />
            )}
            <span style={{ textAlign: 'left', minWidth: 0 }}>
              <strong style={{ display: 'block', overflowWrap: 'anywhere' }}>{value.name}</strong>
              <span className="muted" style={{ fontSize: 12.5 }}>{value.size < MB ? `${Math.max(1, Math.round(value.size / 1024))} KB` : `${(value.size / MB).toFixed(1)} MB`} · tap to change</span>
            </span>
          </span>
        ) : (
          <>
            <span aria-hidden="true" style={{ fontSize: 26, display: 'block' }}>{icon}</span>
            <strong style={{ display: 'block', marginTop: 4 }}>Tap to upload {label.toLowerCase().includes('photo') ? 'the photo' : 'the resume'}</strong>
            <span className="muted" style={{ fontSize: 12.5 }}>{hint}</span>
          </>
        )}
      </button>
    </div>
  );
}

export default function TutorRegisterForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ ...EMPTY });
  const [photo, setPhoto] = useState(null);
  const [resume, setResume] = useState(null);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setVal = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const fail = (msg) => { setError(msg); toast(msg, 'error'); };
  const words = wordCount(form.bio);
  const isUrl = (v) => !v || /^https?:\/\/\S+$/i.test(v.trim());

  const save = async () => {
    setError('');
    if (!form.name.trim()) return fail('Full name is required.');
    if (!form.email.trim()) return fail('Email address is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return fail('Please enter a valid email address.');
    const digits = form.phone.replace(/\D/g, '');
    if (!form.phone.trim() || digits.length < 10 || digits.length > 13) return fail('Please enter a valid phone number.');
    if (!form.country) return fail('Please select a country.');
    if (!form.state) return fail('Please select a state.');
    if (!form.city) return fail('Please select a city.');
    if (!photo) return fail('Tutor photo is required.');
    if (!form.classes.length) return fail('Please select the classes the tutor can teach (up to 3).');
    if (!form.subjects.length) return fail('Please select at least one subject.');
    if (!form.qualification.length) return fail('Please select at least one qualification.');
    if (!form.experience) return fail('Please select experience.');
    if (!form.hourly_charges.trim()) return fail('Hourly charges are required.');
    if (!form.gender) return fail('Please select gender.');
    if (!form.teaching_mode) return fail('Please select teaching mode.');
    if (!form.timing.length) return fail('Please select at least one available timing.');
    if (form.pincode && form.country === 'India' && !/^\d{6}$/.test(form.pincode)) return fail('Please enter a valid 6-digit pincode.');
    if (!isUrl(form.class_link)) return fail('Class link must start with http:// or https://');
    if (!isUrl(form.demo_link)) return fail('Demo class link must start with http:// or https://');
    if (!form.bio.trim()) return fail('Write about yourself is required.');
    if (words > 300) return fail(`Write about yourself must be 300 words or fewer (now ${words}).`);
    if (!resume) return fail('Resume / CV is required.');
    if (!form.terms_accepted) return fail('Please accept the Terms & Conditions.');

    setBusy(true);
    try {
      await api.post('/tutors/register', {
        ...form,
        photo: { name: photo.name, type: photo.type, data: photo.data },
        resume: { name: resume.name, type: resume.type, data: resume.data },
      }); // "Saved" popup comes from the API client
      try { window.dispatchEvent(new Event('app:directory-refresh')); } catch (_) { /* ignore */ }
      onSaved();
    } catch (e) {
      fail(e.message || 'Could not add tutor');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop">{/* closes only via ✕ or Cancel, like the original form */}
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Add tutor</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {error && <div className="alert">{error}</div>}

        <div className="modal-body">
          {/* ---- Your Info ---- */}
          <div style={sectionTitle}>Your info</div>
          <label className="field"><span>Full name *</span>
            <input value={form.name} onChange={set('name')} placeholder="e.g. Ananya Singh" /></label>
          <label className="field"><span>Email address *</span>
            <input type="email" value={form.email} onChange={set('email')} placeholder="name@example.com" /></label>
          <div className="grid-2">
            <label className="field"><span>Phone number *</span>
              <input
                type="tel" inputMode="tel" maxLength={16} placeholder="+91 98765 43210"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/[^0-9+\s-]/g, '') }))}
              />
            </label>
            <LocationFields form={form} setForm={setForm} />
          </div>

          {/* ---- Details ---- */}
          <div style={{ ...sectionTitle, marginTop: 10 }}>Tutor photo *</div>
          <FilePicker
            label="Tutor photo" hint="JPG or PNG, max 5 MB" icon="📷" accept="image/jpeg,image/png"
            types={PHOTO_TYPES} max={5 * MB} value={photo} onChange={setPhoto} preview
          />

          <div style={sectionTitle}>Which class can teach * (select up to 3)</div>
          <div style={chipBox}>
            <ChipMultiSelect options={ACADHR_TUTOR_CLASSES} value={form.classes} onChange={setVal('classes')} max={3} />
          </div>

          <div style={{ ...sectionTitle, marginTop: 12 }}>Subjects * (select one or more)</div>
          <div style={chipBox}>
            <ChipMultiSelect options={ACADHR_SUBJECTS} value={form.subjects} onChange={setVal('subjects')} />
          </div>

          <div style={{ ...sectionTitle, marginTop: 12 }}>Qualifications * (select one or more)</div>
          <div style={chipBox}>
            <ChipMultiSelect options={ACADHR_QUALIFICATIONS} value={form.qualification} onChange={setVal('qualification')} />
          </div>

          <div className="grid-2" style={{ marginTop: 12 }}>
            <label className="field"><span>Experience *</span>
              <select value={form.experience} onChange={set('experience')}>
                <option value="">Select Experience</option>
                {ACADHR_EXPERIENCE.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </label>
            <label className="field"><span>Hourly charges *</span>
              <input value={form.hourly_charges} onChange={set('hourly_charges')} placeholder="e.g. ₹800/hr" maxLength={60} /></label>
            <label className="field"><span>Gender *</span>
              <select value={form.gender} onChange={set('gender')}>
                <option value="">Select</option>
                {ACADHR_GENDERS.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </label>
            <label className="field"><span>Teaching mode *</span>
              <select value={form.teaching_mode} onChange={set('teaching_mode')}>
                {ACADHR_TEACHING_MODES.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </label>
          </div>

          <div style={sectionTitle}>Available timings * (select one or more)</div>
          <div style={{ ...chipBox, marginBottom: 14 }}>
            <ChipMultiSelect options={ACADHR_TIMINGS} value={form.timing} onChange={setVal('timing')} />
          </div>

          <label className="field"><span>Address (optional)</span>
            <input value={form.address} onChange={set('address')} placeholder="House no., street, area" maxLength={255} /></label>
          <div className="grid-2">
            <label className="field"><span>Location (optional)</span>
              <input value={form.location} onChange={set('location')} placeholder="e.g. Banjara Hills, Hyderabad" maxLength={160} /></label>
            <label className="field"><span>Pincode (optional)</span>
              <input value={form.pincode} inputMode="numeric" maxLength={10} placeholder="e.g. 500034"
                onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value.replace(/[^0-9A-Za-z -]/g, '') }))} /></label>
          </div>
          <label className="field"><span>Class link (Google Meet / Zoom) (optional)</span>
            <input type="url" value={form.class_link} onChange={set('class_link')} placeholder="https://meet.google.com/..." /></label>
          <label className="field"><span>Demo class link (YouTube / Instagram) (optional)</span>
            <input type="url" value={form.demo_link} onChange={set('demo_link')} placeholder="https://youtube.com/...  or  https://instagram.com/..." /></label>

          <label className="field"><span>Write about yourself (in 300 words) *</span>
            <textarea rows={5} value={form.bio} onChange={set('bio')}
              placeholder="Tell students & parents about your teaching journey, style, achievements, and what makes you a great tutor... (aim for around 300 words)" />
          </label>
          <div className="muted" style={{ fontSize: 12.5, marginTop: -8, marginBottom: 14, color: words > 300 ? '#dc2626' : undefined, fontWeight: 600 }}>
            {words} / 300 words
          </div>

          <div style={sectionTitle}>Resume / CV *</div>
          <FilePicker
            label="Resume / CV" hint="PDF, DOC or image (max 10 MB)" icon="📄"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
            types={RESUME_TYPES} max={10 * MB} value={resume} onChange={setResume}
          />

          <div style={sectionTitle}>Terms & Conditions *</div>
          <div style={{ border: '1px solid var(--border, #e6e8ef)', background: '#f8f9fb', borderRadius: 12, padding: '12px 14px', maxHeight: 170, overflowY: 'auto' }}>
            <strong style={{ display: 'block', marginBottom: 6 }}>Tutor Registration – Terms & Conditions</strong>
            <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 4, fontSize: 13.5 }}>
              {TERMS.map((t) => <li key={t}>{t}</li>)}
            </ol>
          </div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, cursor: 'pointer', margin: '10px 0 6px' }}>
            <input type="checkbox" checked={form.terms_accepted}
              onChange={(e) => setForm((f) => ({ ...f, terms_accepted: e.target.checked }))}
              style={{ width: 18, height: 18, marginTop: 2 }} />
            <span>The tutor has read and agrees to the Terms & Conditions. *</span>
          </label>

          {/* ---- Optional CRM-only detail from the earlier form ---- */}
          <button type="button" className="btn-ghost" onClick={() => setMore((m) => !m)} style={{ width: '100%', marginTop: 8 }} aria-expanded={more}>
            {more ? '▾ Hide more details' : '▸ More details (optional) — boards'}
          </button>
          {more && (
            <div style={{ marginTop: 12 }}>
              <div className="field"><span>Boards</span></div>
              <ChipMultiSelect options={BOARDS} value={form.boards} onChange={setVal('boards')} />
            </div>
          )}
        </div>

        <div className="modal-foot">
          <div className="spacer" />
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Add tutor'}</button>
        </div>
      </div>
    </div>
  );
}
