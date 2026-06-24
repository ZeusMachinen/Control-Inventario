/**
 * DashboardView — KPIs principales con graficos Plotly.
 */
const DashboardView = {
  async render(container) {
    try {
      const rid = MicrositioEstadisticasPage.rebanoId();
      const params = rid ? `?rebano_id=${rid}` : '';
      const { data: kpis } = await API.get(`/analitica/dashboard-kpis${params}`);

      const r = kpis.data || {};

      container.innerHTML = `
        <div class="kpi-grid">
          <div class="kpi-card"><div class="kpi-valor">${Formateador.numero(r.total_animales||0)}</div><div class="kpi-label">Total Animales</div></div>
          <div class="kpi-card"><div class="kpi-valor">${Formateador.numero(r.machos||0)} / ${Formateador.numero(r.hembras||0)}</div><div class="kpi-label">Machos / Hembras</div></div>
          <div class="kpi-card"><div class="kpi-valor">${r.tasa_natalidad||0}%</div><div class="kpi-label">Tasa Natalidad</div></div>
          <div class="kpi-card"><div class="kpi-valor">${r.tasa_prenez||0}%</div><div class="kpi-label">Tasa Prenez</div></div>
          <div class="kpi-card"><div class="kpi-valor">${Formateador.numero(r.prenadas||0)}</div><div class="kpi-label">Prenadas</div></div>
          <div class="kpi-card"><div class="kpi-valor">${Formateador.numero(r.lactando||0)}</div><div class="kpi-label">Lactando</div></div>
          <div class="kpi-card"><div class="kpi-valor">${Formateador.moneda(r.ganancia_neta||0)}</div><div class="kpi-label">Ganancia Neta</div></div>
          <div class="kpi-card"><div class="kpi-valor">${Formateador.moneda(r.costo_por_cabeza||0)}</div><div class="kpi-label">Costo por Cabeza</div></div>
          <div class="kpi-card"><div class="kpi-valor">${r.cobertura_vacunacion||0}%</div><div class="kpi-label">Vacunacion (3m)</div></div>
        </div>
        <div class="chart-card mt-4">
          <h3><i class="fas fa-chart-line me-2"></i>Series Temporales</h3>
          <div id="chart-series" style="height:350px"></div>
        </div>
      `;

      // Cargar series temporales para el grafico
      const { data: series } = await API.get(`/analitica/series-temporales${params}`);
      const s = series.data || {};

      if (typeof Plotly !== 'undefined') {
        const periodos = Object.keys(s.natalidad || {}).sort();
        const trace1 = { x: periodos, y: periodos.map(p => s.natalidad?.[p] || 0), name: 'Natalidad', type: 'scatter', mode: 'lines+markers' };
        const trace2 = { x: periodos, y: periodos.map(p => s.partos?.[p] || 0), name: 'Partos', type: 'scatter', mode: 'lines+markers' };
        const layout = { margin: { t: 10 }, legend: { orientation: 'h' }, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent' };
        Plotly.newPlot('chart-series', [trace1, trace2], layout, { responsive: true });
      }
    } catch (e) {
      container.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
  }
};
