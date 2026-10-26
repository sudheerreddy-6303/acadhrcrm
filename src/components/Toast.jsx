import { useEffect, useState } from 'react';

// Global popup host. Any code can trigger a popup with:
//   window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } }))
// The API client fires this automatically after every successful save.
let seq = 0;

// Same popup fired twice within this window (e.g. the API client AND a page's
// error banner) is shown only once.
const DEDUPE_MS = 1500;
const recent = new Map();

// Text of a banner, trimmed and shortened for a popup.
const bannerText = (el) => {
  let source = el;
  if (el && el.querySelector && el.querySelector('button, a')) {
    source = el.cloneNode(true);
    source.querySelectorAll('button, a').forEach((b) => b.remove());
  }
  const t = (source && source.textContent ? source.textContent : '').replace(/\s+/g, ' ').trim();
  return t.length > 220 ? `${t.slice(0, 217)}…` : t;
};

export default function Toast() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const onToast = (e) => {
      const { message = 'Saved', type = 'success' } = e.detail || {};
      // Skip an identical popup shown a moment ago.
      const dedupeKey = `${type}|${message}`;
      const now = Date.now();
      if (recent.has(dedupeKey) && now - recent.get(dedupeKey) < DEDUPE_MS) return;
      recent.set(dedupeKey, now);
      const id = ++seq;
      setItems((prev) => [...prev, { id, message, type }]);
      // Errors stay on screen longer so they can be read.
      if (type === 'error') {
        setTimeout(() => {
          setItems((prev) => prev.filter((t) => t.id !== id));
        }, 5000);
        return;
      }
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, 2500);
    };
    window.addEventListener('app:toast', onToast);
    return () => window.removeEventListener('app:toast', onToast);
  }, []);

  // ---- Popups for every page, without touching each page ----
  // 1) Any red error banner (.alert) that appears or changes -> red popup.
  // 2) Any green success banner (.import-ok) that appears or changes -> green popup.
  useEffect(() => {
    const seen = new WeakMap(); // banner element -> last text shown as a popup
    const fire = (el) => {
      if (!el || (el.closest && el.closest('.toast-wrap'))) return;
      const text = bannerText(el);
      if (!text || seen.get(el) === text) return;
      seen.set(el, text);
      const type = el.classList.contains('import-ok') ? 'success' : 'error';
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: text, type } }));
    };
    const scan = (node) => {
      if (!node) return;
      const el = node.nodeType === 1 ? node : node.parentElement;
      if (!el) return;
      const own = el.closest && el.closest('.alert, .import-ok');
      if (own) fire(own);
      if (el.querySelectorAll) el.querySelectorAll('.alert, .import-ok').forEach(fire);
    };
    const obs = new MutationObserver((muts) => {
      muts.forEach((m) => {
        if (m.type === 'characterData') scan(m.target);
        else m.addedNodes.forEach(scan);
      });
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    document.querySelectorAll('.alert, .import-ok').forEach(fire);
    return () => obs.disconnect();
  }, []);

  // 3) Call / WhatsApp / email links, and internet connection lost / back.
  useEffect(() => {
    const say = (message, type = 'info') =>
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } }));
    const onClick = (e) => {
      const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      const href = a.getAttribute('href') || '';
      if (href.startsWith('tel:')) say(`Calling ${href.slice(4)}…`);
      else if (href.includes('wa.me') || href.includes('whatsapp.com')) say('Opening WhatsApp…');
      else if (href.startsWith('mailto:')) say('Opening email…');
    };
    const onOffline = () => say('You are offline — changes will not be saved until the internet is back', 'error');
    const onOnline = () => say('Back online', 'success');
    document.addEventListener('click', onClick, true);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  if (!items.length) return null;

  return (
    <div className="toast-wrap" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">{t.type === 'error' ? '!' : '✓'}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
