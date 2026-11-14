import { useEffect, useMemo, useRef, useState } from 'react';
import { getMyRooms } from '../services/roomService.js';
import { getRoomProjects } from '../services/projectService.js';
import {
  getProjectDevicesReport,
  getProjectSummary,
  getProjectUpdateHistory,
} from '../services/reportService.js';
import { cancelFirmwareDeploymentAssignment } from '../services/firmwareService.js';
import '../styles/reports.css';

const reportStatusLabels = {
  PENDING: 'Pendiente',
  INSTALLED: 'Instalada',
  FAILED: 'Fallida',
  SUPERSEDED: 'Sustituida',
  CANCELLED: 'Cancelada',
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
    <span
      className={`report-status report-status-${status?.toLowerCase() || 'unknown'}`}
      aria-label={`Estado: ${reportStatusLabels[status] || status || 'Sin estado'}`}
    >
      {reportStatusLabels[status] || status || 'Sin estado'}
    </span>
  );
}

const historyColumns = [
  { key: 'device', label: 'Dispositivo', value: (item) => item.device.name || '—' },
  { key: 'type', label: 'Tipo', value: (item) => item.device.deviceType || '—' },
  { key: 'version', label: 'Versión', value: (item) => item.firmware.version || '—' },
  {
    key: 'status',
    label: 'Estado',
    value: (item) => reportStatusLabels[item.status] || item.status || 'Sin estado',
  },
  {
    key: 'assignedAt',
    label: 'Asignada',
    value: (item) => formatDate(item.assignedAt),
    sortValue: (item) => item.assignedAt ? new Date(item.assignedAt).getTime() : Number.NEGATIVE_INFINITY,
  },
  {
    key: 'installedAt',
    label: 'Instalada',
    value: (item) => formatDate(item.installedAt),
    sortValue: (item) => item.installedAt ? new Date(item.installedAt).getTime() : Number.NEGATIVE_INFINITY,
  },
];

const deviceColumns = [
  { key: 'name', label: 'Nombre', value: (device) => device.name || '—' },
  { key: 'deviceType', label: 'Tipo', value: (device) => device.deviceType || '—' },
  { key: 'isActive', label: 'Estado', value: (device) => (device.isActive ? 'Activo' : 'Inactivo') },
  { key: 'isPaired', label: 'Vinculación', value: (device) => (device.isPaired ? 'Vinculado' : 'Sin vincular') },
];

function sortRows(rows, columns, sort) {
  const column = columns.find(({ key }) => key === sort.key);
  if (!column) {
    return rows;
  }

  return [...rows].sort((first, second) => {
    const firstValue = column.sortValue ? column.sortValue(first) : column.value(first);
    const secondValue = column.sortValue ? column.sortValue(second) : column.value(second);
    const comparison = typeof firstValue === 'number' && typeof secondValue === 'number'
      ? firstValue - secondValue
      : String(firstValue).localeCompare(String(secondValue), 'es', {
        numeric: true,
        sensitivity: 'base',
      });
    return sort.direction === 'asc' ? comparison : -comparison;
  });
}

