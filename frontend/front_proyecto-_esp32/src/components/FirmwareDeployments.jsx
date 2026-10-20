import { useEffect, useMemo, useState } from 'react';
import { getProjectDevices } from '../services/deviceService.js';
import {
  createFirmwareDeployment,
  getProjectFirmwareVersions,
} from '../services/firmwareService.js';
import '../styles/firmware.css';

/**
 * Creates a project deployment and displays the initial response from the API.
 * This view does not claim an update succeeded: the current API only returns
 * the initial per-device status and has no endpoint for final OTA results.
 */
export default function FirmwareDeployments({
  projectId,
  projectActive,
  roomActive,
  canManage,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [versions, setVersions] = useState([]);
  const [devices, setDevices] = useState([]);
  const [versionId, setVersionId] = useState('');
  const [targetAll, setTargetAll] = useState(false);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [deploymentResult, setDeploymentResult] = useState(null);

  const eligibleDevices = useMemo(
    () => devices.filter((device) => device.isActive && device.isPaired),
    [devices]
  );
  const canCreateDeployment = canManage && roomActive && projectActive;

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    let isMounted = true;

    Promise.all([
      getProjectFirmwareVersions(projectId),
      getProjectDevices(projectId),
    ])
      .then(([loadedVersions, loadedDevices]) => {
        if (!isMounted) {
          return;
        }

        setVersions(loadedVersions);
        setDevices(loadedDevices);
        setVersionId((currentVersionId) => (
          loadedVersions.some(
            (firmwareVersion) =>
              firmwareVersion.id === currentVersionId && firmwareVersion.isActive
          )
            ? currentVersionId
            : loadedVersions.find((firmwareVersion) => firmwareVersion.isActive)?.id || ''
        ));
        setSelectedDeviceIds((currentIds) => currentIds.filter(
          (deviceId) => loadedDevices.some(
            (device) => device.id === deviceId && device.isActive && device.isPaired
          )
        ));
      })
      .catch((loadError) => {
        if (isMounted) {
          setLoadError(loadError.message || 'No se pudieron cargar los datos del despliegue.');
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

  const handleDeviceSelection = (deviceId) => {
    setSelectedDeviceIds((currentIds) => (
      currentIds.includes(deviceId)
        ? currentIds.filter((currentId) => currentId !== deviceId)
        : [...currentIds, deviceId]
    ));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setDeploymentResult(null);

    try {
      const result = await createFirmwareDeployment(projectId, {
        firmwareVersionId: versionId,
        targetAll,
        deviceIds: targetAll ? [] : selectedDeviceIds,
      });
      setDeploymentResult(result.deployment);
    } catch (deploymentError) {
      setError(deploymentError.message || 'No se pudo crear el despliegue.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="firmware-manager" aria-label="Despliegues OTA del proyecto">
      <button
        type="button"
        className="secondary-button"
        onClick={() => {
          if (!isOpen) {
            setLoading(true);
            setLoadError('');
            setError('');
          }
          setIsOpen((current) => !current);
        }}
        aria-expanded={isOpen}
      >
        {isOpen ? 'Ocultar despliegue' : 'Crear despliegue OTA'}
      </button>

      {isOpen ? (
        <div className="firmware-manager-content">
          {!roomActive || !projectActive ? (
            <p className="room-readonly-note">
              No se pueden crear despliegues mientras la sala o el proyecto estén desactivados.
            </p>
          ) : null}

          {loadError ? <p className="form-error rooms-feedback" role="alert">{loadError}</p> : null}
          {loading ? (
            <p className="room-secondary-text" role="status">Cargando versiones y dispositivos...</p>
          ) : (
            <>
              {canCreateDeployment ? (
                <form className="firmware-deployment-form" onSubmit={handleSubmit}>
                  <label className="field" htmlFor={`deployment-version-${projectId}`}>
                    <span>Versión de firmware</span>
                    <select
                      id={`deployment-version-${projectId}`}
                      value={versionId}
                      onChange={(event) => {
                        setVersionId(event.target.value);
                        setDeploymentResult(null);
                        setError('');
                      }}
                      required
                      disabled={!versions.some((firmwareVersion) => firmwareVersion.isActive)}
                    >
                      <option value="" disabled>Selecciona una versión activa</option>
                      {versions
                        .filter((firmwareVersion) => firmwareVersion.isActive)
                        .map((firmwareVersion) => (
                          <option value={firmwareVersion.id} key={firmwareVersion.id}>
                            {firmwareVersion.version}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label className="firmware-target-all" htmlFor={`deployment-target-all-${projectId}`}>
                    <input
                      id={`deployment-target-all-${projectId}`}
                      type="checkbox"
                      checked={targetAll}
                      onChange={(event) => {
                        setTargetAll(event.target.checked);
                        setDeploymentResult(null);
                        setError('');
                      }}
                    />
                    <span>Asignar a todos los dispositivos activos y vinculados</span>
                  </label>

                  {!targetAll ? (
                    <fieldset className="firmware-device-selection">
                      <legend>Selecciona los dispositivos destino</legend>
                      {eligibleDevices.length === 0 ? (
                        <p className="room-secondary-text">
                          No hay dispositivos activos y vinculados disponibles para este proyecto.
                        </p>
                      ) : (
                        eligibleDevices.map((device) => (
                          <div
                            className="firmware-device-option"
                            key={device.id}
                          >
                            <input
                              id={`deployment-device-${projectId}-${device.id}`}
                              type="checkbox"
                              checked={selectedDeviceIds.includes(device.id)}
                              onChange={() => handleDeviceSelection(device.id)}
                              aria-label={`Seleccionar ${device.name}`}
                            />
                            <span>
                              <strong>{device.name}</strong>
                              <small>{device.deviceType} · {device.hardwareId}</small>
                            </span>
                          </div>
                        ))
                      )}
                    </fieldset>
                  ) : (
                    <p className="room-readonly-note">
                      El backend omitirá automáticamente los dispositivos inactivos o sin vincular.
                      También comprobará que haya un archivo compatible con cada placa seleccionada.
                    </p>
                  )}

                  {error ? <p className="form-error rooms-feedback" role="alert">{error}</p> : null}
                  <button
                    type="submit"
                    aria-busy={submitting}
                    disabled={
                      submitting
                      || !versionId
                      || (!targetAll && selectedDeviceIds.length === 0)
                    }
                  >
                    {submitting ? 'Creando despliegue...' : 'Crear despliegue'}
                  </button>
                </form>
              ) : (
                <p className="room-readonly-note">
                  Tu rol permite consultar el proyecto, pero solo OWNER o ADMIN pueden crear despliegues.
                </p>
              )}

              {!loadError && versions.length === 0 ? (
                <p className="room-secondary-text">Crea primero una versión de firmware para este proyecto.</p>
              ) : null}

              {deploymentResult ? (
                <section className="firmware-deployment-result" aria-label="Resultado inicial del despliegue">
                  <div>
                    <p className="room-label">Despliegue creado</p>
                    <strong>{deploymentResult.id}</strong>
                  </div>
                  <p className="room-secondary-text">
                    Asignación creada. El estado que devuelve el backend es inicial y no confirma que la placa
                    haya instalado el firmware.
                  </p>
                  <ul>
                    {deploymentResult.devices.map((device) => (
                      <li key={device.id}>
                        <span>{device.deviceName} · {device.deviceType}</span>
                        <span className="room-status">{device.status}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="room-secondary-text">
                    La API actual no permite consultar el historial ni los resultados finales de OTA.
                  </p>
                </section>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
