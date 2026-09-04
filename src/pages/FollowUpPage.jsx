import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

const STATUS_LABEL = { active: 'Active', pending: 'Pending', inactive: 'Inactive' };
const ORDINALS = ['1st', '2nd', '3rd'];
const MAX_FOLLOW_UPS = 3;
const todayStr = () => new Date().toISOString().slice(0, 10);

// Contact-action icons (inline SVG so no extra dependency is needed).
const IconCall = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6
      A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81
      a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7
      A2 2 0 0 1 22 16.92z" />
  </svg>
);
const IconWhatsApp = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15
      -.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475
      -.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52
      .149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207
      -.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479
      0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.695.625
      .712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413
      -.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214
      -3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884
      2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884
      m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945
      L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893
      a11.821 11.821 0 0 0-3.48-8.413Z" />
  </svg>
);
const IconMail = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

// Build exactly 3 editable slots, pre-filled from any saved follow-ups.
function makeSlots(fu) {
  const list = Array.isArray(fu) ? fu : [];
  return Array.from({ length: MAX_FOLLOW_UPS }, (_, i) => ({
    date: list[i]?.date || todayStr(),
    remarks: list[i]?.remarks || '',
    status: list[i]?.status || '',
  }));
}

// Fields to show per record type (phone/email shown to everyone here — a follow-up
// caller needs the number). key -> label.
const FIELDS = {
  teachers: [
    ['phone', 'Phone'], ['email', 'Email'], ['subjects', 'Subjects'], ['boards', 'Boards'],
    ['classes', 'Classes'], ['experience', 'Experience'], ['city', 'City'], ['state', 'State'],
    ['previous_institution', 'Previous school/college'], ['note', 'Note'],
  ],
  tutors: [
    ['phone', 'Phone'], ['email', 'Email'], ['subjects', 'Subjects'], ['boards', 'Boards'],
    ['classes', 'Classes'], ['timing', 'Timing'], ['city', 'City'], ['state', 'State'], ['note', 'Note'],
  ],
  schools: [
    ['location', 'Location'], ['contact_person', 'Contact'], ['designation', 'Designation'],
    ['phone', 'Phone'], ['email', 'Mail ID'], ['school_email', 'School mail ID'],
    ['school_number', 'School number'], ['contact_person2', '2nd contact'], ['phone2', '2nd phone'],
    ['city', 'City'], ['state', 'State'], ['note', 'Note'],
  ],
};

const TYPE_LABEL = { teachers: 'Teacher', tutors: 'Tutor', schools: 'School' };

// School subscription tiers — from the acadhr.com pricing page (For Schools).
const PLAN_OPTS = [
  {
    value: 'basic', label: 'Basic Recruitment', price: '₹4,999', note: '/month per school',
    features: [
      'Post up to 5 jobs',
      'Faculty Resume Database Access',
      'Candidate Search Filters',
      'Email & WhatsApp Candidate Alerts',
      'School Profile Page',
      'Applicant Tracking Dashboard',
      'Basic Recruitment Reports',
    ],
  },
  {
    value: 'professional', label: 'Professional Hiring', price: '₹15,000', note: '/month per school',
    featured: true, intro: 'Everything in Basic plus:',
    features: [
      'Post up to 10 jobs/month',
      'Dedicated Recruitment Coordinator',
      'Candidate Screening Support',
      'Interview Coordination',
      'Priority Access to Top Faculty',
      'Subject-wise Talent Pool',
      'Principals',
      'Vice Principals',
      'Academic Directors',
      'Coordinators',
      'Featured School Profile',
      'Featured Job Listings',
    ],
  },
  {
    value: 'enterprise', label: 'Enterprise Chain School', price: '₹25,000 – ₹1,00,000', note: '/month · 5+ schools',
    intro: 'Everything in Professional plus:',
    features: [
      'Dedicated Recruiter, Single Point of Contact',
      'Monthly Recruitment Planning',
      'Requirement Collection',
      'Demo Classes Scheduling',
      'Joining Tracking',
      'Principals',
      'Vice Principals',
      'Academic Heads',
      'Deans',
      'HODs',
      'Counselors',
    ],
  },
];

