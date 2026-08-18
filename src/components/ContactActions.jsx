import { useState, useId } from 'react';

// Normalize a phone number for wa.me (digits only; prepend 91 for 10-digit Indian numbers).
function waNumber(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  return d.length === 10 ? `91${d}` : d;
}

// Card footer: Register/Unregister radios on the left, a Contact button on the
// right that expands to Call / WhatsApp / Mail actions.
export default function ContactActions({ phone, email, registration, onRegistrationChange }) {
  const [open, setOpen] = useState(false);
  const name = useId();
  const wa = waNumber(phone);

  return (
    <div className="contact-block">
      <div className="card-foot">
        <div className="reg-toggle">
          <label className={`reg-opt ${registration === 'registered' ? 'on' : ''}`}>
            <input
              type="radio"
              name={name}
              checked={registration === 'registered'}
              onChange={() => onRegistrationChange && onRegistrationChange('registered')}
            />
            Register
          </label>
          <label className={`reg-opt ${registration === 'unregistered' ? 'on' : ''}`}>
            <input
              type="radio"
              name={name}
              checked={registration === 'unregistered'}
              onChange={() => onRegistrationChange && onRegistrationChange('unregistered')}
            />
            Unregister
          </label>
        </div>

        <button className="btn-contact compact" onClick={() => setOpen((o) => !o)}>
          {open ? 'Hide' : 'Contact'}
        </button>
      </div>

      {open && (
        <div className="contact-actions">
          {phone
            ? <a className="ca ca-call" href={`tel:${phone}`}>Call</a>
            : <span className="ca ca-off">Call</span>}
          {wa
            ? <a className="ca ca-wa" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">WhatsApp</a>
            : <span className="ca ca-off">WhatsApp</span>}
          {email
            ? <a className="ca ca-mail" href={`mailto:${email}`}>Mail</a>
            : <span className="ca ca-off">Mail</span>}
        </div>
      )}
    </div>
  );
}