function SortableHeader({ column, sort, onSort }) {
  const direction = sort.key === column.key ? sort.direction : null;
  return (
    <th scope="col" aria-sort={direction ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        className="reports-sort-button"
        onClick={() => onSort(column.key)}
        aria-label={`Ordenar por ${column.label}${direction === 'asc' ? ', orden ascendente' : direction === 'desc' ? ', orden descendente' : ''}`}
      >
        {column.label}
        <span aria-hidden="true">{direction === 'asc' ? ' ↑' : direction === 'desc' ? ' ↓' : ' ↕'}</span>
      </button>
    </th>
  );
}

function csvCell(value) {
  const text = String(value ?? '').replace(/^(\s*)([=+\-@])/, "$1'$2");
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv(filename, columns, rows) {
  const csv = [
    columns.map(({ label }) => csvCell(label)).join(','),
    ...rows.map((row) => columns.map(({ value }) => csvCell(value(row))).join(',')),
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function filenamePart(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64)
    .replace(/-$/g, '') || 'proyecto';
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
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [cancelingAssignmentId, setCancelingAssignmentId] = useState(null);
  const [exportMessage, setExportMessage] = useState('');
  const [exportError, setExportError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshMessage, setRefreshMessage] = useState('');
  const [historyStatus, setHistoryStatus] = useState('all');
  const [deviceStatus, setDeviceStatus] = useState('all');
  const [devicePairing, setDevicePairing] = useState('all');
  const [historySort, setHistorySort] = useState({ key: 'assignedAt', direction: 'desc' });
  const [deviceSort, setDeviceSort] = useState({ key: 'name', direction: 'asc' });
  const refreshRequestProjectId = useRef(null);

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
          if (refreshRequestProjectId.current === selectedProjectId) {
            setRefreshMessage('Los reportes se actualizaron con los datos disponibles del servidor.');
            refreshRequestProjectId.current = null;
          }
        }
      })
      .catch((loadError) => {
        if (isMounted) {
          setReports(null);
          setRefreshMessage('');
          if (refreshRequestProjectId.current === selectedProjectId) {
            refreshRequestProjectId.current = null;
          }
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
  const canCancelDeployments = ['OWNER', 'ADMIN'].includes(selectedRoom?.role);
  const historyRows = useMemo(() => {
    const rows = reports?.history.history || [];
    return sortRows(
      rows.filter((item) => historyStatus === 'all' || item.status === historyStatus),
      historyColumns,
      historySort
    );
  }, [reports, historyStatus, historySort]);
  const deviceRows = useMemo(() => {
    const rows = reports?.devices.devices || [];
    return sortRows(
      rows.filter((device) => (
        (deviceStatus === 'all' || String(device.isActive) === deviceStatus)
        && (devicePairing === 'all' || String(device.isPaired) === devicePairing)
      )),
      deviceColumns,
      deviceSort
    );
  }, [reports, deviceStatus, devicePairing, deviceSort]);

  const toggleSort = (setSort) => (key) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleExport = (filename, columns, rows, reportName) => {
    setExportMessage('');
    setExportError('');

    try {
      downloadCsv(filename, columns, rows);
      setExportMessage(`Se inició la descarga del CSV de ${reportName}.`);
    } catch (exportFailure) {
      setExportError(exportFailure.message || `No se pudo generar el CSV de ${reportName}.`);
    }
  };

  const refreshReports = () => {
    setReports(null);
    setLoadingReports(true);
    setError('');
    setRefreshMessage('');
    refreshRequestProjectId.current = selectedProjectId;
    setRefreshKey((currentKey) => currentKey + 1);
  };

  const handleCancelAssignment = async (item) => {
    if (
      item.status !== 'PENDING'
      || !canCancelDeployments
      || !window.confirm(`¿Cancelar la actualización pendiente de ${item.device.name || 'este dispositivo'}?`)
    ) {
      return;
    }

    setCancelingAssignmentId(item.deploymentDeviceId);
    setActionError('');
    setActionMessage('');

    try {
      const result = await cancelFirmwareDeploymentAssignment(item.deploymentDeviceId);
      setActionMessage(result.message || 'Actualización cancelada correctamente.');
      refreshReports();
    } catch (cancelError) {
      setActionError(cancelError.message || 'No se pudo cancelar la actualización.');
    } finally {
      setCancelingAssignmentId(null);
    }
  };

  const handleRoomChange = (event) => {
    setLoadingProjects(true);
    setLoadingReports(false);
    setSelectedRoomId(event.target.value);
    setProjects([]);
    setSelectedProjectId('');
    setReports(null);
    setError('');
    setActionError('');
    setActionMessage('');
    setRefreshMessage('');
    refreshRequestProjectId.current = null;
    setHistoryStatus('all');
    setDeviceStatus('all');
    setDevicePairing('all');
  };

  const handleProjectChange = (event) => {
    setLoadingReports(true);
    setSelectedProjectId(event.target.value);
    setReports(null);
    setError('');
    setActionError('');
    setActionMessage('');
    setRefreshMessage('');
    refreshRequestProjectId.current = null;
    setHistoryStatus('all');
    setDeviceStatus('all');
    setDevicePairing('all');
  };

  return (
    <section className="reports-workspace">
      <h2 className="reports-print-title">Reporte de actividad del proyecto</h2>
      <article className="card reports-toolbar">
        <div>
          <h3>Actividad del proyecto</h3>
          <p>Revisa el inventario, los despliegues y las actualizaciones confirmadas por los dispositivos.</p>
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
        <div className="reports-toolbar-tools">
          <button
            type="button"
            className="secondary-button"
            onClick={() => window.print()}
            disabled={!reports}
          >
            Imprimir / Guardar PDF
          </button>
        </div>
      </article>

      {selectedRoom && selectedProject ? (
        <p className="reports-context">
          {selectedRoom.name} <span aria-hidden="true">/</span> {selectedProject.name}
        </p>
      ) : null}
      <details className="reports-help">
        <summary>Acerca de estos reportes</summary>
        <p>
          Los datos corresponden a la sala y el proyecto seleccionados. Los filtros y los archivos
          exportados usan únicamente la información cargada aquí; las instalaciones reflejan las confirmaciones
          recibidas de los dispositivos.
        </p>
      </details>
      {error ? <p className="form-error reports-feedback" role="alert">{error}</p> : null}
      {actionError ? <p className="form-error reports-feedback" role="alert">{actionError}</p> : null}
      {actionMessage ? <p className="form-message reports-feedback" role="status">{actionMessage}</p> : null}
      {refreshMessage ? <p className="form-message reports-feedback" role="status">{refreshMessage}</p> : null}
      {exportError ? <p className="form-error reports-feedback" role="alert">{exportError}</p> : null}
      {exportMessage ? <p className="form-message reports-feedback" role="status">{exportMessage}</p> : null}
      {loadingRooms || loadingProjects || loadingReports ? (
        <p className="room-secondary-text" role="status" aria-live="polite">Cargando la actividad del proyecto…</p>
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
            <div className="reports-section-tools">
              <label className="reports-filter" htmlFor="reports-history-status">
                <span>Filtrar por estado</span>
                <select
                  id="reports-history-status"
                  value={historyStatus}
                  onChange={(event) => setHistoryStatus(event.target.value)}
                >
                  <option value="all">Todos los estados</option>
                  {Object.entries(reportStatusLabels)
                    .filter(([status]) => status !== 'SUPERSEDED')
                    .map(([status, label]) => (
                      <option value={status} key={status}>{label}</option>
                    ))}
                </select>
              </label>
              <button
                type="button"
                className="secondary-button"
                onClick={() => handleExport(
                  `historial-actualizaciones-${filenamePart(selectedProject?.name || '')}.csv`,
                  historyColumns,
                  historyRows,
                  'historial de actualizaciones'
                )}
                disabled={historyRows.length === 0}
              >
                Exportar historial CSV ({historyRows.length})
              </button>
            </div>
            {reports.history.history.length === 0 ? (
              <p className="reports-empty-inline">Todavía no hay asignaciones OTA para este proyecto.</p>
            ) : historyRows.length === 0 ? (
              <p className="reports-empty-inline" role="status">No hay actualizaciones que coincidan con el filtro.</p>
            ) : (
              <div className="reports-table-scroll" aria-busy={loadingReports}>
                <table className="reports-table">
                  <caption className="visually-hidden">Historial de actualizaciones del proyecto seleccionado</caption>
                  <thead>
                    <tr>
                      {historyColumns.map((column) => (
                        <SortableHeader
                          column={column}
                          sort={historySort}
                          onSort={toggleSort(setHistorySort)}
                          key={column.key}
                        />
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.map((item) => (
                      <tr key={item.deploymentDeviceId}>
                        <td>{historyColumns[0].value(item)}</td>
                        <td>{historyColumns[1].value(item)}</td>
                        <td>{historyColumns[2].value(item)}</td>
                        <td>
                          <ReportStatus status={item.status} />
                          {item.errorMessage ? (
                            <small className="report-error-message">{item.errorMessage}</small>
                          ) : null}
                        </td>
                        <td>{historyColumns[4].value(item)}</td>
                        <td>
                          {historyColumns[5].value(item)}
                          {item.status === 'PENDING' && canCancelDeployments ? (
                            <button
                              type="button"
                              className="danger-button reports-cancel-button"
                              onClick={() => handleCancelAssignment(item)}
                              disabled={cancelingAssignmentId !== null}
                              aria-busy={cancelingAssignmentId === item.deploymentDeviceId}
                              aria-label={`Cancelar actualización pendiente de ${item.device.name || 'este dispositivo'}`}
                            >
                              {cancelingAssignmentId === item.deploymentDeviceId ? 'Cancelando…' : 'Cancelar'}
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="reports-section" aria-labelledby="reports-devices-title">
            <h4 id="reports-devices-title">Dispositivos del proyecto</h4>
            <div className="reports-section-tools">
              <label className="reports-filter" htmlFor="reports-device-status">
                <span>Estado</span>
                <select
                  id="reports-device-status"
                  value={deviceStatus}
                  onChange={(event) => setDeviceStatus(event.target.value)}
                >
                  <option value="all">Todos</option>
                  <option value="true">Activos</option>
                  <option value="false">Inactivos</option>
                </select>
              </label>
              <label className="reports-filter" htmlFor="reports-device-pairing">
                <span>Vinculación</span>
                <select
                  id="reports-device-pairing"
                  value={devicePairing}
                  onChange={(event) => setDevicePairing(event.target.value)}
                >
                  <option value="all">Todas</option>
                  <option value="true">Vinculados</option>
                  <option value="false">Sin vincular</option>
                </select>
              </label>
              <button
                type="button"
                className="secondary-button"
                onClick={() => handleExport(
                  `dispositivos-${filenamePart(selectedProject?.name || '')}.csv`,
                  deviceColumns,
                  deviceRows,
                  'dispositivos'
                )}
                disabled={deviceRows.length === 0}
              >
                Exportar dispositivos CSV ({deviceRows.length})
              </button>
            </div>
            {reports.devices.devices.length === 0 ? (
              <p className="reports-empty-inline">Este proyecto aún no tiene dispositivos registrados.</p>
            ) : deviceRows.length === 0 ? (
              <p className="reports-empty-inline" role="status">No hay dispositivos que coincidan con los filtros.</p>
            ) : (
              <div className="reports-table-scroll" aria-busy={loadingReports}>
                <table className="reports-table reports-devices-table">
                  <caption className="visually-hidden">Dispositivos del proyecto seleccionado</caption>
                  <thead>
                    <tr>
                      {deviceColumns.map((column) => (
                        <SortableHeader
                          column={column}
                          sort={deviceSort}
                          onSort={toggleSort(setDeviceSort)}
                          key={column.key}
                        />
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {deviceRows.map((device) => (
                      <tr key={device.id}>
                        {deviceColumns.map((column) => (
                          <td key={column.key}>{column.value(device)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <p className="reports-footnote">
            Una actualización se considera instalada cuando el dispositivo la confirma después de reiniciarse.
          </p>
        </>
      ) : null}
    </section>
  );
}
