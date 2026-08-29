import { buildAuthHeaders } from './auth.js';

const API_URL = 'http://localhost:3000/api';

// Obtener token del localStorage
const getToken = () => localStorage.getItem('authToken');

// Obtener todos los usuarios
export async function getUsers() {
  try {
    const token = getToken();
    const response = await fetch(`${API_URL}/users`, {
      method: 'GET',
      headers: buildAuthHeaders(token),
    });

    if (!response.ok) {
      throw new Error('Error al obtener usuarios');
    }

    const data = await response.json();
    return data.users || [];
  } catch (error) {
    console.error('Error en getUsers:', error);
    // Fallback a localStorage si el backend no está disponible
    return getLocalUsers();
  }
}

// Crear un nuevo usuario
export async function createUser(userData) {
  try {
    const token = getToken();
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: buildAuthHeaders(token),
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al crear usuario');
    }

    return await response.json();
  } catch (error) {
    console.error('Error en createUser:', error);
    // Fallback a localStorage
    return createLocalUser(userData);
  }
}

// Actualizar usuario
export async function updateUser(userId, updates) {
  try {
    const token = getToken();
    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: 'PUT',
      headers: buildAuthHeaders(token),
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al actualizar usuario');
    }

    return await response.json();
  } catch (error) {
    console.error('Error en updateUser:', error);
    // Fallback a localStorage
    return updateLocalUser(userId, updates);
  }
}

// Eliminar usuario
export async function deleteUser(userId) {
  try {
    const token = getToken();
    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: buildAuthHeaders(token),
    });

    if (!response.ok) {
      throw new Error('Error al eliminar usuario');
    }

    return true;
  } catch (error) {
    console.error('Error en deleteUser:', error);
    // Fallback a localStorage
    return deleteLocalUser(userId);
  }
}

// ============= FALLBACK: Funciones de localStorage =============

const USERS_STORAGE_KEY = 'demoUsers';

const initialUsers = [
  { id: 1, name: 'Juan Pérez', username: 'juan', role: 'admin' },
  { id: 2, name: 'María López', username: 'maria', role: 'editor' },
  { id: 3, name: 'Carlos Díaz', username: 'carlos', role: 'viewer' }
];

const getLocalUsers = () => {
  try {
    const stored = localStorage.getItem(USERS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(initialUsers));
  return initialUsers;
};

const saveLocalUsers = (users) => {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
};

const createLocalUser = async (userData) => {
  const users = getLocalUsers();
  const nextId = users.length ? Math.max(...users.map((user) => user.id)) + 1 : 1;
  const newUser = { id: nextId, ...userData };
  const updated = [...users, newUser];
  saveLocalUsers(updated);
  return new Promise((resolve) => setTimeout(() => resolve(newUser), 250));
};

const updateLocalUser = async (userId, updates) => {
  const users = getLocalUsers();
  const updated = users.map((user) =>
    user.id === userId ? { ...user, ...updates } : user
  );
  saveLocalUsers(updated);
  return new Promise((resolve) =>
    setTimeout(() => resolve(updated.find((user) => user.id === userId)), 250)
  );
};

const deleteLocalUser = async (userId) => {
  const users = getLocalUsers();
  const updated = users.filter((user) => user.id !== userId);
  saveLocalUsers(updated);
  return new Promise((resolve) => setTimeout(() => resolve(true), 250));
};
