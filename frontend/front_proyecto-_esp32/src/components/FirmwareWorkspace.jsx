import { useEffect, useState } from 'react';
import { getMyRooms } from '../services/roomService.js';
import { getRoomProjects } from '../services/projectService.js';
import FirmwareDeployments from './FirmwareDeployments.jsx';
import FirmwareVersions from './FirmwareVersions.jsx';
import '../styles/firmware.css';

/**
 * Provides a direct path to OTA controls by choosing a room and project,
 * while reusing the same version and deployment components as room details.
 */
export default function FirmwareWorkspace() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [projects, setProjects] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadWorkspace = async () => {
      try {
        const loadedRooms = await getMyRooms();
        if (!isMounted) {
          return;
        }

        setRooms(loadedRooms);
        const firstRoom = loadedRooms[0];
        if (!firstRoom) {
          return;
        }

        setSelectedRoomId(firstRoom.id);
        setLoadingProjects(true);
        const loadedProjects = await getRoomProjects(firstRoom.id);
        if (isMounted) {
          setProjects(loadedProjects);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || 'No se pudieron cargar los proyectos OTA.');
        }
      } finally {
        if (isMounted) {
          setLoadingRooms(false);
          setLoadingProjects(false);
        }
      }
    };

    loadWorkspace();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRoomChange = async (event) => {
    const roomId = event.target.value;
    setSelectedRoomId(roomId);
    setProjects([]);
    setLoadingProjects(true);
    setError('');

    try {
      setProjects(await getRoomProjects(roomId));
    } catch (loadError) {
      setError(loadError.message || 'No se pudieron cargar los proyectos de la sala.');
    } finally {
      setLoadingProjects(false);
    }
  };

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId);

  return (
    <section className="firmware-workspace">
      <article className="card firmware-workspace-heading">
        <div>
          <h3>Actualizaciones OTA</h3>
          <p>Elige una sala y administra versiones o crea un despliegue en sus proyectos.</p>
        </div>
        {rooms.length > 0 ? (
          <label className="field" htmlFor="firmware-workspace-room">
            <span>Sala</span>
            <select
              id="firmware-workspace-room"
              value={selectedRoomId}
              onChange={handleRoomChange}
              disabled={loadingRooms || rooms.length === 1}
            >
              {rooms.map((room) => (
                <option value={room.id} key={room.id}>{room.name}</option>
              ))}
            </select>
          </label>
        ) : null}
      </article>

      {error ? <p className="form-error rooms-feedback" role="alert">{error}</p> : null}
      {loadingRooms || loadingProjects ? (
        <p className="room-secondary-text" role="status">Cargando proyectos...</p>
      ) : rooms.length === 0 ? (
        <article className="card rooms-empty-state">
          <h3>No hay salas disponibles</h3>
          <p>Crea o únete a una sala para gestionar firmware.</p>
        </article>
      ) : projects.length === 0 && !error ? (
        <article className="card rooms-empty-state">
          <h3>Esta sala no tiene proyectos</h3>
          <p>Agrega un proyecto desde la sección Mis salas para comenzar a gestionar firmware.</p>
        </article>
      ) : (
        <div className="firmware-workspace-projects">
          {projects.map((project) => (
            <article className="card firmware-workspace-project" key={project.id}>
              <div className="room-project-summary">
                <div>
                  <p className="room-label">Proyecto OTA</p>
                  <h4>{project.name}</h4>
                  <p>{project.description || 'Sin descripción.'}</p>
                </div>
                <span className={`room-status${project.isActive ? '' : ' is-inactive'}`}>
                  {project.isActive ? 'Activo' : 'Desactivado'}
                </span>
              </div>
              <FirmwareVersions
                projectId={project.id}
                projectActive={project.isActive}
                roomActive={selectedRoom?.isActive || false}
                canManage={['OWNER', 'ADMIN'].includes(selectedRoom?.role)}
              />
              <FirmwareDeployments
                projectId={project.id}
                projectActive={project.isActive}
                roomActive={selectedRoom?.isActive || false}
                canManage={['OWNER', 'ADMIN'].includes(selectedRoom?.role)}
              />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
