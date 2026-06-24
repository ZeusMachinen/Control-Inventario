/**
 * ComparativaRebanos — Tabla comparativa side-by-side entre rebanos.
 */
const ComparativaRebanos = {
  async render(container) {
    try {
      const { data } = await API.get('/analitica/rebanos/comparativa');
      const rebanos = data.data?.rebanos || [];

      if (!rebanos.length) {
        container.innerHTML = '<p class="text-muted">No hay rebanos activos para comparar.</p>';
        return;
      }

      const metricas = ['total_animales'];
      const headers = rebanos.map(r => r.nombre);

      container.innerHTML = `
        <div class="table-responsive">
          <table class="table table-sm table-bordered">
            <thead><tr><th>Rebano</th>${rebanos.map(r => `<th>${r.nombre}</th>`).join('')}</tr></thead>
            <tbody>
              <tr><td><strong>Total Animales</strong></td>${rebanos.map(r => `<td>${Formateador.numero(r.total_animales)}</td>`).join('')}</tr>
              <tr><td><strong>Riesgo Descarte</strong></td>${rebanos.map(r => `<td><span class="badge bg-${(r.riesgo_descarte?.pct_riesgo||0)>15?'warning':'success'}">${r.riesgo_descarte?.pct_riesgo||0}%</span></td>`).join('')}</tr>
              ${Object.keys(rebanos[0]?.composicion || {}).slice(0, 6).map(cat => `
                <tr><td>${cat}</td>${rebanos.map(r => `<td>${r.composicion?.[cat]?.cantidad || 0}</td>`).join('')}</tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
  }
};