// Tutor subscription tiers — from the acadhr.com pricing page (For Tutors).
const TUTOR_PLAN_OPTS = [
  {
    value: 'inaugural', label: 'Inaugural Offer', price: '₹1,500', note: '+ GST / month',
    badge: 'Launch Offer',
    features: [
      'Apply to up to 10 profiles',
      'Improved profile visibility',
      'Shortlisted job alerts',
    ],
  },
  {
    value: 'pro', label: 'Pro Tutor', price: '₹3,000', note: '+ GST / month', featured: true,
    features: [
      'Up to 20 job applications',
      'Priority profile shown to parents',
      'Direct recruiter support',
      'Highlighted profile',
    ],
  },
];

// Teacher subscription tiers — from the acadhr.com pricing page (For Teachers).
const TEACHER_PLAN_OPTS = [
  {
    value: 'inaugural', label: 'Inaugural Offer', price: 'Free', note: 'Limited launch offer',
    badge: 'Free', tone: 'free',
    features: [
      'Basic profile',
      'Apply to up to 5 jobs',
      'View job listings',
      'Job alerts',
    ],
  },
  {
    value: 'starter', label: 'Starter', price: '₹1,500', note: '+ GST / month',
    features: [
      'Apply to up to 10 jobs',
      'Priority profile visibility',
      'Resume building',
      'Access to shortlisted jobs',
      'Regular job alerts',
    ],
  },
  {
    value: 'premium', label: 'Premium', price: '₹2,000', note: '+ GST / month', featured: true,
    features: [
      'Top priority visibility',
      'Direct interview opportunities from schools',
      'Dedicated profile promotion',
      'Early alerts to high-paying roles',
    ],
  },
  {
    value: 'prestige', label: 'Prestige', price: '₹2,500', note: '+ GST / month',
    badge: 'Leadership', tone: 'leadership', intro: 'Exclusively for leadership roles',
    features: [
      'Dedicated HR for interviews',
      'Profile boosting',
      'Early job alerts',
    ],
  },
];

// Which plan set to show per record type.
const PLAN_SETS = { schools: PLAN_OPTS, tutors: TUTOR_PLAN_OPTS, teachers: TEACHER_PLAN_OPTS };

function waNumber(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  return d.length === 10 ? `91${d}` : d;
}

