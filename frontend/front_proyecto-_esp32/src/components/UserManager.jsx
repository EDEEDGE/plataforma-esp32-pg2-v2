import { useEffect, useState } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../services/userService.js';
import '../styles/userManager.css';

const emptyForm = { name: '', username: '', role: '' };

export default function UserManager() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const loadedUsers = await getUsers();
    setUsers(loadedUsers);
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      await load();
    };
    init();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.name || !form.username || !form.role) {
      setError('Completa todos los campos.');
      return;
    }

    if (editingId) {
      await updateUser(editingId, form);
    } else {
      await createUser(form);
    }

    setForm(emptyForm);
    setEditingId(null);
    load();
  };

  const handleEdit = (user) => {
    setEditingId(user.id);
    setForm({ name: user.name, username: user.username, role: user.role });
  };

  const handleDelete = async (userId) => {
    await deleteUser(userId);
    load();
  };

  return (
    <section className="dashboard-grid">
      <article className="card">
        <h3>Usuarios</h3>
        <p>Gestiona usuarios del sistema en modo simulado.</p>

        <form onSubmit={handleSubmit} className="user-form">
          <label className="field" htmlFor="name-input">
            <span>Nombre</span>
            <input
              id="name-input"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Nombre completo"
              required
            />
          </label>

          <label className="field" htmlFor="username-input">
            <span>Usuario</span>
            <input
              id="username-input"
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
              placeholder="usuario"
              required
            />
          </label>

          <label className="field" htmlFor="role-input">
            <span>Rol</span>
            <input
              id="role-input"
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value })}
              placeholder="admin / editor / viewer"
              required
            />
          </label>

          {error ? <p className="form-error" role="alert">{error}</p> : null}

          <button type="submit">{editingId ? 'Actualizar usuario' : 'Crear usuario'}</button>
          {editingId ? (
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
                setError('');
              }}
            >
              Cancelar
            </button>
          ) : null}
        </form>
      </article>

      <article className="card">
        <h3>Lista de usuarios</h3>
        {loading ? (
          <p>Cargando usuarios...</p>
        ) : (
          <div className="user-table">
            {users.length === 0 ? (
              <p>No hay usuarios registrados.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.username}</td>
                      <td>{user.role}</td>
                      <td>
                        <button type="button" onClick={() => handleEdit(user)}>
                          Editar
                        </button>
                        <button type="button" className="danger-button" onClick={() => handleDelete(user.id)}>
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </article>
    </section>
  );
}
