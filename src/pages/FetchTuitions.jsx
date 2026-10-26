import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import Loader from '../components/Loader';

// Fetch tuition requirements (posted by parents on AcadHr) into the CRM
// Tuitions list. Re-fetching updates existing tuitions instead of duplicating
// them. Mirrors the Fetch Tutors / Fetch Teachers pages.
export default function FetchTuitions() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const loadStatus = () => api.get('/acadhr-sync/tuitions/status')
    .then(setStatus)
    .catch((e) => setStatus({ reachable: false, message: e.message }));

  useEffect(() => { loadStatus(); }, []);

  const runPreview = async () => {
    setBusy('preview'); setError('');
    try {
      setPreview(await api.get('/acadhr-sync/tuitions/preview?limit=5'));
    } catch (e) { setError(e.message); } finally { setBusy(''); }
  };

  const runFetch = async () => {
    setBusy('fetch'); setError(''); setResult(null);
    try {
      setResult(await api.post('/acadhr-sync/tuitions/fetch', {}));
      loadStatus();
    } catch (e) { setError(e.message); } finally { setBusy(''); }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Fetch Tuitions from AcadHr</h2>
          <p className="muted">Pull tuition requirements posted on AcadHr into the CRM Tuitions list under Registration Followup.</p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      {status && status.reachable === false && (
        <div className="alert">{status.message || 'Could not reach the AcadHr tuitions table.'}</div>
      )}

      {status && status.reachable && (
        <>
          <p className="muted">
            Found <strong>{status.tuitionCount}</strong> tuition(s) in <code>{status.sourceDb}.{status.table}</code>.
            {' '}<strong>{status.inCrm || 0}</strong> already in the CRM. Fetching again updates them — nothing is duplicated.
          </p>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
            <button className="btn-ghost" onClick={runPreview} disabled={busy === 'preview'}>
              {busy === 'preview' ? <Loader size="sm" inline label="Loading…" /> : 'Preview'}
            </button>
            <button className="btn-primary" onClick={runFetch} disabled={busy === 'fetch'}>
              {busy === 'fetch' ? 'Fetching…' : 'Fetch tuitions'}
            </button>
          </div>

          {preview && (
            <div className="table-wrap" style={{ marginTop: 8 }}>
              <p className="muted" style={{ margin: '0 0 8px' }}>
                Detected fields: {preview.detectedFields.length
                  ? preview.detectedFields.join(', ')
                  : <em>none — check the column names in {preview.sourceDb}.{preview.table}</em>}
              </p>
              <table className="data-table">
                <thead>
                  <tr><th>Parent</th><th>Student</th><th>Phone</th><th>Subjects</th><th>Class</th><th>Mode</th><th>City</th><th>Budget</th></tr>
                </thead>
                <tbody>
                  {preview.sample.map((r, i) => (
                    <tr key={i}>
                      <td>{r.name || '—'}</td><td>{r.student_name || '—'}</td><td>{r.phone || '—'}</td>
                      <td>{r.subjects || '—'}</td><td>{r.classes || '—'}</td><td>{r.mode || '—'}</td>
                      <td>{r.city || r.location || '—'}</td><td>{r.budget || '—'}</td>
                    </tr>
                  ))}
                  {preview.sample.length === 0 && <tr><td colSpan={8} className="empty">Table is empty.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {result && (
            <>
              <h3 className="section-title mt-lg">Result</h3>
              <div className="stat-grid import-report">
                <div className="stat-card"><div className="stat-num">{result.total}</div><div className="stat-label">Fetched</div></div>
                <div className="stat-card feature"><div className="stat-num">{result.inserted}</div><div className="stat-label">New tuitions added</div></div>
                <div className="stat-card"><div className="stat-num">{result.updated}</div><div className="stat-label">Updated</div></div>
                <div className="stat-card"><div className="stat-num">{result.skipped}</div><div className="stat-label">Skipped (duplicates)</div></div>
              </div>
              <div className="import-ok" style={{ marginTop: 14 }}>
                Tuitions are now in the CRM under Registration Followup.
                <div style={{ marginTop: 10 }}>
                  <button className="btn-primary" onClick={() => navigate('/tuitions?registration=registered')}>
                    View in Tuitions
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
