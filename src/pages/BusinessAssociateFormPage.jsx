import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { AssociateForm } from './BusinessAssociates';
import Loader from '../components/Loader';

// Full-page Add / Edit for a Business Associate.
//   /business-associates/new        -> add
//   /business-associates/:id/edit   -> edit
export default function BusinessAssociateFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(id ? null : {});
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) { setRecord({}); return undefined; }
    let alive = true;
    setRecord(null);
    api.get(`/business-associates/${id}`)
      .then((d) => { if (alive) setRecord(d.associate || {}); })
      .catch((e) => {
        if (!alive) return;
        setError(e.message);
        try { window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: e.message, type: 'error' } })); } catch (_) { /* ignore */ }
      });
    return () => { alive = false; };
  }, [id]);

  const back = () => navigate('/business-associates');

  if (error) {
    return (
      <div>
        <div className="alert">{error}</div>
        <button className="btn-ghost" onClick={back}>← Back to associates</button>
      </div>
    );
  }
  if (!record) return <Loader label="Loading…" />;

  return <AssociateForm key={id || 'new'} record={record} fullPage onClose={back} onSaved={back} />;
}
