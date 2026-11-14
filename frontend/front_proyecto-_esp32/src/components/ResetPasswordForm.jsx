import { useState } from 'react';
import PasswordInput from './PasswordInput.jsx';
import { resetPassword } from '../services/auth.js';
import '../styles/login.css';

export default function ResetPasswordForm({ token }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const passwordsMismatch = confirmation.length > 0 && newPassword !== confirmation;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError('El enlace de recuperación no contiene un token válido.');
      return;
    }

    if (passwordsMismatch) {
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
    <form className="auth-card auth-recovery-form" onSubmit={handleSubmit}>
      <div className="auth-header">
        <p className="eyebrow">Portal de usuario</p>
        <h2>Actualiza tu contraseña</h2>
        <p>Define una nueva contraseña segura para recuperar el acceso a tu cuenta.</p>
      </div>
      <label className="field" htmlFor="reset-password">
        <span>Nueva contraseña</span>
        <PasswordInput
          id="reset-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          minLength="8"
          autoComplete="new-password"
          required
        />
      </label>
      <label className="field" htmlFor="reset-password-confirmation">
        <span>Confirmar contraseña</span>
        <PasswordInput
          id="reset-password-confirmation"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          minLength="8"
          autoComplete="new-password"
          aria-invalid={passwordsMismatch}
          aria-describedby={passwordsMismatch ? 'reset-password-mismatch' : undefined}
          required
        />
        {passwordsMismatch ? (
          <p id="reset-password-mismatch" className="form-error" role="alert">
            Las contraseñas no coinciden.
          </p>
        ) : null}
      </label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {message ? <p className="form-message" role="status">{message}</p> : null}
      <button type="submit" disabled={loading || Boolean(message)}>
        {loading ? 'Actualizando contraseña…' : 'Guardar contraseña'}
      </button>
    </form>
  );
}
