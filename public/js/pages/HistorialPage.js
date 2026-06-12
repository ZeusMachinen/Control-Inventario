const HistorialPage = {
  paginaActual: 1,
  filtroEstado: '',
  filtroBusqueda: '',
  modoFiltro: 'todo',
  mesActual: new Date().toISOString().substring(0, 7),
  anioActual: new Date().getFullYear().toString(),

  generarOpcionesAnio() {
    const anio = new Date().getFullYear();
    let opts = '';
    for (let a = anio; a >= anio - 10; a--) {
      opts += `<option value="${a}" ${a === parseInt(this.anioActual) ? 'selected' : ''}>${a}</option>`;
    }
    return opts;
  },

  async render() {
    return MainLayout.render(`
      <div class="page-header">
        <h1 class="page-title"><i class="fas fa-clock-rotate me-2"></i>Historial de Animales</h1>
        <button class="btn btn-outline-secondary" onclick="Router.navegar('/animales')"><i class="fas fa-arrow-left me-1"></i>Volver a Activos</button>
      </div>

      <div class="stats-grid mb-3" id="historial-stats">
        <div class="stat-card" style="border-left-color:var(--azul);cursor:pointer" onclick="HistorialPage.filtrarEstado('')" id="stat-todos">
          <div class="stat-card-icon" style="background:var(--azul-claro);color:var(--azul)"><i class="fas fa-list"></i></div>
          <div class="stat-card-info">
            <h3 id="kpi-total">···</h3>
            <p>Todos</p>
          </div>
        </div>
        <div class="stat-card" style="border-left-color:var(--verde-principal);cursor:pointer" onclick="HistorialPage.filtrarEstado('Vendido')" id="stat-vendidos">
          <div class="stat-card-icon" style="background:var(--verde-bg);color:var(--verde-principal)"><i class="fas fa-sack-dollar"></i></div>
          <div class="stat-card-info">
            <h3 id="kpi-vendidos">···</h3>
            <p>Vendidos</p>
          </div>
        </div>
        <div class="stat-card" style="border-left-color:var(--rojo);cursor:pointer" onclick="HistorialPage.filtrarEstado('Muerto')" id="stat-muertos">
          <div class="stat-card-icon" style="background:var(--rojo-claro);color:var(--rojo)"><i class="fas fa-skull"></i></div>
          <div class="stat-card-info">
            <h3 id="kpi-muertos">···</h3>
            <p>Muertos</p>
          </div>
        </div>
      </div>

      <div class="filter-panel">
        <div class="form-group" style="flex:1;min-width:200px">
          <label class="form-label">Buscar nombre</label>
          <input type="text" class="form-control form-control-sm" id="historial-search" placeholder="Nombre..." oninput="HistorialPage.aplicarFiltros()">
        </div>
        <div class="mb-0">
          <label class="form-label">Período</label>
          <select class="form-select form-select-sm" id="historial-filtro-modo" onchange="HistorialPage.cambiarModo()" style="min-width:160px">
            <option value="todo">Todo</option>
            <option value="mes">Mes</option>
            <option value="anio">Año</option>
            <option value="rango">Rango personalizado</option>
          </select>
        </div>
        <div class="mb-0" id="historial-filtro-mes-group" style="display:none">
          <label class="form-label">Mes</label>
          <input type="month" class="form-control form-control-sm" id="historial-filtro-mes" value="${this.mesActual}" onchange="HistorialPage.aplicarFiltros()">
        </div>
        <div class="mb-0" id="historial-filtro-anio-group" style="display:none">
          <label class="form-label">Año</label>
          <select class="form-select form-select-sm" id="historial-filtro-anio" onchange="HistorialPage.aplicarFiltros()">
            ${this.generarOpcionesAnio()}
          </select>
        </div>
        <div class="mb-0" id="historial-filtro-desde-group" style="display:none">
          <label class="form-label">Desde</label>
          <input type="date" class="form-control form-control-sm" id="historial-filtro-desde" onchange="HistorialPage.aplicarFiltros()">
        </div>
        <div class="mb-0" id="historial-filtro-hasta-group" style="display:none">
          <label class="form-label">Hasta</label>
          <input type="date" class="form-control form-control-sm" id="historial-filtro-hasta" onchange="HistorialPage.aplicarFiltros()">
        </div>
      </div>

      <div class="card">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th class="th-sortable">Nombre</th>
                <th class="th-sortable">Estado</th>
                <th class="th-sortable">Fecha Salida</th>
                <th class="th-sortable">Motivo</th>
                <th class="th-sortable">Peso Salida</th>
                <th class="th-sortable">Precio/kg</th>
                <th class="th-sortable">Rebaño</th>
                <th style="width:80px">Acciones</th>
              </tr>
            </thead>
            <tbody id="historial-tbody">
              <tr><td colspan="8" class="text-center py-4 text-secondary"><div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>Cargando...</td></tr>
            </tbody>
          </table>
        </div>
        <div id="historial-pagination" class="pagination-custom d-flex justify-content-center gap-1 py-3"></div>
      </div>
    `);
  },

  afterRender() {
    this.paginaActual = 1;
    this.filtroEstado = '';
    this.filtroBusqueda = '';
    this.modoFiltro = 'todo';
    this.cargar();
  },

  filtrarEstado(estado) {
    this.filtroEstado = estado;
    this.paginaActual = 1;
    // Highlight activo
    document.querySelectorAll('#historial-stats .stat-card').forEach(el => el.style.opacity = '0.6');
    const id = estado === '' ? 'stat-todos' : estado === 'Vendido' ? 'stat-vendidos' : 'stat-muertos';
    document.getElementById(id).style.opacity = '1';
    this.aplicarFiltros();
  },

  async aplicarFiltros() {
    this.paginaActual = 1;
    this.cargar();
  },

  cambiarModo() {
    this.modoFiltro = document.getElementById('historial-filtro-modo').value;
    const esMes = this.modoFiltro === 'mes';
    const esAnio = this.modoFiltro === 'anio';
    const esRango = this.modoFiltro === 'rango';
    document.getElementById('historial-filtro-mes-group').style.display = esMes ? '' : 'none';
    document.getElementById('historial-filtro-anio-group').style.display = esAnio ? '' : 'none';
    document.getElementById('historial-filtro-desde-group').style.display = esRango ? '' : 'none';
    document.getElementById('historial-filtro-hasta-group').style.display = esRango ? '' : 'none';
    this.aplicarFiltros();
  },

  obtenerParams() {
    const params = { pagina: this.paginaActual };

    // Búsqueda
    const busqueda = document.getElementById('historial-search')?.value?.trim();
    if (busqueda) params.search = busqueda;

    // Estado
    if (this.filtroEstado) params.estado = this.filtroEstado;

    // Período
    if (this.modoFiltro === 'mes') {
      const mes = document.getElementById('historial-filtro-mes')?.value;
      if (mes) {
        params.fecha_desde = mes + '-01';
        const [y, m] = mes.split('-');
        const ultimoDia = new Date(parseInt(y), parseInt(m), 0).getDate();
        params.fecha_hasta = mes + '-' + String(ultimoDia).padStart(2, '0');
      }
    } else if (this.modoFiltro === 'anio') {
      const anio = document.getElementById('historial-filtro-anio')?.value;
      if (anio) {
        params.fecha_desde = anio + '-01-01';
        params.fecha_hasta = anio + '-12-31';
      }
    } else if (this.modoFiltro === 'rango') {
      const desde = document.getElementById('historial-filtro-desde')?.value;
      const hasta = document.getElementById('historial-filtro-hasta')?.value;
      if (desde) params.fecha_desde = desde;
      if (hasta) params.fecha_hasta = hasta;
    }

    return params;
  },

  async cargar() {
    const tbody = document.getElementById('historial-tbody');
    try {
      const params = this.obtenerParams();
      const { data } = await API.get('/animales/historial', params);
      const animales = data.data || [];
      const total = data.total || 0;
      const counters = data.counters || {};

      // Actualizar contadores
      document.getElementById('kpi-total').textContent = counters.total ?? '···';
      document.getElementById('kpi-vendidos').textContent = counters.vendidos ?? '···';
      document.getElementById('kpi-muertos').textContent = counters.muertos ?? '···';

      // Highlight del filtro activo
      document.querySelectorAll('#historial-stats .stat-card').forEach(el => el.style.opacity = '0.6');
      const id = this.filtroEstado === '' ? 'stat-todos' : this.filtroEstado === 'Vendido' ? 'stat-vendidos' : 'stat-muertos';
      const activeEl = document.getElementById(id);
      if (activeEl) activeEl.style.opacity = '1';

      if (animales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-secondary">No hay animales en el historial</td></tr>';
        return;
      }

      const badgeColor = { Vendido: 'bg-primary', Muerto: 'bg-danger' };
      tbody.innerHTML = animales.map(a => `
        <tr>
          <td><a href="#/animales/${a.id}" class="animal-link fw-medium">${a.nombre}</a></td>
          <td><span class="badge ${badgeColor[a.estado_general] || 'bg-secondary'}">${a.estado_general}</span></td>
          <td>${a.fecha_salida ? new Date(a.fecha_salida + 'T00:00:00').toLocaleDateString('es-CO') : '—'}</td>
          <td>${a.motivo_salida || '—'}</td>
          <td>${a.peso_salida ? a.peso_salida + ' kg' : '—'}</td>
          <td>${a.precio_kg ? '$' + Number(a.precio_kg).toLocaleString('es-CO', { minimumFractionDigits: 2 }) : '—'}</td>
          <td>${a.rebano_nombre || '—'}</td>
          <td>
            <button class="btn btn-outline-secondary btn-sm" onclick="Router.navegar('/animales/${a.id}')" title="Ver"><i class="fas fa-eye"></i></button>
          </td>
        </tr>
      `).join('');

      const totalPaginas = Math.ceil(total / (data.por_pagina || 20));
      const el = document.getElementById('historial-pagination');
      if (totalPaginas <= 1) { el.innerHTML = ''; return; }
      let html = '';
      html += `<button class="btn btn-sm btn-outline-secondary" ${this.paginaActual <= 1 ? 'disabled' : ''} onclick="HistorialPage.irPagina(${this.paginaActual - 1})">&lsaquo;</button>`;
      for (let i = 1; i <= totalPaginas; i++) {
        html += `<button class="btn btn-sm ${i === this.paginaActual ? 'btn-primary' : 'btn-outline-secondary'}" onclick="HistorialPage.irPagina(${i})">${i}</button>`;
      }
      html += `<button class="btn btn-sm btn-outline-secondary" ${this.paginaActual >= totalPaginas ? 'disabled' : ''} onclick="HistorialPage.irPagina(${this.paginaActual + 1})">&rsaquo;</button>`;
      el.innerHTML = html;
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-danger py-3 text-center">Error: ${e.message}</td></tr>`;
    }
  },

  irPagina(pagina) {
    this.paginaActual = pagina;
    this.cargar();
  },
};
