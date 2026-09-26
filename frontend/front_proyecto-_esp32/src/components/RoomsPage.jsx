import { useEffect, useState } from 'react';
import { createRoom, getMyRooms } from '../services/roomService.js';
import '../styles/rooms.css';

export default function RoomsPage({ onOpenRoom }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadRooms = async () => {
      try {
        const userRooms = await getMyRooms();
        if (isMounted) {
          setRooms(userRooms);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || 'No se pudieron cargar las salas.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadRooms();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const room = await createRoom({
        name: form.name.trim(),
        description: form.description.trim(),
      });
      setRooms((currentRooms) => [room, ...currentRooms]);
      setForm({ name: '', description: '' });
      setShowForm(false);
      setMessage(`La sala “${room.name}” se creó correctamente. Ahora tienes el rol OWNER.`);
    } catch (createError) {
      setError(createError.message || 'No se pudo crear la sala.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rooms-page">
      <div className="rooms-toolbar">
        <div>
          <h3>Mis salas</h3>
          <p>Organiza tus espacios y colabora con otros miembros.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError('');
            setMessage('');
            setShowForm((current) => !current);
          }}
          aria-expanded={showForm}
        >
          {showForm ? 'Cancelar' : 'Crear sala'}
        </button>
      </div>

      {error ? <p className="form-error rooms-feedback" role="alert">{error}</p> : null}
      {message ? <p className="form-message rooms-feedback" role="status">{message}</p> : null}

      {showForm ? (
        <article className="card room-form-card">
          <h3>Nueva sala</h3>
          <form className="user-form" onSubmit={handleSubmit}>
            <label className="field" htmlFor="room-name">
              <span>Nombre de la sala</span>
              <input
                id="room-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                maxLength={120}
                autoComplete="off"
                required
              />
            </label>
            <label className="field" htmlFor="room-description">
              <span>Descripción <small>(opcional)</small></span>
              <textarea
                id="room-description"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                rows={3}
                maxLength={500}
              />
            </label>
            <button type="submit" disabled={saving || !form.name.trim()}>
              {saving ? 'Creando sala...' : 'Guardar sala'}
            </button>
          </form>
        </article>
      ) : null}

      {loading ? (
        <article className="card rooms-empty-state" role="status">
          <p>Cargando tus salas...</p>
        </article>
      ) : rooms.length === 0 ? (
        <article className="card rooms-empty-state">
          <h3>Aún no tienes salas</h3>
          <p>Crea una sala para organizar proyectos y dispositivos.</p>
        </article>
      ) : (
        <div className="rooms-grid">
          {rooms.map((room) => (
            <article className="card room-card" key={room.id}>
              <div className="room-card-heading">
                <div>
                  <p className="room-label">Sala</p>
                  <h3>{room.name}</h3>
                </div>
                <span className={`room-status${room.isActive ? '' : ' is-inactive'}`}>
                  {room.isActive ? 'Activa' : 'Desactivada'}
                </span>
              </div>
              <p className="room-description">
                {room.description || 'Sin descripción.'}
              </p>
              <div className="room-card-footer">
                <span className="room-role">Tu rol: {room.role}</span>
                {room.createdAt ? (
                  <time dateTime={room.createdAt}>
                    Creada {new Date(room.createdAt).toLocaleDateString()}
                  </time>
                ) : null}
              </div>
              <button type="button" className="secondary-button room-open-button" onClick={() => onOpenRoom(room.id)}>
                Abrir sala
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
