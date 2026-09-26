const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api`;

export const AUTH_FAILURE_EVENT = 'auth:session-expired';

export class ApiError extends Error {
  constructor(message, status, sessionExpired = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.sessionExpired = sessionExpired;
  }
}

export function buildAuthHeaders(token) {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function request(path, {
  auth = false,
  token,
  fallbackMessage = 'Error en la solicitud',
  shouldExpireSession = () => true,
  ...options
} = {}) {
  const authToken = auth ? token ?? localStorage.getItem('authToken') : undefined;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...buildAuthHeaders(authToken),
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
    const sessionExpired = auth
      && response.status === 401
      && shouldExpireSession(data);

    if (sessionExpired) {
      window.dispatchEvent(new CustomEvent(AUTH_FAILURE_EVENT));
    }

    throw new ApiError(data.message || fallbackMessage, response.status, sessionExpired);
  }

  return data;
}
