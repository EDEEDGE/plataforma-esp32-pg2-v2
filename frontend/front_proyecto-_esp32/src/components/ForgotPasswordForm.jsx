import { useState } from 'react';
import { requestPasswordReset } from '../services/auth.js';
import '../styles/login.css';

export default function ForgotPasswordForm({ onBackToLogin }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await requestPasswordReset(email);
      setMessage(response.message);
    } catch (err) {
      setError(err.message || 'No se pudo solicitar la recuperación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <div className="auth-header">
        <p className="eyebrow">Plataforma para actualizar ESP32</p>
        <h2>Recuperar contraseña</h2>
        <p>Te enviaremos instrucciones si existe una cuenta con ese correo.</p>
      </div>
      <label className="field" htmlFor="forgot-email">
        <span>Correo</span>
        <input
          id="forgot-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {message ? <p className="form-message" role="status">{message}</p> : null}
      <button type="submit" disabled={loading}>
        {loading ? 'Enviando...' : 'Enviar instrucciones'}
      </button>
      <button type="button" className="auth-link" onClick={onBackToLogin}>
        Volver al inicio de sesión
      </button>
    </form>
  );
}
