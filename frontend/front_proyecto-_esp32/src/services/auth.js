// Servicio de autenticación conectado con backend real

const API_URL = 'http://localhost:3000/api';

// Login con backend real
export async function login(email, password) {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error al iniciar sesión');
    }

    const data = await response.json();

    // Transformar respuesta del backend al formato que el frontend espera
    return {
      token: data.token,
      user: {
        id: data.user.id,
        name: `${data.user.firstName} ${data.user.lastName}`.trim(),
        username: data.user.username,
        email: data.user.email,
        role: data.user.role,
        firstName: data.user.firstName,
        lastName: data.user.lastName
      }
    };
  } catch (error) {
    throw error;
  }
}

// Helper para construir headers autenticados
export function buildAuthHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };
}
