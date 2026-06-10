const RebanoListPage = {
  mostrarInactivos: false,
  filtroNombre: '',
  columnaOrden: null,
  direccionOrden: 'asc',
  datos: [],

  async render() {
    return MainLayout.render(`
      <div class="page-header">
        <h1 class="page-title"><i class="fas fa-people-group me-2"></i>Rebaños</h1>
        <button class="btn btn-primary" onclick="RebanoListPage.mostrarFormulario()">
          <i class="fas fa-plus"></i> Nuevo Rebaño
        </button>
      </div>

      <div class="stats-grid" id="rebanos-kpis">
        <div class="stat-card" style="border-left-color:var(--azul)">
          <div class="stat-card-icon" style="background:var(--azul-claro);color:var(--azul)"><i class="fas fa-horse"></i></div>
          <div class="stat-card-info">
            <h3 id="kpi-animales">0</h3>
            <p>Animales Activos</p>
          </div>
        </div>
        <div class="stat-card" style="border-left-color:var(--verde-principal)">
          <div class="stat-card-icon" style="background:var(--verde-bg);color:var(--verde-principal)"><i class="fas fa-seedling"></i></div>
          <div class="stat-card-info">
            <h3 id="kpi-nacidos">0</h3>
            <p>Nacidos Totales</p>
          </div>
        </div>
        <div class="stat-card" style="border-left-color:var(--rojo)">
          <div class="stat-card-icon" style="background:var(--rojo-claro);color:var(--rojo)"><i class="fas fa-skull"></i></div>
          <div class="stat-card-info">
            <h3 id="kpi-muertes">0</h3>
            <p>Muertes</p>
          </div>
        </div>
        <div class="stat-card" style="border-left-color:var(--naranja)">
          <div class="stat-card-icon" style="background:var(--naranja-claro);color:var(--naranja)"><i class="fas fa-box"></i></div>
          <div class="stat-card-info">
            <h3 id="kpi-rebanos">0</h3>
            <p>Rebaños Activos</p>
          </div>
        </div>
      </div>

      <div class="filter-panel">
        <div class="mb-0" style="min-width:150px">
          <label class="form-label">Buscar rebaño</label>
          <input type="text" class="form-control form-control-sm" id="filtro-nombre" placeholder="Nombre..." oninput="RebanoListPage.aplicarFiltros()">
        </div>
        <div class="d-flex align-items-end pb-1">
          <label class="d-flex align-items-center gap-1 small" style="cursor:pointer">
            <input type="checkbox" id="toggle-inactivos" onchange="RebanoListPage.toggleInactivos()">
            Mostrar inactivos
          </label>
        </div>
      </div>

      <div class="card" id="rebanos-contenedor">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th onclick="RebanoListPage.ordenarPor('nombre')" data-columna="nombre" class="th-sortable">Nombre</th>
                <th onclick="RebanoListPage.ordenarPor('fecha_inicio')" data-columna="fecha_inicio" class="th-sortable">Inicio</th>
                <th onclick="RebanoListPage.ordenarPor('animales')" data-columna="animales" class="th-sortable">Animales</th>
                <th onclick="RebanoListPage.ordenarPor('costo_cabeza')" data-columna="costo_cabeza" class="th-sortable">Costo/Cabeza</th>
                <th onclick="RebanoListPage.ordenarPor('coste_mensual')" data-columna="coste_mensual" class="th-sortable">Coste Mensual</th>
                <th style="width:140px">Acciones</th>
              </tr>
            </thead>
            <tbody id="rebanos-tbody">
              <tr><td colspan="6" class="text-center py-5 text-secondary"><div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div id="rebano-modal"></div>
    `);
  },

  afterRender() {
    this.cargarKpis();
    this.cargar();
  },

  async cargarKpis() {
    try {
      const { data } = await API.get('/rebanos/kpis');
      const k = data.data || {};
      document.getElementById('kpi-animales').textContent = k.total_animales ?? 0;
      document.getElementById('kpi-nacidos').textContent = k.total_nacidos ?? 0;
      document.getElementById('kpi-muertes').textContent = k.total_muertes ?? 0;
      document.getElementById('kpi-rebanos').textContent = k.rebanos_activos ?? 0;
    } catch (e) {
      // los KPIs se quedan en 0 si falla la carga
    }
  },

  toggleInactivos() {
    this.mostrarInactivos = document.getElementById('toggle-inactivos').checked;
    this.cargar();
  },

  obtenerValor(columna, item) {
    const map = {
      nombre: item.nombre,
      fecha_inicio: item.fecha_inicio,
      animales: parseInt(item.total_animales) || 0,
      costo_cabeza: parseFloat(item.costo_cabeza) || 0,
      coste_mensual: (parseFloat(item.costo_cabeza) || 0) * (parseInt(item.total_animales_pastaje) || item.total_animales || 0),
    };
    return map[columna];
  },

  ordenarPor(columna) {
    if (this.columnaOrden === columna) {
      this.direccionOrden = SortUtil.toggleDir(this.direccionOrden);
    } else {
      this.columnaOrden = columna;
      this.direccionOrden = 'asc';
    }
    SortUtil.actualizarEncabezados('rebanos-tbody', this.columnaOrden, this.direccionOrden);
    this.renderTabla();
  },

  aplicarFiltros() {
    this.filtroNombre = (document.getElementById('filtro-nombre')?.value || '').toLowerCase().trim();
    this.cargar();
  },

  async cargar() {
    try {
      const params = {};
      if (this.mostrarInactivos) params.inactivos = 1;
      const { data } = await API.get('/rebanos', params);
      this.datos = Array.isArray(data) ? data : (data.data || []);

      if (this.filtroNombre) {
        this.datos = this.datos.filter(r => r.nombre.toLowerCase().includes(this.filtroNombre));
      }

      this.renderTabla();
    } catch (e) {
      document.getElementById('rebanos-tbody').innerHTML = `<tr><td colspan="6" class="text-danger py-3 text-center">Error: ${e.message}</td></tr>`;
    }
  },

  renderTabla() {
    const tbody = document.getElementById('rebanos-tbody');
    const rebanos = [...this.datos];

    if (this.columnaOrden) {
      rebanos.sort((a, b) => SortUtil.comparar(
        this.obtenerValor(this.columnaOrden, a),
        this.obtenerValor(this.columnaOrden, b),
        this.direccionOrden
      ));
    }

    if (rebanos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5 text-secondary">No hay rebaños creados</td></tr>';
      return;
    }

    tbody.innerHTML = rebanos.map(r => {
      const costo = parseFloat(r.costo_cabeza) || 0;
      const cabezasPastaje = parseInt(r.total_animales_pastaje) || r.total_animales || 0;
      const total = (costo * cabezasPastaje).toFixed(2);
      const fechaInicio = r.fecha_inicio ? new Date(r.fecha_inicio + 'T00:00:00').toLocaleDateString('es-CO') : '—';
      return `
        <tr class="${!r.activo ? 'opacity-50' : ''}">
          <td><a href="#/rebanos/${r.id}" class="animal-link fw-medium">${r.nombre}</a>${!r.activo ? ' <span class="badge bg-danger">Inactivo</span>' : ''}</td>
          <td><span class="small text-secondary">${fechaInicio}</span></td>
          <td><span class="badge bg-primary">${r.total_animales} animales</span></td>
          <td>${costo ? '$' + costo.toFixed(2) : '—'}</td>
          <td>${costo ? '$' + total : '—'}</td>
          <td>
            <div class="d-flex gap-1">
              <button class="btn btn-outline-secondary btn-sm" onclick="Router.navegar('/rebanos/${r.id}')" title="Ver">
                <i class="fas fa-eye"></i>
              </button>
              ${r.activo ? `
                <button class="btn btn-outline-primary btn-sm" onclick="RebanoListPage.editar(${r.id}, '${r.nombre}', ${r.costo_cabeza || ''}, '${r.fecha_inicio || ''}', ${r.dia_corte || ''})" title="Editar">
                  <i class="fas fa-pen"></i>
                </button>
                <button class="btn btn-outline-danger btn-sm" onclick="RebanoListPage.eliminar(${r.id}, '${r.nombre}', ${r.total_animales || 0})" title="Inactivar">
                  <i class="fas fa-ban"></i>
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
    SortUtil.actualizarEncabezados('rebanos-tbody', this.columnaOrden, this.direccionOrden);
  },

  async verEstadisticas(id, nombre) {
    try {
      const { data } = await API.get(`/rebanos/${id}/estadisticas`);
      const e = data.data || data;
      document.getElementById('rebano-modal').innerHTML = `
        <div class="modal fade d-block" tabindex="-1" style="background:rgba(0,0,0,0.5)" onclick="if(event.target===this)RebanoListPage.cerrarModal()">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title"><i class="fas fa-chart-bar me-2"></i>Estadísticas: ${nombre}</h5>
                <button class="btn-close" onclick="RebanoListPage.cerrarModal()"></button>
              </div>
              <div class="modal-body">
                <div class="row g-2">
                  <div class="col-6"><div class="card text-center p-3"><div class="small text-secondary">Nacidos</div><div class="fs-4 fw-bold">${e.nacidos || 0}</div></div></div>
                  <div class="col-6"><div class="card text-center p-3"><div class="small text-secondary">Activos</div><div class="fs-4 fw-bold">${e.activos || 0}</div></div></div>
                  <div class="col-6"><div class="card text-center p-3"><div class="small text-secondary">Muertes</div><div class="fs-4 fw-bold text-danger">${e.muertes || 0}</div></div></div>
                  <div class="col-6"><div class="card text-center p-3"><div class="small text-secondary">Vendidos</div><div class="fs-4 fw-bold text-primary">${e.vendidos || 0}</div></div></div>
                  <div class="col-6"><div class="card text-center p-3"><div class="small text-secondary">Kg Producidos</div><div class="fs-5 fw-bold">${parseFloat(e.kilos_producidos || 0).toFixed(1)} kg</div></div></div>
                  <div class="col-6"><div class="card text-center p-3"><div class="small text-secondary">Ingresos Generados</div><div class="fs-5 fw-bold">$${parseFloat(e.ingresos_generados || 0).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</div></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      Toast.error('Error al cargar estadísticas');
    }
  },

  mostrarFormulario() {
    document.getElementById('rebano-modal').innerHTML = `
      <div class="modal fade d-block" tabindex="-1" style="background:rgba(0,0,0,0.5)" onclick="if(event.target===this)RebanoListPage.cerrarModal()">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title"><i class="fas fa-plus me-2"></i>Nuevo Rebaño</h5>
              <button class="btn-close" onclick="RebanoListPage.cerrarModal()"></button>
            </div>
            <div class="modal-body">
              <form id="rebano-form" onsubmit="RebanoListPage.guardar(event)">
                <div class="mb-3">
                  <label class="form-label">Nombre del Rebaño *</label>
                  <input type="text" class="form-control" id="rebano-nombre" placeholder="Ej: Rebaño Norte" required>
                </div>
                <div class="mb-3">
                  <label class="form-label">Fecha de inicio</label>
                  <input type="date" class="form-control" id="rebano-fecha-inicio" value="${new Date().toISOString().substring(0, 10)}">
                </div>
                <div class="mb-3">
                  <label class="form-label">Costo por Cabeza ($)</label>
                  <input type="number" step="0.01" min="0" class="form-control" id="rebano-costo" placeholder="Ej: 1500.00">
                </div>
                <div class="mb-3">
                  <label class="form-label">Día de corte (pastaje)</label>
                  <input type="number" min="1" max="28" class="form-control" id="rebano-dia-corte" placeholder="Ej: 15" style="max-width:100px">
                  <small class="text-secondary d-block mt-1">Día del mes en que te cobran el pastaje. Al guardar, se genera automáticamente el gasto en Gastos.</small>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" onclick="RebanoListPage.cerrarModal()">Cancelar</button>
              <button type="submit" class="btn btn-primary" form="rebano-form">Crear</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async guardar(e) {
    e.preventDefault();
    const nombre = document.getElementById('rebano-nombre').value;
    const costo = document.getElementById('rebano-costo').value;
    const fechaInicio = document.getElementById('rebano-fecha-inicio').value;
    const diaCorte = document.getElementById('rebano-dia-corte').value;
    try {
      await API.post('/rebanos', { nombre, costo_cabeza: costo || null, fecha_inicio: fechaInicio || null, dia_corte: diaCorte || null });
      this.cerrarModal();
      this.cargarKpis();
      this.cargar();
    } catch (err) {
      Toast.error(err.response?.data?.error || 'Error al guardar');
    }
  },

  async editar(id, nombreActual, costoActual, fechaInicioActual, diaCorteActual) {
    if (diaCorteActual === undefined) {
      const r = this.datos.find(d => d.id === id);
      diaCorteActual = r ? r.dia_corte : '';
    }
    document.getElementById('rebano-modal').innerHTML = `
      <div class="modal fade d-block" tabindex="-1" style="background:rgba(0,0,0,0.5)" onclick="if(event.target===this)RebanoListPage.cerrarModal()">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title"><i class="fas fa-pen me-2"></i>Editar Rebaño</h5>
              <button class="btn-close" onclick="RebanoListPage.cerrarModal()"></button>
            </div>
            <div class="modal-body">
              <form id="rebano-form" onsubmit="RebanoListPage.actualizar(event, ${id})">
                <div class="mb-3">
                  <label class="form-label">Nombre del Rebaño *</label>
                  <input type="text" class="form-control" id="rebano-nombre" value="${nombreActual}" required>
                </div>
                <div class="mb-3">
                  <label class="form-label">Fecha de inicio</label>
                  <input type="date" class="form-control" id="rebano-fecha-inicio" value="${fechaInicioActual || ''}">
                </div>
                <div class="mb-3">
                  <label class="form-label">Costo por Cabeza ($)</label>
                  <input type="number" step="0.01" min="0" class="form-control" id="rebano-costo" value="${costoActual || ''}" placeholder="Ej: 1500.00">
                </div>
                <div class="mb-3">
                  <label class="form-label">Día de corte (pastaje)</label>
                  <input type="number" min="1" max="28" class="form-control" id="rebano-dia-corte" value="${diaCorteActual || ''}" placeholder="Ej: 15" style="max-width:100px">
                  <small class="text-secondary d-block mt-1">Día del mes en que te cobran el pastaje. Al guardar, se actualiza el gasto en Gastos.</small>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" onclick="RebanoListPage.cerrarModal()">Cancelar</button>
              <button type="submit" class="btn btn-primary" form="rebano-form">Guardar</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async actualizar(e, id) {
    e.preventDefault();
    const nombre = document.getElementById('rebano-nombre').value;
    const costo = document.getElementById('rebano-costo').value;
    const fechaInicio = document.getElementById('rebano-fecha-inicio').value;
    const diaCorte = document.getElementById('rebano-dia-corte').value;
    try {
      await API.put(`/rebanos/${id}`, {
        nombre,
        costo_cabeza: costo || null,
        fecha_inicio: fechaInicio || null,
        dia_corte: diaCorte || null,
      });
      this.cerrarModal();
      this.cargar();
    } catch (err) {
      Toast.error(err.response?.data?.error || 'Error al actualizar');
    }
  },

  async eliminar(id, nombre, totalAnimales) {
    if (totalAnimales > 0) {
      Toast.warning(`No se puede inactivar "${nombre}" porque tiene ${totalAnimales} animal(es) activo(s). Primero mové o da de baja los animales.`);
      return;
    }
    if (!(await Confirm.show(`¿Inactivar el rebaño "${nombre}"?`))) return;
    try {
      await API.delete(`/rebanos/${id}`);
      this.cargarKpis();
      this.cargar();
    } catch (err) {
      Toast.error(err.response?.data?.error || 'Error al eliminar');
    }
  },

  cerrarModal() {
    document.getElementById('rebano-modal').innerHTML = '';
  },
};

