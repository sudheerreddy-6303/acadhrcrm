import { useEffect } from 'react';
import { api } from '../api/client';
import { summarize } from './AutoSyncCard';

// Invisible helper for admins: wherever they are in the CRM, shows a popup when
// the background auto-sync has added new AcadHr registrations
// (e.g. "New from AcadHr: 2 teachers, 1 school"). Checks once a minute.
const SEEN_KEY = 'acadhr_autosync_seen';

export default function AutoSyncNotifier() {
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const s = await api.get('/acadhr-sync/auto/status');
        if (!alive || !s || !Array.isArray(s.recent) || !s.recent.length) return;
        let seen = null;
        try { seen = localStorage.getItem(SEEN_KEY); } catch (_) { /* ignore */ }
        const latestId = s.recent[0].id;
        if (seen === null || seen === '') {
          // First visit: remember where we are, don't flood with old news.
          try { localStorage.setItem(SEEN_KEY, String(latestId)); } catch (_) { /* ignore */ }
          return;
        }
        const fresh = s.recent.filter((r) => Number(r.id) > Number(seen));
        if (!fresh.length) return;
        const total = fresh.reduce((t, r) => ({
          teachers: t.teachers + Number(r.teachers || 0),
          tutors: t.tutors + Number(r.tutors || 0),
          schools: t.schools + Number(r.schools || 0),
          tuitions: t.tuitions + Number(r.tuitions || 0),
        }), { teachers: 0, tutors: 0, schools: 0, tuitions: 0 });
        const what = summarize(total);
        if (what) {
          window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: `New from AcadHr: ${what}`, type: 'success' } }));
          window.dispatchEvent(new Event('app:directory-refresh'));
        }
        try { localStorage.setItem(SEEN_KEY, String(latestId)); } catch (_) { /* ignore */ }
      } catch (_) {
        /* quiet: the Dashboard card shows errors */
      }
    };
    check();
    const t = setInterval(check, 60 * 1000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  return null;
}
