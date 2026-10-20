import { request } from './http.js';

const normalizeVersion = (firmwareVersion) => ({
  id: firmwareVersion.id,
  projectId: firmwareVersion.projectId,
  version: firmwareVersion.version,
  description: firmwareVersion.description,
  isActive: firmwareVersion.isActive,
  createdAt: firmwareVersion.createdAt,
  updatedAt: firmwareVersion.updatedAt,
});

/** Lists firmware versions registered for a project. */
export async function getProjectFirmwareVersions(projectId) {
  const data = await request(`/projects/${projectId}/firmware/versions`, {
    auth: true,
    fallbackMessage: 'No se pudieron cargar las versiones de firmware',
  });

  if (!Array.isArray(data.firmwareVersions)) {
    throw new Error('La respuesta no contiene la lista de versiones de firmware.');
  }

  return data.firmwareVersions.map(normalizeVersion);
}

/** Creates a version that can later receive ESP32 and/or ESP8266 binary files. */
export async function createFirmwareVersion(projectId, versionData) {
  const data = await request(`/projects/${projectId}/firmware/versions`, {
    method: 'POST',
    auth: true,
    body: JSON.stringify(versionData),
    fallbackMessage: 'No se pudo crear la versión de firmware',
  });

  if (!data.firmwareVersion) {
    throw new Error('La respuesta no contiene la versión de firmware creada.');
  }

  return {
    message: data.message,
    firmwareVersion: normalizeVersion(data.firmwareVersion),
  };
}

/** Updates the version label and description using the backend's JSON endpoint. */
export async function updateFirmwareVersion(versionId, versionData) {
  const data = await request(`/firmware/versions/${versionId}`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify(versionData),
    fallbackMessage: 'No se pudo actualizar la versión de firmware',
  });

  if (!data.firmwareVersion) {
    throw new Error('La respuesta no contiene la versión de firmware actualizada.');
  }

  return {
    message: data.message,
    firmwareVersion: normalizeVersion(data.firmwareVersion),
  };
}

/** Activates or deactivates a version so the backend can allow or reject its use. */
export async function updateFirmwareVersionStatus(versionId, isActive) {
  const data = await request(`/firmware/versions/${versionId}/status`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify({ isActive }),
    fallbackMessage: 'No se pudo cambiar el estado de la versión',
  });

  if (!data.firmwareVersion || typeof data.firmwareVersion.isActive !== 'boolean') {
    throw new Error('La respuesta no contiene el nuevo estado de la versión.');
  }

  return {
    message: data.message,
    firmwareVersion: normalizeVersion(data.firmwareVersion),
  };
}

/**
 * Sends the binary and its device type as multipart form data.
 * The browser must set the multipart boundary, so this request omits JSON Content-Type.
 */
export async function uploadFirmwareFile(versionId, file, deviceType) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('deviceType', deviceType);

  const data = await request(`/firmware/versions/${versionId}/files`, {
    method: 'POST',
    auth: true,
    body: formData,
    fallbackMessage: 'No se pudo subir el archivo de firmware',
  });

  if (!data.firmwareFile) {
    throw new Error('La respuesta no contiene los datos del archivo subido.');
  }

  return {
    message: data.message,
    firmwareFile: data.firmwareFile,
  };
}
