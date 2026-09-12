import { ApiError, AUTH_FAILURE_EVENT, buildAuthHeaders } from './auth.js';

const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api`;

const getToken = () => localStorage.getItem('authToken');

const request = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...buildAuthHeaders(getToken()),
      ...options.headers,
    },
  });
  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent(AUTH_FAILURE_EVENT));
    }
    throw new ApiError(data.message || 'Error en la solicitud de usuarios', response.status);
  }

  return data;
};

const normalizeUser = (user) => ({
  id: user.id,
  name: [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.username || 'Usuario',
  username: user.username,
  email: user.email,
  role: user.role,
  firstName: user.firstName,
  lastName: user.lastName,
  isActive: user.isActive,
  createdAt: user.createdAt,
});

export async function getUsers() {
  const data = await request('/users');
  return (data.users || []).map(normalizeUser);
}

export async function getUserById(userId) {
  const data = await request(`/users/${userId}`);
  return normalizeUser(data.user);
}

export async function updateMyProfile(profile) {
  const data = await request('/users/me', {
    method: 'PUT',
    body: JSON.stringify(profile),
  });
  return normalizeUser(data.user);
}

export async function updateUserStatus(userId, isActive) {
  const data = await request(`/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
  return normalizeUser(data.user);
}

export async function updateUserRole(userId, role) {
  const data = await request(`/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
  return normalizeUser(data.user);
}
