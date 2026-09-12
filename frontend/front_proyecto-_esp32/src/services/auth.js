const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api`;

export const AUTH_FAILURE_EVENT = 'auth:session-expired';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const parseResponse = async (response, fallbackMessage) => {
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
    throw new ApiError(data.message || fallbackMessage, response.status);
  }

  return data;
};

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
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseResponse(response, 'Error al iniciar sesión');

  return {
    token: data.token,
    user: normalizeUser(data.user),
  };
}

export async function register(userData) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  return parseResponse(response, 'Error al registrar usuario');
}

export async function getCurrentUser(token) {
  const response = await fetch(`${API_URL}/auth/me`, {
    method: 'GET',
    headers: buildAuthHeaders(token),
  });
  const data = await parseResponse(response, 'No se pudo validar la sesión');

  return normalizeUser(data.user);
}

export async function changePassword(currentPassword, newPassword) {
  const response = await fetch(`${API_URL}/auth/change-password`, {
    method: 'PUT',
    headers: buildAuthHeaders(localStorage.getItem('authToken')),
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  return parseResponse(response, 'No se pudo cambiar la contraseña');
}

export async function requestPasswordReset(email) {
  const response = await fetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  return parseResponse(response, 'No se pudo solicitar la recuperación');
}

export async function resetPassword(token, newPassword) {
  const response = await fetch(`${API_URL}/auth/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token, newPassword }),
  });

  return parseResponse(response, 'No se pudo restablecer la contraseña');
}

export function buildAuthHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export { ApiError };
