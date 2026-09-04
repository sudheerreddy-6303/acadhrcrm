import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import DirectoryOverview from '../components/DirectoryOverview';
import DirectoryFilters from '../components/DirectoryFilters';

export default function Tuitions() {
  const [f, setF] = useState({ search: '', status: '', registration: '', country: '', state: '', city: '' });
  const [params] = useSearchParams();
  const regParam = params.get('registration') || '';
  const followupTitle = regParam === 'registered'
    ? 'Registration Followup — Tuitions'
    : regParam === 'unregistered'
    ? 'Unregistration Followup — Tuitions'
    : 'Tuitions';

  // Apply the registration filter when opened from a sidebar follow-up link.
  useEffect(() => { setF((prev) => ({ ...prev, registration: regParam })); }, [regParam]);

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>{followupTitle}</h2>
          <p className="muted">Tuition requirements and matches.</p>
        </div>
      </div>

      <DirectoryFilters value={f} onChange={setF} showStatus={false} />

      <DirectoryOverview
        type="tuitions"
        filters={{ search: f.search, registration: f.registration, country: f.country, state: f.state, city: f.city }}
      />

      <div className="record-empty">This section is ready to be set up — tell us what it should show.</div>
    </div>
  );
}
