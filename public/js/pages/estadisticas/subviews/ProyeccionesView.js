/**
 * ProyeccionesView — Proyecciones a 12 meses con banda de confianza.
 */
const ProyeccionesView = {
  async render(container) {
    const rid = MicrositioEstadisticasPage.rebanoId() || '0';

    try {
      const { data } = await API.get(`/analitica/rebanos/${rid}/proyecciones`);
      const d = data.data || {};
      const proy = d.proyecciones || [];

      container.innerHTML = `
        <p class="text-muted mb-2">Poblacion actual: <strong>${Formateador.numero(d.poblacion_actual)}</strong> — ${d.metodo || ''}</p>
        <div id="chart-proyeccion" style="height:350px"></div>
        <div class="table-responsive mt-4">
          <table class="table table-sm">
            <thead><tr><th>Mes</th><th>Poblacion</th><th>Natalidad</th><th>Partos Conf.</th><th>Partos Est.</th><th>Optimista</th><th>Pesimista</th></tr></thead>
            <tbody>${proy.map(p => `<tr>
              <td>${p.mes}</td><td>${p.poblacion}</td><td>${p.natalidad}</td><td>${p.partos_confirmados}</td>
              <td>${p.partos_estimados}</td><td>${p.optimista}</td><td>${p.pesimista}</td></tr>`).join('')}</tbody>
          </table>
        </div>
      `;

      if (typeof Plotly !== 'undefined' && proy.length) {
        const meses = proy.map(p => p.mes);
        Plotly.newPlot('chart-proyeccion', [
          { x: meses, y: proy.map(p => p.poblacion), name: 'Poblacion', type: 'scatter', mode: 'lines+markers', line: { width: 3 } },
          { x: meses, y: proy.map(p => p.optimista), name: 'Optimista', type: 'scatter', mode: 'lines', line: { dash: 'dash', color: 'green' }, showlegend: true },
          { x: meses, y: proy.map(p => p.pesimista), name: 'Pesimista', type: 'scatter', mode: 'lines', line: { dash: 'dash', color: 'red' }, showlegend: true },
        ], { margin: { t: 10 }, legend: { orientation: 'h' } }, { responsive: true });
      }
    } catch (e) {
      container.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
  }
};
