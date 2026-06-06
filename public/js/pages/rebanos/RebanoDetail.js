/**
 * Página: Detalle de Rebaño — KPIs, animales, filtro de período
 */
const RebanoDetailPage = {
  id: null,
  costoPorCabeza: 0,
  modoFiltro: 'todo',
  mesActual: new Date().toISOString().substring(0, 7),
  anioActual: new Date().getFullYear().toString(),
  desdeActual: '',
  hastaActual: '',

  generarOpcionesAnio() {
    const anio = new Date().getFullYear();
    let opts = '';
    for (let a = anio; a >= anio - 10; a--) {
      opts += `<option value="${a}" ${a === parseInt(this.anioActual) ? 'selected' : ''}>${a}</option>`;
    }
    return opts;
  },

  async render(params) {
    this.id = params.id;
    try {
      const { data: res } = await API.get(`/rebanos/${params.id}`);
      const r = res.data || {};
      this.costoPorCabeza = parseFloat(r.costo_cabeza) || 0;

      const fechaInicio = r.fecha_inicio
        ? new Date(r.fecha_inicio + 'T00:00:00').toLocaleDateString('es-CO')
        : '—';

      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title">${r.nombre}</h1>
          <button class="btn btn-secondary" onclick="Router.navegar('/rebanos')">← Volver</button>
        </div>

        <div style="display:flex;gap:1rem;margin-bottom:var(--spacing-lg);flex-wrap:wrap;align-items:center">
          <span style="font-size:0.9rem;color:var(--texto-secundario)">📅 Inicio: ${fechaInicio}</span>
          <span class="badge ${r.activo ? 'badge-verde' : 'badge-rojo'}">${r.activo ? 'Activo' : 'Inactivo'}</span>
          ${this.costoPorCabeza ? `<span style="font-size:0.9rem;color:var(--texto-secundario)">💰 Costo/cabeza: $${this.costoPorCabeza.toFixed(2)}</span>` : ''}
        </div>

        <!-- ─── Filtro de período ─────────────────────── -->
        <div class="filter-panel">
          <div class="form-group">
            <label class="form-label">Período</label>
            <select class="form-select" id="detail-filtro-modo" onchange="RebanoDetailPage.cambiarModo()">
              <option value="todo">Todo</option>
              <option value="mes">Mes</option>
              <option value="anio">Año</option>
              <option value="rango">Rango personalizado</option>
            </select>
          </div>
          <div class="form-group" id="detail-filtro-mes-group" style="display:none">
            <label class="form-label">Mes</label>
            <input type="month" class="form-input" id="detail-filtro-mes" value="${this.mesActual}" onchange="RebanoDetailPage.cargarEstadisticas()">
          </div>
          <div class="form-group" id="detail-filtro-anio-group" style="display:none">
            <label class="form-label">Año</label>
            <select class="form-select" id="detail-filtro-anio" onchange="RebanoDetailPage.cargarEstadisticas()">
              ${this.generarOpcionesAnio()}
            </select>
          </div>
          <div class="form-group" id="detail-filtro-desde-group" style="display:none">
            <label class="form-label">Desde</label>
            <input type="date" class="form-input" id="detail-filtro-desde" onchange="RebanoDetailPage.cargarEstadisticas()">
          </div>
          <div class="form-group" id="detail-filtro-hasta-group" style="display:none">
            <label class="form-label">Hasta</label>
            <input type="date" class="form-input" id="detail-filtro-hasta" onchange="RebanoDetailPage.cargarEstadisticas()">
          </div>
        </div>

        <!-- ─── KPIs + accesos directos ───────────────── -->
        <div class="stats-grid">
          <div class="stat-card" style="border-left-color:var(--azul)">
            <div class="stat-card-icon" style="background:var(--azul-claro);color:var(--azul)">🐮</div>
            <div class="stat-card-info">
              <h3 id="kpi-activos">···</h3>
              <p>Animales Activos</p>
            </div>
          </div>
          <div class="stat-card" style="border-left-color:var(--verde-principal)">
            <div class="stat-card-icon" style="background:var(--verde-bg);color:var(--verde-principal)">🐣</div>
            <div class="stat-card-info">
              <h3 id="kpi-nacidos">···</h3>
              <p>Nacidos</p>
            </div>
          </div>
          <div class="stat-card" style="border-left-color:var(--rojo)">
            <div class="stat-card-icon" style="background:var(--rojo-claro);color:var(--rojo)">💀</div>
            <div class="stat-card-info">
              <h3 id="kpi-muertes">···</h3>
              <p>Muertes</p>
            </div>
          </div>
          <div class="stat-card" style="border-left-color:var(--naranja)">
            <div class="stat-card-icon" style="background:var(--naranja-claro);color:var(--naranja)">💰</div>
            <div class="stat-card-info">
              <h3 id="kpi-vendidos">···</h3>
              <p>Vendidos</p>
            </div>
          </div>
          <div class="stat-card" style="border-left-color:#2E7D32;cursor:pointer" onclick="Router.navegar('/rebanos/${r.id}/movimientos')">
            <div class="stat-card-icon" style="background:#E8F5E9;color:#2E7D32">📋</div>
            <div class="stat-card-info">
              <h3 style="font-size:var(--font-size-base);font-weight:600">Movimientos</h3>
              <p>Ver historial →</p>
            </div>
          </div>
          <div class="stat-card" style="border-left-color:#1565C0;cursor:pointer" onclick="Router.navegar('/rebanos/${r.id}/costos')">
            <div class="stat-card-icon" style="background:#E3F2FD;color:#1565C0">💰</div>
            <div class="stat-card-info">
              <h3 style="font-size:var(--font-size-base);font-weight:600">Costos</h3>
              <p>Ver mensuales →</p>
            </div>
          </div>
          <div class="stat-card" style="border-left-color:#6A1B9A">
            <div class="stat-card-icon" style="background:#F3E5F5;color:#6A1B9A">💵</div>
            <div class="stat-card-info">
              <h3 id="kpi-valor">···</h3>
              <p>Valor del Rebaño</p>
            </div>
          </div>
        </div>

        <!-- ─── Animales del rebaño ────────────────────── -->
        <div class="card" style="margin-bottom:var(--spacing-xl)">
          <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
            <strong>🐮 Animales de este Rebaño</strong>
            <button class="btn btn-sm btn-primary" onclick="Router.navegar('/animales?rebano_id=${r.id}')">Ver todos</button>
          </div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Sexo</th>
                  <th>Edad</th>
                  <th>Etapa</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="detail-animales-tbody">
                <tr><td colspan="6" class="loading"><div class="spinner"></div>Cargando...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ─── Estadísticas detalladas ────────────────── -->
        <div class="card">
          <div class="card-header"><strong>📊 Estadísticas Detalladas</strong></div>
          <div class="card-body">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;max-width:400px">
              <div><strong>Kg Producidos:</strong></div>
              <div id="detail-kilos">···</div>
              <div><strong>Ingresos Generados:</strong></div>
              <div id="detail-ingresos">···</div>
            </div>
          </div>
        </div>
      `);
    } catch (error) {
      return MainLayout.render(`<div class="alert alert-danger">Error: ${error.message}</div>`);
    }
  },

  afterRender() {
    this.cargarAnimales();
    this.cargarEstadisticas();
  },

  // ─── Filtro de período ──────────────────────────────

  cambiarModo() {
    this.modoFiltro = document.getElementById('detail-filtro-modo').value;
    const esMes = this.modoFiltro === 'mes';
    const esAnio = this.modoFiltro === 'anio';
    const esRango = this.modoFiltro === 'rango';
    document.getElementById('detail-filtro-mes-group').style.display = esMes ? '' : 'none';
    document.getElementById('detail-filtro-anio-group').style.display = esAnio ? '' : 'none';
    document.getElementById('detail-filtro-desde-group').style.display = esRango ? '' : 'none';
    document.getElementById('detail-filtro-hasta-group').style.display = esRango ? '' : 'none';
    this.cargarEstadisticas();
  },

  obtenerParamsFiltro() {
    if (this.modoFiltro === 'todo') return {};

    const params = {};

    if (this.modoFiltro === 'mes') {
      const mes = document.getElementById('detail-filtro-mes')?.value;
      if (mes) {
        params.fecha_desde = mes + '-01';
        const [y, m] = mes.split('-');
        const ultimoDia = new Date(parseInt(y), parseInt(m), 0).getDate();
        params.fecha_hasta = mes + '-' + String(ultimoDia).padStart(2, '0');
      }
    } else if (this.modoFiltro === 'anio') {
      const anio = document.getElementById('detail-filtro-anio')?.value;
      if (anio) {
        params.fecha_desde = anio + '-01-01';
        params.fecha_hasta = anio + '-12-31';
      }
    } else if (this.modoFiltro === 'rango') {
      const desde = document.getElementById('detail-filtro-desde')?.value;
      const hasta = document.getElementById('detail-filtro-hasta')?.value;
      if (desde) params.fecha_desde = desde;
      if (hasta) params.fecha_hasta = hasta;
    }

    return params;
  },

  // ─── KPIs ────────────────────────────────────────────

  async cargarEstadisticas() {
    const params = this.obtenerParamsFiltro();

    try {
      const { data: res } = await API.get(`/rebanos/${this.id}/estadisticas`, params);
      const k = res.data || {};

      document.getElementById('kpi-activos').textContent = k.activos ?? 0;
      document.getElementById('kpi-nacidos').textContent = k.nacidos ?? 0;
      document.getElementById('kpi-muertes').textContent = k.muertes ?? 0;
      document.getElementById('kpi-vendidos').textContent = k.vendidos ?? 0;

      const valor = this.costoPorCabeza * (k.activos_pastaje ?? k.activos ?? 0);
      document.getElementById('kpi-valor').textContent =
        this.costoPorCabeza > 0 ? '$' + valor.toLocaleString('es-CO', { minimumFractionDigits: 2 }) : '—';

      document.getElementById('detail-kilos').textContent = `${parseFloat(k.kilos_producidos || 0).toFixed(1)} kg`;
      document.getElementById('detail-ingresos').textContent =
        `$${parseFloat(k.ingresos_generados || 0).toLocaleString('es-CO', { minimumFractionDigits: 2 })}`;
    } catch (e) {
      // Se queda en "···"
    }
  },

  // ─── Animales del rebaño ─────────────────────────────

  async cargarAnimales() {
    const tbody = document.getElementById('detail-animales-tbody');
    if (!tbody) return;

    try {
      const { data } = await API.get(`/rebanos/${this.id}/animales`);
      const animales = data.data || [];

      if (animales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No hay animales en este rebaño</td></tr>';
        return;
      }

      tbody.innerHTML = animales.map(a => `
        <tr>
          <td><a href="#/animales/${a.id}" class="animal-link"><strong>${a.nombre}</strong></a></td>
          <td><span class="badge ${a.sexo === 'Macho' ? 'badge-sexo-macho' : 'badge-sexo-hembra'}">${a.sexo}</span></td>
          <td>${DateUtil.edadTexto(a.fecha_nacimiento)}</td>
          <td><span class="badge badge-verde">${a.etapa}</span></td>
          <td>${a.estado_reproductivo ? `<span class="badge badge-${a.estado_reproductivo === 'Prenada' ? 'naranja' : 'azul'}">${a.estado_reproductivo}</span>` : '-'}</td>
          <td class="table-actions">
            <button class="btn btn-sm btn-secondary" onclick="Router.navegar('/animales/${a.id}')">Ver</button>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="6" class="alert alert-danger">Error al cargar animales</td></tr>`;
    }
  },
};
