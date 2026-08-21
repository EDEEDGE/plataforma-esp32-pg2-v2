// Entry point of the React application.
// Carga los estilos globales y renderiza el componente raíz App.
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/common.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
