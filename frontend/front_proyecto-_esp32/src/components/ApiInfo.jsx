export default function ApiInfo({ apiBase }) {
  return (
    <section className="card api-info">
      <h2>Conexión API</h2>
      <p>Base de la API: <code>{apiBase}</code></p>
      <p>Se espera que el backend exponga un endpoint REST como <code>/sensors</code> para este panel.</p>
    </section>
  );
}
