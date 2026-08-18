import { useState } from 'react';
import DirectoryOverview from '../components/DirectoryOverview';
import DirectoryFilters from '../components/DirectoryFilters';

export default function Tuitions() {
  const [f, setF] = useState({ search: '', status: '', registration: '', state: '', city: '' });

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Tuitions</h2>
          <p className="muted">Tuition requirements and matches.</p>
        </div>
      </div>

      <DirectoryOverview
        type="tuitions"
        filters={{ search: f.search, registration: f.registration, state: f.state, city: f.city }}
      />

      <DirectoryFilters value={f} onChange={setF} showStatus={false} />

      <div className="record-empty">This section is ready to be set up — tell us what it should show.</div>
    </div>
  );
}
