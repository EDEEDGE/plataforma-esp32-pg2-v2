import { useState } from 'react';
import { ApiError, changePassword } from '../services/auth.js';
import PasswordInput from './PasswordInput.jsx';

export default function ChangePasswordForm({ onPasswordChanged, onSessionExpired }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await changePassword(currentPassword, newPassword);
      onPasswordChanged();
    } catch (err) {
      if (err instanceof ApiError && err.sessionExpired) {
        onSessionExpired();
      } else {
        setError(err.message || 'No se pudo cambiar la contraseña');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <article className="card profile-card">
      <h3>Cambiar contraseña</h3>
      <p>Por seguridad, se cerrará tu sesión después de actualizar la contraseña.</p>
      <form className="user-form" onSubmit={handleSubmit}>
        <label className="field" htmlFor="current-password">
          <span>Contraseña actual</span>
          <PasswordInput
            id="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <label className="field" htmlFor="new-password">
          <span>Nueva contraseña</span>
          <PasswordInput
            id="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            minLength="8"
            autoComplete="new-password"
            required
          />
        </label>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button type="submit" disabled={loading} aria-busy={loading}>
          {loading ? 'Actualizando…' : 'Actualizar contraseña'}
        </button>
      </form>
      <aside className="password-guidance">
        <strong>Recomendaciones de seguridad</strong>
        <ul>
          <li>Usa al menos 8 caracteres.</li>
          <li>Combina letras, números y símbolos.</li>
          <li>No reutilices una contraseña anterior.</li>
        </ul>
      </aside>
    </article>
  );
}
