import { INDIAN_STATES, CITIES } from './FieldControls';

// Dashboard-style filter bar: Search + Status + Registration + State + City + Reset.
// `value` is { search, status, registration, state, city }; `onChange` gets the next value.
export default function DirectoryFilters({ value, onChange, showStatus = true }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  const reset = () => onChange({ search: '', status: '', registration: '', state: '', city: '' });

  return (
    <div className="filter-bar">
      <label className="filter filter-grow">
        <span>Search</span>
        <input
          className="search"
          placeholder="Search name, city…"
          value={value.search}
          onChange={set('search')}
        />
      </label>
      {showStatus && (
        <label className="filter">
          <span>Status</span>
          <select value={value.status} onChange={set('status')}>
            <option value="">Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      )}
      <label className="filter">
        <span>Registration</span>
        <select value={value.registration} onChange={set('registration')}>
          <option value="">Registration</option>
          <option value="registered">Registered</option>
          <option value="unregistered">Unregistered</option>
        </select>
      </label>
      <label className="filter">
        <span>State</span>
        <select value={value.state} onChange={set('state')}>
          <option value="">State</option>
          {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
      <label className="filter">
        <span>City</span>
        <select value={value.city} onChange={set('city')}>
          <option value="">City</option>
          {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <div className="filter-actions">
        <button className="btn-ghost" onClick={reset}>Reset</button>
      </div>
    </div>
  );
}
