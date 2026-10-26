import { useMemo, useState } from 'react';
import { api } from '../api/client';

// Plan picker for the follow-up page, using plans read LIVE from acadhr.plans
// (see GET /api/plans). Same look as the built-in plan cards, plus a
// "1 month / 3 months" switch. Saves with PATCH /api/plans/select.

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// Badge for a plan card, based on what AcadHr says about it.
function badgeFor(g, period) {
  const text = `${g.tagline} ${g.name} ${g.value}`.toLowerCase();
  if (period && period.amount === 0) return { label: 'Free', tone: 'free' };
  if (text.includes('most popular')) return { label: 'Most Popular', tone: '' , featured: true };
  if (text.includes('leadership') || g.value === 'prestige') return { label: 'Leadership', tone: 'leadership' };
  if (text.includes('inaugural') || text.includes('launch')) return { label: 'Launch Offer', tone: 'free' };
  return null;
}

export default function AcadhrPlans({ type, record, groups, source, onSaved }) {
  // All period lengths offered (e.g. [1, 3]).
  const monthsList = useMemo(() => {
    const s = new Set();
    groups.forEach((g) => g.periods.forEach((p) => s.add(p.months)));
    return [...s].sort((a, b) => a - b);
  }, [groups]);

  const savedMonths = (() => {
    const g = groups.find((x) => x.value === record.plan);
    const p = g && g.periods.find((x) => x.label === record.plan_period);
    return p ? p.months : null;
  })();
  const [months, setMonths] = useState(savedMonths || monthsList[0] || 1);
  const [busy, setBusy] = useState('');

  const periodOf = (g) => g.periods.find((p) => p.months === months) || g.periods[0];

  const choose = async (g) => {
    const p = periodOf(g);
    setBusy(g.value);
    try {
      const res = await api.patch('/plans/select', { type, id: record.id, plan: g.value, period: p ? p.label : '' });
      onSaved(res);
      try {
        window.dispatchEvent(new CustomEvent('app:toast', {
          detail: { message: `Plan set: ${g.name}${p ? ` · ${p.label} · ${inr(p.rupees)}` : ''}`, type: 'success' },
        }));
      } catch (_) { /* ignore */ }
    } catch (e) {
      // error popup comes from the API client
    } finally {
      setBusy('');
    }
  };

  const monthLabel = (m) => `${m} month${m === 1 ? '' : 's'}`;

  return (
    <div className="card">
      <div className="fu-section-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <h3>Plan</h3>
        {monthsList.length > 1 && (
          <div role="group" aria-label="Billing period" style={{ display: 'inline-flex', background: '#f1f3f8', borderRadius: 999, padding: 3, gap: 2 }}>
            {monthsList.map((m) => {
              const save = groups.map((g) => g.periods.find((p) => p.months === m)).find((p) => p && p.note);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMonths(m)}
                  aria-pressed={months === m}
                  style={{
                    border: 0, borderRadius: 999, padding: '7px 14px', minHeight: 36, fontWeight: 650, fontSize: 13.5,
                    background: months === m ? 'var(--primary, #4f46e5)' : 'transparent',
                    color: months === m ? '#fff' : 'var(--text, #1f2433)', cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  {monthLabel(m)}{save ? ` · ${save.note}` : ''}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="plan-options">
        {groups.map((g) => {
          const p = periodOf(g);
          const b = badgeFor(g, p);
          const selected = record.plan === g.value;
          return (
            <label
              key={g.group_key}
              className={`plan-opt ${selected ? 'on' : ''} ${b && b.featured ? 'featured' : ''}`}
              style={{ opacity: busy && busy !== g.value ? 0.7 : 1 }}
            >
              <span className="plan-top">
                <input
                  type="radio"
                  name={`acadhr-plan-${type}`}
                  checked={selected}
                  onChange={() => choose(g)}
                  disabled={!!busy}
                />
                <span className="plan-name">{g.name}</span>
              </span>
              <span className="plan-price">{p && p.amount === 0 ? 'Free' : inr(p ? p.rupees : 0)}</span>
              <span className="plan-note">
                + GST / {p ? p.label : 'month'}{p && p.note ? ` · ${p.note}` : ''}
              </span>
              {g.tagline && <span className="plan-intro">{g.tagline}</span>}
              <ul className="plan-feats">
                {g.features.map((f, i) => <li key={i}><span className="fk">✓</span>{f}</li>)}
                {p && p.credits != null && <li><span className="fk">✓</span>{p.credits} credits</li>}
              </ul>
              {selected && record.plan_period && (
                <span className="plan-note" style={{ fontWeight: 650, color: 'var(--primary, #4f46e5)' }}>
                  Selected: {record.plan_period}
                </span>
              )}
              {b && <span className={`plan-tag ${b.tone ? `tone-${b.tone}` : ''}`}>{b.label}</span>}
            </label>
          );
        })}
      </div>
      <p className="muted" style={{ fontSize: 12, margin: '10px 0 0' }}>
        Plans and prices are fetched live from AcadHr{source ? ` (${source})` : ''}.
      </p>
    </div>
  );
}
