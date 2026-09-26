import { request } from './http.js';

export { ApiError, AUTH_FAILURE_EVENT, buildAuthHeaders } from './http.js';

const normalizeUser = (user) => ({
  id: user.id,
  name: `${user.firstName} ${user.lastName}`.trim(),
  username: user.username,
  email: user.email,
  role: user.role,
  firstName: user.firstName,
  lastName: user.lastName,
  isActive: user.isActive
});

export async function login(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    fallbackMessage: 'Error al iniciar sesión',
  });

  return {
    token: data.token,
    user: normalizeUser(data.user),
  };
}

export async function register(userData) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
    fallbackMessage: 'Error al registrar usuario',
  });
}

export async function getCurrentUser(token) {
  const data = await request('/auth/me', {
    method: 'GET',
    auth: true,
    token,
    fallbackMessage: 'No se pudo validar la sesión',
  });

  return normalizeUser(data.user);
}

export async function changePassword(currentPassword, newPassword) {
  return request('/auth/change-password', {
    method: 'PUT',
    auth: true,
    body: JSON.stringify({ currentPassword, newPassword }),
    fallbackMessage: 'No se pudo cambiar la contraseña',
    shouldExpireSession: (data) => data.message !== 'La contraseña actual es incorrecta',
  });
}

export async function requestPasswordReset(email) {
  return request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
    fallbackMessage: 'No se pudo solicitar la recuperación',
  });
}

export async function resetPassword(token, newPassword) {
  return request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
    fallbackMessage: 'No se pudo restablecer la contraseña',
  });
}
