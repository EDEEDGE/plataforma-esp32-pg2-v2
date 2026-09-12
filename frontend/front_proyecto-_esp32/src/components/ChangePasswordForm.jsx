import { useState } from 'react';
import { ApiError, changePassword } from '../services/auth.js';

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
      if (err instanceof ApiError && err.status === 401) {
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
      <p>Al cambiarla, tendrás que iniciar sesión nuevamente.</p>
      <form className="user-form" onSubmit={handleSubmit}>
        <label className="field" htmlFor="current-password">
          <span>Contraseña actual</span>
          <input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <label className="field" htmlFor="new-password">
          <span>Nueva contraseña</span>
          <input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            minLength="8"
            autoComplete="new-password"
            required
          />
        </label>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button type="submit" disabled={loading}>
          {loading ? 'Actualizando...' : 'Cambiar contraseña'}
        </button>
      </form>
      <aside className="password-guidance">
        <strong>Recomendaciones</strong>
        <ul>
          <li>Usa al menos 8 caracteres.</li>
          <li>Combina letras, números y símbolos.</li>
          <li>No reutilices una contraseña anterior.</li>
        </ul>
      </aside>
    </article>
  );
}
