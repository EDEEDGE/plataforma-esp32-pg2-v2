import '../styles/common.css';

// NotFound muestra una página de ruta no encontrada.
export default function NotFound() {
  return (
    <div className="notfound-view">
      <h2>Página no encontrada</h2>
      <p>La ruta que intentaste acceder no existe. Usa el menú o regresa al inicio.</p>
    </div>
  );
}
