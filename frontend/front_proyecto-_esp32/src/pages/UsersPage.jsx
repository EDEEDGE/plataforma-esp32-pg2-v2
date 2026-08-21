import '../styles/userManager.css';
import UserManager from '../components/UserManager.jsx';

// UsersPage es una página separada que muestra el módulo de gestión de usuarios.
export default function UsersPage() {
  return (
    <main className="main-content">
      <section className="page-shell">
        <div className="page-header">
          <p className="eyebrow">Usuarios</p>
          <h1>Gestión de usuarios</h1>
          <p>Crear, editar y eliminar usuarios de forma simulada.</p>
        </div>
        <UserManager />
      </section>
    </main>
  );
}
