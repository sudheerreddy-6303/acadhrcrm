import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';

const TYPES = [
  { k: 'schools', label: 'Schools' },
  { k: 'teachers', label: 'Teachers' },
  { k: 'tutors', label: 'Tutors' },
];

// Suggested header columns for the uploaded file, per type.
const SAMPLE_COLUMNS = {
  teachers: ['Name', 'Phone', 'Email', 'City', 'State', 'Subjects', 'Boards', 'Classes', 'Experience', 'Previous School/College', 'Note'],
  tutors: ['Name', 'Phone', 'Email', 'City', 'State', 'Subjects', 'Boards', 'Classes', 'Timing'],
  schools: ['School Name', 'Location', 'State', 'City', 'Contact Person', 'Phone', 'Mail ID', 'Designation', 'School Mail ID', 'School Number', 'Note'],
};

// last-10-digit normalization (handles country codes / formatting)
const normPhone = (p) => {
  const d = String(p == null ? '' : p).replace(/\D/g, '');
  return d.length > 10 ? d.slice(-10) : d;
};

// case-insensitive header pick
const pickCI = (row, keys) => {
  const map = {};
  Object.keys(row).forEach((k) => { map[String(k).toLowerCase().replace(/[^a-z0-9]/g, '')] = row[k]; });
  for (const k of keys) {
    if (map[k] != null && String(map[k]).trim() !== '') return String(map[k]).trim();
  }
  return null;
};

