import { useEffect, useState } from 'react';
import { api } from '../api/client';
import Loader from './Loader';

// Tutor photo + resume (stored by the Add tutor form). Shows "View photo" and
// "Resume" buttons; files are fetched with the login token, never public.
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function toast(message, type = 'success') {
  try { window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } })); } catch (_) { /* ignore */ }
}

async function fetchFile(id, kind) {
  const token = localStorage.getItem('acadhr_crm_token');
  const res = await fetch(`${BASE}/tutors/${id}/file/${kind}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) {
    let msg = 'Could not open the document';
    try { msg = (await res.json()).message || msg; } catch (_) { /* binary / empty */ }
    throw new Error(msg);
  }
  return res.blob();
}

export default function TutorDocuments({ id, compact = false, asCard = false }) {
  const [info, setInfo] = useState(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    let alive = true;
    api.get(`/tutors/${id}/files`).then((d) => { if (alive) setInfo(d); }).catch(() => { if (alive) setInfo({ photo: null, resume: null }); });
    return () => { alive = false; };
  }, [id]);
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);

  if (!info || (!info.photo && !info.resume)) return null;

  const showPhoto = async () => {
    setBusy('photo');
    try {
      const blob = await fetchFile(id, 'photo');
      setPhotoUrl(URL.createObjectURL(blob));
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(''); }
  };
  const openResume = async () => {
    setBusy('resume');
    try {
      const blob = await fetchFile(id, 'resume');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (info.resume && info.resume.name) || 'resume';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
      toast(`Resume downloaded: ${a.download}`, 'success');
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(''); }
  };

  return (
    <div className={asCard ? 'card' : undefined} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', margin: compact ? '6px 0 4px' : undefined }}>
      {!compact && <span className="rf-label" style={{ margin: 0 }}>Documents</span>}
      {info.photo && (
        <button type="button" className="btn-ghost sm" onClick={showPhoto} disabled={busy === 'photo'}>
          {busy === 'photo' ? <Loader size="sm" inline label="Loading…" /> : '📷 View photo'}
        </button>
      )}
      {info.resume && (
        <button type="button" className="btn-ghost sm" onClick={openResume} disabled={busy === 'resume'}>
          {busy === 'resume' ? <Loader size="sm" inline label="Loading…" /> : '📄 Resume'}
        </button>
      )}

      {photoUrl && (
        <div className="modal-backdrop" onClick={() => setPhotoUrl('')}>
          <div className="modal narrow" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Tutor photo</h3>
              <button className="icon-btn" onClick={() => setPhotoUrl('')} aria-label="Close">✕</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center' }}>
              <img src={photoUrl} alt="Tutor" style={{ maxWidth: '100%', maxHeight: '65vh', borderRadius: 12 }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
