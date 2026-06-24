/**
 * DashboardView — KPIs con tooltips, drill-down a Animales con filtros, graficos Plotly con anotaciones.
 */
const DashboardView = {
  kpiDefs: [
    { key: 'total_animales',   label: 'Total Animales',   icon: 'fa-cow',         help: 'Animales activos en el hato.', filter: null },
    { key: 'machos_hembras',   label: 'Machos / Hembras', icon: 'fa-venus-mars',  help: 'Distribucion por sexo.', filter: null },
    { key: 'nacidos_finca',    label: 'Nacidos en Finca', icon: 'fa-home',        help: 'Nacidos con madre registrada.', filter: 'madre' },
    { key: 'comprados',        label: 'Comprados',        icon: 'fa-truck',       help: 'Sin madre registrada (externos).', filter: 'externo' },
    { key: 'tasa_natalidad',   label: 'Tasa Natalidad',   icon: 'fa-baby',        help: 'Nacimientos / total en el periodo.', filter: null },
    { key: 'tasa_prenez',      label: 'Tasa Prenez',      icon: 'fa-heart',       help: 'Diagnosticos positivos / total.', filter: null },
    { key: 'prenadas',         label: 'Prenadas',         icon: 'fa-calendar-check', help: 'Hembras con estado Prenada.', filter: 'Prenada' },
    { key: 'lactando',         label: 'Lactando',         icon: 'fa-droplet',     help: 'Hembras en lactancia.', filter: 'Lactando' },
    { key: 'ganancia_neta',    label: 'Ganancia Neta',    icon: 'fa-dollar-sign', help: 'Ingresos - gastos en el periodo.', filter: null },
    { key: 'costo_por_cabeza', label: 'Costo / Cabeza',   icon: 'fa-coins',       help: 'Gasto total / animales activos.', filter: null },
    { key: 'cobertura_vacunacion', label: 'Vacunacion 3m', icon: 'fa-syringe',    help: '% vacunados en 3 meses.', filter: 'Vacunados' },
  ],

  async render(container) {
    const qp = MicrositioEstadisticasPage.queryParams();
    try {
      const { data: kpis } = await API.get(`/analitica/dashboard-kpis${qp}`);
      const r = kpis.data || {};

      container.innerHTML = `
        <div class="kpi-grid">${this.kpiDefs.map(d => {
          const val = this.fmt(d.key, r);
          const hasFilter = !!d.filter;
          return `<div class="kpi-card ${hasFilter ? 'kpi-clickable' : ''}" ${hasFilter ? `onclick="DashboardView.drillDown('${d.filter}')"` : ''}>
            <div class="kpi-icon"><i class="fas ${d.icon}"></i></div>
            <div class="kpi-valor">${val}</div>
            <div class="kpi-label">${d.label}</div>
            <span class="kpi-tooltip" title="${d.help}"><i class="fas fa-info-circle"></i></span>
          </div>`;
        }).join('')}</div>

        <div class="chart-card mt-3">
          <h3><i class="fas fa-chart-line me-2"></i>Natalidad vs Partos</h3>
          <div id="chart-nat-partos" style="height:320px"></div>
        </div>
        <div class="chart-card mt-3">
          <h3><i class="fas fa-chart-bar me-2"></i>Ingresos vs Gastos</h3>
          <div id="chart-ingresos" style="height:320px"></div>
        </div>
      `;

      const { data: series } = await API.get(`/analitica/series-temporales${qp}`);
      const s = series.data || {};

      if (typeof Plotly !== 'undefined') {
        const nat = s.natalidad || {}; const par = s.partos || {};
        const ing = s.ingresos || {}; const gas = s.gastos || {};
        const keys1 = [...new Set([...Object.keys(nat), ...Object.keys(par)])].sort();
        const keys2 = [...new Set([...Object.keys(ing), ...Object.keys(gas)])].sort();

        const makeTrace = (x, y, name, color, fill) => ({
          x, y, name, type: 'scatter', mode: 'lines+markers+text',
          text: y.map(v => v > 0 ? v : ''),
          textposition: 'top center', textfont: { size: 10, color, family: 'system-ui' },
          marker: { size: 6, color, line: { width: 1, color: '#fff' } },
          line: { width: 2.5, color },
          hovertemplate: '<b>%{y}</b><extra>%{fullData.name}</extra>',
          ...(fill ? { fill: 'tozeroy', fillcolor: color.replace(')', ',0.1)').replace('rgb', 'rgba') } : {})
        });

        const layout = () => ({
          margin: { t: 10, r: 15, b: 50, l: 50 },
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'rgba(0,0,0,0.02)',
          xaxis: {
            tickangle: -45, tickfont: { size: 9, color: '#666' },
            gridcolor: 'rgba(0,0,0,0.06)', showgrid: true,
            zeroline: false
          },
          yaxis: {
            tickfont: { size: 9, color: '#666' },
            gridcolor: 'rgba(0,0,0,0.06)', showgrid: true,
            zeroline: true, zerolinecolor: 'rgba(0,0,0,0.15)', zerolinewidth: 1
          },
          showlegend: true,
          legend: { orientation: 'h', y: 1.12, x: 0, font: { size: 11 } },
          font: { family: 'system-ui, sans-serif' }
        });

        Plotly.newPlot('chart-nat-partos', [
          makeTrace(keys1, keys1.map(k => nat[k]||0), 'Natalidad', '#2E7D32'),
          makeTrace(keys1, keys1.map(k => par[k]||0), 'Partos', '#1565C0')
        ], layout(), { responsive: true, displaylogo: false });

        Plotly.newPlot('chart-ingresos', [
          makeTrace(keys2, keys2.map(k => ing[k]||0), 'Ingresos', '#2E7D32'),
          makeTrace(keys2, keys2.map(k => gas[k]||0), 'Gastos', '#C62828')
        ], layout(), { responsive: true, displaylogo: false });
      }
    } catch (e) {
      container.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
  },

  fmt(key, r) {
    switch (key) {
      case 'machos_hembras': return `${Formateador.numero(r.machos||0)} / ${Formateador.numero(r.hembras||0)}`;
      case 'total_animales': return Formateador.numero(r.total_animales||0);
      case 'nacidos_finca': case 'comprados': return Formateador.numero(r[key]||0);
      case 'tasa_natalidad': case 'tasa_prenez': case 'cobertura_vacunacion': return (r[key]||0) + '%';
      case 'prenadas': case 'lactando': return Formateador.numero(r[key]||0);
      case 'ganancia_neta': case 'costo_por_cabeza': return Formateador.moneda(r[key]||0);
      default: return '—';
    }
  },

  drillDown(filter) {
    const params = [];
    const rid = MicrositioEstadisticasPage.rebanoId();
    if (rid) params.push(`rebano_id=${rid}`);
    if (filter === 'Prenada' || filter === 'Lactando') params.push(`estado=${filter}`);
    if (filter === 'madre') params.push(`search=madre`); // animales con madre
    if (filter === 'externo') params.push(`search=externo`);
    if (filter === 'Vacunados') params.push(`search=vacunados`);
    window.location.hash = `#/animales${params.length ? '?' + params.join('&') : ''}`;
  }
};
