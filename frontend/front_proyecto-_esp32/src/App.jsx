import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginForm from './components/LoginForm.jsx';
import Dashboard from './components/Dashboard.jsx';
import NotFound from './components/NotFound.jsx';
import { login } from './services/auth.js';

const getStoredAuth = () => {
  try {
    const storedUser = localStorage.getItem('authUser');

    if (storedUser) {
      return {
        user: JSON.parse(storedUser)
      };
    }
  } catch {
    localStorage.removeItem('authUser');
    localStorage.removeItem('authToken');
  }

  return { user: null };
};

// App es el componente raíz de la aplicación.
// Mantiene el estado de autenticación y controla la navegación entre login y dashboard.
function App() {
  const storedAuth = getStoredAuth();
  const [user, setUser] = useState(storedAuth.user);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Maneja el intento de login usando el servicio de auth.
  // Actualiza el estado y guarda la sesión localmente para recargar la página.
  const handleLogin = async (username, password) => {
    setLoading(true);
    setError('');

    try {
      const response = await login(username, password);
      setUser(response.user);
      // response.token se guarda en localStorage para futuras llamadas
      // autenticadas cuando el backend real ya esté integrado.
      localStorage.setItem('authUser', JSON.stringify(response.user));
      localStorage.setItem('authToken', response.token);
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  // Cierra la sesión del usuario, quitando los datos de localStorage.
  const handleLogout = () => {
    setUser(null);
    setError('');
    localStorage.removeItem('authUser');
    localStorage.removeItem('authToken');
  };

  return (
    <BrowserRouter>
      <div className={`app-shell${user ? ' dashboard-active' : ''}`}>
        <header className="app-header">
          <div>
            <p className="eyebrow">Plataforma para actualizar ESP32</p>
            <h1>Gestión de dispositivos</h1>
          </div>
        </header>

        <main className="main-content">
          <Routes>
            {/* Redirige según si el usuario ya está logueado */}
            <Route
              path="/"
              element={<Navigate to={user ? '/dashboard' : '/login'} replace />}
            />

            {/* Página de login, solo accesible si no hay sesión activa */}
            <Route
              path="/login"
              element={
                user ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <div className="login-view">
                    <LoginForm
                      onSubmit={handleLogin}
                      loading={loading}
                      error={error}
                    />
                  </div>
                )
              }
            />

            {/* Dashboard protegido que solo se muestra si el usuario está autenticado */}
            <Route
              path="/dashboard"
              element={
                user ? (
                  <div className="dashboard-view">
                    <Dashboard user={user} onLogout={handleLogout} />
                  </div>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            {/* Cualquier ruta desconocida muestra una página 404 simple */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
