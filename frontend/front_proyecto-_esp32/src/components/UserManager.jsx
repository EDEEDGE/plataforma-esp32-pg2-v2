import { useCallback, useEffect, useState } from 'react';
import {
  getUsers,
  updateUserRole,
  updateUserStatus
} from '../services/userService.js';
import { ApiError } from '../services/auth.js';
import '../styles/userManager.css';

export default function UserManager({ onSessionExpired }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      setUsers(await getUsers());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
      } else {
        setError(err.message || 'No se pudieron cargar los usuarios');
      }
    } finally {
      setLoading(false);
    }
  }, [onSessionExpired]);

  useEffect(() => {
    const init = async () => {
      await loadUsers();
    };
    init();
  }, [loadUsers]);

  const handleStatusChange = async (user) => {
    setSavingId(user.id);
    setError('');

    try {
      const updatedUser = await updateUserStatus(user.id, !user.isActive);
      setUsers((current) =>
        current.map((currentUser) =>
          currentUser.id === updatedUser.id ? updatedUser : currentUser
        )
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
      } else {
        setError(err.message || 'No se pudo actualizar el estado');
      }
    } finally {
      setSavingId(null);
    }
  };

  const handleRoleChange = async (user, event) => {
    const role = event.target.value;
    setSavingId(user.id);
    setError('');

    try {
      const updatedUser = await updateUserRole(user.id, role);
      setUsers((current) =>
        current.map((currentUser) =>
          currentUser.id === updatedUser.id ? updatedUser : currentUser
        )
      );
    } catch (err) {
      event.target.value = user.role;
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
      } else {
        setError(err.message || 'No se pudo actualizar el rol');
      }
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="user-manager-grid">
      <article className="card user-manager-intro">
        <h3>Usuarios</h3>
        <p>Administra el estado y el rol de los usuarios del sistema.</p>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
      </article>

      <article className="card user-manager-list-card">
        <h3>Lista de usuarios</h3>
        {loading ? (
          <p>Cargando usuarios...</p>
        ) : users.length === 0 ? (
          <p>No hay usuarios registrados.</p>
        ) : (
          <div className="user-list">
            {users.map((user) => (
              <article className="user-item" key={user.id}>
                <div className="user-identity">
                  <span className="user-avatar" aria-hidden="true">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <strong>{user.name}</strong>
                    <span>@{user.username}</span>
                    <small>{user.email}</small>
                  </div>
                </div>
                <div className="user-controls">
                  <label className="user-control">
                    <span>Rol</span>
                    <select
                      value={user.role}
                      onChange={(event) => handleRoleChange(user, event)}
                      disabled={savingId === user.id}
                      aria-label={`Rol de ${user.name}`}
                    >
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </label>
                  <span className={`user-status ${user.isActive ? 'is-active' : 'is-inactive'}`}>
                    {user.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                  <button
                    type="button"
                    className={user.isActive ? 'danger-button' : ''}
                    onClick={() => handleStatusChange(user)}
                    disabled={savingId === user.id}
                  >
                    {user.isActive ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
