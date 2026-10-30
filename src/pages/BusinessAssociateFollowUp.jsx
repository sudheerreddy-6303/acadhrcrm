import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import Loader from '../components/Loader';
import { useAuth } from '../context/AuthContext';

// Business Associate follow-up page: associate details, "This call"
// (date / category / remark) and "Call history" with replies.
// Saving a new call keeps the previous one in Call history.

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
const waLink = (n) => `https://wa.me/${String(n || '').replace(/\D/g, '').replace(/^(\d{10})$/, '91$1')}`;

export default function BusinessAssociateFollowUp() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ call_date: today(), category: '', remark: '' });
  const [busy, setBusy] = useState(false);
  const [replyOpen, setReplyOpen] = useState(null); // call id with an open reply box
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
    api.get(`/business-associates/${id}/followup`)
      .then((d) => { if (alive) apply(d); })
      .catch((e) => { if (alive) setError(e.message || 'Could not load follow-up'); });
    return () => { alive = false; };
  }, [id, apply]);

  const fail = (msg) => { setError(msg); toast(msg, 'error'); };

  const save = async () => {
    setError('');
    if (!form.call_date) return fail('Please choose the call date.');
    if (!form.category && !form.remark.trim()) return fail('Please choose a category or write a remark.');
    setBusy(true);
    try {
      const d = await api.put(`/business-associates/${id}/followup`, { ...form, remark: form.remark.trim() });
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
      const d = await api.post(`/business-associates/${id}/calls/${callId}/replies`, { reply: replyText.trim() });
      apply(d);
      setReplyOpen(null);
      setReplyText('');
    } catch (e) {
      fail(e.message || 'Could not add the reply');
    } finally {
      setReplyBusy(false);
    }
  };

  // Admins: delete this associate (asks first), then go back to the list.
  const removeAssociate = async () => {
    if (!data || !window.confirm(`Delete business associate "${data.associate.name}"? This cannot be undone.`)) return;
    try {
      await api.del(`/business-associates/${id}`); // "Deleted" popup comes from the API client
      navigate('/business-associates');
    } catch (e) {
      fail(e.message || 'Could not delete');
    }
  };

  if (!data && !error) return <Loader label="Loading follow-up…" />;
  if (!data) {
    return (
      <div>
        <div className="alert">{error}</div>
        <button className="btn-ghost" onClick={() => navigate('/business-associates')}>← Back to associates</button>
      </div>
    );
  }

  const a = data.associate;
  const cur = data.current || {};
  const details = [
    ['Mobile', a.mobile], ['WhatsApp', a.whatsapp], ['Email', a.email], ['Business', a.business_name],
    ['Associate type', a.associate_type], ['Partnership', a.partnership_model],
    ['City', a.city], ['State', a.state], ['Location', a.location],
  ];

  return (
    <div className="ba-fu">
      <div className="page-head">
        <div style={{ minWidth: 0 }}>
          <button className="btn-ghost sm" onClick={() => navigate('/business-associates')} style={{ marginBottom: 10 }}>← Back</button>
          <h2 style={{ overflowWrap: 'anywhere' }}>{a.name}</h2>
          <p className="muted">{[a.business_name, a.associate_type].filter(Boolean).join(' · ') || 'Business associate'}</p>
        </div>
        <div className="head-actions">
          {a.mobile && <a className="btn-ghost" style={{ textDecoration: 'none' }} href={`tel:${a.mobile}`}>📞 Call</a>}
          {(a.whatsapp || a.mobile) && <a className="btn-ghost" style={{ textDecoration: 'none' }} href={waLink(a.whatsapp || a.mobile)} target="_blank" rel="noreferrer">WhatsApp</a>}
          {isAdmin && <button className="btn-danger" onClick={removeAssociate}>Delete</button>}
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="card">
        <div className="record-fields">
          {details.map(([l, v]) => (
            <div key={l} className="rf"><span className="rf-label">{l}</span><span className="rf-value">{v || '—'}</span></div>
          ))}
        </div>
      </div>

      {/* ---- This call ---- */}
      <div className="card">
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
                    <td data-label="By">{h.by_name || '—'}</td>
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
                      {replyOpen === h.id ? (
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
    </div>
  );
}
