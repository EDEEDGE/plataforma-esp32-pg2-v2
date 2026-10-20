import { useEffect, useState } from 'react';
import {
  createFirmwareVersion,
  getProjectFirmwareVersions,
  updateFirmwareVersion,
  updateFirmwareVersionStatus,
  uploadFirmwareFile,
} from '../services/firmwareService.js';
import '../styles/firmware.css';

const deviceTypes = ['ESP32', 'ESP8266'];
const maxFirmwareSize = 8 * 1024 * 1024;

function formatFileSize(sizeBytes) {
  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Project-level firmware interface: manages versions and binary uploads.
 * It deliberately explains that uploaded-file metadata cannot be reloaded because
 * the current API does not expose a list-files endpoint.
 */
export default function FirmwareVersions({
  projectId,
  projectActive,
  roomActive,
  canManage,
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
  const [uploadedFiles, setUploadedFiles] = useState({});
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
      setVersions((current) => current.map((item) => (
        item.id === versionId ? result.firmwareVersion : item
      )));
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
        !firmwareVersion.isActive
      );
      setVersions((current) => current.map((item) => (
        item.id === firmwareVersion.id ? result.firmwareVersion : item
      )));
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
    const uploadForm = uploadForms[firmwareVersion.id] || {
      deviceType: 'ESP32',
      file: null,
    };
    const uploadKey = `${firmwareVersion.id}:${uploadForm.deviceType}`;

    if (!uploadForm.file) {
      setActionError('Selecciona un archivo .bin antes de subirlo.');
      return;
    }

    if (!uploadForm.file.name.toLowerCase().endsWith('.bin')) {
      setActionError('El archivo debe tener la extensión .bin.');
      return;
    }

    if (uploadForm.file.size > maxFirmwareSize) {
      setActionError('El archivo supera el límite de 8 MB permitido por el backend.');
      return;
    }

    setUploadingKey(uploadKey);
    setActionError('');
    setMessage('');

    try {
      const result = await uploadFirmwareFile(
        firmwareVersion.id,
        uploadForm.file,
        uploadForm.deviceType
      );
      setUploadedFiles((current) => ({
        ...current,
        [uploadKey]: result.firmwareFile,
      }));
      setUploadForms((current) => ({
        ...current,
        [firmwareVersion.id]: { ...uploadForm, file: null },
      }));
      uploadFormElement.reset();
      setMessage(result.message || 'Archivo de firmware subido correctamente.');
    } catch (error) {
      setActionError(error.message || 'No se pudo subir el archivo.');
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
              Administra versiones y carga los binarios compatibles con cada placa.
            </p>
            <div className="room-project-actions">
              <button type="button" className="secondary-button" onClick={handleRefresh} disabled={loading}>
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
              El firmware se puede consultar, pero no modificar mientras la sala o el proyecto estén desactivados.
            </p>
          ) : null}

          <p className="room-readonly-note">
            La API actual no permite consultar los archivos ya cargados. Los detalles de los binarios se muestran
            aquí solo durante esta sesión; si un tipo ya tiene archivo, el backend indicará que existe al intentar
            subir otro.
          </p>

          {showCreateForm && canManageFirmware ? (
            <form className="user-form firmware-form" onSubmit={handleCreateVersion}>
              <label className="field" htmlFor={`firmware-version-new-${projectId}`}>
                <span>Versión (formato X.Y.Z)</span>
                <input
                  id={`firmware-version-new-${projectId}`}
                  value={versionForm.version}
                  onChange={(event) => setVersionForm({ ...versionForm, version: event.target.value })}
                  placeholder="1.0.0"
                  pattern="[0-9]+\\.[0-9]+\\.[0-9]+"
                  required
                />
              </label>
              <label className="field" htmlFor={`firmware-description-new-${projectId}`}>
                <span>Descripción <small>(opcional)</small></span>
                <textarea
                  id={`firmware-description-new-${projectId}`}
                  value={versionForm.description}
                  onChange={(event) => setVersionForm({ ...versionForm, description: event.target.value })}
                  rows={2}
                />
              </label>
              <button type="submit" disabled={creating} aria-busy={creating}>
                {creating ? 'Creando...' : 'Guardar versión'}
              </button>
            </form>
          ) : null}

          {message ? <p className="form-message rooms-feedback" role="status">{message}</p> : null}
          {actionError ? <p className="form-error rooms-feedback" role="alert">{actionError}</p> : null}
          {loadError ? <p className="form-error rooms-feedback" role="alert">{loadError}</p> : null}
          {loading ? (
            <p className="room-secondary-text" role="status">Cargando versiones...</p>
          ) : versions.length === 0 && !loadError ? (
            <p className="room-secondary-text">Aún no hay versiones de firmware para este proyecto.</p>
          ) : (
            <div className="firmware-version-list">
              {versions.map((firmwareVersion) => (
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
                          onChange={(event) => setEditingForm({ ...editingForm, version: event.target.value })}
                          pattern="[0-9]+\\.[0-9]+\\.[0-9]+"
                          required
                        />
                      </label>
                      <label className="field" htmlFor={`firmware-description-${firmwareVersion.id}`}>
                        <span>Descripción <small>(opcional)</small></span>
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
                          {savingVersionId === firmwareVersion.id ? 'Guardando...' : 'Guardar cambios'}
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
                      <div className="room-project-summary">
                        <div>
                          <p className="room-label">Firmware</p>
                          <h5>Versión {firmwareVersion.version}</h5>
                          <p>{firmwareVersion.description || 'Sin descripción.'}</p>
                        </div>
                        <span className={`room-status${firmwareVersion.isActive ? '' : ' is-inactive'}`}>
                          {firmwareVersion.isActive ? 'Activa' : 'Desactivada'}
                        </span>
                      </div>

                      {canManageFirmware ? (
                        <div className="room-project-actions">
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
                            className={firmwareVersion.isActive ? 'danger-button' : 'secondary-button'}
                            onClick={() => handleToggleVersion(firmwareVersion)}
                            disabled={savingVersionId === firmwareVersion.id}
                            aria-busy={savingVersionId === firmwareVersion.id}
                          >
                            {savingVersionId === firmwareVersion.id
                              ? 'Actualizando...'
                              : firmwareVersion.isActive ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      ) : null}

                      {canManageFirmware && firmwareVersion.isActive ? (
                        <form
                          className="firmware-upload-form"
                          onSubmit={(event) => handleUpload(event, firmwareVersion)}
                        >
                          <label className="field" htmlFor={`firmware-type-${firmwareVersion.id}`}>
                            <span>Tipo de placa del archivo</span>
                            <select
                              id={`firmware-type-${firmwareVersion.id}`}
                              value={uploadForms[firmwareVersion.id]?.deviceType || 'ESP32'}
                              onChange={(event) => setUploadForms((current) => ({
                                ...current,
                                [firmwareVersion.id]: {
                                  ...current[firmwareVersion.id],
                                  deviceType: event.target.value,
                                },
                              }))}
                            >
                              {deviceTypes.map((deviceType) => (
                                <option value={deviceType} key={deviceType}>{deviceType}</option>
                              ))}
                            </select>
                          </label>
                          <label className="field" htmlFor={`firmware-file-${firmwareVersion.id}`}>
                            <span>Archivo .bin (máximo 8 MB)</span>
                            <input
                              id={`firmware-file-${firmwareVersion.id}`}
                              type="file"
                              accept=".bin,application/octet-stream"
                              onChange={(event) => setUploadForms((current) => ({
                                ...current,
                                [firmwareVersion.id]: {
                                  ...current[firmwareVersion.id],
                                  file: event.target.files?.[0] || null,
                                },
                              }))}
                              required
                            />
                          </label>
                          <button
                            type="submit"
                            disabled={uploadingKey.startsWith(`${firmwareVersion.id}:`)}
                            aria-busy={uploadingKey.startsWith(`${firmwareVersion.id}:`)}
                          >
                            {uploadingKey.startsWith(`${firmwareVersion.id}:`)
                              ? 'Subiendo...'
                              : 'Subir firmware'}
                          </button>
                        </form>
                      ) : null}

                      {deviceTypes.map((deviceType) => {
                        const uploadedFile = uploadedFiles[`${firmwareVersion.id}:${deviceType}`];
                        if (!uploadedFile) {
                          return null;
                        }

                        return (
                          <div className="firmware-file-info" key={deviceType}>
                            <strong>{deviceType}: {uploadedFile.originalName}</strong>
                            <span>
                              {formatFileSize(uploadedFile.sizeBytes)} · SHA-256: {uploadedFile.sha256}
                            </span>
                          </div>
                        );
                      })}
                    </>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
