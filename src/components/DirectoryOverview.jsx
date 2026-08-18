import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { COURSES, SUBJECTS } from './FieldControls';

// Dashboard-style overview for a single directory type (teachers/tutors/schools).
// Shows total + registered/unregistered, and (for teachers/tutors) Courses,
// Subjects and Classes breakdowns — all scoped to that type only.
export default function DirectoryOverview({ type, filters = {} }) {
  const [dir, setDir] = useState(null);
  const [subjects, setSubjects] = useState(null);
  const [classes, setClasses] = useState(null);

  const { search = '', registration = '', state = '', city = '' } = filters;

  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const q = new URLSearchParams();
        q.set('type', type);
        if (search) q.set('search', search);
        if (registration) q.set('registration', registration);
        if (state) q.set('state', state);
        if (city) q.set('city', city);
        const qs = q.toString();
        const subjQs = new URLSearchParams(qs);
        subjQs.delete('type'); // subjects endpoint returns both maps; we pick by type
        const [d, s, c] = await Promise.all([
          api.get(`/dashboard/directory?${qs}`),
          api.get(`/dashboard/subjects?${subjQs.toString()}`),
          api.get(`/dashboard/classes?${qs}`),
        ]);
        if (!ok) return;
        setDir(d);
        setSubjects((s && s[type]) || {});
        setClasses((c && c.counts) || {});
      } catch (e) {
        /* overview is best-effort; ignore */
      }
    })();
    return () => { ok = false; };
  }, [type, search, registration, state, city]);

  if (!dir) return null;

  const hasSubjects = type === 'teachers' || type === 'tutors';
  const courseKeys = COURSES;
  const subjectKeys = Array.from(new Set([
    ...SUBJECTS.filter((s) => !COURSES.includes(s)),
    ...Object.keys(subjects || {}).filter((k) => !COURSES.includes(k)),
  ]));
  const classKeys = Array.from(new Set([
    '6th', '7th', '8th', '9th', '10th', '11th', '12th',
    ...Object.keys(classes || {}),
  ]));

  return (
    <div className="dir-overview">
      <div className="total-hero-wrap">
        <div className="stat-card feature total-hero">
          <div className="hero-total">
            <div className="stat-num">{dir.total}</div>
            <div className="stat-label">Total {type}</div>
          </div>
          <div className="hero-breakdown">
            <div className="hb"><span className="hb-num">{dir.registered}</span><span className="hb-lab">Registered</span></div>
            <div className="hb"><span className="hb-num">{dir.unregistered}</span><span className="hb-lab">Unregistered</span></div>
          </div>
        </div>
      </div>

      {hasSubjects && (
        <>
          <h3 className="section-title">Courses</h3>
          <div className="subject-grid">
            {courseKeys.map((s) => (
              <div key={s} className="subject-card">
                <div className="subject-count">{subjects[s] || 0}</div>
                <div className="subject-name">{s}</div>
              </div>
            ))}
          </div>

          <h3 className="section-title mt-lg">Subjects</h3>
          <div className="subject-grid">
            {subjectKeys.map((s) => (
              <div key={s} className="subject-card">
                <div className="subject-count">{subjects[s] || 0}</div>
                <div className="subject-name">{s}</div>
              </div>
            ))}
          </div>

          <h3 className="section-title mt-lg">Classes</h3>
          <div className="subject-grid">
            {classKeys.map((s) => (
              <div key={s} className="subject-card">
                <div className="subject-count">{classes[s] || 0}</div>
                <div className="subject-name">{s}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="overview-divider" />
    </div>
  );
}
