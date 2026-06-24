/**
 * ComposicionDetallada — Tabla de 8+ categorias por edad/sexo/estado con grafico Plotly.
 */
const ComposicionDetallada = {
  async render(container) {
    const rid = MicrositioEstadisticasPage.rebanoId();
    const params = rid ? `?rebano_id=${rid}` : '';

    try {
      const { data } = await API.get(`/analitica/composicion${params}`);
      const d = data.data || {};
      const categorias = d.categorias || {};
      const total = d.total || 0;

      const labels = Object.values(categorias).map(c => c.label);
      const values = Object.values(categorias).map(c => c.cantidad);

      container.innerHTML = `
        <div id="chart-composicion" style="height:400px"></div>
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
          labels, values, type: 'pie',
          textinfo: 'label+percent',
          marker: { colors: ['#A5D6A7','#81C784','#66BB6A','#4CAF50','#388E3C','#FFB74D','#FF8A65','#EF5350','#AB47BC','#42A5F5'] }
        }], { margin: { t: 10 } }, { responsive: true });
      }
    } catch (e) {
      container.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
  },

  drillDown(categoria) {
    // Navegar a la lista de animales filtrada
    window.location.hash = `#/animales`;
    Toast.success(`Filtrando por categoria: ${categoria}`);
  }
};
