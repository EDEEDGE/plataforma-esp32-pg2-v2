import { useState } from 'react';
import {
  acceptRoomInvitation,
  rejectRoomInvitation,
} from '../services/roomService.js';
import '../styles/rooms.css';

export default function RoomInvitationPage({ token, onComplete }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [completed, setCompleted] = useState(false);

  const handleDecision = async (decision) => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const result = decision === 'accept'
        ? await acceptRoomInvitation(token)
        : await rejectRoomInvitation(token);
      setMessage(result.message || (
        decision === 'accept'
          ? 'Invitación aceptada correctamente.'
          : 'Invitación rechazada correctamente.'
      ));
      setCompleted(true);
    } catch (decisionError) {
      setError(decisionError.message || 'No se pudo procesar la invitación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-view room-invitation-view">
      <section className="auth-card" aria-labelledby="room-invitation-title">
        <div className="auth-header">
          <p className="eyebrow">Salas compartidas</p>
          <h2 id="room-invitation-title">Invitación a una sala</h2>
          <p>
            {completed
              ? 'La invitación ya fue procesada.'
              : 'Acepta para unirte a la sala o rechaza la invitación.'}
          </p>
        </div>

        {!token ? (
          <p className="form-error" role="alert">
            El enlace no contiene un token de invitación válido.
          </p>
        ) : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {message ? <p className="form-message" role="status">{message}</p> : null}

        {completed ? (
          <button type="button" onClick={onComplete}>Ir a la plataforma</button>
        ) : (
          <div className="room-invitation-actions">
            <button
              type="button"
              onClick={() => handleDecision('accept')}
              disabled={!token || loading}
            >
              {loading ? 'Procesando...' : 'Aceptar invitación'}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => handleDecision('reject')}
              disabled={!token || loading}
            >
              Rechazar
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
