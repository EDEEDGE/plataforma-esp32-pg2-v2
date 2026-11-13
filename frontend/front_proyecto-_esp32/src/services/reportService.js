import { request } from './http.js';

export async function getProjectSummary(projectId) {
  const data = await request(`/projects/${projectId}/reports/summary`, {
    auth: true,
    fallbackMessage: 'No se pudo cargar el resumen del proyecto',
  });

  if (!data.project || !data.devices || !data.deployments || !data.installations) {
    throw new Error('La respuesta no contiene el resumen completo del proyecto.');
  }

  return data;
}

export async function getProjectUpdateHistory(projectId) {
  const data = await request(`/projects/${projectId}/reports/history`, {
    auth: true,
    fallbackMessage: 'No se pudo cargar el historial de actualizaciones',
  });

  if (!Array.isArray(data.history)) {
    throw new Error('La respuesta no contiene el historial de actualizaciones.');
  }

  return data;
}

export async function getProjectDevicesReport(projectId) {
  const data = await request(`/projects/${projectId}/reports/devices`, {
    auth: true,
    fallbackMessage: 'No se pudo cargar el reporte de dispositivos',
  });

  if (!Array.isArray(data.devices) || !data.summary) {
    throw new Error('La respuesta no contiene el reporte de dispositivos completo.');
  }

  return data;
}
