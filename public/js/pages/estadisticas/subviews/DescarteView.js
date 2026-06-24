/**
 * DescarteView — Lista de vacas con semaforo de descarte.
 */
const DescarteView = {
  async render(container) {
    const qp = MicrositioEstadisticasPage.queryParams();
    try {
      const { data } = await API.get(`/analitica/descarte${qp}`);
      const d = data.data || {};
      const vacas = d.vacas || [];
      const resumen = d.resumen || {};

      container.innerHTML = `
        <div class="row g-3 mb-4">
          <div class="col-4"><div class="kpi-card bg-success bg-opacity-10"><div class="kpi-valor text-success">${resumen.bajo_riesgo||0}</div><div class="kpi-label">Bajo Riesgo</div></div></div>
          <div class="col-4"><div class="kpi-card bg-warning bg-opacity-10"><div class="kpi-valor text-warning">${resumen.atencion||0}</div><div class="kpi-label">Atencion</div></div></div>
          <div class="col-4"><div class="kpi-card bg-danger bg-opacity-10"><div class="kpi-valor text-danger">${resumen.descarte||0}</div><div class="kpi-label">Descarte</div></div></div>
        </div>
        ${resumen.pct_riesgo > 15 ? `<div class="alert alert-warning"><i class="fas fa-exclamation-triangle me-2"></i>Alerta: ${resumen.pct_riesgo}% del rebano en riesgo de descarte</div>` : ''}
        <div class="table-responsive">
          <table class="table table-sm table-hover">
            <thead><tr><th>Nombre</th><th>Edad</th><th>Dias ult. parto</th><th>Estado</th><th>Partos</th><th>Tasa Prenez</th><th>Score Riesgo</th><th>Veredicto</th></tr></thead>
            <tbody>${vacas.map(v => {
              const color = v.semaforo === 'verde' ? 'success' : v.semaforo === 'amarillo' ? 'warning' : 'danger';
              return `<tr>
                <td><strong>${v.nombre}</strong></td><td>${v.edad_meses}m</td><td>${v.dias_ultimo_parto||'-'}</td>
                <td>${v.estado_reproductivo}</td><td>${v.partos_total}</td><td>${v.tasa_prenez}</td>
                <td>${v.score_riesgo}</td>
                <td><span class="badge bg-${color}">${v.veredicto}</span></td></tr>`;
            }).join('')}</tbody>
          </table>
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
  }
};
