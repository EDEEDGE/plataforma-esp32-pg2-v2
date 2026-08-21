import { useState } from 'react';
import '../styles/login.css';

// LoginForm muestra el formulario de autenticación.
// Recibe onSubmit, loading y error como propiedades desde App.
export default function LoginForm({ onSubmit, loading, error }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123456');

  // Envía los datos del formulario al controlador padre.
  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(username, password);
  };

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <div className="auth-header">
        <p className="eyebrow">Plataforma para actualizar ESP32</p>
        <h2>Iniciar sesión</h2>
      </div>

      <label className="field" htmlFor="username-input">
        <span>Usuario</span>
        <input
          id="username-input"
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="usuario"
          autoComplete="username"
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
