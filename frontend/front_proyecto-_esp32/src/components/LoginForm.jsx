import { useState } from 'react';
import '../styles/login.css';

// LoginForm muestra el formulario de autenticación.
// Recibe onSubmit, loading y error como propiedades desde App.
export default function LoginForm({ onSubmit, loading, error, message, onForgotPassword }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Envía los datos del formulario al controlador padre.
  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(email, password);
  };

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <div className="auth-header">
        <p className="eyebrow">Portal de usuario</p>
        <h2>Iniciar sesión</h2>
      </div>

      <label className="field" htmlFor="email-input">
        <span>Correo electrónico</span>
        <input
          id="email-input"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="correo@ejemplo.com"
          autoComplete="email"
          required
        />
      </label>

      <label className="field" htmlFor="password-input">
        <span>Contraseña</span>
        <div className="password-input-wrap">
          <input
            id="password-input"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••"
            autoComplete="current-password"
            required
          />
          <button
            className="password-visibility-toggle"
            type="button"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((visible) => !visible)}
          >
            {showPassword ? (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" />
                <path d="M9.9 5.2A10.7 10.7 0 0112 5c5.5 0 9 7 9 7a16 16 0 01-3.1 3.8M6.2 6.2C3.9 7.7 2 12 2 12s3.5 7 10 7a10.5 10.5 0 004.1-.8" />
              </svg>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      </label>

      {error ? (
        <p className="form-error" role="alert" aria-live="assertive">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="form-message" role="status" aria-live="polite">
          {message}
        </p>
      ) : null}

      <button type="submit" disabled={loading}>
        {loading ? 'Verificando acceso...' : 'Iniciar sesión'}
      </button>

      <button type="button" className="auth-link" onClick={onForgotPassword}>
        ¿Olvidaste tu contraseña?
      </button>
    </form>
  );
}
