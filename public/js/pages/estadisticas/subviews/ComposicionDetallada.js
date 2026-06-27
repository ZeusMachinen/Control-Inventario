/**
 * ComposicionDetallada — Tabla de 8+ categorias por edad/sexo/estado con grafico Plotly.
 */
const ComposicionDetallada = {
  CATEGORIA_FILTROS: {
    'terneros_lactando_machos':    { sexo: 'Macho', edad_max: '8' },
    'terneros_lactando_hembras':   { sexo: 'Hembra', edad_max: '8' },
    'terneros_destetados_machos':  { sexo: 'Macho', edad_min: '9', edad_max: '17' },
    'terneros_destetados_hembras': { sexo: 'Hembra', edad_min: '9', edad_max: '17' },
    'novillos':                    { sexo: 'Macho', edad_min: '18' },
    'toretes':                     { sexo: 'Macho', edad_min: '18', edad_max: '23', estado: 'Padrote' },
    'vacas':                       { sexo: 'Hembra', edad_min: '18' },
    'toros':                       { sexo: 'Macho', edad_min: '24', estado: 'Padrote' },
    'vacas_vacias':                { sexo: 'Hembra', edad_min: '30' },
  },

  async render(container) {
    const qp = MicrositioEstadisticasPage.queryParams();
    try {
      const { data } = await API.get(`/analitica/composicion${qp}`);
      const d = data.data || {};
      const categorias = d.categorias || {};
      const total = d.total || 0;

      const labels = Object.values(categorias).map(c => c.label);
      const values = Object.values(categorias).map(c => c.cantidad);

      container.innerHTML = `
        <div class="chart-card" style="background:var(--card-bg,#fff);border-radius:16px;padding:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08),0 1px 4px rgba(0,0,0,0.06)">
          <div id="chart-composicion" style="height:500px"></div>
        </div>
        <div class="table-responsive mt-4">
          <table class="table table-sm table-hover">
            <thead><tr><th>Categoria</th><th>Cantidad</th><th>%</th><th>Peso Prom.</th></tr></thead>
            <tbody>
              ${Object.entries(categorias).map(([key, c]) => `
                <tr class="composicion-row" data-categoria="${key}" onclick="ComposicionDetallada.drillDown('${key}')">
                  <td>${c.label}</td>
                  <td><strong>${Formateador.numero(c.cantidad)}</strong></td>
                  <td>${c.porcentaje}%</td>
                  <td>${c.peso_promedio ? c.peso_promedio + ' kg' : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot><tr class="table-active"><th>Total</th><th>${Formateador.numero(total)}</th><th>100%</th><th></th></tr></tfoot>
          </table>
        </div>
      `;

      if (typeof Plotly !== 'undefined' && labels.length) {
        Plotly.newPlot('chart-composicion', [{
          labels, values, type: 'treemap',
          parents: labels.map(() => ''),
          textinfo: 'label+value+percent parent',
          hovertemplate: '<b>%{label}</b><br>Animales: %{value}<br>% del total: %{percentParent:.1%}<extra></extra>',
          textfont: { size: 13, family: 'Segoe UI, -apple-system, sans-serif', color: '#fff', shadow: { enabled: true, color: 'rgba(0,0,0,0.5)', size: 2 } },
          textposition: 'middle center',
          outsidetextfont: { size: 12, family: 'Segoe UI, -apple-system, sans-serif' },
          marker: {
            colors: [
              '#2E7D32', '#388E3C', '#43A047', '#4CAF50', '#66BB6A',
              '#FF8F00', '#F4511E', '#D32F2F', '#7B1FA2'
            ],
            line: { width: 3, color: 'rgba(0,0,0,0.25)' },
            depthfade: true
          },
          tiling: { pad: 6, squarifyratio: 1 },
          pathbar: { visible: false, thickness: 0 },
          branchvalues: 'total'
        }], {
          margin: { t: 10, l: 6, r: 6, b: 6 },
          font: { family: 'Segoe UI, -apple-system, sans-serif' },
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent'
        }, { responsive: true, displayModeBar: false });
      }
    } catch (e) {
      container.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
  },

  drillDown(categoria) {
    const filtro = this.CATEGORIA_FILTROS[categoria];
    if (!filtro) return;

    const params = [];
    const rid = MicrositioEstadisticasPage.rebanoId();
    if (rid) params.push(`rebano_id=${rid}`);
    Object.entries(filtro).forEach(([k, v]) => params.push(`${k}=${encodeURIComponent(v)}`));

    window.location.hash = `#/animales${params.length ? '?' + params.join('&') : ''}`;
  }
};
