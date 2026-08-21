import { useState } from 'react';
import '../styles/dashboard.css';
import Sidebar from './Sidebar.jsx';
import UserManager from './UserManager.jsx';

// Dashboard presenta el panel principal para usuarios autenticados.
// Incluye un sidebar, una sección de datos y el módulo de usuarios.
export default function Dashboard({ user, onLogout }) {
  const [selectedPage, setSelectedPage] = useState('summary');

  return (
    <div className="dashboard-layout">
      <Sidebar
        user={user}
        onLogout={onLogout}
        selectedPage={selectedPage}
        onSelectPage={setSelectedPage}
      />

      <section className="dashboard-main">
        <div className="dashboard-top">
          <div>
            <p className="eyebrow">{selectedPage === 'summary' ? 'Resumen' : 'Usuarios'}</p>
            <h2>Hola, {user.name}</h2>
          </div>
          <p className="dashboard-help">
            {selectedPage === 'summary'
              ? 'Monitorea tus dispositivos ESP32 y despliega actualizaciones desde aquí.'
              : 'Gestiona los usuarios del sistema desde este panel.'}
          </p>
        </div>

        {selectedPage === 'summary' ? (
          <>
            <div className="dashboard-overview">
              <article className="overview-card">
                <p>Dispositivos conectados</p>
                <strong>14</strong>
              </article>
              <article className="overview-card">
                <p>Actualizaciones pendientes</p>
                <strong>3</strong>
              </article>
              <article className="overview-card">
                <p>Tiempo de actividad</p>
                <strong>99.7%</strong>
              </article>
            </div>

            <div className="dashboard-grid">
              <article className="card">
                <h3>Estado del sistema</h3>
                <p>Conexión con ESP32: <strong>Activa</strong></p>
                <p>Última actualización: <strong>Hace 2 minutos</strong></p>
              </article>

              <article className="card">
                <h3>Próximos pasos</h3>
                <p>Prepara la ruta de actualización OTA para tus dispositivos.</p>
              </article>

              <article className="card">
                <h3>Medidas rápidas</h3>
                <p>Revisa la integridad de la tabla de dispositivos antes de desplegar.</p>
              </article>

              <article className="card">
                <h3>Notas</h3>
                <p>Este panel es una vista inicial. El backend real conectará aquí los datos de los ESP32.</p>
              </article>
            </div>
          </>
        ) : (
          <UserManager />
        )}
      </section>
    </div>
  );
}
