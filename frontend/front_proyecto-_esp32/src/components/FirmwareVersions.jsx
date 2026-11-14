import { useEffect, useState } from 'react';
import {
  createFirmwareVersion,
  getProjectFirmwareVersions,
  replaceFirmwareFile,
  updateFirmwareVersion,
  updateFirmwareVersionStatus,
  uploadFirmwareFile,
} from '../services/firmwareService.js';
import '../styles/firmware.css';

const deviceTypes = ['ESP32', 'ESP8266'];
const maxFirmwareSize = 8 * 1024 * 1024;

function formatFileSize(sizeBytes) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} bytes`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFirmwareFileError(file) {
  if (!file) {
    return 'Selecciona un archivo .bin antes de subirlo.';
  }

  if (file.size === 0) {
    return 'El archivo está vacío. Selecciona un firmware con contenido.';
  }

  if (!file.name.toLowerCase().endsWith('.bin')) {
    return 'El archivo debe tener la extensión .bin.';
  }

  if (file.size > maxFirmwareSize) {
    return 'El archivo supera el límite de 8 MB permitido por el backend.';
  }

  return '';
}

/**
 * Project-level firmware interface: manages versions and binary uploads.
 * The versions endpoint exposes uploaded files so the board-specific upload
 * and replacement options remain visible after reloading.
 */
export default function FirmwareVersions({
  projectId,
  projectActive,
  roomActive,
  canManage,
  onVersionsChanged,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [versionForm, setVersionForm] = useState({ version: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [editingVersionId, setEditingVersionId] = useState(null);
  const [editingForm, setEditingForm] = useState({ version: '', description: '' });
  const [savingVersionId, setSavingVersionId] = useState(null);
  const [uploadForms, setUploadForms] = useState({});
  const [uploadingKey, setUploadingKey] = useState('');

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    let isMounted = true;

    getProjectFirmwareVersions(projectId)
      .then((loadedVersions) => {
        if (isMounted) {
          setVersions(loadedVersions);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setLoadError(error.message || 'No se pudieron cargar las versiones.');
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

  const canManageFirmware = canManage && roomActive && projectActive;

  const handleCreateVersion = async (event) => {
    event.preventDefault();
    setCreating(true);
    setActionError('');
    setMessage('');

    try {
      const result = await createFirmwareVersion(projectId, {
        version: versionForm.version.trim(),
        description: versionForm.description.trim(),
      });
      setVersions((current) => [result.firmwareVersion, ...current]);
      onVersionsChanged?.(result.firmwareVersion.id);
      setVersionForm({ version: '', description: '' });
      setShowCreateForm(false);
      setMessage(result.message || 'Versión creada correctamente.');
    } catch (error) {
      setActionError(error.message || 'No se pudo crear la versión.');
    } finally {
      setCreating(false);
    }
  };

  const handleSaveVersion = async (event, versionId) => {
    event.preventDefault();
    setSavingVersionId(versionId);
    setActionError('');
    setMessage('');

    try {
      const result = await updateFirmwareVersion(versionId, {
        version: editingForm.version.trim(),
        description: editingForm.description.trim(),
      });
      setVersions((current) =>
        current.map((item) =>
          item.id === versionId
            ? {
                ...result.firmwareVersion,
                files: item.files,
              }
            : item,
        ),
      );
      onVersionsChanged?.(result.firmwareVersion.id);
      setEditingVersionId(null);
      setMessage(result.message || 'Versión actualizada correctamente.');
    } catch (error) {
      setActionError(error.message || 'No se pudo actualizar la versión.');
    } finally {
      setSavingVersionId(null);
    }
  };

  const handleToggleVersion = async (firmwareVersion) => {
    setSavingVersionId(firmwareVersion.id);
    setActionError('');
    setMessage('');

    try {
      const result = await updateFirmwareVersionStatus(
        firmwareVersion.id,
        !firmwareVersion.isActive,
      );
      setVersions((current) =>
        current.map((item) =>
          item.id === firmwareVersion.id
            ? {
                ...result.firmwareVersion,
                files: item.files,
              }
            : item,
        ),
      );
      onVersionsChanged?.(result.firmwareVersion.id);
      setMessage(result.message || 'Estado de la versión actualizado.');
    } catch (error) {
      setActionError(error.message || 'No se pudo cambiar el estado de la versión.');
    } finally {
      setSavingVersionId(null);
    }
  };

  const handleUpload = async (event, firmwareVersion) => {
    event.preventDefault();
    const uploadFormElement = event.currentTarget;
    const selectedDeviceType = new FormData(uploadFormElement).get('deviceType');
    const uploadForm = uploadForms[firmwareVersion.id] || {
      file: null,
    };

    if (typeof selectedDeviceType !== 'string' || !deviceTypes.includes(selectedDeviceType)) {
      setActionError('Selecciona el tipo de placa del archivo antes de subirlo.');
      return;
    }

    const fileError = getFirmwareFileError(uploadForm.file);
    if (fileError) {
      setActionError(fileError);
      return;
    }

    const uploadKey = `${firmwareVersion.id}:${selectedDeviceType}`;
    setUploadingKey(uploadKey);
    setActionError('');
    setMessage('');

    try {
      const result = await uploadFirmwareFile(
        firmwareVersion.id,
        uploadForm.file,
        selectedDeviceType,
      );
      setVersions((current) =>
        current.map((version) =>
          version.id === firmwareVersion.id
            ? { ...version, files: [...(version.files || []), result.firmwareFile] }
            : version,
        ),
      );
      setUploadForms((current) => ({
        ...current,
        [firmwareVersion.id]: { deviceType: '', file: null },
      }));
      uploadFormElement.reset();
      setMessage(result.message || 'Archivo de firmware subido correctamente.');
    } catch (error) {
      setActionError(error.message || 'No se pudo subir el archivo.');
    } finally {
      setUploadingKey('');
    }
  };

  const handleReplace = async (event, firmwareVersion, firmwareFile) => {
    event.preventDefault();
    const replaceFormElement = event.currentTarget;
    const replacementFile = new FormData(replaceFormElement).get('file');
    const fileError = getFirmwareFileError(replacementFile);

    if (fileError) {
      setActionError(fileError);
      return;
    }

    const uploadKey = `${firmwareVersion.id}:replace:${firmwareFile.id}`;
    setUploadingKey(uploadKey);
    setActionError('');
    setMessage('');

    try {
      const result = await replaceFirmwareFile(firmwareFile.id, replacementFile);
      setVersions((current) =>
        current.map((version) =>
          version.id === firmwareVersion.id
            ? {
                ...version,
                files: version.files.map((file) =>
                  file.id === firmwareFile.id ? result.firmwareFile : file,
                ),
              }
            : version,
        ),
      );
      replaceFormElement.reset();
      setMessage(result.message || 'Archivo de firmware reemplazado correctamente.');
    } catch (error) {
      setActionError(error.message || 'No se pudo reemplazar el archivo de firmware.');
    } finally {
      setUploadingKey('');
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    setLoadError('');
    try {
      setVersions(await getProjectFirmwareVersions(projectId));
    } catch (error) {
      setLoadError(error.message || 'No se pudieron cargar las versiones.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="firmware-manager" aria-label="Versiones de firmware del proyecto">
      <button
        type="button"
        className="secondary-button"
        onClick={() => {
          if (!isOpen) {
            setLoading(true);
            setLoadError('');
          }
          setIsOpen((current) => !current);
        }}
        aria-expanded={isOpen}
      >
        {isOpen ? 'Ocultar firmware' : 'Versiones y firmware'}
      </button>

      {isOpen ? (
        <div className="firmware-manager-content">
          <div className="firmware-toolbar">
            <p className="room-secondary-text">
              Carga un archivo por placa y reemplázalo desde su tarjeta cuando necesites
              actualizarlo.
            </p>
            <div className="room-project-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={handleRefresh}
                disabled={loading}
              >
                {loading ? 'Actualizando...' : 'Actualizar versiones'}
              </button>
              {canManageFirmware ? (
                <button
                  type="button"
                  onClick={() => {
                    setActionError('');
                    setShowCreateForm((current) => !current);
                  }}
                  aria-expanded={showCreateForm}
                >
                  {showCreateForm ? 'Cancelar' : 'Crear versión'}
                </button>
              ) : null}
            </div>
          </div>

          {!roomActive || !projectActive ? (
            <p className="room-readonly-note">
              El firmware se puede consultar, pero no modificar mientras la sala o el proyecto estén
              desactivados.
            </p>
          ) : null}

          {showCreateForm && canManageFirmware ? (
            <form className="user-form firmware-form" onSubmit={handleCreateVersion}>
              <label className="field" htmlFor={`firmware-version-new-${projectId}`}>
                <span>Versión (formato X.Y.Z)</span>
                <input
                  id={`firmware-version-new-${projectId}`}
                  value={versionForm.version}
                  onChange={(event) =>
                    setVersionForm({ ...versionForm, version: event.target.value })
                  }
                  placeholder="1.0.0"
                  pattern="[0-9]+\.[0-9]+\.[0-9]+"
                  required
                />
              </label>
              <label className="field" htmlFor={`firmware-description-new-${projectId}`}>
                <span>
                  Descripción <small>(opcional)</small>
                </span>
                <textarea
                  id={`firmware-description-new-${projectId}`}
                  value={versionForm.description}
                  onChange={(event) =>
                    setVersionForm({ ...versionForm, description: event.target.value })
                  }
                  rows={2}
                />
              </label>
              <button type="submit" disabled={creating} aria-busy={creating}>
                {creating ? 'Creando...' : 'Guardar versión'}
              </button>
            </form>
          ) : null}

          {message ? (
            <p className="form-message rooms-feedback" role="status">
              {message}
            </p>
          ) : null}
          {actionError ? (
            <p className="form-error rooms-feedback" role="alert">
              {actionError}
            </p>
          ) : null}
          {loadError ? (
            <p className="form-error rooms-feedback" role="alert">
              {loadError}
            </p>
          ) : null}
          {loading ? (
            <p className="room-secondary-text" role="status">
              Cargando versiones...
            </p>
          ) : versions.length === 0 && !loadError ? (
            <p className="room-secondary-text">
              Aún no hay versiones de firmware para este proyecto.
            </p>
          ) : (
            <div className="firmware-version-list">
              {versions.map((firmwareVersion) => {
                const firmwareFiles = firmwareVersion.files || [];
                const uploadedDeviceTypes = new Set(
                  firmwareFiles.map((firmwareFile) => firmwareFile.deviceType),
                );
                const availableDeviceTypes = deviceTypes.filter(
                  (deviceType) => !uploadedDeviceTypes.has(deviceType),
                );

                return (
                  <article className="firmware-version-item" key={firmwareVersion.id}>
                    {editingVersionId === firmwareVersion.id ? (
                      <form
                        className="user-form firmware-form"
                        onSubmit={(event) => handleSaveVersion(event, firmwareVersion.id)}
                      >
                        <label className="field" htmlFor={`firmware-version-${firmwareVersion.id}`}>
                          <span>Versión (formato X.Y.Z)</span>
                          <input
                            id={`firmware-version-${firmwareVersion.id}`}
                            value={editingForm.version}
                            onChange={(event) =>
                              setEditingForm({ ...editingForm, version: event.target.value })
                            }
                            pattern="[0-9]+\.[0-9]+\.[0-9]+"
                            required
                          />
                        </label>
                        <label
                          className="field"
                          htmlFor={`firmware-description-${firmwareVersion.id}`}
                        >
                          <span>
                            Descripción <small>(opcional)</small>
                          </span>
                          <textarea
                            id={`firmware-description-${firmwareVersion.id}`}
                            value={editingForm.description}
                            onChange={(event) =>
                              setEditingForm({ ...editingForm, description: event.target.value })
                            }
                            rows={2}
                          />
                        </label>
                        <div className="room-project-actions">
                          <button
                            type="submit"
                            disabled={savingVersionId === firmwareVersion.id}
                            aria-busy={savingVersionId === firmwareVersion.id}
                          >
                            {savingVersionId === firmwareVersion.id
                              ? 'Guardando...'
                              : 'Guardar cambios'}
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => setEditingVersionId(null)}
                            disabled={savingVersionId === firmwareVersion.id}
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="firmware-version-header">
                          <div className="room-project-summary">
                            <div>
                              <p className="room-label">Firmware</p>
                              <h5>Versión {firmwareVersion.version}</h5>
                              <p>{firmwareVersion.description || 'Sin descripción.'}</p>
                            </div>
                            <span
                              className={`room-status${firmwareVersion.isActive ? '' : ' is-inactive'}`}
                            >
                              {firmwareVersion.isActive ? 'Activa' : 'Desactivada'}
                            </span>
                          </div>

                          {canManageFirmware ? (
                            <div className="room-project-actions firmware-version-actions">
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => {
                                  setActionError('');
                                  setEditingForm({
                                    version: firmwareVersion.version,
                                    description: firmwareVersion.description || '',
                                  });
                                  setEditingVersionId(firmwareVersion.id);
                                }}
                              >
                                Editar versión
                              </button>
                              <button
                                type="button"
                                className={
                                  firmwareVersion.isActive ? 'danger-button' : 'secondary-button'
                                }
                                onClick={() => handleToggleVersion(firmwareVersion)}
                                disabled={savingVersionId === firmwareVersion.id}
                                aria-busy={savingVersionId === firmwareVersion.id}
                              >
                                {savingVersionId === firmwareVersion.id
                                  ? 'Actualizando...'
                                  : firmwareVersion.isActive
                                    ? 'Desactivar'
                                    : 'Activar'}
                              </button>
                            </div>
                          ) : null}
                        </div>

                        {firmwareFiles.map((firmwareFile) => (
                          <div className="firmware-file-info" key={firmwareFile.id}>
                            <strong>
                              {firmwareFile.deviceType}: {firmwareFile.originalName}
                            </strong>
                            <span>
                              {formatFileSize(firmwareFile.sizeBytes)} · SHA-256:{' '}
                              {firmwareFile.sha256}
                            </span>
                            {canManageFirmware && firmwareVersion.isActive ? (
                              <form
                                className="firmware-upload-form firmware-replace-form"
                                onSubmit={(event) =>
                                  handleReplace(event, firmwareVersion, firmwareFile)
                                }
                              >
                                <label
                                  className="field"
                                  htmlFor={`firmware-replace-${firmwareFile.id}`}
                                >
                                  <span>Nuevo archivo .bin para {firmwareFile.deviceType}</span>
                                  <input
                                    id={`firmware-replace-${firmwareFile.id}`}
                                    name="file"
                                    type="file"
                                    accept=".bin,application/octet-stream"
                                    disabled={uploadingKey.startsWith(`${firmwareVersion.id}:`)}
                                    required
                                  />
                                </label>
                                <button
                                  type="submit"
                                  disabled={uploadingKey.startsWith(`${firmwareVersion.id}:`)}
                                  aria-busy={
                                    uploadingKey ===
                                    `${firmwareVersion.id}:replace:${firmwareFile.id}`
                                  }
                                >
                                  {uploadingKey ===
                                  `${firmwareVersion.id}:replace:${firmwareFile.id}`
                                    ? 'Reemplazando...'
                                    : `Reemplazar archivo ${firmwareFile.deviceType}`}
                                </button>
                              </form>
                            ) : null}
                          </div>
                        ))}

                        {canManageFirmware &&
                        firmwareVersion.isActive &&
                        availableDeviceTypes.length > 0 ? (
                          <form
                            className="firmware-upload-form"
                            onSubmit={(event) => handleUpload(event, firmwareVersion)}
                          >
                            <label
                              className="field"
                              htmlFor={`firmware-type-${firmwareVersion.id}`}
                            >
                              <span>Tipo de placa del archivo</span>
                              <select
                                id={`firmware-type-${firmwareVersion.id}`}
                                name="deviceType"
                                value={uploadForms[firmwareVersion.id]?.deviceType ?? ''}
                                required
                                onChange={(event) =>
                                  setUploadForms((current) => ({
                                    ...current,
                                    [firmwareVersion.id]: {
                                      ...current[firmwareVersion.id],
                                      deviceType: event.target.value,
                                    },
                                  }))
                                }
                              >
                                <option value="">Selecciona la placa del archivo</option>
                                {availableDeviceTypes.map((deviceType) => (
                                  <option value={deviceType} key={deviceType}>
                                    {deviceType}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label
                              className="field"
                              htmlFor={`firmware-file-${firmwareVersion.id}`}
                            >
                              <span>Archivo .bin (máximo 8 MB)</span>
                              <input
                                id={`firmware-file-${firmwareVersion.id}`}
                                type="file"
                                accept=".bin,application/octet-stream"
                                disabled={uploadingKey.startsWith(`${firmwareVersion.id}:`)}
                                onChange={(event) =>
                                  setUploadForms((current) => ({
                                    ...current,
                                    [firmwareVersion.id]: {
                                      ...current[firmwareVersion.id],
                                      file: event.target.files?.[0] || null,
                                    },
                                  }))
                                }
                                required
                              />
                            </label>
                            <button
                              type="submit"
                              disabled={
                                !uploadForms[firmwareVersion.id]?.deviceType ||
                                uploadingKey.startsWith(`${firmwareVersion.id}:`)
                              }
                              aria-busy={uploadingKey.startsWith(`${firmwareVersion.id}:`)}
                            >
                              {uploadingKey.startsWith(`${firmwareVersion.id}:`)
                                ? 'Subiendo...'
                                : 'Subir firmware'}
                            </button>
                            <small className="firmware-upload-hint">
                              Usa el binario generado al compilar para esta placa; un archivo de
                              texto renombrado a .bin no sirve para instalar firmware por OTA.
                            </small>
                          </form>
                        ) : null}

                        {canManageFirmware &&
                        firmwareVersion.isActive &&
                        availableDeviceTypes.length === 0 ? (
                          <small className="firmware-upload-hint">
                            Ya hay un archivo para cada placa. Elige arriba cuál deseas reemplazar.
                          </small>
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
