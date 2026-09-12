import { useState } from 'react';
import { resetPassword } from '../services/auth.js';
import '../styles/login.css';

export default function ResetPasswordForm({ token, onBackToLogin }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError('El enlace de recuperación no contiene un token válido.');
      return;
    }

    if (newPassword !== confirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      const response = await resetPassword(token, newPassword);
      setMessage(response.message);
    } catch (err) {
      setError(err.message || 'No se pudo restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <div className="auth-header">
        <p className="eyebrow">Plataforma para actualizar ESP32</p>
        <h2>Nueva contraseña</h2>
        <p>Define una nueva contraseña para recuperar el acceso.</p>
      </div>
      <label className="field" htmlFor="reset-password">
        <span>Nueva contraseña</span>
        <input
          id="reset-password"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          minLength="8"
          autoComplete="new-password"
          required
        />
      </label>
      <label className="field" htmlFor="reset-password-confirmation">
        <span>Confirmar contraseña</span>
        <input
          id="reset-password-confirmation"
          type="password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          minLength="8"
          autoComplete="new-password"
          required
        />
      </label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {message ? <p className="form-message" role="status">{message}</p> : null}
      <button type="submit" disabled={loading || Boolean(message)}>
        {loading ? 'Guardando...' : 'Restablecer contraseña'}
      </button>
      <button type="button" className="auth-link" onClick={onBackToLogin}>
        Volver al inicio de sesión
      </button>
    </form>
  );
}
