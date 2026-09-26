import { useEffect, useState } from 'react';
import {
  createDevice,
  generateDevicePairingCode,
  getProjectDevices,
  resetDevicePairing,
  updateDevice,
  updateDeviceStatus,
} from '../services/deviceService.js';

const deviceTypes = ['ESP32', 'ESP8266'];

function formatDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
}

export default function ProjectDevices({
  projectId,
  projectActive,
  roomActive,
  canManage,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [formError, setFormError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', deviceType: 'ESP32' });
  const [editingDeviceId, setEditingDeviceId] = useState(null);
  const [editingForm, setEditingForm] = useState({ name: '', deviceType: 'ESP32' });
  const [saving, setSaving] = useState(false);
  const [savingDeviceId, setSavingDeviceId] = useState(null);
  const [pairingCodes, setPairingCodes] = useState({});
  const [pairingDeviceId, setPairingDeviceId] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    let isMounted = true;
    getProjectDevices(projectId)
      .then((loadedDevices) => {
        if (isMounted) {
          setDevices(loadedDevices);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setLoadError(error.message || 'No se pudieron cargar los dispositivos.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, projectId]);

  useEffect(() => {
    if (Object.keys(pairingCodes).length === 0) {
      return undefined;
    }

    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, [pairingCodes]);

  useEffect(() => {
    const hasUnexpiredCode = Object.values(pairingCodes).some(
      (pairingCode) => new Date(pairingCode.expiresAt).getTime() > Date.now()
    );
    if (!isOpen || !hasUnexpiredCode) {
      return undefined;
    }

    let isMounted = true;
    let isRefreshing = false;
    let timer;

    const refreshPairingStatus = async () => {
      const hasRemainingCode = Object.values(pairingCodes).some(
        (pairingCode) => new Date(pairingCode.expiresAt).getTime() > Date.now()
      );
      if (!hasRemainingCode) {
        window.clearInterval(timer);
        return;
      }
      if (isRefreshing) {
        return;
      }

      isRefreshing = true;
      try {
        const refreshedDevices = await getProjectDevices(projectId);
        if (!isMounted) {
          return;
        }

        setDevices(refreshedDevices);
        setLoadError('');
        setCurrentTime(Date.now());
        const devicesById = new Map(refreshedDevices.map((device) => [device.id, device]));
        setPairingCodes((currentCodes) => {
          const remainingCodes = { ...currentCodes };
          let codeRemoved = false;
          Object.keys(remainingCodes).forEach((deviceId) => {
            if (devicesById.get(deviceId)?.isPaired) {
              delete remainingCodes[deviceId];
              codeRemoved = true;
            }
          });
          return codeRemoved ? remainingCodes : currentCodes;
        });
      } catch (error) {
        if (isMounted) {
          setLoadError(error.message || 'No se pudo actualizar automáticamente el estado de vinculación.');
        }
      } finally {
        isRefreshing = false;
      }
    };

    timer = window.setInterval(refreshPairingStatus, 5000);
    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, [isOpen, pairingCodes, projectId]);

  const canManageDevices = canManage && roomActive && projectActive;

  const handleRefresh = async () => {
    setLoading(true);
    setLoadError('');
    try {
      setDevices(await getProjectDevices(projectId));
    } catch (error) {
      setLoadError(error.message || 'No se pudieron cargar los dispositivos.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    setActionError('');

    try {
      const result = await createDevice(projectId, {
        name: form.name.trim(),
        deviceType: form.deviceType,
      });
      setDevices((currentDevices) => [result.device, ...currentDevices]);
      setForm({ name: '', deviceType: 'ESP32' });
      setShowForm(false);
      setActionError(result.message || 'Dispositivo registrado correctamente.');
    } catch (error) {
      setFormError(error.message || 'No se pudo registrar el dispositivo.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (event, device) => {
    event.preventDefault();
    setSavingDeviceId(device.id);
    setFormError('');
    setActionError('');

    try {
      const result = await updateDevice(device.id, {
        name: editingForm.name.trim(),
        deviceType: editingForm.deviceType,
      });
      setDevices((currentDevices) =>
        currentDevices.map((currentDevice) =>
          currentDevice.id === device.id
            ? { ...currentDevice, ...result.device, projectId }
            : currentDevice
        )
      );
      setEditingDeviceId(null);
      setActionError(result.message || 'Dispositivo actualizado correctamente.');
    } catch (error) {
      setFormError(error.message || 'No se pudo actualizar el dispositivo.');
    } finally {
      setSavingDeviceId(null);
    }
  };

  const handleStatusChange = async (device) => {
    const action = device.isActive ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Quieres ${action} el dispositivo “${device.name}”?`)) {
      return;
    }

    setSavingDeviceId(device.id);
    setActionError('');
    setFormError('');
    try {
      const result = await updateDeviceStatus(device.id, !device.isActive);
      setDevices((currentDevices) =>
        currentDevices.map((currentDevice) =>
          currentDevice.id === device.id
            ? { ...currentDevice, ...result.device }
            : currentDevice
        )
      );
      setActionError(result.message || 'Estado del dispositivo actualizado.');
    } catch (error) {
      setActionError(error.message || 'No se pudo cambiar el estado del dispositivo.');
    } finally {
      setSavingDeviceId(null);
    }
  };

  const handleGenerateCode = async (device) => {
    setPairingDeviceId(device.id);
    setActionError('');
    try {
      const pairingCode = await generateDevicePairingCode(device.id);
      setPairingCodes((currentCodes) => ({
        ...currentCodes,
        [device.id]: pairingCode,
      }));
      setCurrentTime(Date.now());
    } catch (error) {
      setActionError(error.message || 'No se pudo generar el código de vinculación.');
    } finally {
      setPairingDeviceId(null);
    }
  };

  const handleResetPairing = async (device) => {
    if (!window.confirm(
      `¿Desvincular “${device.name}”? La credencial actual de la placa será revocada.`
    )) {
      return;
    }

    setSavingDeviceId(device.id);
    setActionError('');
    try {
      const result = await resetDevicePairing(device.id);
      setDevices((currentDevices) =>
        currentDevices.map((currentDevice) =>
          currentDevice.id === device.id
            ? { ...currentDevice, ...result.device, projectId }
            : currentDevice
        )
      );
      setPairingCodes((currentCodes) => {
        const remainingCodes = { ...currentCodes };
        delete remainingCodes[device.id];
        return remainingCodes;
      });
      setActionError(result.message || 'Dispositivo desvinculado correctamente.');
    } catch (error) {
      setActionError(error.message || 'No se pudo desvincular el dispositivo.');
    } finally {
      setSavingDeviceId(null);
    }
  };

  return (
    <section className="project-devices" aria-label="Dispositivos del proyecto">
      <button
        type="button"
        className="secondary-button project-devices-toggle"
        onClick={() => {
          if (!isOpen) {
            setLoading(true);
            setLoadError('');
          }
          setIsOpen((current) => !current);
        }}
        aria-expanded={isOpen}
      >
        {isOpen ? 'Ocultar dispositivos' : 'Ver dispositivos'}
      </button>

      {isOpen ? (
        <div className="project-devices-content">
          <button
            type="button"
            className="secondary-button"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? 'Actualizando...' : 'Actualizar estado'}
          </button>
          {!roomActive || !projectActive ? (
            <p className="room-readonly-note">
              Los dispositivos se pueden consultar, pero no modificar mientras la sala o el proyecto
              estén desactivados.
            </p>
          ) : null}

          {canManageDevices ? (
            <button
              type="button"
              onClick={() => {
                setFormError('');
                setShowForm((current) => !current);
              }}
              aria-expanded={showForm}
            >
              {showForm ? 'Cancelar' : 'Agregar dispositivo'}
            </button>
          ) : null}

          {showForm && canManageDevices ? (
            <form className="user-form device-form" onSubmit={handleCreate}>
              <label className="field" htmlFor={`new-device-name-${projectId}`}>
                <span>Nombre del dispositivo</span>
                <input
                  id={`new-device-name-${projectId}`}
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  autoComplete="off"
                  maxLength={120}
                  required
                />
              </label>
              <label className="field" htmlFor={`new-device-type-${projectId}`}>
                <span>Tipo de placa</span>
                <select
                  id={`new-device-type-${projectId}`}
                  value={form.deviceType}
                  onChange={(event) => setForm({ ...form, deviceType: event.target.value })}
                >
                  {deviceTypes.map((deviceType) => (
                    <option value={deviceType} key={deviceType}>{deviceType}</option>
                  ))}
                </select>
              </label>
              {formError ? <p className="form-error rooms-feedback" role="alert">{formError}</p> : null}
              <button type="submit" disabled={saving || !form.name.trim()}>
                {saving ? 'Registrando...' : 'Guardar dispositivo'}
              </button>
            </form>
          ) : null}

          {!showForm && formError ? (
            <p className="form-error rooms-feedback" role="alert">{formError}</p>
          ) : null}
          {actionError ? (
            <p
              className={actionError.toLowerCase().includes('correctamente') ? 'form-message rooms-feedback' : 'form-error rooms-feedback'}
              role={actionError.toLowerCase().includes('correctamente') ? 'status' : 'alert'}
            >
              {actionError}
            </p>
          ) : null}
          {loadError ? <p className="form-error rooms-feedback" role="alert">{loadError}</p> : null}
          {loading ? (
            <p className="room-secondary-text" role="status">Cargando dispositivos...</p>
          ) : devices.length === 0 && !loadError ? (
            <p className="room-secondary-text">Aún no hay dispositivos en este proyecto.</p>
          ) : (
            <div className="project-device-list">
              {devices.map((device) => {
                const pairingCode = pairingCodes[device.id];
                const pairingExpired = pairingCode
                  ? new Date(pairingCode.expiresAt).getTime() <= currentTime
                  : false;
                const lastSeen = formatDate(device.lastSeenAt);

                return (
                  <article className="project-device-item" key={device.id}>
                    {editingDeviceId === device.id ? (
                      <form
                        className="user-form device-form"
                        onSubmit={(event) => handleUpdate(event, device)}
                      >
                        <label className="field" htmlFor={`device-name-${device.id}`}>
                          <span>Nombre del dispositivo</span>
                          <input
                            id={`device-name-${device.id}`}
                            value={editingForm.name}
                            onChange={(event) => setEditingForm({ ...editingForm, name: event.target.value })}
                            maxLength={120}
                            required
                          />
                        </label>
                        <label className="field" htmlFor={`device-type-${device.id}`}>
                          <span>Tipo de placa</span>
                          <select
                            id={`device-type-${device.id}`}
                            value={editingForm.deviceType}
                            onChange={(event) =>
                              setEditingForm({ ...editingForm, deviceType: event.target.value })
                            }
                          >
                            {deviceTypes.map((deviceType) => (
                              <option value={deviceType} key={deviceType}>{deviceType}</option>
                            ))}
                          </select>
                        </label>
                        {formError ? (
                          <p className="form-error rooms-feedback" role="alert">{formError}</p>
                        ) : null}
                        <div className="room-project-actions">
                          <button type="submit" disabled={savingDeviceId === device.id}>
                            {savingDeviceId === device.id ? 'Guardando...' : 'Guardar cambios'}
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => {
                              setEditingDeviceId(null);
                              setFormError('');
                            }}
                            disabled={savingDeviceId === device.id}
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="project-device-heading">
                          <div>
                            <strong>{device.name}</strong>
                            <span>{device.deviceType}</span>
                            <span>{device.hardwareId || 'Sin placa vinculada'}</span>
                          </div>
                          <div className="project-device-badges">
                            <span className={`room-status${device.isPaired ? '' : ' is-inactive'}`}>
                              {device.isPaired ? 'Vinculado' : 'Pendiente'}
                            </span>
                            <span className={`room-status${device.isActive ? '' : ' is-inactive'}`}>
                              {device.isActive ? 'Activo' : 'Desactivado'}
                            </span>
                          </div>
                        </div>
                        <p className="room-secondary-text">
                          Última comunicación: {lastSeen || 'Sin comunicación registrada'}
                        </p>
                        {canManageDevices ? (
                          <div className="room-project-actions">
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => {
                                setFormError('');
                                setEditingForm({
                                  name: device.name,
                                  deviceType: device.deviceType,
                                });
                                setEditingDeviceId(device.id);
                              }}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className={device.isActive ? 'danger-button' : 'secondary-button'}
                              onClick={() => handleStatusChange(device)}
                              disabled={savingDeviceId === device.id}
                            >
                              {savingDeviceId === device.id
                                ? 'Actualizando...'
                                : device.isActive
                                  ? 'Desactivar'
                                  : 'Activar'}
                            </button>
                            {!device.isPaired ? (
                              <button
                                type="button"
                                onClick={() => handleGenerateCode(device)}
                                disabled={
                                  !device.isActive
                                  || pairingDeviceId === device.id
                                  || Boolean(pairingCode && !pairingExpired)
                                }
                              >
                                {pairingDeviceId === device.id
                                  ? 'Generando código...'
                                  : pairingCode && !pairingExpired
                                    ? 'Código vigente'
                                    : 'Generar código de vinculación'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="danger-button"
                                onClick={() => handleResetPairing(device)}
                                disabled={savingDeviceId === device.id}
                              >
                                {savingDeviceId === device.id ? 'Desvinculando...' : 'Desvincular dispositivo'}
                              </button>
                            )}
                          </div>
                        ) : null}
                        {pairingCode ? (
                          <>
                            <div className={`pairing-code${pairingExpired ? ' is-expired' : ''}`} role="status">
                              <span>Código temporal de vinculación</span>
                              <strong>{pairingCode.pairingCode}</strong>
                              <span>
                                {pairingExpired
                                  ? 'Este código venció.'
                                  : `Vence ${formatDate(pairingCode.expiresAt) || pairingCode.expiresAt}`}
                              </span>
                            </div>
                            {!pairingExpired && !device.isPaired ? (
                              <p className="room-secondary-text" role="status">
                                Buscando la vinculación automáticamente mientras el código siga vigente.
                              </p>
                            ) : null}
                          </>
                        ) : null}
                      </>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
