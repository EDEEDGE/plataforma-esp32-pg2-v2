import { useState } from 'react';
import { requestPasswordReset } from '../services/auth.js';
import '../styles/login.css';

export default function ForgotPasswordForm() {
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
    <form className="auth-card auth-recovery-form" onSubmit={handleSubmit}>
      <div className="auth-header">
        <p className="eyebrow">Portal de usuario</p>
        <h2>Recuperar acceso</h2>
        <p>Te enviaremos un enlace para restablecer tu contraseña.</p>
      </div>
      <label className="field" htmlFor="forgot-email">
        <span>Correo electrónico</span>
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
        {loading ? 'Enviando enlace...' : 'Enviar enlace de recuperación'}
      </button>
    </form>
  );
}
