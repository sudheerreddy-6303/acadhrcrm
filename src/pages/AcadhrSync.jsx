import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';

// Where fetched rows should land in the CRM.
const TARGETS = [
  { k: 'tutors', label: 'Tutors' },
  { k: 'teachers', label: 'Teachers' },
  { k: 'schools', label: 'Schools' },
  { k: 'leads', label: 'Leads only' },
];

export default function AcadhrSync() {
  const [status, setStatus] = useState(null);   // { configured, reachable, message }
  const [tables, setTables] = useState([]);     // [{ table, rows }]
  const [table, setTable] = useState('');        // chosen source table
  const [target, setTarget] = useState('tutors');// chosen CRM destination
  const [preview, setPreview] = useState(null);  // { columns, detectedFields, sample }
  const [fetched, setFetched] = useState(null);  // { rows, total, usable }
  const [analysis, setAnalysis] = useState(null);// dedup analysis before import
  const [imported, setImported] = useState(null);// { count, leadIds }

  const [telecallers, setTelecallers] = useState([]);
  const [assignee, setAssignee] = useState('');

  const [busy, setBusy] = useState('');          // which step is running
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  // Connection status + table list on mount.
  useEffect(() => {
    api.get('/acadhr-sync/status')
      .then((s) => {
        setStatus(s);
        if (s.configured && s.reachable !== false) loadTables();
      })
      .catch((e) => setStatus({ configured: false, message: e.message }));
    api.get('/users/telecallers')
      .then((r) => setTelecallers(r.users || []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTables = useCallback(async () => {
    setError('');
    try {
      const r = await api.get('/acadhr-sync/tables');
      setTables(r.tables || []);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const reset = () => { setPreview(null); setFetched(null); setAnalysis(null); setImported(null); setDone(''); setError(''); };

  const chooseTable = (t) => {
    setTable(t);
    reset();
    // sensible default target based on the table name
    const low = t.toLowerCase();
    if (low.includes('teacher')) setTarget('teachers');
    else if (low.includes('school')) setTarget('schools');
    else if (low.includes('tutor')) setTarget('tutors');
    else setTarget('leads');
  };

  const runPreview = async () => {
    if (!table) return;
    setBusy('preview'); setError('');
    try {
      const p = await api.get(`/acadhr-sync/preview?table=${encodeURIComponent(table)}&limit=5`);
      setPreview(p);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  // Fetch all rows, then run them through the SAME dedup the Import page uses.
  const runFetch = async () => {
    if (!table) return;
    setBusy('fetch'); setError(''); setDone(''); setImported(null);
    try {
      const f = await api.post('/acadhr-sync/fetch', { table });
      setFetched(f);

      // Dedup against existing CRM leads by phone (reuses /leads/check-duplicates).
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
      const report = { total: f.rows.length, willImport: 0, dupFile: 0, dupDb: 0, noPhone: 0 };
      const toImport = [];
      for (const r of f.rows) {
        const p = String(r.phone || '').replace(/\D/g, '').slice(-10);
        if (p.length !== 10) { report.noPhone++; continue; }
        if (seen.has(p)) { report.dupFile++; continue; }
        seen.add(p);
        if (existing.has(p)) { report.dupDb++; continue; }
        report.willImport++;
        toImport.push(r);
      }
      setAnalysis({ report, toImport });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const runImport = async () => {
    if (!analysis || !analysis.toImport.length) return;
    setBusy('import'); setError(''); setDone('');
    try {
      const type = target === 'leads' ? 'import' : target;
      const res = await api.post('/leads/import', { type, rows: analysis.toImport });
      if (res.warning) {
        setError(res.warning);
      } else {
        setImported({ count: res.imported, leadIds: res.leadIds || [] });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const runAssign = async () => {
    if (!imported || !imported.leadIds.length || !assignee) return;
    setBusy('assign'); setError('');
    try {
      const res = await api.patch('/leads/bulk-assign', { ids: imported.leadIds, assigned_to: Number(assignee) });
      const who = telecallers.find((t) => String(t.id) === String(assignee));
      setDone(`Assigned ${res.updated} fetched records to ${who ? who.name : 'the telecaller'}.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Fetch from AcadHr</h2>
          <p className="muted">Pull records from the AcadHr platform database into this CRM.</p>
        </div>
        {status?.configured && (
          <button className="btn-ghost" onClick={loadTables} disabled={busy === 'tables'}>Refresh tables</button>
        )}
      </div>

      {error && <div className="alert">{error}</div>}
      {done && <div className="import-ok">{done}</div>}

      {/* Connection status */}
      {status && !status.configured && (
        <div className="alert">
          {status.message || 'AcadHr database is not configured.'}
          <div className="muted" style={{ marginTop: 6 }}>
            Set <code>ACADHR_DB_HOST</code>, <code>ACADHR_DB_PORT</code>, <code>ACADHR_DB_USER</code>,
            <code> ACADHR_DB_PASSWORD</code> and <code>ACADHR_DB_NAME</code> in the backend environment, then restart it.
          </div>
        </div>
      )}
      {status?.configured && status.reachable === false && (
        <div className="alert">{status.message || 'Could not reach the AcadHr database.'}</div>
      )}

      {status?.configured && status.reachable !== false && (
        <>
          {/* Step 1 — pick a source table */}
          <h3 className="section-title">1 · Pick a table from AcadHr</h3>
          {tables.length === 0 ? (
            <p className="muted">No tables loaded yet. Click “Refresh tables”.</p>
          ) : (
            <div className="type-tabs" style={{ flexWrap: 'wrap' }}>
              {tables.map((t) => (
                <button
                  key={t.table}
                  className={`type-tab ${table === t.table ? 'on' : ''}`}
                  onClick={() => chooseTable(t.table)}
                  title={t.rows != null ? `${t.rows} rows` : ''}
                >
                  {t.table}{t.rows != null ? ` (${t.rows})` : ''}
                </button>
              ))}
            </div>
          )}

          {/* Step 2 — choose destination + preview */}
          {table && (
            <>
              <h3 className="section-title mt-lg">2 · Bring “{table}” into</h3>
              <div className="type-tabs">
                {TARGETS.map((t) => (
                  <button
                    key={t.k}
                    className={`type-tab ${target === t.k ? 'on' : ''}`}
                    onClick={() => { setTarget(t.k); setImported(null); }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn-ghost" onClick={runPreview} disabled={busy === 'preview'}>
                  {busy === 'preview' ? 'Loading…' : 'Preview mapping'}
                </button>
                <button className="btn-primary" onClick={runFetch} disabled={busy === 'fetch'}>
                  {busy === 'fetch' ? 'Fetching…' : 'Fetch & check'}
                </button>
              </div>
            </>
          )}

          {/* Preview of detected columns */}
          {preview && (
            <div className="table-wrap" style={{ marginTop: 14 }}>
              <p className="muted" style={{ margin: '0 0 8px' }}>
                Detected fields: {preview.detectedFields.length
                  ? preview.detectedFields.join(', ')
                  : <em>none — this table may not have name/phone columns</em>}
              </p>
              <table className="data-table">
                <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>City</th><th>State</th><th>Subjects</th></tr></thead>
                <tbody>
                  {preview.sample.map((r, i) => (
                    <tr key={i}>
                      <td>{r.name || '—'}</td><td>{r.phone || '—'}</td><td>{r.email || '—'}</td>
                      <td>{r.city || '—'}</td><td>{r.state || '—'}</td><td>{r.subjects || '—'}</td>
                    </tr>
                  ))}
                  {preview.sample.length === 0 && <tr><td colSpan={6} className="empty">Table is empty.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* Step 3 — review dedup + import */}
          {analysis && !imported && (
            <>
              <h3 className="section-title mt-lg">3 · Review</h3>
              <div className="stat-grid import-report">
                <div className="stat-card"><div className="stat-num">{analysis.report.total}</div><div className="stat-label">Fetched</div></div>
                <div className="stat-card feature"><div className="stat-num">{analysis.report.willImport}</div><div className="stat-label">Will import</div></div>
                <div className="stat-card"><div className="stat-num">{analysis.report.dupDb}</div><div className="stat-label">Already in CRM</div></div>
                <div className="stat-card"><div className="stat-num">{analysis.report.dupFile}</div><div className="stat-label">Duplicates in batch</div></div>
                <div className="stat-card"><div className="stat-num">{analysis.report.noPhone}</div><div className="stat-label">No valid phone</div></div>
              </div>
              <button className="btn-primary" onClick={runImport} disabled={busy === 'import' || analysis.report.willImport === 0}>
                {busy === 'import' ? 'Importing…' : `Import ${analysis.report.willImport} into ${target === 'leads' ? 'Leads' : target}`}
              </button>
            </>
          )}

          {/* Step 4 — assign (optional) */}
          {imported && (
            <>
              <h3 className="section-title mt-lg">4 · Assign to a telecaller (optional)</h3>
              <p className="muted" style={{ marginTop: 0 }}>
                Imported <strong>{imported.count}</strong> record(s) from “{table}”.
              </p>
              {imported.leadIds.length === 0 ? (
                <div className="alert">Backend didn’t return the imported IDs, so auto-assign isn’t available. Assign from the {target} page instead.</div>
              ) : telecallers.length === 0 ? (
                <div className="alert">No telecallers found. Add one under Users first.</div>
              ) : (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select className="select" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                    <option value="">Select telecaller…</option>
                    {telecallers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <button className="btn-primary" onClick={runAssign} disabled={busy === 'assign' || !assignee}>
                    {busy === 'assign' ? 'Assigning…' : `Assign ${imported.count}`}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
