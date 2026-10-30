import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import Loader from './Loader';

// "📞 This call" + "Call history" (with replies) for Teachers / Tutors /
// Schools / Tuitions — same look and behaviour as the Business Associate
// follow-up. Saving a new call keeps the previous one in Call history.
// Earlier 1st/2nd/3rd follow-ups are listed in the history (read-only).

const today = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const fmtWhen = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};
function toast(message, type = 'success') {
  try { window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } })); } catch (_) { /* ignore */ }
}

export default function CallFollowUp({ type, id }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ call_date: today(), category: '', remark: '' });
  const [busy, setBusy] = useState(false);
  const [replyOpen, setReplyOpen] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);

  const apply = useCallback((d) => {
    setData(d);
    setForm({
      call_date: (d.current && d.current.call_date) || today(),
      category: (d.current && d.current.category) || '',
      remark: (d.current && d.current.remark) || '',
    });
  }, []);

  useEffect(() => {
    let alive = true;
    setData(null);
    api.get(`/calls/${type}/${id}`)
      .then((d) => { if (alive) apply(d); })
      .catch((e) => { if (alive) setError(e.message || 'Could not load calls'); });
    return () => { alive = false; };
  }, [type, id, apply]);

  const fail = (msg) => { setError(msg); toast(msg, 'error'); };

  const save = async () => {
    setError('');
    if (!form.call_date) return fail('Please choose the call date.');
    if (!form.category && !form.remark.trim()) return fail('Please choose a category or write a remark.');
    setBusy(true);
    try {
      const d = await api.put(`/calls/${type}/${id}`, { ...form, remark: form.remark.trim() });
      apply(d);
      if (d.message === 'No changes') toast('Nothing changed — the call is already saved', 'info');
    } catch (e) {
      fail(e.message || 'Could not save the call');
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async (callId) => {
    if (!replyText.trim()) return fail('Please write a reply.');
    setReplyBusy(true);
    try {
      const d = await api.post(`/calls/${type}/${id}/history/${callId}/replies`, { reply: replyText.trim() });
      apply(d);
      setReplyOpen(null);
      setReplyText('');
    } catch (e) {
      fail(e.message || 'Could not add the reply');
    } finally {
      setReplyBusy(false);
    }
  };

  if (!data && !error) return <div className="card"><Loader label="Loading calls…" /></div>;
  if (!data) return <div className="card"><div className="alert" style={{ margin: 0 }}>{error}</div></div>;
  const cur = data.current || {};

  return (
    <>
      {/* ---- This call ---- */}
      <div className="card">
        {error && <div className="alert">{error}</div>}
        <div className="ba-call-box">
          <h3 className="ba-call-title"><span aria-hidden="true">📞</span> This call</h3>
          <div className="ba-call-grid">
            <label className="field"><span>Call date</span>
              <input type="date" value={form.call_date} onChange={(e) => setForm((f) => ({ ...f, call_date: e.target.value }))} />
            </label>
            <label className="field"><span>Category</span>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                <option value="">Select category</option>
                {data.categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>
          <label className="field"><span>Call remark</span>
            <textarea rows={3} maxLength={2000} value={form.remark} placeholder="What happened on this call?"
              onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))} />
          </label>
          <p className="ba-call-help">
            Each time you change the call date or remark and save, the previous one is kept in <strong>Call history</strong> below.
            {cur.by_name && <> Last saved by <strong>{cur.by_name}</strong>{cur.updated_at ? ` · ${fmtWhen(cur.updated_at)}` : ''}.</>}
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="ba-btn-green" onClick={save} disabled={busy}>
              {busy ? <Loader size="sm" inline label="Saving…" /> : 'Save call'}
            </button>
          </div>
        </div>
      </div>

      {/* ---- Call history ---- */}
      <div className="card">
        <h3 style={{ fontSize: 17, marginBottom: 12 }}>Call history</h3>
        {data.history.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No previous calls yet. When you save a new call, the earlier one appears here.</p>
        ) : (
          <div className="ba-history">
            <table>
              <thead>
                <tr><th>Call date</th><th>By</th><th>Category</th><th>Remark</th></tr>
              </thead>
              <tbody>
                {data.history.map((h) => (
                  <tr key={h.id}>
                    <td data-label="Call date">{h.call_date || '—'}</td>
                    <td data-label="By">{h.by_name || (h.legacy ? <span className="muted">{h.legacy_label}</span> : '—')}</td>
                    <td data-label="Category" className="ba-cat">{h.category || '—'}</td>
                    <td data-label="Remark">
                      <div className="ba-remark">{h.remark || '-'}</div>
                      {h.replies.length > 0 && (
                        <ul className="ba-replies">
                          {h.replies.map((r) => (
                            <li key={r.id}>
                              <span className="ba-reply-who">↳ {r.by_name || 'Someone'}</span>
                              <span className="ba-reply-when">{fmtWhen(r.created_at)}</span>
                              <div>{r.reply}</div>
                            </li>
                          ))}
                        </ul>
                      )}
                      {h.legacy ? null : replyOpen === h.id ? (
                        <div className="ba-reply-box">
                          <textarea rows={2} maxLength={2000} autoFocus value={replyText} placeholder="Write a reply…"
                            onChange={(e) => setReplyText(e.target.value)} />
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <button className="btn-ghost sm" onClick={() => { setReplyOpen(null); setReplyText(''); }}>Cancel</button>
                            <button className="ba-btn-green sm" onClick={() => sendReply(h.id)} disabled={replyBusy}>
                              {replyBusy ? <Loader size="sm" inline label="Sending…" /> : 'Send reply'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button className="ba-btn-reply" onClick={() => { setReplyOpen(h.id); setReplyText(''); }}>↩ Reply</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