export default function ImportAssign() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preset = params.get('type');

  const [type, setType] = useState(['schools', 'teachers', 'tutors'].includes(preset) ? preset : null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState(null); // { report, toImport }
  const [importing, setImporting] = useState(false);

  // After a successful import we keep the created lead IDs so they can be assigned.
  const [imported, setImported] = useState(null); // { count, leadIds }

  // Assign step state.
  const [telecallers, setTelecallers] = useState([]);
  const [assignee, setAssignee] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [done, setDone] = useState('');

  // Keep the type in sync if the sidebar link changes ?type=…
  useEffect(() => {
    if (['schools', 'teachers', 'tutors'].includes(preset) && preset !== type) {
      setType(preset);
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  // Load telecallers once (for the assign dropdown).
  useEffect(() => {
    let alive = true;
    api.get('/users/telecallers')
      .then((res) => { if (alive) setTelecallers(res.users || []); })
      .catch(() => { /* dropdown just stays empty */ });
    return () => { alive = false; };
  }, []);

  const reset = () => {
    setAnalysis(null); setError(''); setDone(''); setFileName('');
    setImported(null); setAssignee('');
  };

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true); setError(''); setAnalysis(null); setDone(''); setImported(null); setFileName(file.name);
    try {
      const XLSX = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      if (!rows.length) throw new Error('The file has no data rows.');

      const seen = new Set();
      const enriched = rows.map((r) => {
        const name = pickCI(r, ['name', 'fullname', 'schoolname', 'teachername', 'tutorname', 'contactpersonname', 'contactperson']);
        const phoneRaw = pickCI(r, ['phone', 'phonenumber', 'mobile', 'mobilenumber', 'contact', 'contactnumber']);
        const phone = normPhone(phoneRaw);
        const validPhone = phone.length === 10;
        const dupInFile = validPhone && seen.has(phone);
        if (validPhone) seen.add(phone);
        return { raw: r, name, phone, validPhone, dupInFile };
      });

      // check duplicates against existing leads
      const phones = [...new Set(enriched.filter((x) => x.validPhone).map((x) => x.phone))];
      let existing = new Set();
      if (phones.length) {
        const res = await api.post('/leads/check-duplicates', { phones });
        existing = new Set(res.existing || []);
      }

      const report = { total: rows.length, willImport: 0, dupFile: 0, dupDb: 0, unknown: 0 };
      const toImport = [];
      for (const x of enriched) {
        if (!x.validPhone) { report.unknown++; continue; }
        if (x.dupInFile) { report.dupFile++; continue; }
        if (existing.has(x.phone)) { report.dupDb++; continue; }
        report.willImport++;
        toImport.push(x.raw);
      }
      setAnalysis({ report, toImport });
    } catch (err) {
      setError(err.message || 'Could not read the file');
    } finally {
      setBusy(false);
    }
  };

  const confirmImport = async () => {
    if (!analysis || !analysis.toImport.length) return;
    setImporting(true); setError(''); setDone('');
    try {
      const res = await api.post('/leads/import', { type, rows: analysis.toImport });
      if (res.warning) {
        // Rows reached Leads but not the directory table — don't pretend it worked.
        setError(res.warning);
      } else {
        setImported({ count: res.imported, leadIds: res.leadIds || [] });
      }
    } catch (err) {
      setError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const confirmAssign = async () => {
    if (!imported || !imported.leadIds.length || !assignee) return;
    setAssigning(true); setError('');
    try {
      const res = await api.patch('/leads/bulk-assign', {
        ids: imported.leadIds,
        assigned_to: Number(assignee),
      });
      const who = telecallers.find((t) => String(t.id) === String(assignee));
      setDone(`Assigned ${res.updated} imported ${type} to ${who ? who.name : 'the telecaller'}. Redirecting…`);
      setTimeout(() => navigate(`/${type}`), 1500);
    } catch (err) {
      setError(err.message || 'Could not assign the imported records');
    } finally {
      setAssigning(false);
    }
  };

  const skipAssign = () => navigate(`/${type}`);

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Import &amp; Assign</h2>
          <p className="muted">Upload an Excel/CSV, import it, then assign the imported records to a telecaller — all in one place.</p>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {done && <div className="import-ok">{done}</div>}

      {/* Step 1: choose type */}
      <h3 className="section-title">1 · What are you importing?</h3>
      <div className="type-tabs">
        {TYPES.map((t) => (
          <button
            key={t.k}
            className={`type-tab ${type === t.k ? 'on' : ''}`}
            onClick={() => { setType(t.k); reset(); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Step 2: upload */}
      {type && !imported && (
        <>
          <h3 className="section-title mt-lg">2 · Upload {type} file</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            First row should be column headers — e.g. Name, Phone, Email, City, Subjects.
          </p>
          <label className="upload-box">
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} disabled={busy} hidden />
            {busy ? 'Analyzing…' : (fileName ? `Re-upload (last: ${fileName})` : 'Choose Excel / CSV file')}
          </label>

          <div className="sample-cols">
            <span className="sample-label">Sample columns:</span>
            {SAMPLE_COLUMNS[type].map((c) => (
              <span key={c} className="col-chip">{c}</span>
            ))}
          </div>
          <p className="muted sample-note">
            Headers are matched case-insensitively. Only <strong>Name</strong> and <strong>Phone</strong>
            are essential; the rest are optional and stored with the record.
          </p>
        </>
      )}

      {/* Step 3: review + import */}
      {analysis && !imported && (
        <>
          <h3 className="section-title mt-lg">3 · Review</h3>
          <div className="stat-grid import-report">
            <div className="stat-card"><div className="stat-num">{analysis.report.total}</div><div className="stat-label">Total rows</div></div>
            <div className="stat-card feature"><div className="stat-num">{analysis.report.willImport}</div><div className="stat-label">Will import</div></div>
            <div className="stat-card"><div className="stat-num">{analysis.report.dupFile}</div><div className="stat-label">Duplicates in file</div></div>
            <div className="stat-card"><div className="stat-num">{analysis.report.dupDb}</div><div className="stat-label">Already in system</div></div>
            <div className="stat-card"><div className="stat-num">{analysis.report.unknown}</div><div className="stat-label">Unknown numbers</div></div>
          </div>
          <p className="muted">
            Only the <strong>{analysis.report.willImport}</strong> valid, non-duplicate rows will be
            imported. Duplicates and rows without a valid 10-digit number are skipped.
          </p>
          <button
            className="btn-primary"
            onClick={confirmImport}
            disabled={importing || analysis.report.willImport === 0}
          >
            {importing ? 'Importing…' : `Import ${analysis.report.willImport} ${type}`}
          </button>
        </>
      )}

      {/* Step 4: assign the imported records */}
      {imported && (
        <>
          <h3 className="section-title mt-lg">4 · Assign to a telecaller</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Imported <strong>{imported.count}</strong> {type}. Choose a telecaller to assign them to, or skip to assign later from the {type} page.
          </p>

          {imported.leadIds.length === 0 ? (
            <div className="alert">
              The import succeeded, but this backend build didn’t return the imported record IDs, so they can’t be
              auto-assigned here. Restart/redeploy the backend, or assign them from the {type} page.
            </div>
          ) : telecallers.length === 0 ? (
            <div className="alert">
              No telecallers found. Add a telecaller under Users first, then come back to assign.
            </div>
          ) : (
            <div className="assign-row" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                className="select"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              >
                <option value="">Select telecaller…</option>
                {telecallers.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <button
                className="btn-primary"
                onClick={confirmAssign}
                disabled={assigning || !assignee}
              >
                {assigning ? 'Assigning…' : `Assign ${imported.count} to telecaller`}
              </button>
            </div>
          )}

          <div style={{ marginTop: '0.9rem' }}>
            <button className="btn-ghost" onClick={skipAssign}>Skip — go to {type}</button>
          </div>
        </>
      )}
    </div>
  );
}
