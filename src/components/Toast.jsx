import { useEffect, useState } from 'react';

// Global popup host. Any code can trigger a popup with:
//   window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } }))
// The API client fires this automatically after every successful save.
let seq = 0;

export default function Toast() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const onToast = (e) => {
      const { message = 'Saved', type = 'success' } = e.detail || {};
      const id = ++seq;
      setItems((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, 2500);
    };
    window.addEventListener('app:toast', onToast);
    return () => window.removeEventListener('app:toast', onToast);
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
