import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AREAS from '../data/cityAreas';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';

// Business Associates — partners (consultants, marketing associates,
// institutions) who bring in leads, schools, teachers and tutors.
// Everyone can view / add / edit; only admins can delete.

export const ASSOCIATE_TYPES = ['Individual', 'Education Consultant', 'Marketing Associate', 'Institutional Partner', 'Principal', 'School Owner', 'Teacher', 'Others'];
export const PARTNERSHIP_MODELS = ['Commission-Based', 'Lead Generation', 'School Recruitment', 'Teacher / Tutor Registration'];

const OTHER = '__other__';

// Popup helper (same global toast the API client uses for "Saved").
function toast(message, type = 'success') {
  try {
    window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } }));
  } catch (_) { /* ignore */ }
}

// India state -> cities list, loaded on demand (same file the other forms use).
let locCache = null;
function loadIndia() {
  if (!locCache) {
    locCache = import('../data/locations.json')
      .then((m) => (m.default || m).India || {})
      .catch(() => ({}));
  }
  return locCache;
}

export default function BusinessAssociates() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [f, setF] = useState({ search: '', associate_type: '', partnership_model: '' });
  const [editing, setEditing] = useState(null); // {} for new, record for edit
  const [viewing, setViewing] = useState(null);
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    setError('');
    const seq = ++loadSeq.current;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (f.search) q.set('search', f.search);
      if (f.associate_type) q.set('associate_type', f.associate_type);
      if (f.partnership_model) q.set('partnership_model', f.partnership_model);
      const { associates } = await api.get(`/business-associates?${q.toString()}`);
      if (seq === loadSeq.current) setRows(associates || []);
    } catch (e) {
      if (seq === loadSeq.current) setError(e.message);
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [f]);

  useEffect(() => { load(); }, [load]);

  const remove = async (a) => {
    if (!window.confirm(`Delete business associate "${a.name}"? This cannot be undone.`)) return false;
    setError('');
    try {
      await api.del(`/business-associates/${a.id}`); // client shows "Deleted" popup
      setRows((prev) => prev.filter((x) => x.id !== a.id));
      return true;
    } catch (e) {
      setError(e.message);
      toast(e.message || 'Could not delete', 'error');
      return false;
    }
  };

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${label} copied`);
    } catch (_) {
      toast('Could not copy', 'error');
    }
  };

  const set = (k) => (e) => setF((prev) => ({ ...prev, [k]: e.target.value }));
  const counts = ASSOCIATE_TYPES.map((t) => ({ t, n: rows.filter((r) => r.associate_type === t).length }));

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Business Associates</h2>
          <p className="muted">{loading ? <Loader size="sm" inline label="Loading…" /> : `${rows.length} shown`}</p>
        </div>
        <div className="head-actions">
          <button className="btn-primary" onClick={() => navigate('/business-associates/new')}>+ Add associate</button>
        </div>
      </div>

      <div className="toolbar">
        <input
          className="search"
          placeholder="Search name, mobile, email, business, city, location…"
          value={f.search}
          onChange={set('search')}
        />
        <select value={f.associate_type} onChange={set('associate_type')}>
          <option value="">All associate types</option>
          {ASSOCIATE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={f.partnership_model} onChange={set('partnership_model')}>
          <option value="">All partnership models</option>
          {PARTNERSHIP_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <button className="btn-ghost" onClick={() => setF({ search: '', associate_type: '', partnership_model: '' })}>Reset</button>
      </div>

      <div className="status-row" style={{ marginBottom: 18 }}>
        {counts.map(({ t, n }) => (
          <div key={t} className="status-chip-card">
            <div className="chip-num">{n}</div>
            <div className="chip-label">{t}</div>
          </div>
        ))}
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="record-grid">
        {rows.map((a) => (
          <div key={a.id} className="record-card">
            <div className="record-head">
              <div className="record-id">
                <div className="record-avatar">{(a.name || '?').charAt(0).toUpperCase()}</div>
                <div>
                  <div className="record-title">{a.name}</div>
                  <div className="record-sub">{a.business_name || '—'}</div>
                </div>
              </div>
              {a.associate_type && <span className="badge s-contacted">{a.associate_type}</span>}
            </div>
            <div className="record-fields">
              <div className="rf"><span className="rf-label">Mobile</span><span className="rf-value">{a.mobile || '—'}</span></div>
              <div className="rf"><span className="rf-label">WhatsApp</span><span className="rf-value">{a.whatsapp || '—'}</span></div>
              <div className="rf"><span className="rf-label">Email</span><span className="rf-value">{a.email || '—'}</span></div>
              <div className="rf"><span className="rf-label">Partnership</span><span className="rf-value">{a.partnership_model || '—'}</span></div>
              <div className="rf"><span className="rf-label">City</span><span className="rf-value">{a.city || '—'}</span></div>
              <div className="rf"><span className="rf-label">State</span><span className="rf-value">{a.state || '—'}</span></div>
              <div className="rf"><span className="rf-label">Location</span><span className="rf-value">{a.location || '—'}</span></div>
              <div className="rf"><span className="rf-label">PAN</span><span className="rf-value">{a.pan_number || '—'}</span></div>
              <div className="rf"><span className="rf-label">Agreement</span><span className="rf-value">{Number(a.agreement_accepted) ? 'Accepted ✓' : 'Not accepted'}</span></div>
              <div className="rf block"><span className="rf-label">Address</span><span className="rf-value">{a.address || '—'}</span></div>
            </div>
            <div className="row-actions" style={{ flexWrap: 'wrap', marginTop: 10 }}>
              {a.mobile && <a className="btn-ghost sm" style={{ textDecoration: 'none' }} href={`tel:${a.mobile}`}>Call</a>}
              {(a.whatsapp || a.mobile) && (
                <a
                  className="btn-ghost sm"
                  style={{ textDecoration: 'none' }}
                  href={`https://wa.me/${String(a.whatsapp || a.mobile).replace(/\D/g, '').replace(/^(\d{10})$/, '91$1')}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              )}
              {a.mobile && <button className="btn-ghost sm" onClick={() => copy(a.mobile, 'Mobile number')}>Copy</button>}
              <button className="btn-ghost sm" onClick={() => setViewing(a)}>View</button>
              <button className="btn-ghost sm" onClick={() => navigate(`/business-associates/${a.id}/edit`)}>Edit</button>
              <button className="btn-contact compact" onClick={() => navigate(`/business-associates/${a.id}/followup`)}>Follow up</button>
              {/* Delete is inside the card: View window and Follow up page (admins only) */}
            </div>
          </div>
        ))}
        {loading && rows.length === 0 && <div className="record-empty"><Loader label="Loading business associates…" /></div>}
        {!loading && rows.length === 0 && <div className="record-empty">No business associates found.</div>}
      </div>

      {editing && (
        <AssociateForm
          record={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      {viewing && (
        <AssociateView
          record={viewing}
          onClose={() => setViewing(null)}
          onDelete={isAdmin ? async () => { if (await remove(viewing)) setViewing(null); } : undefined}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

const EMPTY = {
  name: '', mobile: '', whatsapp: '', email: '', business_name: '',
  associate_type: '', state: '', city: '', location: '', partnership_model: '',
  address: '', pan_number: '', agreement_accepted: false,
};

export function AssociateForm({ record, onClose, onSaved, fullPage = false }) {
  const isNew = !record.id;
  const [form, setForm] = useState(() => {
    const base = { ...EMPTY };
    Object.keys(EMPTY).forEach((k) => {
      if (record[k] !== undefined && record[k] !== null) base[k] = record[k];
    });
    base.agreement_accepted = !!Number(record.agreement_accepted || 0);
    return base;
  });
  const [sameAsMobile, setSameAsMobile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // State / City dropdowns (India), with "Other (type it)" fallback.
  const [india, setIndia] = useState(null);
  const [stateOther, setStateOther] = useState(false);
  const [cityOther, setCityOther] = useState(false);
  useEffect(() => {
    let alive = true;
    loadIndia().then((d) => {
      if (!alive) return;
      setIndia(d);
      // Editing a record whose state/city isn't in the list -> show typed boxes.
      if (record.state && !d[record.state]) setStateOther(true);
      else if (record.city && record.state && !(d[record.state] || []).includes(record.city)) setCityOther(true);
    });
    return () => { alive = false; };
  }, [record.state, record.city]);

  // Location (area) dropdown — depends on the chosen city. Options = common
  // areas for that city (src/data/cityAreas.js) + locations already saved for
  // it in the database, with "Other (type it)" for anything missing.
  const [savedLocs, setSavedLocs] = useState([]);
  const [locOther, setLocOther] = useState(false);
  useEffect(() => {
    let alive = true;
    setSavedLocs([]);
    if (!form.city) return undefined;
    api.get(`/business-associates/locations?city=${encodeURIComponent(form.city)}`)
      .then((d) => { if (alive) setSavedLocs(d.locations || []); })
      .catch(() => {});
    return () => { alive = false; };
  }, [form.city]);
  const locOptions = Array.from(new Set([
    ...(AREAS[form.city] || []),
    ...savedLocs,
    ...(record.location && record.city === form.city ? [record.location] : []),
  ])).sort((a, b) => a.localeCompare(b));
  const locTyped = locOther || (form.city && locOptions.length === 0);
  const onLocation = (e) => {
    const v = e.target.value;
    if (v === OTHER) { setLocOther(true); setForm((p) => ({ ...p, location: '' })); }
    else setForm((p) => ({ ...p, location: v }));
  };

  const states = india ? Object.keys(india) : [];
  const cities = (india && form.state && india[form.state]) || [];
  const stateTyped = india && (stateOther || states.length === 0);
  const cityTyped = india && (cityOther || stateTyped || (form.state && cities.length === 0));

  const set = (k) => (e) => {
    const v = e.target.value;
    setForm((prev) => ({ ...prev, [k]: v, ...(k === 'mobile' && sameAsMobile ? { whatsapp: v } : {}) }));
  };

  const onState = (e) => {
    const v = e.target.value;
    setCityOther(false);
    setLocOther(false);
    if (v === OTHER) { setStateOther(true); setForm((p) => ({ ...p, state: '', city: '', location: '' })); }
    else setForm((p) => ({ ...p, state: v, city: '', location: '' }));
  };
  const onCity = (e) => {
    const v = e.target.value;
    setLocOther(false);
    if (v === OTHER) { setCityOther(true); setForm((p) => ({ ...p, city: '', location: '' })); }
    else setForm((p) => ({ ...p, city: v, location: '' }));
  };

  const toggleSame = (e) => {
    const on = e.target.checked;
    setSameAsMobile(on);
    if (on) setForm((p) => ({ ...p, whatsapp: p.mobile }));
  };

  const fail = (msg) => { setError(msg); toast(msg, 'error'); };

  const save = async () => {
    setError('');
    if (!form.name.trim()) return fail('Associate name is required.');
    if (!form.mobile.trim()) return fail('Mobile number is required.');
    if (!/^[0-9+\-\s]{7,20}$/.test(form.mobile.trim())) return fail('Please enter a valid mobile number.');
    if (form.whatsapp && !/^[0-9+\-\s]{7,20}$/.test(form.whatsapp.trim())) return fail('Please enter a valid WhatsApp number.');
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return fail('Please enter a valid email address.');
    if (!form.associate_type) return fail('Please select an associate type.');
    if (!form.state) return fail('Please select a state.');
    if (!form.city) return fail('Please select a city.');
    // Partnership model is optional.
    const pan = (form.pan_number || '').trim().toUpperCase();
    if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) return fail('Please enter a valid PAN number (e.g. ABCDE1234F).');
    // Agreement acceptance is optional.

    setBusy(true);
    try {
      const payload = { ...form, pan_number: pan };
      if (isNew) await api.post('/business-associates', payload);
      else await api.put(`/business-associates/${record.id}`, payload);
      onSaved(); // client shows the "Saved" popup
    } catch (e) {
      fail(e.message || 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  const backToList = (which) => (
    <button
      type="button"
      style={{ background: 'none', border: 0, padding: 0, marginTop: 4, color: 'var(--primary, #4f46e5)', cursor: 'pointer', fontSize: 12, textAlign: 'left' }}
      onClick={() => {
        if (which === 'state') { setStateOther(false); setCityOther(false); setForm((p) => ({ ...p, state: '', city: '' })); }
        else { setCityOther(false); setForm((p) => ({ ...p, city: '' })); }
      }}
    >
      ← choose from list
    </button>
  );

  const title = isNew ? 'Add business associate' : `Edit ${record.name}`;
  const saveLabel = busy ? 'Saving…' : isNew ? 'Add associate' : 'Save';

  const fields = (
    <>
          <div className="grid-2">
            <label className="field"><span>Associate Name *</span>
              <input value={form.name} onChange={set('name')} placeholder="Full name" /></label>
            <label className="field"><span>Mobile Number *</span>
              <input value={form.mobile} onChange={set('mobile')} inputMode="tel" placeholder="10-digit mobile" /></label>

            <label className="field"><span>WhatsApp Number</span>
              <input value={form.whatsapp} onChange={set('whatsapp')} inputMode="tel" disabled={sameAsMobile} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: '#4a5164' }}>
                <input type="checkbox" checked={sameAsMobile} onChange={toggleSame} style={{ width: 'auto' }} />
                Same as mobile
              </label>
            </label>
            <label className="field"><span>Email Address</span>
              <input type="email" value={form.email} onChange={set('email')} placeholder="name@example.com" /></label>

            <label className="field"><span>Business / Organization Name</span>
              <input value={form.business_name} onChange={set('business_name')} /></label>
            <label className="field"><span>Associate Type *</span>
              <select value={form.associate_type} onChange={set('associate_type')}>
                <option value="">Select type…</option>
                {ASSOCIATE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>

            <label className="field"><span>State *</span>
              {!india ? (
                <select disabled><option>Loading…</option></select>
              ) : stateTyped ? (
                <>
                  <input value={form.state} onChange={set('state')} placeholder="Type state" />
                  {stateOther && states.length > 0 && backToList('state')}
                </>
              ) : (
                <select value={form.state} onChange={onState}>
                  <option value="">Select state…</option>
                  {states.map((s) => <option key={s} value={s}>{s}</option>)}
                  <option value={OTHER}>Other (type it)</option>
                </select>
              )}
            </label>
            <label className="field"><span>City *</span>
              {!india ? (
                <select disabled><option>Loading…</option></select>
              ) : !form.state && !stateTyped ? (
                <select disabled><option>Select state first</option></select>
              ) : cityTyped ? (
                <>
                  <input value={form.city} onChange={set('city')} placeholder="Type city" />
                  {cityOther && !stateTyped && cities.length > 0 && backToList('city')}
                </>
              ) : (
                <select value={form.city} onChange={onCity}>
                  <option value="">Select city…</option>
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                  <option value={OTHER}>Other (type it)</option>
                </select>
              )}
            </label>

            <label className="field"><span>Location</span>
              {!form.city ? (
                <select disabled><option>Select city first</option></select>
              ) : locTyped ? (
                <>
                  <input value={form.location} onChange={set('location')} placeholder="Type area / locality" />
                  {locOther && locOptions.length > 0 && (
                    <button
                      type="button"
                      style={{ background: 'none', border: 0, padding: 0, marginTop: 4, color: 'var(--primary, #4f46e5)', cursor: 'pointer', fontSize: 12, textAlign: 'left' }}
                      onClick={() => { setLocOther(false); setForm((p) => ({ ...p, location: '' })); }}
                    >
                      ← choose from list
                    </button>
                  )}
                </>
              ) : (
                <select value={form.location} onChange={onLocation}>
                  <option value="">Select location…</option>
                  {locOptions.map((l) => <option key={l} value={l}>{l}</option>)}
                  <option value={OTHER}>Other (type it)</option>
                </select>
              )}
            </label>

            <label className="field"><span>Partnership Model (Optional)</span>
              <select value={form.partnership_model} onChange={set('partnership_model')}>
                <option value="">Select model…</option>
                {PARTNERSHIP_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <label className="field"><span>PAN Number (Optional)</span>
              <input
                value={form.pan_number}
                onChange={(e) => setForm((p) => ({ ...p, pan_number: e.target.value.toUpperCase() }))}
                maxLength={10}
                placeholder="ABCDE1234F"
              />
            </label>
          </div>

          <label className="field"><span>Address</span>
            <textarea rows={3} value={form.address} onChange={set('address')} /></label>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13.5, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.agreement_accepted}
              onChange={(e) => setForm((p) => ({ ...p, agreement_accepted: e.target.checked }))}
              style={{ width: 'auto', marginTop: 3 }}
            />
            <span>I accept the AcadHr Business Associate agreement and terms of partnership. (Optional)</span>
          </label>
    </>
  );

  // Full-page version (used by /business-associates/new and /:id/edit).
  if (fullPage) {
    return (
      <div>
        <div className="page-head">
          <div>
            <h2>{title}</h2>
            <p className="muted">Fields marked * are required</p>
          </div>
          <div className="head-actions">
            <button className="btn-ghost" onClick={onClose}>← Back to associates</button>
          </div>
        </div>

        {error && <div className="alert">{error}</div>}

        <div style={{ background: 'var(--surface, #fff)', border: '1px solid var(--border, #e6e8ef)', borderRadius: 'var(--radius, 12px)', boxShadow: 'var(--shadow-sm)', padding: '24px 24px 8px' }}>
          {fields}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid var(--border, #e6e8ef)', margin: '20px -24px 0', padding: '16px 24px' }}>
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={save} disabled={busy}>{saveLabel}</button>
          </div>
        </div>
      </div>
    );
  }

  // Pop-up version.
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {error && <div className="alert">{error}</div>}

        <div className="modal-body">
          {fields}
        </div>

        <div className="modal-foot">
          <div className="spacer" />
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={busy}>
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function AssociateView({ record: a, onClose, onDelete }) {
  const rows = [
    ['Associate Name', a.name],
    ['Mobile Number', a.mobile],
    ['WhatsApp Number', a.whatsapp],
    ['Email Address', a.email],
    ['Business / Organization Name', a.business_name],
    ['Associate Type', a.associate_type],
    ['State', a.state],
    ['City', a.city],
    ['Location', a.location],
    ['Partnership Model', a.partnership_model],
    ['Address', a.address],
    ['PAN Number', a.pan_number],
    ['Agreement Acceptance', Number(a.agreement_accepted) ? 'Accepted' : 'Not accepted'],
    ['Added on', a.created_at ? new Date(a.created_at).toLocaleString() : ''],
  ];
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{a.name}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          <div className="record-fields">
            {rows.map(([label, value]) => (
              <div key={label} className="rf block">
                <span className="rf-label">{label}</span>
                <span className="rf-value">{value || '—'}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-foot">
          {onDelete && <button className="btn-danger" onClick={onDelete}>Delete</button>}
          <div className="spacer" />
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
