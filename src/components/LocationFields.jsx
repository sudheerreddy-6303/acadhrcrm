import { useEffect, useState } from 'react';
import { COUNTRIES } from './FieldControls';

// Linked Country -> State -> City dropdowns for the Add forms.
//   - Changing the country clears state + city.
//   - Changing the state clears city.
//   - If a state/city isn't in the list, choose "Other (type it)" and enter it by hand.
// The country/state/city list lives in src/data/locations.json and is loaded
// on demand, so it doesn't slow down the first page load.

const OTHER = '__other__';

let cache = null;
function loadLocations() {
  if (!cache) cache = import('../data/locations.json').then((m) => m.default || m);
  return cache;
}

export default function LocationFields({ form, setForm }) {
  const [data, setData] = useState(null);
  const [stateOther, setStateOther] = useState(false);
  const [cityOther, setCityOther] = useState(false);

  useEffect(() => {
    let alive = true;
    loadLocations().then((d) => { if (alive) setData(d); }).catch(() => { if (alive) setData({}); });
    return () => { alive = false; };
  }, []);

  const statesMap = (data && data[form.country]) || {};
  const states = Object.keys(statesMap);
  const cities = (form.state && statesMap[form.state]) || [];

  // Fall back to a typed box when there's nothing to pick from.
  const stateTyped = data && (stateOther || states.length === 0);
  const cityTyped = data && (cityOther || stateTyped || cities.length === 0);

  const onCountry = (e) => {
    const country = e.target.value;
    setStateOther(false);
    setCityOther(false);
    setForm((f) => ({ ...f, country, state: '', city: '' }));
  };

  const onState = (e) => {
    const v = e.target.value;
    setCityOther(false);
    if (v === OTHER) {
      setStateOther(true);
      setForm((f) => ({ ...f, state: '', city: '' }));
    } else {
      setForm((f) => ({ ...f, state: v, city: '' }));
    }
  };

  const onCity = (e) => {
    const v = e.target.value;
    if (v === OTHER) {
      setCityOther(true);
      setForm((f) => ({ ...f, city: '' }));
    } else {
      setForm((f) => ({ ...f, city: v }));
    }
  };

  const setText = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const backToList = (which) => (
    <button
      type="button"
      className="link-btn"
      style={{ background: 'none', border: 0, padding: 0, marginTop: 4, color: 'var(--primary, #4f46e5)', cursor: 'pointer', fontSize: 12, textAlign: 'left' }}
      onClick={() => {
        if (which === 'state') { setStateOther(false); setCityOther(false); setForm((f) => ({ ...f, state: '', city: '' })); }
        else { setCityOther(false); setForm((f) => ({ ...f, city: '' })); }
      }}
    >
      ← choose from list
    </button>
  );

  return (
    <>
      <label className="field"><span>Country *</span>
        <select value={form.country} onChange={onCountry}>
          {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>

      <label className="field"><span>State *</span>
        {!data ? (
          <select disabled><option>Loading…</option></select>
        ) : stateTyped ? (
          <>
            <input value={form.state} onChange={setText('state')} placeholder="Type state" />
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
        {!data ? (
          <select disabled><option>Loading…</option></select>
        ) : !form.state && !stateTyped ? (
          <select disabled><option>Select state first</option></select>
        ) : cityTyped ? (
          <>
            <input value={form.city} onChange={setText('city')} placeholder="Type city" />
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
    </>
  );
}
