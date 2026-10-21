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
            <p className="brand-title">Plataforma OTA</p>
            <p className="brand-subtitle">Gestión segura de firmware</p>
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
        <p className="sidebar-label">Cuenta</p>
        <h3>{user.name}</h3>
        <p className="sidebar-role">
          {user.role === 'ADMIN' ? 'Administrador' : 'Usuario'}
        </p>
      </div>

      <nav className="sidebar-nav" aria-label="Navegación principal" id="sidebar-navigation">
        <ul>
          <li>
            <button
              type="button"
              className={`nav-item${selectedPage === 'summary' ? ' active' : ''}`}
              aria-current={selectedPage === 'summary' ? 'page' : undefined}
              onClick={() => onSelectPage('summary')}
            >
              Resumen
            </button>
          </li>
          <li>
            <button
              type="button"
              className={`nav-item${selectedPage === 'rooms' ? ' active' : ''}`}
              aria-current={selectedPage === 'rooms' ? 'page' : undefined}
              onClick={() => onSelectPage('rooms')}
            >
              Salas y proyectos
            </button>
          </li>
          <li>
            <button
              type="button"
              className={`nav-item${selectedPage === 'updates' ? ' active' : ''}`}
              aria-current={selectedPage === 'updates' ? 'page' : undefined}
              onClick={() => onSelectPage('updates')}
            >
              Actualizaciones OTA
            </button>
          </li>
          {user.role === 'ADMIN' ? (
            <li>
              <button
                type="button"
                className={`nav-item${selectedPage === 'users' ? ' active' : ''}`}
                aria-current={selectedPage === 'users' ? 'page' : undefined}
                onClick={() => onSelectPage('users')}
              >
                Gestión de usuarios
              </button>
            </li>
          ) : null}
          <li>
            <button
              type="button"
              className={`nav-item${selectedPage === 'profile' ? ' active' : ''}`}
              aria-current={selectedPage === 'profile' ? 'page' : undefined}
              onClick={() => onSelectPage('profile')}
            >
              Mi perfil
            </button>
          </li>
        </ul>
      </nav>

      <div className="sidebar-logout">
        <button type="button" className="logout-button" onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
