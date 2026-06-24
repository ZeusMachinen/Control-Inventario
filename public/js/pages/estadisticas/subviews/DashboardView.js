/**
 * DashboardView — KPIs principales con tooltips, drill-down y graficos Plotly con valores.
 */
const DashboardView = {
  kpiDefs: [
    { key: 'total_animales',   label: 'Total Animales',   icon: 'fa-cow',              help: 'Animales activos en el hato. Incluye nacidos en la finca y comprados.' },
    { key: 'machos_hembras',   label: 'Machos / Hembras', icon: 'fa-venus-mars',       help: 'Distribucion por sexo del total de animales activos.' },
    { key: 'nacidos_finca',    label: 'Nacidos en Finca', icon: 'fa-home',             help: 'Animales nacidos en la finca (tienen madre registrada). Excluye comprados.' },
    { key: 'comprados',        label: 'Comprados',        icon: 'fa-truck',            help: 'Animales adquiridos por compra. No tienen madre registrada en el sistema.' },
    { key: 'tasa_natalidad',   label: 'Tasa Natalidad',   icon: 'fa-baby',             help: 'Porcentaje de nacimientos sobre el total de animales en el ultimo ano.' },
    { key: 'tasa_prenez',      label: 'Tasa Prenez',      icon: 'fa-heart',            help: 'Diagnosticos de gestacion positivos sobre el total de diagnosticos del hato.' },
    { key: 'prenadas',         label: 'Prenadas',         icon: 'fa-calendar-check',   help: 'Hembras con estado reproductivo Prenada actualmente.' },
    { key: 'lactando',         label: 'Lactando',         icon: 'fa-droplet',          help: 'Hembras en periodo de lactancia activa.' },
    { key: 'ganancia_neta',    label: 'Ganancia Neta',    icon: 'fa-dollar-sign',      help: 'Ingresos por ventas menos gastos operativos en el periodo seleccionado.' },
    { key: 'costo_por_cabeza', label: 'Costo por Cabeza', icon: 'fa-coins',            help: 'Gasto operativo total dividido por la cantidad de animales activos.' },
    { key: 'cobertura_vacunacion', label: 'Vacunacion 3m', icon: 'fa-syringe',         help: 'Porcentaje de animales que recibieron al menos una vacuna en los ultimos 3 meses.' },
  ],

  async render(container) {
    try {
      const qp = MicrositioEstadisticasPage.queryParams();
      const { data: kpis } = await API.get(`/analitica/dashboard-kpis${qp}`);
      const r = kpis.data || {};

      container.innerHTML = `
        <div class="kpi-grid" id="kpi-grid">
          ${this.kpiDefs.map(def => `
            <div class="kpi-card kpi-clickable" data-kpi="${def.key}" onclick="DashboardView.drillDown('${def.key}')">
              <div class="kpi-icon"><i class="fas ${def.icon}"></i></div>
              <div class="kpi-valor">${this.formatearValor(def.key, r)}</div>
              <div class="kpi-label">${def.label}</div>
              <span class="kpi-tooltip" title="${def.help}"><i class="fas fa-info-circle"></i></span>
            </div>
          `).join('')}
        </div>
        <div class="chart-card mt-4">
          <h3><i class="fas fa-chart-line me-2"></i>Series Temporales</h3>
          <div id="chart-series" style="height:350px"></div>
        </div>
      `;

      // Cargar series temporales
      const { data: series } = await API.get(`/analitica/series-temporales${qp}`);
      const s = series.data || {};

      if (typeof Plotly !== 'undefined') {
        const natalidad = s.natalidad || {};
        const partos = s.partos || {};
        const ingresos = s.ingresos || {};
        const gastos = s.gastos || {};
        const allKeys = [...new Set([...Object.keys(natalidad), ...Object.keys(partos)])].sort();

        const trace1 = {
          x: allKeys, y: allKeys.map(k => natalidad[k] || 0),
          name: 'Natalidad', type: 'scatter', mode: 'lines+markers',
          hovertemplate: '%{x}<br>Natalidad: <b>%{y}</b><extra></extra>'
        };
        const trace2 = {
          x: allKeys, y: allKeys.map(k => partos[k] || 0),
          name: 'Partos', type: 'scatter', mode: 'lines+markers',
          hovertemplate: '%{x}<br>Partos: <b>%{y}</b><extra></extra>'
        };

        const layout = {
          margin: { t: 10, r: 20, b: 50, l: 50 },
          legend: { orientation: 'h', y: 1.1 },
          paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
          hovermode: 'x unified',
          xaxis: { tickangle: -45 }
        };
        const config = { responsive: true, displaylogo: false, modeBarButtonsToRemove: ['lasso2d','select2d'] };

        Plotly.newPlot('chart-series', [trace1, trace2], layout, config);
      }
    } catch (e) {
      container.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
  },

  formatearValor(key, r) {
    switch (key) {
      case 'machos_hembras': return `${Formateador.numero(r.machos||0)} / ${Formateador.numero(r.hembras||0)}`;
      case 'total_animales': return Formateador.numero(r.total_animales||0);
      case 'nacidos_finca':  return Formateador.numero(r.nacidos_finca||0);
      case 'comprados':      return Formateador.numero(r.comprados||0);
      case 'tasa_natalidad': return (r.tasa_natalidad||0) + '%';
      case 'tasa_prenez':    return (r.tasa_prenez||0) + '%';
      case 'prenadas':       return Formateador.numero(r.prenadas||0);
      case 'lactando':       return Formateador.numero(r.lactando||0);
      case 'ganancia_neta':  return Formateador.moneda(r.ganancia_neta||0);
      case 'costo_por_cabeza': return Formateador.moneda(r.costo_por_cabeza||0);
      case 'cobertura_vacunacion': return (r.cobertura_vacunacion||0) + '%';
      default: return '—';
    }
  },

  drillDown(kpi) {
    const params = new URLSearchParams();
    const rid = MicrositioEstadisticasPage.rebanoId();
    if (rid) params.set('rebano_id', rid);

    switch (kpi) {
      case 'prenadas':
        params.set('estado_reproductivo', 'Prenada');
        break;
      case 'lactando':
        params.set('estado_reproductivo', 'Lactando');
        break;
      case 'machos_hembras':
        // Alterna entre machos y hembras al hacer doble click — por ahora va a todos
        break;
      case 'nacidos_finca':
        params.set('origen', 'nacimiento');
        break;
      case 'comprados':
        params.set('origen', 'compra');
        break;
      case 'cobertura_vacunacion':
        params.set('vacunados', '1');
        break;
      default:
        // Sin filtro especifico, va a lista general
        break;
    }

    const qs = params.toString();
    window.location.hash = `#/animales${qs ? '?' + qs : ''}`;
  }
};
