import { request } from './http.js';

const normalizeDevice = (device) => ({
  id: device.id,
  projectId: device.projectId,
  name: device.name,
  deviceType: device.deviceType,
  hardwareId: device.hardwareId,
  isPaired: device.isPaired,
  isActive: device.isActive,
  lastSeenAt: device.lastSeenAt,
  createdAt: device.createdAt,
  updatedAt: device.updatedAt,
});

export async function getProjectDevices(projectId) {
  const data = await request(`/projects/${projectId}/devices`, {
    auth: true,
    fallbackMessage: 'No se pudieron cargar los dispositivos',
  });

  if (!Array.isArray(data.devices)) {
    throw new Error('La respuesta del servidor no contiene la lista de dispositivos.');
  }

  return data.devices.map((device) => normalizeDevice({ ...device, projectId }));
}

export async function createDevice(projectId, deviceData) {
  const data = await request(`/projects/${projectId}/devices`, {
    method: 'POST',
    auth: true,
    body: JSON.stringify(deviceData),
    fallbackMessage: 'No se pudo registrar el dispositivo',
  });

  if (!data.device) {
    throw new Error('La respuesta del servidor no contiene el dispositivo registrado.');
  }

  return {
    message: data.message,
    device: normalizeDevice(data.device),
  };
}

export async function updateDevice(deviceId, deviceData) {
  const data = await request(`/devices/${deviceId}`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify(deviceData),
    fallbackMessage: 'No se pudo actualizar el dispositivo',
  });

  if (!data.device) {
    throw new Error('La respuesta del servidor no contiene el dispositivo actualizado.');
  }

  return {
    message: data.message,
    device: normalizeDevice(data.device),
  };
}

export async function updateDeviceStatus(deviceId, isActive) {
  const data = await request(`/devices/${deviceId}/status`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify({ isActive }),
    fallbackMessage: 'No se pudo cambiar el estado del dispositivo',
  });

  if (!data.device || typeof data.device.isActive !== 'boolean') {
    throw new Error('La respuesta del servidor no contiene el nuevo estado del dispositivo.');
  }

  return {
    message: data.message,
    device: data.device,
  };
}

export async function generateDevicePairingCode(deviceId) {
  const data = await request(`/devices/${deviceId}/pairing-code`, {
    method: 'POST',
    auth: true,
    fallbackMessage: 'No se pudo generar el código de vinculación',
  });

  if (!data.pairingCode || !data.expiresAt) {
    throw new Error('La respuesta del servidor no contiene el código o su vencimiento.');
  }

  return {
    message: data.message,
    pairingCode: data.pairingCode,
    expiresAt: data.expiresAt,
  };
}

export async function resetDevicePairing(deviceId) {
  const data = await request(`/devices/${deviceId}/reset-pairing`, {
    method: 'POST',
    auth: true,
    fallbackMessage: 'No se pudo desvincular el dispositivo',
  });

  if (!data.device) {
    throw new Error('La respuesta del servidor no contiene el estado actualizado del dispositivo.');
  }

  return {
    message: data.message,
    device: normalizeDevice(data.device),
  };
}
