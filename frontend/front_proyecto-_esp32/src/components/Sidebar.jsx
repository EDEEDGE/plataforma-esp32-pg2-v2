import { useState } from 'react';

// Sidebar es el menú lateral del dashboard.
// Incluye marca, estado del usuario, navegación y botón de logout.
export default function Sidebar({ user, onLogout, selectedPage, onSelectPage }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-top">
        <div className="sidebar-brand">
          <span className="brand-mark">ESP</span>
          <div>
            <p className="brand-title">ESP32 Update</p>
            <p className="brand-subtitle">Control y despliegue</p>
          </div>
        </div>

        {/* Botón que muestra y oculta el menú en pantallas pequeñas */}
        <button
          type="button"
          className="sidebar-toggle"
          aria-expanded={menuOpen}
          aria-controls="sidebar-navigation"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          {menuOpen ? 'Cerrar menú' : 'Abrir menú'}
        </button>
      </div>

      <div className="sidebar-profile">
        <p className="sidebar-label">Usuario</p>
        <h3>{user.name}</h3>
        <p className="sidebar-role">{user.role}</p>
      </div>

      <nav className="sidebar-nav" aria-label="Navegación principal" id="sidebar-navigation">
        <ul>
          <li>
            <button
              type="button"
              className={`nav-item${selectedPage === 'summary' ? ' active' : ''}`}
              onClick={() => onSelectPage('summary')}
            >
              Resumen
            </button>
          </li>
          <li>
            <button
              type="button"
              className={`nav-item${selectedPage === 'users' ? ' active' : ''}`}
              onClick={() => onSelectPage('users')}
            >
              Usuarios
            </button>
          </li>
          <li>
            <button type="button" className="nav-item" disabled>
              Dispositivos
            </button>
          </li>
          <li>
            <button type="button" className="nav-item" disabled>
              Actualizaciones
            </button>
          </li>
        </ul>
      </nav>

      <div className="sidebar-logout">
        <button className="logout-button" onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
