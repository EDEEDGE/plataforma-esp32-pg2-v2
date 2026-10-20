import { useEffect, useState } from 'react';
import '../styles/dashboard.css';
import { getDeviceOverview } from '../services/dashboardService.js';
import Sidebar from './Sidebar.jsx';
import UserManager from './UserManager.jsx';
import ProfileForm from './ProfileForm.jsx';
import RoomsPage from './RoomsPage.jsx';
import RoomDetailPage from './RoomDetailPage.jsx';
import FirmwareWorkspace from './FirmwareWorkspace.jsx';

// Dashboard presenta el panel principal para usuarios autenticados.
// Incluye un sidebar, una sección de datos y el módulo de usuarios.
export default function Dashboard({ user, onLogout, onUserUpdated }) {
  const [selectedPage, setSelectedPage] = useState('summary');
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState('');

  useEffect(() => {
    let isMounted = true;

    getDeviceOverview()
      .then((deviceOverview) => {
        if (isMounted) {
          setOverview(deviceOverview);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setOverviewError(error.message || 'No se pudo cargar el resumen de dispositivos.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setOverviewLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleOverviewRefresh = async () => {
    setOverviewLoading(true);
    setOverviewError('');

    try {
      setOverview(await getDeviceOverview());
    } catch (error) {
      setOverviewError(error.message || 'No se pudo actualizar el resumen de dispositivos.');
    } finally {
      setOverviewLoading(false);
    }
  };

  const handleSelectPage = (page) => {
    setSelectedPage(page);
    setSelectedRoomId(null);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar
        user={user}
        onLogout={onLogout}
        selectedPage={selectedPage}
        onSelectPage={handleSelectPage}
      />

      <section className="dashboard-main">
        <div className="dashboard-top">
          <div>
            <p className="eyebrow">
              {selectedPage === 'summary'
                ? 'Resumen'
                : selectedPage === 'rooms'
                  ? 'Salas'
                  : selectedPage === 'users'
                    ? 'Usuarios'
                    : selectedPage === 'updates'
                      ? 'Actualizaciones OTA'
                    : 'Mi perfil'}
            </p>
            <h2>Hola, {user.name}</h2>
          </div>
          <p className="dashboard-help">
            {selectedPage === 'summary'
              ? 'Monitorea tus dispositivos ESP32 y despliega actualizaciones desde aquí.'
              : selectedPage === 'rooms'
                ? 'Consulta y crea las salas donde organizas tus proyectos y dispositivos.'
                : selectedPage === 'users'
                  ? 'Gestiona los usuarios del sistema desde este panel.'
                    : selectedPage === 'updates'
                      ? 'Administra versiones de firmware y crea despliegues para tus dispositivos.'
                    : 'Consulta y actualiza tus datos personales.'}
          </p>
        </div>

        {selectedPage === 'summary' ? (
          <>
            <div className="dashboard-overview">
              <article className="overview-card">
                <p>Dispositivos registrados</p>
                <strong>{overviewLoading ? '…' : overview?.deviceCount ?? '—'}</strong>
              </article>
              <article className="overview-card">
                <p>Dispositivos activos</p>
                <strong>{overviewLoading ? '…' : overview?.activeDeviceCount ?? '—'}</strong>
              </article>
              <article className="overview-card">
                <p>Dispositivos vinculados</p>
                <strong>{overviewLoading ? '…' : overview?.pairedDeviceCount ?? '—'}</strong>
              </article>
            </div>

            {overviewError ? (
              <article className="card">
                <p className="form-error" role="alert">{overviewError}</p>
                <button type="button" className="secondary-button" onClick={handleOverviewRefresh}>
                  Reintentar carga
                </button>
              </article>
            ) : null}
            {!overviewError && overview && !overviewLoading ? (
              <article className="card dashboard-communication-card">
                <h3>Última comunicación reportada</h3>
                <p>
                  {overview.latestCommunication
                    ? new Date(overview.latestCommunication).toLocaleString()
                    : 'Ningún dispositivo ha reportado comunicación.'}
                </p>
                <button type="button" className="secondary-button" onClick={handleOverviewRefresh}>
                  Actualizar resumen
                </button>
              </article>
            ) : null}

            <div className="dashboard-grid">
              <article className="card">
                <h3>Estado de dispositivos</h3>
                <p>Los totales se calculan con los dispositivos visibles en tus salas y proyectos.</p>
              </article>

              <article className="card">
                <h3>Próximos pasos</h3>
                <p>Abre Actualizaciones OTA para cargar firmware y asignarlo a dispositivos compatibles.</p>
              </article>
            </div>
          </>
        ) : selectedPage === 'rooms' ? (
          selectedRoomId ? (
            <RoomDetailPage
              roomId={selectedRoomId}
              userId={user.id}
              onBack={() => setSelectedRoomId(null)}
            />
          ) : (
            <RoomsPage onOpenRoom={setSelectedRoomId} />
          )
        ) : selectedPage === 'users' ? (
          <UserManager onSessionExpired={onLogout} />
        ) : selectedPage === 'updates' ? (
          <FirmwareWorkspace />
        ) : (
          <ProfileForm
            user={user}
            onUserUpdated={onUserUpdated}
            onSessionExpired={onLogout}
          />
        )}
      </section>
    </div>
  );
}
