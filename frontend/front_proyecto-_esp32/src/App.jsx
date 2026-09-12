import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginForm from './components/LoginForm.jsx';
import RegisterForm from './components/RegisterForm.jsx';
import ForgotPasswordForm from './components/ForgotPasswordForm.jsx';
import ResetPasswordForm from './components/ResetPasswordForm.jsx';
import Dashboard from './components/Dashboard.jsx';
import NotFound from './components/NotFound.jsx';
import {
  ApiError,
  AUTH_FAILURE_EVENT,
  getCurrentUser,
  login,
  register
} from './services/auth.js';

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
  const [storedAuth] = useState(getStoredAuth);
  const storedToken = localStorage.getItem('authToken');
  const [user, setUser] = useState(storedAuth.user);
  const [authReady, setAuthReady] = useState(!storedAuth.user || !storedToken);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [registrationError, setRegistrationError] = useState('');

  const handleLogout = useCallback(() => {
    setUser(null);
    setError('');
    setSuccessMessage('');
    localStorage.removeItem('authUser');
    localStorage.removeItem('authToken');
  }, []);

  useEffect(() => {
    window.addEventListener(AUTH_FAILURE_EVENT, handleLogout);
    return () => window.removeEventListener(AUTH_FAILURE_EVENT, handleLogout);
  }, [handleLogout]);

  useEffect(() => {
    const token = localStorage.getItem('authToken');

    if (!storedAuth.user || !token) {
      if (storedAuth.user && !token) {
        localStorage.removeItem('authUser');
      }
      return undefined;
    }

    getCurrentUser(token)
      .then((currentUser) => {
        setUser(currentUser);
        localStorage.setItem('authUser', JSON.stringify(currentUser));
      })
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          handleLogout();
        }
        setError(err.message || 'No se pudo validar la sesión');
        setUser(null);
      })
      .finally(() => setAuthReady(true));
  }, [handleLogout, storedAuth.user]);

  // Maneja el intento de login usando el servicio de auth.
  // Actualiza el estado y guarda la sesión localmente para recargar la página.
  const handleLogin = async (email, password) => {
    setLoading(true);
    setError('');

    try {
      const response = await login(email, password);
      setUser(response.user);
      // response.token se guarda en localStorage para futuras llamadas autenticadas
      localStorage.setItem('authUser', JSON.stringify(response.user));
      localStorage.setItem('authToken', response.token);
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (userData) => {
    setLoading(true);
    setRegistrationError('');

    try {
      await register(userData);
      setSuccessMessage('Registro exitoso. Ahora puedes iniciar sesión.');
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      setRegistrationError(err.message || 'Error al registrar usuario');
    } finally {
      setLoading(false);
    }
  };

  const showRegister = () => {
    setError('');
    setSuccessMessage('');
    setRegistrationError('');
    window.history.pushState({}, '', '/register');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const showLogin = () => {
    setError('');
    setRegistrationError('');
    window.history.pushState({}, '', '/login');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const showForgotPassword = () => {
    setError('');
    setSuccessMessage('');
    window.history.pushState({}, '', '/forgot-password');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  if (!authReady) {
    return null;
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
                      message={successMessage}
                      onRegister={showRegister}
                      onForgotPassword={showForgotPassword}
                    />
                  </div>
                )
              }
            />

            <Route
              path="/forgot-password"
              element={
                user ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <div className="login-view">
                    <ForgotPasswordForm onBackToLogin={showLogin} />
                  </div>
                )
              }
            />

            <Route
              path="/reset-password"
              element={
                user ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <div className="login-view">
                    <ResetPasswordForm
                      token={new URLSearchParams(window.location.search).get('token')}
                      onBackToLogin={showLogin}
                    />
                  </div>
                )
              }
            />

            <Route
              path="/register"
              element={
                user ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <div className="login-view">
                    <RegisterForm
                      onSubmit={handleRegister}
                      loading={loading}
                      error={registrationError}
                      onBackToLogin={showLogin}
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
                    <Dashboard
                      user={user}
                      onLogout={handleLogout}
                      onUserUpdated={(updatedUser) => {
                        setUser(updatedUser);
                        localStorage.setItem('authUser', JSON.stringify(updatedUser));
                      }}
                    />
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
