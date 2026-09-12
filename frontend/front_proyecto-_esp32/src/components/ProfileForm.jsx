import { useState } from 'react';
import { ApiError } from '../services/auth.js';
import { updateMyProfile } from '../services/userService.js';
import ChangePasswordForm from './ChangePasswordForm.jsx';

export default function ProfileForm({ user, onUserUpdated, onSessionExpired }) {
  const [form, setForm] = useState({
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const updatedUser = await updateMyProfile(form);
      onUserUpdated(updatedUser);
      setMessage('Perfil actualizado correctamente.');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
      } else {
        setError(err.message || 'No se pudo actualizar el perfil');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="dashboard-grid profile-grid">
      <article className="card profile-card">
        <h3>Mi perfil</h3>
        <p>Actualiza tu nombre de usuario y tus datos personales.</p>
        <form className="user-form" onSubmit={handleSubmit}>
        <label className="field" htmlFor="profile-username">
          <span>Usuario</span>
          <input
            id="profile-username"
            value={form.username}
            onChange={(event) => setForm({ ...form, username: event.target.value })}
            required
          />
        </label>
        <label className="field" htmlFor="profile-first-name">
          <span>Nombre</span>
          <input
            id="profile-first-name"
            value={form.firstName}
            onChange={(event) => setForm({ ...form, firstName: event.target.value })}
            required
          />
        </label>
        <label className="field" htmlFor="profile-last-name">
          <span>Apellido</span>
          <input
            id="profile-last-name"
            value={form.lastName}
            onChange={(event) => setForm({ ...form, lastName: event.target.value })}
            required
          />
        </label>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {message ? <p className="form-message" role="status">{message}</p> : null}
        <button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </button>
        </form>
      </article>
      <ChangePasswordForm
        onPasswordChanged={onSessionExpired}
        onSessionExpired={onSessionExpired}
      />
    </section>
  );
}
