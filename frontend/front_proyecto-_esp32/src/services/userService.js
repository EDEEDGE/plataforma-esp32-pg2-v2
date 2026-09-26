import { request } from './http.js';

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
  const data = await request('/users', {
    auth: true,
    fallbackMessage: 'Error en la solicitud de usuarios',
  });
  return (data.users || []).map(normalizeUser);
}

export async function getUserById(userId) {
  const data = await request(`/users/${userId}`, {
    auth: true,
    fallbackMessage: 'Error en la solicitud de usuarios',
  });
  return normalizeUser(data.user);
}

export async function updateMyProfile(profile) {
  const data = await request('/users/me', {
    method: 'PUT',
    auth: true,
    body: JSON.stringify(profile),
    fallbackMessage: 'Error en la solicitud de usuarios',
  });
  return normalizeUser(data.user);
}

export async function updateUserStatus(userId, isActive) {
  const data = await request(`/users/${userId}/status`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify({ isActive }),
    fallbackMessage: 'Error en la solicitud de usuarios',
  });
  return normalizeUser(data.user);
}

export async function updateUserRole(userId, role) {
  const data = await request(`/users/${userId}/role`, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify({ role }),
    fallbackMessage: 'Error en la solicitud de usuarios',
  });
  return normalizeUser(data.user);
}
