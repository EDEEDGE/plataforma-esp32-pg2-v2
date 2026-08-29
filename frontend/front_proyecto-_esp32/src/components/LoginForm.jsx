import { useState } from 'react';
import '../styles/login.css';

// LoginForm muestra el formulario de autenticación.
// Recibe onSubmit, loading y error como propiedades desde App.
export default function LoginForm({ onSubmit, loading, error }) {
  const [email, setEmail] = useState('admin@plataforma.com');
  const [password, setPassword] = useState('admin123456');

  // Envía los datos del formulario al controlador padre.
  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(email, password);
  };

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <div className="auth-header">
        <p className="eyebrow">Plataforma para actualizar ESP32</p>
        <h2>Iniciar sesión</h2>
      </div>

      <label className="field" htmlFor="email-input">
        <span>Correo</span>
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
        <input
          id="password-input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••"
          autoComplete="current-password"
          required
        />
      </label>

      {error ? (
        <p className="form-error" role="alert" aria-live="assertive">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={loading}>
        {loading ? 'Ingresando...' : 'Entrar'}
      </button>
    </form>
  );
}