function StatusBadge({ status }) {
  if (!status) return null;
  return <span className={`fu-badge st-${status}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

// Yes / No toggle used in the Job follow-up. Click the active one again to clear.
function YesNo({ label, value, onChange }) {
  return (
    <div className="jf-row">
      <span className="jf-label">{label}</span>
      <div className="jf-yn">
        <button
          type="button"
          className={`jf-btn ${value === 'yes' ? 'on yes' : ''}`}
          onClick={() => onChange(value === 'yes' ? '' : 'yes')}
        >
          Yes
        </button>
        <button
          type="button"
          className={`jf-btn ${value === 'no' ? 'on no' : ''}`}
          onClick={() => onChange(value === 'no' ? '' : 'no')}
        >
          No
        </button>
      </div>
    </div>
  );
}

export default function FollowUpPage() {
  const { type, id } = useParams();
  const navigate = useNavigate();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Three editable follow-up slots, all shown at once.
  const [slots, setSlots] = useState(() => makeSlots([]));
  const [saving, setSaving] = useState(false);

  // Job follow-up (registered records): demo / interview / hired + notes.
  const [job, setJob] = useState({ demo: '', interview: '', hired: '', description: '' });
  const [savingJob, setSavingJob] = useState(false);

  const valid = ['teachers', 'tutors', 'schools'].includes(type);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { record } = await api.get(`/${type}/${id}`);
      setRecord(record);
    } catch (e) {
      setError(e.message || 'Could not load record');
    } finally {
      setLoading(false);
    }
  }, [type, id]);

  useEffect(() => {
    if (valid) load();
    else setLoading(false);
  }, [valid, load]);

  // Keep the 3 slots + job follow-up in sync with whatever is saved on the record.
  useEffect(() => {
    if (record) {
      setSlots(makeSlots(record.follow_ups));
      const j = record.job_follow_up || {};
      setJob({
        demo: j.demo || '', interview: j.interview || '', hired: j.hired || '',
        description: j.description || '',
      });
    }
  }, [record]);

  if (!valid) {
    return (
      <div className="page followup-page">
        <button className="btn-back" onClick={() => navigate(-1)}>← Back</button>
        <div className="record-empty">Unknown record type.</div>
      </div>
    );
  }

  const followUps = Array.isArray(record?.follow_ups) ? record.follow_ups : [];
  const completedCount = followUps.filter((f) => f.status || (f.remarks && f.remarks.trim())).length;

  const saveJob = async () => {
    setSavingJob(true);
    setError('');
    try {
      const { job_follow_up } = await api.patch(`/${type}/${id}/jobfollowup`, { job });
      setRecord((r) => ({ ...r, job_follow_up }));
    } catch (e) {
      setError(e.message || 'Could not save job follow-up');
    } finally {
      setSavingJob(false);
    }
  };

  const setReg = async (registration) => {
    setError('');
    try {
      await api.patch(`/${type}/${id}/registration`, { registration });
      setRecord((r) => ({ ...r, registration }));
    } catch (e) {
      setError(e.message);
    }
  };

  const savePlan = async (plan) => {
    setError('');
    try {
      const res = await api.patch(`/${type}/${id}/plan`, { plan });
      setRecord((r) => ({ ...r, plan: res.plan }));
    } catch (e) {
      setError(e.message);
    }
  };

  // Schools log "Customer feedback"; teachers/tutors log call "Remarks".
  const isSchool = type === 'schools';
  const planOpts = PLAN_SETS[type] || null;
  // Schools and tutors log "Customer feedback"; teachers log call "Remarks".
  const usesFeedback = type === 'schools' || type === 'tutors';
  const feedbackLabel = usesFeedback ? 'Customer feedback' : 'Remarks';
  const feedbackPlaceholder = usesFeedback ? 'Customer feedback…' : 'What happened on this call…';

  const setSlot = (i, key) => (e) => {
    const v = e.target.value;
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, [key]: v } : s)));
  };

  const saveSlots = async () => {
    // Save all three slots, keeping their positions (1st / 2nd / 3rd).
    const list = slots.map((s) => ({
      date: s.date || todayStr(),
      remarks: (s.remarks || '').trim(),
      status: s.status || '',
    }));
    setSaving(true);
    setError('');
    try {
      const { follow_ups } = await api.patch(`/${type}/${id}/followups`, { followUps: list });
      setRecord((r) => ({ ...r, follow_ups }));
    } catch (e) {
      setError(e.message || 'Could not save follow-up');
    } finally {
      setSaving(false);
    }
  };

  const phone = record?.phone;
  const wa = waNumber(phone);
  const email = record?.email;

  return (
    <div className="page followup-page">
      <button className="btn-back" onClick={() => navigate(-1)}>← Back</button>

      {loading && <div className="record-empty">Loading…</div>}
      {error && <div className="alert">{error}</div>}

      {record && (
        <>
          <div className="fu-header">
            <div className="record-avatar lg">{(record.name || '?').charAt(0).toUpperCase()}</div>
            <div className="fu-header-main">
              <h2 className="fu-name">{record.name}</h2>
              <div className="fu-meta">
                <span className="muted">{TYPE_LABEL[type]}</span>
                {record.status && <span className="muted">· {STATUS_LABEL[record.status] || record.status}</span>}
                <span className={`reg-badge reg-${record.registration || 'none'}`}>
                  {record.registration === 'registered' ? 'Registered'
                    : record.registration === 'unregistered' ? 'Unregistered' : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Contact quick actions */}
          <div className="contact-actions wide">
            {phone
              ? <a className="ca ca-call" href={`tel:${phone}`}><span className="ca-ico"><IconCall /></span>Call</a>
              : <span className="ca ca-off"><span className="ca-ico"><IconCall /></span>Call</span>}
            {wa
              ? <a className="ca ca-wa" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer"><span className="ca-ico"><IconWhatsApp /></span>WhatsApp</a>
              : <span className="ca ca-off"><span className="ca-ico"><IconWhatsApp /></span>WhatsApp</span>}
            {email
              ? <a className="ca ca-mail" href={`mailto:${email}`}><span className="ca-ico"><IconMail /></span>Mail</a>
              : <span className="ca ca-off"><span className="ca-ico"><IconMail /></span>Mail</span>}
          </div>

          {/* Details */}
          <div className="card">
            <div className="record-fields">
              {FIELDS[type].map(([key, label]) => (
                <div className="rf" key={key}>
                  <span className="rf-label">{label}</span>
                  <span className="rf-value">{record[key] || '—'}</span>
                </div>
              ))}
            </div>

            <div className="fu-reg card-foot">
              <span className="rf-label">Registration</span>
              <div className="reg-toggle">
                <label className={`reg-opt ${record.registration === 'registered' ? 'on' : ''}`}>
                  <input type="radio" checked={record.registration === 'registered'} onChange={() => setReg('registered')} />
                  Register
                </label>
                <label className={`reg-opt ${record.registration === 'unregistered' ? 'on' : ''}`}>
                  <input type="radio" checked={record.registration === 'unregistered'} onChange={() => setReg('unregistered')} />
                  Unregister
                </label>
              </div>
            </div>
          </div>

          {/* School subscription plan (schools only) */}
          {planOpts && (
            <div className="card">
              <div className="fu-section-head"><h3>Plan</h3></div>
              <div className="plan-options">
                {planOpts.map((p) => (
                  <label
                    key={p.value}
                    className={`plan-opt ${record.plan === p.value ? 'on' : ''} ${p.featured ? 'featured' : ''}`}
                  >
                    <span className="plan-top">
                      <input
                        type="radio"
                        name="school-plan"
                        checked={record.plan === p.value}
                        onChange={() => savePlan(p.value)}
                      />
                      <span className="plan-name">{p.label}</span>
                    </span>
                    <span className="plan-price">{p.price}</span>
                    <span className="plan-note">{p.note}</span>
                    {p.intro && <span className="plan-intro">{p.intro}</span>}
                    <ul className="plan-feats">
                      {p.features.map((f, i) => (
                        <li key={i}><span className="fk">✓</span>{f}</li>
                      ))}
                    </ul>
                    {(p.badge || p.featured) && (
                      <span className={`plan-tag ${p.tone ? `tone-${p.tone}` : ''}`}>{p.badge || 'Most Popular'}</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Follow-up calls — all three shown at once */}
          <div className="card">
            <div className="fu-section-head">
              <h3>Follow-ups</h3>
              <span className="muted">{completedCount} of {MAX_FOLLOW_UPS} completed</span>
            </div>

            {slots.map((s, i) => (
              <div className={`fu-next ${s.status || (s.remarks && s.remarks.trim()) ? 'is-done' : ''}`} key={i}>
                <div className="fu-call-label big">{ORDINALS[i]} call</div>
                <div className="fu-next-grid">
                  <label className="fu-field">
                    <span className="rf-label">Date</span>
                    <input type="date" value={s.date} onChange={setSlot(i, 'date')} />
                  </label>
                  <label className="fu-field wide">
                    <span className="rf-label">{feedbackLabel}</span>
                    <input
                      type="text"
                      placeholder={feedbackPlaceholder}
                      value={s.remarks}
                      onChange={setSlot(i, 'remarks')}
                    />
                  </label>
                  <label className="fu-field">
                    <span className="rf-label">Status</span>
                    <select
                      className={`fu-status st-${s.status || 'none'}`}
                      value={s.status}
                      onChange={setSlot(i, 'status')}
                    >
                      <option value="">Status</option>
                      <option value="hot">Hot</option>
                      <option value="cold">Cold</option>
                      <option value="dead">Dead</option>
                    </select>
                  </label>
                </div>
              </div>
            ))}

            <div className="fu-foot">
              <button className="btn-primary" onClick={saveSlots} disabled={saving}>
                {saving ? 'Saving…' : 'Save follow-ups'}
              </button>
            </div>
          </div>

          {/* Job follow-up — shown once the record is registered */}
          {record.registration === 'registered' && (
            <div className="card">
              <div className="fu-section-head"><h3>Job Follow-up</h3></div>
              <div className="jobfollow">
                <YesNo label="Demo" value={job.demo} onChange={(v) => setJob((j) => ({ ...j, demo: v }))} />
                <YesNo label="Personal Interview" value={job.interview} onChange={(v) => setJob((j) => ({ ...j, interview: v }))} />
                <YesNo label="Hired" value={job.hired} onChange={(v) => setJob((j) => ({ ...j, hired: v }))} />
                <label className="jf-desc">
                  <span className="rf-label">Description</span>
                  <textarea
                    rows={3}
                    placeholder="Notes about the job follow-up…"
                    value={job.description}
                    onChange={(e) => setJob((j) => ({ ...j, description: e.target.value }))}
                  />
                </label>
                <div className="fu-foot">
                  <button className="btn-primary" onClick={saveJob} disabled={savingJob}>
                    {savingJob ? 'Saving…' : 'Save job follow-up'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
