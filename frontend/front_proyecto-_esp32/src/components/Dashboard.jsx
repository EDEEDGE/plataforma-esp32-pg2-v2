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

  const pageContent = {
    summary: {
      title: `Bienvenido, ${user.name}`,
      description: 'Consulta el estado de tus dispositivos y accede a las herramientas de gestión OTA.'
    },
    rooms: {
      title: 'Salas y proyectos',
      description: 'Organiza tus espacios de trabajo, proyectos y dispositivos.'
    },
    updates: {
      title: 'Centro de actualizaciones',
      description: 'Administra versiones de firmware y prepara despliegues para tus dispositivos.'
    },
    users: {
      title: 'Gestión de usuarios',
      description: 'Administra las cuentas y los niveles de acceso a la plataforma.'
    },
    profile: {
      title: 'Tu perfil',
      description: 'Mantén actualizados tus datos personales y credenciales de acceso.'
    }
  }[selectedPage];

  return (
    <div className="dashboard-layout">
      <Sidebar
        user={user}
        onLogout={onLogout}
        selectedPage={selectedPage}
        onSelectPage={handleSelectPage}
      />

      <section className="dashboard-main">
        <div className="dashboard-top" key={`header-${selectedPage}`}>
          <div>
            <p className="eyebrow">Plataforma de dispositivos</p>
            <h2>{pageContent.title}</h2>
          </div>
          <p className="dashboard-help">{pageContent.description}</p>
        </div>

        <div
          className="dashboard-section-content"
          key={`content-${selectedPage}-${selectedRoomId || 'list'}`}
        >
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
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleOverviewRefresh}
                    disabled={overviewLoading}
                    aria-busy={overviewLoading}
                  >
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
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleOverviewRefresh}
                    disabled={overviewLoading}
                    aria-busy={overviewLoading}
                  >
                    Actualizar resumen
                  </button>
                </article>
              ) : null}

              <div className="dashboard-grid">
                <article className="card">
                  <h3>Visibilidad de tus dispositivos</h3>
                  <p>
                    Los indicadores reflejan los dispositivos disponibles en las salas y proyectos a los que
                    tienes acceso.
                  </p>
                </article>

                <article className="card">
                  <h3>Gestión de firmware</h3>
                  <p>
                    Accede a Actualizaciones OTA para administrar versiones y preparar despliegues compatibles
                    con tus placas.
                  </p>
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
        </div>
      </section>
    </div>
  );
}
