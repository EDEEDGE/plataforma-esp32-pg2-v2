import { useState } from 'react';
import PasswordInput from './PasswordInput.jsx';
import '../styles/login.css';

const initialForm = {
  username: '',
  email: '',
  password: '',
  firstName: '',
  lastName: ''
};

export default function RegisterForm({ onSubmit, loading, error }) {
  const [form, setForm] = useState(initialForm);
  const [confirmation, setConfirmation] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const passwordsMismatch = confirmation.length > 0 && form.password !== confirmation;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (passwordsMismatch) {
      return;
    }

    onSubmit(form);
  };

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <div className="auth-header">
        <p className="eyebrow">Portal de usuario</p>
        <h2>Crear cuenta</h2>
        <p>Registra tus datos para acceder a la plataforma de gestión.</p>
      </div>

      <label className="field" htmlFor="register-username">
        <span>Nombre de usuario</span>
        <input
          id="register-username"
          name="username"
          value={form.username}
          onChange={handleChange}
          autoComplete="username"
          required
        />
      </label>

      <label className="field" htmlFor="register-email">
        <span>Correo electrónico</span>
        <input
          id="register-email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          autoComplete="email"
          required
        />
      </label>

      <label className="field" htmlFor="register-password">
        <span>Contraseña</span>
        <PasswordInput
          id="register-password"
          name="password"
          value={form.password}
          onChange={handleChange}
          minLength="8"
          autoComplete="new-password"
          required
        />
      </label>

      <label className="field" htmlFor="register-password-confirmation">
        <span>Confirmar contraseña</span>
        <PasswordInput
          id="register-password-confirmation"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          minLength="8"
          autoComplete="new-password"
          aria-invalid={passwordsMismatch}
          aria-describedby={passwordsMismatch ? 'register-password-mismatch' : undefined}
          required
        />
        {passwordsMismatch ? (
          <p id="register-password-mismatch" className="form-error" role="alert">
            Las contraseñas no coinciden.
          </p>
        ) : null}
      </label>

      <label className="field" htmlFor="register-first-name">
        <span>Nombre</span>
        <input
          id="register-first-name"
          name="firstName"
          value={form.firstName}
          onChange={handleChange}
          autoComplete="given-name"
          required
        />
      </label>

      <label className="field" htmlFor="register-last-name">
        <span>Apellido</span>
        <input
          id="register-last-name"
          name="lastName"
          value={form.lastName}
          onChange={handleChange}
          autoComplete="family-name"
          required
        />
      </label>

      {error ? (
        <p className="form-error" role="alert" aria-live="assertive">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={loading}>
        {loading ? 'Creando cuenta…' : 'Crear cuenta'}
      </button>

    </form>
  );
}
