const VacunacionListPage = {
  modoFiltro: 'todo',
  mesActual: new Date().toISOString().substring(0, 7),
  anioActual: new Date().getFullYear().toString(),
  columnaOrden: null,
  direccionOrden: 'asc',
  datos: [],

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
        <h1 class="page-title"><i class="fas fa-syringe me-2"></i>Vacunaciones</h1>
        <button class="btn btn-primary" onclick="Router.navegar('/vacunacion/nuevo')"><i class="fas fa-plus me-1"></i>Nueva Vacunación</button>
      </div>

      <div class="filter-panel">
        <div class="form-group">
          <label class="form-label">Buscar</label>
          <input type="text" class="form-control form-control-sm" id="vac-search" placeholder="Medicamento, observaciones..." oninput="VacunacionListPage.cargar()">
        </div>
        <div class="mb-0">
          <label class="form-label">Período</label>
          <select class="form-select form-select-sm" id="vac-filtro-modo" onchange="VacunacionListPage.cambiarModo()" style="min-width:160px">
            <option value="todo">Todo</option>
            <option value="mes">Mes</option>
            <option value="anio">Año</option>
          </select>
        </div>
        <div class="mb-0" id="vac-filtro-mes-group" style="display:none">
          <label class="form-label">Mes</label>
          <input type="month" class="form-control form-control-sm" id="vac-filtro-mes" value="${this.mesActual}" onchange="VacunacionListPage.cargar()">
        </div>
        <div class="mb-0" id="vac-filtro-anio-group" style="display:none">
          <label class="form-label">Año</label>
          <select class="form-select form-select-sm" id="vac-filtro-anio" onchange="VacunacionListPage.cargar()">
            ${this.generarOpcionesAnio()}
          </select>
        </div>
      </div>

      <div id="vac-resumen" class="row g-3 mb-3"></div>

      <div class="card">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th onclick="VacunacionListPage.ordenarPor('fecha')" data-columna="fecha" class="th-sortable">Fecha</th>
                <th onclick="VacunacionListPage.ordenarPor('medicamento_nombre')" data-columna="medicamento_nombre" class="th-sortable">Medicamento</th>
                <th onclick="VacunacionListPage.ordenarPor('rebano_nombre')" data-columna="rebano_nombre" class="th-sortable">Rebaño</th>
                <th onclick="VacunacionListPage.ordenarPor('total_animales')" data-columna="total_animales" class="th-sortable">Animales</th>
                <th onclick="VacunacionListPage.ordenarPor('observaciones')" data-columna="observaciones" class="th-sortable">Observaciones</th>
                <th onclick="VacunacionListPage.ordenarPor('costo_veterinario')" data-columna="costo_veterinario" class="th-sortable">Costo Vet.</th>
                <th onclick="VacunacionListPage.ordenarPor('gasto_monto')" data-columna="gasto_monto" class="th-sortable">Costo Medicamento</th>
                <th style="width:130px">Acciones</th>
              </tr>
            </thead>
            <tbody id="vac-tbody">
              <tr><td colspan="8" class="text-center py-4 text-secondary"><div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `);
  },

  afterRender() { this.cargar(); },

  cambiarModo() {
    this.modoFiltro = document.getElementById('vac-filtro-modo').value;
    document.getElementById('vac-filtro-mes-group').style.display = this.modoFiltro === 'mes' ? '' : 'none';
    document.getElementById('vac-filtro-anio-group').style.display = this.modoFiltro === 'anio' ? '' : 'none';
    this.cargar();
  },

  obtenerParamsFiltro() {
    const params = {};
    const search = document.getElementById('vac-search')?.value.trim();
    if (search) params.search = search;

    if (this.modoFiltro === 'mes') {
      const mes = document.getElementById('vac-filtro-mes')?.value;
      if (mes) {
        params.fecha_desde = mes + '-01';
        const [y, m] = mes.split('-');
        const ultimoDia = new Date(parseInt(y), parseInt(m), 0).getDate();
        params.fecha_hasta = mes + '-' + String(ultimoDia).padStart(2, '0');
      }
    } else if (this.modoFiltro === 'anio') {
      const anio = document.getElementById('vac-filtro-anio')?.value;
      if (anio) {
        params.fecha_desde = anio + '-01-01';
        params.fecha_hasta = anio + '-12-31';
      }
    }
    return params;
  },

  obtenerValor(columna, item) {
    const map = {
      fecha: item.fecha,
      medicamento_nombre: item.medicamento_nombre,
      rebano_nombre: item.rebano_nombre,
      total_animales: parseInt(item.total_animales) || 0,
      observaciones: item.observaciones,
      costo_veterinario: parseFloat(item.costo_veterinario) || 0,
      gasto_monto: parseFloat(item.gasto_monto) || 0,
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
    SortUtil.actualizarEncabezados('vac-tbody', this.columnaOrden, this.direccionOrden);
    this.renderTabla();
  },

  async cargar() {
    try {
      const params = this.obtenerParamsFiltro();
      const { data: res } = await API.get('/vacunaciones', params);
      this.datos = res.data?.data || [];
      const totales = res.data?.totales || {};

      // Renderizar resumen
      const container = document.getElementById('vac-resumen');
      if (container) {
        const totalGeneral = (parseFloat(totales.total_veterinario) || 0) + (parseFloat(totales.total_medicamento) || 0);
        container.innerHTML = `
          <div class="col-md-3">
            <div class="card text-center py-3 border-primary border-2">
              <div class="small text-secondary">Total General</div>
              <div class="fs-4 fw-bold">${Formateador.moneda(totalGeneral)}</div>
              <div class="small text-secondary">${totales.cantidad || 0} vacunaciones</div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card text-center py-3">
              <div class="small text-secondary">Costo Veterinario</div>
              <div class="fs-4 fw-bold">${Formateador.moneda(totales.total_veterinario || 0)}</div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card text-center py-3">
              <div class="small text-secondary">Costo Medicamentos</div>
              <div class="fs-4 fw-bold">${Formateador.moneda(totales.total_medicamento || 0)}</div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card text-center py-3">
              <div class="small text-secondary">Animales Vacunados</div>
              <div class="fs-4 fw-bold">${this.datos.reduce((s, v) => s + (parseInt(v.total_animales) || 0), 0)}</div>
            </div>
          </div>
        `;
      }

      this.renderTabla();
    } catch (e) {
      document.getElementById('vac-tbody').innerHTML = `<tr><td colspan="8" class="text-danger py-3 text-center">Error: ${e.message}</td></tr>`;
    }
  },

  renderTabla() {
    const tbody = document.getElementById('vac-tbody');
    const list = [...this.datos];

    if (this.columnaOrden) {
      list.sort((a, b) => SortUtil.comparar(
        this.obtenerValor(this.columnaOrden, a),
        this.obtenerValor(this.columnaOrden, b),
        this.direccionOrden
      ));
    }

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-secondary">No hay vacunaciones registradas</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(v => `
      <tr>
        <td>${DateUtil.formatear(v.fecha)}</td>
        <td>${v.medicamento_nombre}</td>
        <td>${v.rebano_nombre || '-'}</td>
        <td><span class="badge bg-primary">${v.total_animales} animales</span></td>
        <td>${v.observaciones || '-'}</td>
        <td>${v.costo_veterinario ? Formateador.moneda(v.costo_veterinario) : '-'}</td>
        <td>${v.gasto_monto ? Formateador.moneda(v.gasto_monto) : '-'}</td>
        <td>
          <div class="d-flex gap-1">
            <button class="btn btn-outline-secondary btn-sm" onclick="VacunacionListPage.verAnimales(${v.id})" title="Ver animales"><i class="fas fa-eye"></i></button>
            <button class="btn btn-outline-primary btn-sm" onclick="Router.navegar('/vacunacion/${v.id}/editar')" title="Editar"><i class="fas fa-pen"></i></button>
            <button class="btn btn-outline-danger btn-sm" onclick="VacunacionListPage.eliminar(${v.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
    SortUtil.actualizarEncabezados('vac-tbody', this.columnaOrden, this.direccionOrden);
  },

  async verAnimales(id) {
    try {
      const { data: res } = await API.get(`/vacunaciones/${id}`);
      const v = res.data || {};

      const div = document.createElement('div');
      div.id = 'vac-animales-modal';
      div.innerHTML = `
        <div class="modal fade show d-block" tabindex="-1" style="background:rgba(0,0,0,0.5)" onclick="if(event.target===this)VacunacionListPage.cerrarModal()">
          <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title"><i class="fas fa-syringe me-2"></i>Animales vacunados — ${DateUtil.formatear(v.fecha)}</h5>
                <button class="btn-close" onclick="VacunacionListPage.cerrarModal()"></button>
              </div>
              <div class="modal-body">
                <p class="mb-3 small text-secondary"><i class="fas fa-syringe me-1"></i>${v.medicamento_nombre} ${v.rebano_nombre ? `· <i class="fas fa-people-group me-1"></i>${v.rebano_nombre}` : ''}</p>
                ${!v.animales || v.animales.length === 0
                  ? '<p class="text-center text-secondary py-3">Sin animales registrados en esta vacunación</p>'
                  : `<div class="table-responsive">
                      <table class="table table-hover align-middle mb-0">
                        <thead class="table-light">
                          <tr>
                            <th>Nombre</th>
                            <th>Sexo</th>
                            <th style="width:80px">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${v.animales.map(a => `
                            <tr>
                              <td class="fw-medium">${a.animal_nombre}</td>
                              <td><span class="badge ${a.sexo === 'Macho' ? 'bg-info' : 'bg-warning'}">${a.sexo}</span></td>
                              <td>
                                <button class="btn btn-outline-secondary btn-sm" onclick="VacunacionListPage.cerrarModal();Router.navegar('/animales/${a.animal_id}')"><i class="fas fa-eye"></i></button>
                              </td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    </div>`
                }
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(div);
    } catch (e) {
      Toast.error('Error al cargar animales: ' + (e.response?.data?.error || e.message));
    }
  },

  cerrarModal() {
    const el = document.getElementById('vac-animales-modal');
    if (el) el.remove();
  },

  async eliminar(id) {
    if (!(await Confirm.show('¿Eliminar esta vacunación?'))) return;
    try {
      await API.delete(`/vacunaciones/${id}`);
      this.cargar();
    } catch (err) {
      Toast.error(err.response?.data?.error || 'Error al eliminar');
    }
  },
};

