const MedicamentoListPage = {
  columnaOrden: null,
  direccionOrden: 'asc',
  datos: [],

  async render() {
    return MainLayout.render(`
      <div class="page-header">
        <h1 class="page-title"><i class="fas fa-capsules me-2"></i>Medicamentos</h1>
        <button class="btn btn-primary" onclick="MedicamentoListPage.mostrarFormulario()"><i class="fas fa-plus me-1"></i>Nuevo Medicamento</button>
      </div>

      <div class="filter-panel">
        <div class="form-group">
          <label class="form-label">Buscar</label>
          <input type="text" class="form-control form-control-sm" id="med-search" placeholder="Nombre..." oninput="MedicamentoListPage.cargar()">
        </div>
      </div>

      <div id="med-resumen" class="row g-3 mb-3"></div>

      <div class="card">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th onclick="MedicamentoListPage.ordenarPor('nombre')" data-columna="nombre" class="th-sortable">Nombre</th>
                <th onclick="MedicamentoListPage.ordenarPor('stock')" data-columna="stock" class="th-sortable">Cantidad</th>
                <th onclick="MedicamentoListPage.ordenarPor('unidad')" data-columna="unidad" class="th-sortable">Presentación</th>
                <th onclick="MedicamentoListPage.ordenarPor('precio')" data-columna="precio" class="th-sortable">Precio</th>
                <th onclick="MedicamentoListPage.ordenarPor('fecha_vencimiento')" data-columna="fecha_vencimiento" class="th-sortable">Vencimiento</th>
                <th style="width:120px">Acciones</th>
              </tr>
            </thead>
            <tbody id="med-tbody">
              <tr><td colspan="6" class="text-center py-4 text-secondary"><div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div id="med-modal"></div>
    `);
  },

  afterRender() { this.cargar(); },

  obtenerValor(columna, item) {
    const map = {
      nombre: item.nombre,
      stock: parseInt(item.stock) || 0,
      unidad: item.unidad,
      precio: parseFloat(item.precio) || 0,
      fecha_vencimiento: item.fecha_vencimiento,
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
    SortUtil.actualizarEncabezados('med-tbody', this.columnaOrden, this.direccionOrden);
    this.renderTabla();
  },

  async cargar() {
    try {
      const params = {};
      const search = document.getElementById('med-search')?.value.trim();
      if (search) params.search = search;

      const { data: res } = await API.get('/medicamentos', params);
      this.datos = res.data?.data || [];
      const totales = res.data?.totales || {};

      // Renderizar resumen
      const container = document.getElementById('med-resumen');
      if (container) {
        container.innerHTML = `
          <div class="col-md-4">
            <div class="card text-center py-3 border-primary border-2">
              <div class="small text-secondary">Valor Total Inventario</div>
              <div class="fs-4 fw-bold">${Formateador.moneda(totales.total_valor || 0)}</div>
              <div class="small text-secondary">${totales.cantidad || 0} medicamentos</div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card text-center py-3">
              <div class="small text-secondary">Stock Total</div>
              <div class="fs-4 fw-bold">${parseInt(totales.total_stock) || 0}</div>
              <div class="small text-secondary">unidades en inventario</div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card text-center py-3">
              <div class="small text-secondary">Precio Promedio</div>
              <div class="fs-4 fw-bold">${totales.cantidad > 0 && totales.total_stock > 0 ? Formateador.moneda(totales.total_valor / totales.total_stock) : '$0'}</div>
              <div class="small text-secondary">por unidad</div>
            </div>
          </div>
        `;
      }

      this.renderTabla();
    } catch (e) {
      document.getElementById('med-tbody').innerHTML = `<tr><td colspan="6" class="text-danger py-3 text-center">Error: ${e.message}</td></tr>`;
    }
  },

  renderTabla() {
    const tbody = document.getElementById('med-tbody');
    const list = [...this.datos];

    if (this.columnaOrden) {
      list.sort((a, b) => SortUtil.comparar(
        this.obtenerValor(this.columnaOrden, a),
        this.obtenerValor(this.columnaOrden, b),
        this.direccionOrden
      ));
    }

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-secondary">No hay medicamentos registrados</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(m => `
      <tr>
        <td class="fw-medium">${m.nombre}</td>
        <td><strong>${parseInt(m.stock)}</strong></td>
        <td>${m.unidad}</td>
        <td>${m.precio ? Formateador.moneda(m.precio) : '-'}</td>
        <td>${m.fecha_vencimiento ? DateUtil.formatear(m.fecha_vencimiento) : '-'}</td>
        <td>
          <div class="d-flex gap-1">
            <button class="btn btn-outline-primary btn-sm" onclick="MedicamentoListPage.editar(${m.id})" title="Editar"><i class="fas fa-pen"></i></button>
            <button class="btn btn-outline-warning btn-sm" onclick="MedicamentoListPage.agotar(${m.id})" title="Agotado"><i class="fas fa-circle-xmark"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
    SortUtil.actualizarEncabezados('med-tbody', this.columnaOrden, this.direccionOrden);
  },

  mostrarFormulario() {
    document.getElementById('med-modal').innerHTML = this.modalHtml('Nuevo Medicamento', null);
  },

  editar(id) {
    document.getElementById('med-modal').innerHTML = this.modalHtml('Editar Medicamento', id);
    this.cargarDatos(id);
  },

  modalHtml(titulo, id) {
    return `
      <div class="modal fade show d-block" tabindex="-1" style="background:rgba(0,0,0,0.5)" onclick="if(event.target===this)MedicamentoListPage.cerrarModal()">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">${titulo}</h5>
              <button class="btn-close" onclick="MedicamentoListPage.cerrarModal()"></button>
            </div>
            <div class="modal-body">
              <form id="med-form" onsubmit="MedicamentoListPage.guardar(event, ${id || 'null'})">
                <div class="mb-3">
                  <label class="form-label">Nombre *</label>
                  <input type="text" class="form-control" id="med-nombre" required>
                </div>
                <div class="row g-3">
                  <div class="col-6">
                    <label class="form-label">Cantidad (u. enteras)</label>
                    <input type="number" step="1" min="0" class="form-control" id="med-stock" value="0">
                  </div>
                  <div class="col-6">
                    <label class="form-label">Presentación *</label>
                    <input type="text" class="form-control" id="med-unidad" placeholder="Ej: frasco, dosis, ml" required>
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label">Precio por Unidad</label>
                  <input type="number" step="0.01" min="0" class="form-control" id="med-precio" placeholder="0.00">
                </div>
                <div class="mb-3">
                  <label class="form-label">Descripción</label>
                  <textarea class="form-control" id="med-descripcion" rows="2"></textarea>
                </div>
                <div class="mb-3">
                  <label class="form-label">Fecha de Vencimiento</label>
                  <input type="date" class="form-control" id="med-vencimiento">
                </div>
                <div class="d-flex gap-2 justify-content-end">
                  <button type="button" class="btn btn-outline-secondary" onclick="MedicamentoListPage.cerrarModal()">Cancelar</button>
                  <button type="submit" class="btn btn-primary">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async cargarDatos(id) {
    try {
      const { data } = await API.get(`/medicamentos/${id}`);
      const m = data.data;
      document.getElementById('med-nombre').value = m.nombre || '';
      document.getElementById('med-stock').value = parseInt(m.stock) || 0;
      document.getElementById('med-unidad').value = m.unidad || '';
      document.getElementById('med-precio').value = m.precio || '';
      document.getElementById('med-descripcion').value = m.descripcion || '';
      document.getElementById('med-vencimiento').value = DateUtil.formatoInput(m.fecha_vencimiento) || '';
    } catch (e) {}
  },

  async guardar(e, id) {
    e.preventDefault();
    const payload = {
      nombre: document.getElementById('med-nombre').value,
      stock: document.getElementById('med-stock').value || 0,
      unidad: document.getElementById('med-unidad').value,
      precio: document.getElementById('med-precio').value || null,
      descripcion: document.getElementById('med-descripcion').value,
      fecha_vencimiento: document.getElementById('med-vencimiento').value || null,
    };

    try {
      if (id) {
        await API.put(`/medicamentos/${id}`, payload);
      } else {
        await API.post('/medicamentos', payload);
      }
      this.cerrarModal();
      this.cargar();
    } catch (err) {
      Toast.error(err.response?.data?.error || 'Error al guardar');
    }
  },

  async agotar(id) {
    if (!(await Confirm.show('¿Marcar este medicamento como agotado?'))) return;
    try {
      await API.put(`/medicamentos/${id}/agotar`);
      this.cargar();
    } catch (err) {
      Toast.error(err.response?.data?.error || 'Error al marcar como agotado');
    }
  },

  cerrarModal() { document.getElementById('med-modal').innerHTML = ''; },
};

