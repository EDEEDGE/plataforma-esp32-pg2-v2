// Servicio de auth simulado mientras no tenemos backend real.
// Cuando el backend esté listo, esto se reemplaza por la llamada real
// a `POST /auth/login` del API.

const DEMO_USERS = [
  {
    id: 1,
    username: 'admin',
    password: '123456',
    name: 'Administrador',
    role: 'admin'
  },
  {
    id: 2,
    username: 'user',
    password: '123456',
    name: 'Usuario Demo',
    role: 'user'
  }
];

// Datos simulados para login.
// Más adelante, si se conecta el backend, cambiar esta función
// por un `fetch()` a `POST /auth/login` y devolver { user, token }.
export function login(username, password) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const user = DEMO_USERS.find(
        (item) => item.username === username && item.password === password
      );

      if (!user) {
        reject(new Error('Usuario o contraseña incorrectos'));
        return;
      }

      resolve({
        token: `demo-token-${user.id}`,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role
        }
      });
    }, 700);
  });
}

// Helper para cuando hagamos llamadas autenticadas al backend.
// En esta etapa sigue sin usarse porque estamos trabajando con datos simulados.
export function buildAuthHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };
}
