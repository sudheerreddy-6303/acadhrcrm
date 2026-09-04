import { useId } from 'react';
import { useNavigate } from 'react-router-dom';

// Card footer: Register/Unregister radios on the left, a Follow up button on the
// right that opens the full-page follow-up view for this record.
export default function ContactActions({ type, id, registration, onRegistrationChange }) {
  const navigate = useNavigate();
  const name = useId();

  return (
    <div className="contact-block">
      <div className="card-foot" style={{ justifyContent: 'flex-end' }}>
        {/*
          Register / Unregister radios removed from this card by request.
          Registration can still be changed on the Follow-up page (which has its
          own toggle), so no capability is lost. Kept here (commented) so it can
          be restored easily if needed.

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
        */}

        <button className="btn-contact compact" onClick={() => navigate(`/followup/${type}/${id}`)}>
          Follow up
        </button>
      </div>
    </div>
  );
}
