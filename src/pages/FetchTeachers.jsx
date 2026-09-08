import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

// Fetch teachers from the AcadHr schema and bring them into the CRM Teachers
// list, reusing the existing import flow. Mirrors FetchTutors (nothing shared
// is changed). Imported teachers land under Registration Followup (registered).
export default function FetchTeachers() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [imported, setImported] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/acadhr-sync/teachers/status')
      .then(setStatus)
      .catch((e) => setStatus({ reachable: false, message: e.message }));
  }, []);

  const runPreview = async () => {
    setBusy('preview'); setError('');
    try {
      setPreview(await api.get('/acadhr-sync/teachers/preview?limit=5'));
    } catch (e) { setError(e.message); } finally { setBusy(''); }
  };

  const runFetch = async () => {
    setBusy('fetch'); setError(''); setImported(null);
    try {
      const f = await api.post('/acadhr-sync/teachers/fetch', {});
      const phones = [...new Set(
        (f.rows || [])
          .map((r) => String(r.phone || '').replace(/\D/g, '').slice(-10))
          .filter((p) => p.length === 10)
      )];
      let existing = new Set();
      if (phones.length) {
        const d = await api.post('/leads/check-duplicates', { phones });
        existing = new Set(d.existing || []);
      }
      const seen = new Set();
      const report = { total: f.rows.length, willImport: 0, dupBatch: 0, dupDb: 0, noPhone: 0 };
      const toImport = [];
      for (const r of f.rows) {
        const p = String(r.phone || '').replace(/\D/g, '').slice(-10);
        if (p.length !== 10) { report.noPhone++; continue; }
        if (seen.has(p)) { report.dupBatch++; continue; }
        seen.add(p);
        if (existing.has(p)) { report.dupDb++; continue; }
        report.willImport++;
        toImport.push(r);
      }
      setAnalysis({ report, toImport });
    } catch (e) { setError(e.message); } finally { setBusy(''); }
  };

  const runImport = async () => {
    if (!analysis || !analysis.toImport.length) return;
    setBusy('import'); setError('');
    try {
      const res = await api.post('/leads/import', { type: 'teachers', rows: analysis.toImport, registration: 'registered' });
      if (res.warning) setError(res.warning);
      else setImported({ count: res.imported });
    } catch (e) { setError(e.message); } finally { setBusy(''); }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Fetch Teachers from AcadHr</h2>
          <p className="muted">Pull teachers from the AcadHr database into the CRM Teachers list under Registration Followup.</p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      {status && status.reachable === false && (
        <div className="alert">
          {status.message || 'Could not reach the AcadHr teachers table.'}
        </div>
      )}

      {status && status.reachable && (
        <>
          <p className="muted">
            Found <strong>{status.teacherCount}</strong> teacher(s) in <code>{status.sourceDb}.teachers</code>.
            Imported teachers appear in the <strong>Teachers</strong> list under <strong>Registration Followup</strong> (registered).
          </p>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
            <button className="btn-ghost" onClick={runPreview} disabled={busy === 'preview'}>
              {busy === 'preview' ? 'Loading…' : 'Preview'}
            </button>
            <button className="btn-primary" onClick={runFetch} disabled={busy === 'fetch'}>
              {busy === 'fetch' ? 'Fetching…' : 'Fetch & check'}
            </button>
          </div>

          {preview && (
            <div className="table-wrap" style={{ marginTop: 8 }}>
              <p className="muted" style={{ margin: '0 0 8px' }}>
                Detected fields: {preview.detectedFields.length
                  ? preview.detectedFields.join(', ')
                  : <em>none — check the column names in acadhr.teachers</em>}
              </p>
              <table className="data-table">
                <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>City</th><th>Subjects</th></tr></thead>
                <tbody>
                  {preview.sample.map((r, i) => (
                    <tr key={i}>
                      <td>{r.name || '—'}</td><td>{r.phone || '—'}</td><td>{r.email || '—'}</td>
                      <td>{r.city || '—'}</td><td>{r.subjects || '—'}</td>
                    </tr>
                  ))}
                  {preview.sample.length === 0 && <tr><td colSpan={5} className="empty">Table is empty.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {analysis && !imported && (
            <>
              <h3 className="section-title mt-lg">Review</h3>
              <div className="stat-grid import-report">
                <div className="stat-card"><div className="stat-num">{analysis.report.total}</div><div className="stat-label">Fetched</div></div>
                <div className="stat-card feature"><div className="stat-num">{analysis.report.willImport}</div><div className="stat-label">Will import</div></div>
                <div className="stat-card"><div className="stat-num">{analysis.report.dupDb}</div><div className="stat-label">Already in CRM</div></div>
                <div className="stat-card"><div className="stat-num">{analysis.report.dupBatch}</div><div className="stat-label">Duplicates in batch</div></div>
                <div className="stat-card"><div className="stat-num">{analysis.report.noPhone}</div><div className="stat-label">No valid phone</div></div>
              </div>
              <button className="btn-primary" onClick={runImport} disabled={busy === 'import' || analysis.report.willImport === 0}>
                {busy === 'import' ? 'Importing…' : `Import ${analysis.report.willImport} into Teachers`}
              </button>
            </>
          )}

          {imported && (
            <div className="import-ok" style={{ marginTop: 14 }}>
              Imported <strong>{imported.count}</strong> teacher(s) into the CRM under Registration Followup.
              <div style={{ marginTop: 10 }}>
                <button className="btn-primary" onClick={() => navigate('/teachers?registration=registered')}>
                  View in Teachers
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
