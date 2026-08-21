export default function SensorCard({ sensor }) {
  return (
    <article className="card sensor-card">
      <div className="card-header">
        <h2>{sensor.name || 'Sensor desconocido'}</h2>
        <span className="chip">{sensor.type || 'Desconocido'}</span>
      </div>

      <div className="card-body">
        <p>
          <strong>Valor:</strong> {sensor.value ?? '—'}
        </p>
        <p>
          <strong>Unidad:</strong> {sensor.unit || '—'}
        </p>
        <p>
          <strong>Última actualización:</strong> {sensor.updatedAt ? new Date(sensor.updatedAt).toLocaleString() : '—'}
        </p>
      </div>
    </article>
  );
}
