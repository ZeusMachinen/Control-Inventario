const GastosPage = {
  tipoActual: 'mantenimiento',
  modoFiltro: 'todo',
  mesActual: new Date().toISOString().substring(0, 7),
  anioActual: new Date().getFullYear().toString(),
  desdeActual: '',
  hastaActual: '',
  columnaOrden: null,
  direccionOrden: 'asc',
  datos: [],

  async render() {
    return MainLayout.render(`
      <div class="page-header">
        <h1 class="page-title"><i class="fas fa-money-bill-wave me-2"></i>Gastos</h1>
        <button class="btn btn-primary" onclick="GastosPage.mostrarFormulario()"><i class="fas fa-plus me-1"></i>Nuevo Gasto</button>
      </div>

      <div class="filter-panel">
        <div class="mb-0">
          <label class="form-label">Tipo</label>
          <select class="form-select form-select-sm" id="gasto-filtro-tipo" onchange="GastosPage.cambiarFiltro()" style="min-width:160px">
            <option value="todo">Todos</option>
            <option value="mantenimiento">Mantenimiento</option>
            <option value="medicamentos">Medicamentos</option>
            <option value="veterinarios">Veterinarios</option>
            <option value="compras">Compras</option>
          </select>
        </div>
        <div class="mb-0">
          <label class="form-label">Período</label>
          <select class="form-select form-select-sm" id="gasto-filtro-modo" onchange="GastosPage.cambiarModo()" style="min-width:160px">
            <option value="todo">Todo</option>
            <option value="mes">Mes</option>
            <option value="anio">Año</option>
            <option value="rango">Rango personalizado</option>
          </select>
        </div>
        <div class="mb-0" id="gasto-filtro-mes-group">
          <label class="form-label">Mes</label>
          <input type="month" class="form-control form-control-sm" id="gasto-filtro-mes" value="${this.mesActual}" onchange="GastosPage.cambiarFiltro()">
        </div>
        <div class="mb-0" id="gasto-filtro-anio-group" style="display:none">
          <label class="form-label">Año</label>
          <select class="form-select form-select-sm" id="gasto-filtro-anio" onchange="GastosPage.cambiarFiltro()">
            ${GastosPage.generarOpcionesAnio()}
          </select>
        </div>
        <div class="mb-0" id="gasto-filtro-rango-group" style="display:none">
          <label class="form-label">Desde</label>
          <input type="date" class="form-control form-control-sm" id="gasto-filtro-desde" onchange="GastosPage.cambiarFiltro()">
        </div>
        <div class="mb-0" id="gasto-filtro-hasta-group" style="display:none">
          <label class="form-label">Hasta</label>
          <input type="date" class="form-control form-control-sm" id="gasto-filtro-hasta" onchange="GastosPage.cambiarFiltro()">
        </div>
      </div>

      <div id="gastos-resumen" class="row g-3 mb-3"></div>

      <div class="card">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th onclick="GastosPage.ordenarPor('mes')" data-columna="mes" class="th-sortable">Fecha</th>
                <th onclick="GastosPage.ordenarPor('descripcion')" data-columna="descripcion" class="th-sortable">Descripción</th>
                <th onclick="GastosPage.ordenarPor('tipo')" data-columna="tipo" class="th-sortable">Tipo</th>
                <th onclick="GastosPage.ordenarPor('rebano_nombre')" data-columna="rebano_nombre" class="th-sortable">Rebaño</th>
                <th onclick="GastosPage.ordenarPor('monto')" data-columna="monto" class="th-sortable">Monto</th>
                <th style="width:100px">Acciones</th>
              </tr>
            </thead>
            <tbody id="gastos-tbody">
              <tr><td colspan="6" class="text-center py-4 text-secondary"><div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div id="gasto-modal"></div>
    `);
  },

  generarOpcionesAnio() {
    const anio = new Date().getFullYear();
    let opts = '';
    for (let a = anio; a >= anio - 10; a--) {
      opts += `<option value="${a}" ${a === parseInt(this.anioActual) ? 'selected' : ''}>${a}</option>`;
    }
    return opts;
  },

  afterRender() { this.cargar(); },

  cambiarModo() {
    this.modoFiltro = document.getElementById('gasto-filtro-modo').value;
    document.getElementById('gasto-filtro-mes-group').style.display = this.modoFiltro === 'mes' ? '' : 'none';
    document.getElementById('gasto-filtro-anio-group').style.display = this.modoFiltro === 'anio' ? '' : 'none';
    document.getElementById('gasto-filtro-rango-group').style.display = this.modoFiltro === 'rango' ? '' : 'none';
    document.getElementById('gasto-filtro-hasta-group').style.display = this.modoFiltro === 'rango' ? '' : 'none';
    this.cambiarFiltro();
  },

  cambiarFiltro() {
    this.tipoActual = document.getElementById('gasto-filtro-tipo').value;
    this.mesActual = document.getElementById('gasto-filtro-mes')?.value || this.mesActual;
    this.anioActual = document.getElementById('gasto-filtro-anio')?.value || this.anioActual;
    this.desdeActual = document.getElementById('gasto-filtro-desde')?.value || '';
    this.hastaActual = document.getElementById('gasto-filtro-hasta')?.value || '';
    this.cargar();
  },

  async cargar() {
    try {
      const params = this.tipoActual !== 'todo' ? { tipo: this.tipoActual } : {};

      if (this.modoFiltro === 'mes') {
        params.mes = this.mesActual;
      } else if (this.modoFiltro === 'anio') {
        params.anio = this.anioActual;
      } else if (this.modoFiltro === 'rango') {
        if (this.desdeActual) params.desde = this.desdeActual;
        if (this.hastaActual) params.hasta = this.hastaActual;
      }

      const { data } = await API.get('/gastos', params);
      this.datos = data.data?.gastos || [];
      const totales = data.data?.totales || {};

      const container = document.getElementById('gastos-resumen');
      const tipos = { mantenimiento: 'Mantenimiento', medicamentos: 'Medicamentos', veterinarios: 'Veterinarios', compras: 'Compras' };
      const sumaTotal = Object.keys(tipos).reduce((s, k) => s + (parseFloat(totales[k]) || 0), 0);
      container.innerHTML = `
        <div class="col-md-4">
          <div class="card text-center py-3 ${this.tipoActual === 'todo' ? 'border-primary border-2' : ''}" style="cursor:pointer" onclick="document.getElementById('gasto-filtro-tipo').value='todo';GastosPage.cambiarFiltro()">
            <div class="small text-secondary">Total General</div>
            <div class="fs-4 fw-bold">$${sumaTotal.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      ` + Object.entries(tipos).map(([k, v]) => `
        <div class="col-md-4">
          <div class="card text-center py-3 ${this.tipoActual === k ? 'border-primary border-2' : ''}" style="cursor:pointer" onclick="document.getElementById('gasto-filtro-tipo').value='${k}';GastosPage.cambiarFiltro()">
            <div class="small text-secondary">${v}</div>
            <div class="fs-4 fw-bold">$${parseFloat(totales[k] || 0).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      `).join('');

      this.renderTabla();
    } catch (e) {
      document.getElementById('gastos-tbody').innerHTML = `<tr><td colspan="6" class="text-danger py-3 text-center">Error: ${e.message}</td></tr>`;
    }
  },

  obtenerValor(columna, item) {
    const map = {
      mes: item.mes,
      descripcion: item.descripcion,
      tipo: item.tipo,
      rebano_nombre: item.rebano_nombre,
      monto: parseFloat(item.monto) || 0,
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
    SortUtil.actualizarEncabezados('gastos-tbody', this.columnaOrden, this.direccionOrden);
    this.renderTabla();
  },

  renderTabla() {
    const tbody = document.getElementById('gastos-tbody');
    const gastos = [...this.datos];

    if (this.columnaOrden) {
      gastos.sort((a, b) => SortUtil.comparar(
        this.obtenerValor(this.columnaOrden, a),
        this.obtenerValor(this.columnaOrden, b),
        this.direccionOrden
      ));
    }

    if (gastos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-secondary">No hay gastos para este período</td></tr>';
      return;
    }

    const tipoLabels = { mantenimiento: 'Mantenimiento', medicamentos: 'Medicamentos', veterinarios: 'Veterinarios', compras: 'Compras' };
    const tipoBadge = { mantenimiento: 'bg-success', medicamentos: 'bg-warning', veterinarios: 'bg-info', compras: 'bg-danger' };
    tbody.innerHTML = gastos.map(g => `
      <tr>
        <td>${new Date(g.mes + 'T00:00:00').toLocaleDateString('es-CO', { year: 'numeric', month: 'long' })}</td>
        <td>${g.descripcion}</td>
        <td><span class="badge ${tipoBadge[g.tipo] || 'bg-secondary'}">${tipoLabels[g.tipo] || g.tipo}</span></td>
        <td>${g.rebano_nombre || '—'}</td>
        <td class="fw-bold">$${parseFloat(g.monto).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</td>
        <td>
          <div class="d-flex gap-1">
            <button class="btn btn-outline-primary btn-sm" onclick="GastosPage.editar(${JSON.stringify(g).replace(/"/g, '&quot;')})" title="Editar"><i class="fas fa-pen"></i></button>
            <button class="btn btn-outline-danger btn-sm" onclick="GastosPage.eliminar(${g.id}, '${g.descripcion}')" title="Eliminar"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
    SortUtil.actualizarEncabezados('gastos-tbody', this.columnaOrden, this.direccionOrden);
  },

  async mostrarFormulario(gasto) {
    const { data: rebanos } = await API.get('/rebanos');
    const rebanosList = rebanos.data || [];
    const editando = !!gasto;
    const titulo = editando ? 'Editar Gasto' : 'Nuevo Gasto';

    document.getElementById('gasto-modal').innerHTML = `
      <div class="modal fade show d-block" tabindex="-1" style="background:rgba(0,0,0,0.5)" onclick="if(event.target===this)GastosPage.cerrarModal()">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">${titulo}</h5>
              <button class="btn-close" onclick="GastosPage.cerrarModal()"></button>
            </div>
            <div class="modal-body">
              <form id="gasto-form" onsubmit="GastosPage.guardar(event${editando ? `, ${gasto.id}` : ''})">
                <div class="mb-3">
                  <label class="form-label">Tipo *</label>
                  <select class="form-select" id="gasto-tipo" required>
                    <option value="">Seleccione...</option>
                    <option value="mantenimiento" ${gasto?.tipo === 'mantenimiento' ? 'selected' : ''}>Mantenimiento</option>
                    <option value="medicamentos" ${gasto?.tipo === 'medicamentos' ? 'selected' : ''}>Medicamentos</option>
                    <option value="veterinarios" ${gasto?.tipo === 'veterinarios' ? 'selected' : ''}>Veterinarios</option>
                    <option value="compras" ${gasto?.tipo === 'compras' ? 'selected' : ''}>Compras</option>
                  </select>
                </div>
                <div class="mb-3">
                  <label class="form-label">Descripción *</label>
                  <input type="text" class="form-control" id="gasto-descripcion" value="${gasto?.descripcion || ''}" placeholder="Ej: Alimento concentrado" required>
                </div>
                <div class="mb-3">
                  <label class="form-label">Monto ($) *</label>
                  <input type="number" step="0.01" min="0" class="form-control" id="gasto-monto" value="${gasto?.monto || ''}" placeholder="Ej: 500000" required>
                </div>
                <div class="mb-3">
                  <label class="form-label">Mes *</label>
                  <input type="month" class="form-control" id="gasto-mes" value="${gasto ? (gasto.mes || '').substring(0, 7) : this.mesActual}" required>
                </div>
                <div class="mb-3">
                  <label class="form-label">Rebaño (opcional)</label>
                  <select class="form-select" id="gasto-rebano">
                    <option value="">Ninguno</option>
                    ${rebanosList.map(r => `<option value="${r.id}" ${gasto?.rebano_id == r.id ? 'selected' : ''}>${r.nombre}</option>`).join('')}
                  </select>
                </div>
                <div class="d-flex gap-2 justify-content-end mt-3">
                  <button type="button" class="btn btn-outline-secondary" onclick="GastosPage.cerrarModal()">Cancelar</button>
                  <button type="submit" class="btn btn-primary">${editando ? 'Guardar' : 'Crear'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async guardar(e, id) {
    e.preventDefault();
    const datos = {
      tipo: document.getElementById('gasto-tipo').value,
      descripcion: document.getElementById('gasto-descripcion').value,
      monto: document.getElementById('gasto-monto').value,
      mes: document.getElementById('gasto-mes').value,
      rebano_id: document.getElementById('gasto-rebano').value || null,
    };
    try {
      if (id) {
        await API.put(`/gastos/${id}`, datos);
      } else {
        await API.post('/gastos', datos);
      }
      this.cerrarModal();
      this.cargar();
    } catch (err) {
      Toast.error(err.response?.data?.error || 'Error al guardar');
    }
  },

  async editar(gasto) {
    this.mostrarFormulario(gasto);
  },

  async eliminar(id, desc) {
    if (!(await Confirm.show(`¿Eliminar el gasto "${desc}"?`))) return;
    try {
      await API.delete(`/gastos/${id}`);
      this.cargar();
    } catch (err) {
      Toast.error(err.response?.data?.error || 'Error al eliminar');
    }
  },

  cerrarModal() { document.getElementById('gasto-modal').innerHTML = ''; },
};

