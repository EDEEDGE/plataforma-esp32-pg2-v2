import { useEffect, useState } from 'react';
import { getMyRooms } from '../services/roomService.js';
import { getRoomProjects } from '../services/projectService.js';
import {
  getProjectDevicesReport,
  getProjectSummary,
  getProjectUpdateHistory,
} from '../services/reportService.js';
import '../styles/reports.css';

const reportStatusLabels = {
  PENDING: 'Pendiente',
  INSTALLED: 'Instalada',
  FAILED: 'Fallida',
  SUPERSEDED: 'Sustituida',
};

function formatDate(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

function ReportStatus({ status }) {
  return (
    <span className={`report-status report-status-${status?.toLowerCase() || 'unknown'}`}>
      {reportStatusLabels[status] || status || 'Sin estado'}
    </span>
  );
}

export default function ReportsWorkspace() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [reports, setReports] = useState(null);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    getMyRooms()
      .then((loadedRooms) => {
        if (isMounted) {
          setRooms(loadedRooms);
          const firstRoomId = loadedRooms[0]?.id || '';
          if (firstRoomId) {
            setLoadingProjects(true);
            setSelectedRoomId(firstRoomId);
          }
        }
      })
      .catch((loadError) => {
        if (isMounted) {
          setError(loadError.message || 'No se pudieron cargar las salas.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoadingRooms(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedRoomId) {
      return undefined;
    }

    let isMounted = true;

    getRoomProjects(selectedRoomId)
      .then((loadedProjects) => {
        if (isMounted) {
          setProjects(loadedProjects);
          const firstProjectId = loadedProjects[0]?.id || '';
          if (firstProjectId) {
            setLoadingReports(true);
            setSelectedProjectId(firstProjectId);
          }
        }
      })
      .catch((loadError) => {
        if (isMounted) {
          setError(loadError.message || 'No se pudieron cargar los proyectos.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoadingProjects(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedRoomId]);

  useEffect(() => {
    if (!selectedProjectId) {
      return undefined;
    }

    let isMounted = true;

    Promise.all([
      getProjectSummary(selectedProjectId),
      getProjectUpdateHistory(selectedProjectId),
      getProjectDevicesReport(selectedProjectId),
    ])
      .then(([summary, history, devices]) => {
        if (isMounted) {
          setReports({ summary, history, devices });
        }
      })
      .catch((loadError) => {
        if (isMounted) {
          setReports(null);
          setError(loadError.message || 'No se pudieron cargar los reportes.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoadingReports(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedProjectId, refreshKey]);

  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId);

  const refreshReports = () => {
    setReports(null);
    setLoadingReports(true);
    setError('');
    setRefreshKey((currentKey) => currentKey + 1);
  };

  const handleRoomChange = (event) => {
    setLoadingProjects(true);
    setLoadingReports(false);
    setSelectedRoomId(event.target.value);
    setProjects([]);
    setSelectedProjectId('');
    setReports(null);
    setError('');
  };

  const handleProjectChange = (event) => {
    setLoadingReports(true);
    setSelectedProjectId(event.target.value);
    setReports(null);
    setError('');
  };

  return (
    <section className="reports-workspace">
      <article className="card reports-toolbar">
        <div>
          <h3>Reportes del proyecto</h3>
          <p>Consulta dispositivos, despliegues y resultados confirmados por las placas.</p>
        </div>
        <div className="reports-selectors">
          <label className="field" htmlFor="reports-room">
            <span>Sala</span>
            <select
              id="reports-room"
              value={selectedRoomId}
              onChange={handleRoomChange}
              disabled={loadingRooms || rooms.length === 0}
            >
              {rooms.length === 0 ? <option value="">Sin salas</option> : null}
              {rooms.map((room) => (
                <option value={room.id} key={room.id}>{room.name}</option>
              ))}
            </select>
          </label>
          <label className="field" htmlFor="reports-project">
            <span>Proyecto</span>
            <select
              id="reports-project"
              value={selectedProjectId}
              onChange={handleProjectChange}
              disabled={loadingProjects || projects.length === 0}
            >
              {projects.length === 0 ? <option value="">Sin proyectos</option> : null}
              {projects.map((project) => (
                <option value={project.id} key={project.id}>{project.name}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="secondary-button"
            onClick={refreshReports}
            disabled={!selectedProjectId || loadingReports}
            aria-busy={loadingReports}
          >
            {loadingReports ? 'Actualizando…' : 'Actualizar reportes'}
          </button>
        </div>
      </article>

      {selectedRoom && selectedProject ? (
        <p className="reports-context">
          {selectedRoom.name} <span aria-hidden="true">/</span> {selectedProject.name}
        </p>
      ) : null}
      {error ? <p className="form-error reports-feedback" role="alert">{error}</p> : null}
      {loadingRooms || loadingProjects || loadingReports ? (
        <p className="room-secondary-text" role="status">Cargando reportes del proyecto…</p>
      ) : !error && rooms.length === 0 ? (
        <article className="card reports-empty">
          <h4>No tienes salas disponibles</h4>
          <p>Crea una sala o acepta una invitación para consultar reportes.</p>
        </article>
      ) : !error && selectedRoomId && projects.length === 0 ? (
        <article className="card reports-empty">
          <h4>Esta sala aún no tiene proyectos</h4>
          <p>Cuando haya un proyecto, aquí podrás revisar su actividad y sus dispositivos.</p>
        </article>
      ) : null}

      {reports ? (
        <>
          <section className="reports-section" aria-labelledby="reports-summary-title">
            <h4 id="reports-summary-title">Resumen</h4>
            <div className="reports-summary-grid">
              <article className="overview-card">
                <p>Dispositivos</p>
                <strong>{reports.summary.devices.total}</strong>
                <small>{reports.summary.devices.active} activos · {reports.summary.devices.paired} vinculados</small>
              </article>
              <article className="overview-card">
                <p>Despliegues</p>
                <strong>{reports.summary.deployments.total}</strong>
                <small>Despliegues registrados para el proyecto</small>
              </article>
              <article className="overview-card">
                <p>Instalaciones confirmadas</p>
                <strong>{reports.summary.installations.installed}</strong>
                <small>
                  {reports.summary.installations.successRate === null
                    ? 'Aún no hay resultados completados'
                    : `Tasa de éxito: ${reports.summary.installations.successRate}%`}
                </small>
              </article>
              <article className="overview-card">
                <p>Otros estados OTA</p>
                <strong>{reports.summary.installations.pending + reports.summary.installations.failed
                  + reports.summary.installations.superseded}</strong>
                <small>
                  {reports.summary.installations.pending} pendientes · {reports.summary.installations.failed} fallidas
                  {' · '}{reports.summary.installations.superseded} sustituidas
                </small>
              </article>
            </div>
          </section>

          <section className="reports-section" aria-labelledby="reports-history-title">
            <h4 id="reports-history-title">Historial de actualizaciones</h4>
            {reports.history.history.length === 0 ? (
              <p className="reports-empty-inline">Todavía no hay asignaciones OTA para este proyecto.</p>
            ) : (
              <div className="reports-table-scroll">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th scope="col">Dispositivo</th>
                      <th scope="col">Tipo</th>
                      <th scope="col">Versión</th>
                      <th scope="col">Estado</th>
                      <th scope="col">Asignada</th>
                      <th scope="col">Instalada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.history.history.map((item) => (
                      <tr key={item.deploymentDeviceId}>
                        <td>{item.device.name}</td>
                        <td>{item.device.deviceType || '—'}</td>
                        <td>{item.firmware.version || '—'}</td>
                        <td>
                          <ReportStatus status={item.status} />
                          {item.errorMessage ? (
                            <small className="report-error-message">{item.errorMessage}</small>
                          ) : null}
                        </td>
                        <td>{formatDate(item.assignedAt)}</td>
                        <td>{formatDate(item.installedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="reports-section" aria-labelledby="reports-devices-title">
            <h4 id="reports-devices-title">Dispositivos del proyecto</h4>
            {reports.devices.devices.length === 0 ? (
              <p className="reports-empty-inline">Este proyecto aún no tiene dispositivos registrados.</p>
            ) : (
              <div className="reports-table-scroll">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th scope="col">Nombre</th>
                      <th scope="col">Tipo</th>
                      <th scope="col">Estado</th>
                      <th scope="col">Vinculación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.devices.devices.map((device) => (
                      <tr key={device.id}>
                        <td>{device.name}</td>
                        <td>{device.deviceType}</td>
                        <td>{device.isActive ? 'Activo' : 'Inactivo'}</td>
                        <td>{device.isPaired ? 'Vinculado' : 'Sin vincular'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <p className="reports-footnote">
            El estado instalado aparece cuando la placa confirma la actualización después de reiniciar.
          </p>
        </>
      ) : null}
    </section>
  );
}
