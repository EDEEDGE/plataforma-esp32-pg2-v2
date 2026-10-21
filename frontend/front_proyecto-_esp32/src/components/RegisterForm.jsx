import { useState } from 'react';
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

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <div className="auth-header">
        <p className="eyebrow">Portal de usuario</p>
        <h2>Crear cuenta</h2>
        <p>Completa tus datos para acceder a la plataforma.</p>
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
        <input
          id="register-password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          minLength="8"
          autoComplete="new-password"
          required
        />
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
        {loading ? 'Creando cuenta...' : 'Crear mi cuenta'}
      </button>

    </form>
  );
}
