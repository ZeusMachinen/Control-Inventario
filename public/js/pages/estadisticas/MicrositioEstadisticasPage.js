/**
 * MicrositioEstadisticasPage — Shell del micrositio de estadisticas.
 * Sistema de tabs con sub-vistas lazy-load y Plotly.js cargado bajo demanda.
 */
const MicrositioEstadisticasPage = {
  tabActual: 'dashboard',
  graficos: [],
  plotlyLoaded: false,

  tabs: [
    { id: 'dashboard',    label: 'Dashboard',       icon: 'fa-chart-line',  view: 'DashboardView' },
    { id: 'composicion',  label: 'Composicion',     icon: 'fa-layer-group', view: 'ComposicionDetallada' },
    { id: 'rankings',     label: 'Rankings',        icon: 'fa-trophy',      view: 'RankingsView' },
    { id: 'descarte',     label: 'Descarte',        icon: 'fa-exclamation-triangle', view: 'DescarteView' },
    { id: 'comparativa',  label: 'Comparativa',     icon: 'fa-balance-scale', view: 'ComparativaRebanos' },
    { id: 'proyecciones', label: 'Proyecciones',    icon: 'fa-chart-area',  view: 'ProyeccionesView' },
  ],

  async render() {
    return MainLayout.render(`
      <div class="micrositio-container">
        <div class="micrositio-header">
          <h1><i class="fas fa-chart-pie me-2"></i>Analitica del Hato</h1>
          <div class="micrositio-filtros">
            <select id="filtro-rebano" class="form-select form-select-sm" onchange="MicrositioEstadisticasPage.aplicarFiltros()">
              <option value="">Todos los rebanos</option>
            </select>
            <select id="filtro-periodo" class="form-select form-select-sm" onchange="MicrositioEstadisticasPage.cambiarPeriodo()" style="min-width:150px">
              <option value="todo">Todo</option>
              <option value="mes">Mes</option>
              <option value="anio">Año</option>
              <option value="rango">Rango personalizado</option>
            </select>
            <span id="filtro-periodo-extra"></span>
            <button class="btn btn-sm btn-outline-secondary ms-2" onclick="MicrositioEstadisticasPage.exportarPDF()" title="Exportar PDF"><i class="fas fa-file-pdf"></i></button>
            <button class="btn btn-sm btn-outline-secondary" onclick="MicrositioEstadisticasPage.exportarExcel()" title="Exportar Excel"><i class="fas fa-file-excel"></i></button>
          </div>
        </div>

        <nav class="micrositio-tabs">
          ${this.tabs.map(t => `
            <button class="micrositio-tab ${t.id === this.tabActual ? 'active' : ''}"
                    data-tab="${t.id}"
                    onclick="MicrositioEstadisticasPage.cambiarTab('${t.id}')">
              <i class="fas ${t.icon} me-2"></i>${t.label}
            </button>
          `).join('')}
        </nav>

        <div class="micrositio-content" id="micrositio-content">
          <div class="text-center py-5"><i class="fas fa-spinner fa-spin fa-2x"></i></div>
        </div>
      </div>
    `);
  },

  afterRender() {
    this.cargarRebanos();
    this.cambiarTab(this.tabActual);
  },

  async cargarRebanos() {
    try {
      const { data } = await API.get('/rebanos');
      const select = document.getElementById('filtro-rebano');
      if (!select || !data.data) return;
      data.data.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = r.nombre;
        select.appendChild(opt);
      });
    } catch (e) { /* silencioso */ }
  },

  async cambiarTab(tabId) {
    this.tabActual = tabId;
    this.destruirGraficos();

    // Actualizar tabs visuales
    document.querySelectorAll('.micrositio-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    const content = document.getElementById('micrositio-content');
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab || !content) return;

    content.innerHTML = '<div class="text-center py-5"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';

    try {
      // Cargar Plotly si se necesita (para tabs con graficos)
      if (['dashboard', 'proyecciones', 'composicion'].includes(tabId)) {
        await this.cargarPlotly();
      }

      switch (tabId) {
        case 'dashboard':    await DashboardView.render(content); break;
        case 'composicion':  await ComposicionDetallada.render(content); break;
        case 'rankings':     await RankingsView.render(content); break;
        case 'descarte':     await DescarteView.render(content); break;
        case 'comparativa':  await ComparativaRebanos.render(content); break;
        case 'proyecciones': await ProyeccionesView.render(content); break;
      }
    } catch (e) {
      content.innerHTML = `<div class="alert alert-danger">Error al cargar: ${e.message}</div>`;
    }
  },

  async cargarPlotly() {
    if (this.plotlyLoaded) return;
    if (typeof Plotly !== 'undefined') { this.plotlyLoaded = true; return; }
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.plot.ly/plotly-2.35.2.min.js';
      script.onload = () => { this.plotlyLoaded = true; resolve(); };
      script.onerror = () => { console.warn('Plotly no disponible'); resolve(); };
      document.head.appendChild(script);
    });
  },

  destruirGraficos() {
    this.graficos.forEach(g => { try { g.destroy?.(); } catch(e) {} });
    this.graficos = [];
  },

  rebanoId() {
    const select = document.getElementById('filtro-rebano');
    return select?.value || '';
  },

  modoPeriodo: 'todo',

  cambiarPeriodo() {
    const modo = document.getElementById('filtro-periodo')?.value || 'todo';
    this.modoPeriodo = modo;
    const extra = document.getElementById('filtro-periodo-extra');
    if (!extra) return;

    const hoy = new Date();
    const mesActual = hoy.toISOString().substring(0, 7);
    const anioActual = hoy.getFullYear();

    if (modo === 'mes') {
      extra.innerHTML = `<input type="month" id="filtro-mes" class="form-control form-control-sm" value="${mesActual}" onchange="MicrositioEstadisticasPage.aplicarFiltros()" style="width:150px">`;
    } else if (modo === 'anio') {
      let ops = '';
      for (let y = anioActual; y >= anioActual - 5; y--) {
        ops += `<option value="${y}" ${y === anioActual ? 'selected' : ''}>${y}</option>`;
      }
      extra.innerHTML = `<select id="filtro-anio" class="form-select form-select-sm" onchange="MicrositioEstadisticasPage.aplicarFiltros()" style="width:120px">${ops}</select>`;
    } else if (modo === 'rango') {
      extra.innerHTML = `<input type="date" id="filtro-desde" class="form-control form-control-sm" onchange="MicrositioEstadisticasPage.aplicarFiltros()" style="width:135px" placeholder="Desde">
        <input type="date" id="filtro-hasta" class="form-control form-control-sm" onchange="MicrositioEstadisticasPage.aplicarFiltros()" style="width:135px" placeholder="Hasta">`;
    } else {
      extra.innerHTML = '';
    }
    this.aplicarFiltros();
  },

  queryParams() {
    const params = new URLSearchParams();
    const rid = this.rebanoId(); if (rid) params.set('rebano_id', rid);

    const modo = this.modoPeriodo;
    if (modo === 'mes') {
      const mes = document.getElementById('filtro-mes')?.value;
      if (mes) {
        const [y, m] = mes.split('-');
        const ultimo = new Date(+y, +m, 0).getDate();
        params.set('fecha_desde', `${mes}-01`);
        params.set('fecha_hasta', `${mes}-${String(ultimo).padStart(2, '0')}`);
      }
    } else if (modo === 'anio') {
      const anio = document.getElementById('filtro-anio')?.value;
      if (anio) { params.set('fecha_desde', `${anio}-01-01`); params.set('fecha_hasta', `${anio}-12-31`); }
    } else if (modo === 'rango') {
      const fd = document.getElementById('filtro-desde')?.value;
      const fh = document.getElementById('filtro-hasta')?.value;
      if (fd) params.set('fecha_desde', fd);
      if (fh) params.set('fecha_hasta', fh);
    }
    return params.toString() ? '?' + params.toString() : '';
  },

  async aplicarFiltros() {
    await this.cambiarTab(this.tabActual);
  },

  async exportarPDF() {
    await this.cargarLibreria('jspdf', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Analitica del Hato', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 28);
    doc.text(`Vista: ${this.tabActual}`, 14, 34);
    // Capturar contenido visible como texto simple (limitado)
    const content = document.getElementById('micrositio-content');
    if (content) {
      const text = content.innerText.substring(0, 3000);
      doc.setFontSize(8);
      doc.text(text, 14, 42, { maxWidth: 180 });
    }
    doc.save(`analitica-${this.tabActual}.pdf`);
  },

  async exportarExcel() {
    await this.cargarLibreria('xlsx', 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
    const content = document.getElementById('micrositio-content');
    if (!content) return;
    const tables = content.querySelectorAll('table');
    const wb = XLSX.utils.book_new();
    tables.forEach((table, i) => {
      const ws = XLSX.utils.table_to_sheet(table);
      XLSX.utils.book_append_sheet(wb, ws, `Tabla_${i + 1}`);
    });
    XLSX.writeFile(wb, `analitica-${this.tabActual}.xlsx`);
  },

  async cargarLibreria(name, url) {
    if (window[name === 'jspdf' ? 'jspdf' : 'XLSX']) return;
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => resolve();
      script.onerror = () => { console.warn(`${name} no disponible`); resolve(); };
      document.head.appendChild(script);
    });
  },
};
