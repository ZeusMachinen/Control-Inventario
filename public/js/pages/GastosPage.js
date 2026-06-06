const GastosPage = {
  tipoActual: 'mantenimiento',
  modoFiltro: 'mes', // 'mes' | 'anio' | 'rango'
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
        <h1 class="page-title">Gastos</h1>
        <button class="btn btn-primary" onclick="GastosPage.mostrarFormulario()">+ Nuevo Gasto</button>
      </div>

      <div class="filter-panel">
        <div class="form-group">
          <label class="form-label">Tipo</label>
          <select class="form-select" id="gasto-filtro-tipo" onchange="GastosPage.cambiarFiltro()">
            <option value="mantenimiento">Mantenimiento</option>
            <option value="medicamentos">Medicamentos</option>
            <option value="compras">Compras</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Período</label>
          <select class="form-select" id="gasto-filtro-modo" onchange="GastosPage.cambiarModo()">
            <option value="mes">Mes</option>
            <option value="anio">Año</option>
            <option value="rango">Rango personalizado</option>
          </select>
        </div>
        <div class="form-group" id="gasto-filtro-mes-group">
          <label class="form-label">Mes</label>
          <input type="month" class="form-input" id="gasto-filtro-mes" value="${this.mesActual}" onchange="GastosPage.cambiarFiltro()">
        </div>
        <div class="form-group" id="gasto-filtro-anio-group" style="display:none">
          <label class="form-label">Año</label>
          <select class="form-select" id="gasto-filtro-anio" onchange="GastosPage.cambiarFiltro()">
            ${GastosPage.generarOpcionesAnio()}
          </select>
        </div>
        <div class="form-group" id="gasto-filtro-rango-group" style="display:none">
          <label class="form-label">Desde</label>
          <input type="date" class="form-input" id="gasto-filtro-desde" onchange="GastosPage.cambiarFiltro()">
        </div>
        <div class="form-group" id="gasto-filtro-hasta-group" style="display:none">
          <label class="form-label">Hasta</label>
          <input type="date" class="form-input" id="gasto-filtro-hasta" onchange="GastosPage.cambiarFiltro()">
        </div>
      </div>

      <div id="gastos-resumen" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:1rem"></div>

      <div class="card">
        <div class="table-container">
          <table>
              <thead>
                <tr>
                  <th onclick="GastosPage.ordenarPor('mes')" data-columna="mes" class="th-sortable">Fecha</th>
                  <th onclick="GastosPage.ordenarPor('descripcion')" data-columna="descripcion" class="th-sortable">Descripción</th>
                  <th onclick="GastosPage.ordenarPor('tipo')" data-columna="tipo" class="th-sortable">Tipo</th>
                  <th onclick="GastosPage.ordenarPor('rebano_nombre')" data-columna="rebano_nombre" class="th-sortable">Rebaño</th>
                  <th onclick="GastosPage.ordenarPor('monto')" data-columna="monto" class="th-sortable">Monto</th>
                  <th>Acciones</th>
                </tr>
              </thead>
            <tbody id="gastos-tbody">
              <tr><td colspan="6" class="loading"><div class="spinner"></div>Cargando...</td></tr>
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

  afterRender() {
    this.cargar();
  },

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
      const params = { tipo: this.tipoActual };

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

      // Resumen de totales
      const container = document.getElementById('gastos-resumen');
      container.innerHTML = Object.entries({ mantenimiento: 'Mantenimiento', medicamentos: 'Medicamentos', compras: 'Compras' }).map(([k, v]) => `
        <div class="card" style="cursor:pointer;${this.tipoActual === k ? 'border:2px solid var(--primary);' : ''}" onclick="document.getElementById('gasto-filtro-tipo').value='${k}';GastosPage.cambiarFiltro()">
          <div class="card-body" style="padding:1rem">
            <h3 style="margin:0 0 0.5rem;font-size:0.9rem;color:var(--muted)">${v}</h3>
            <p style="margin:0;font-size:1.5rem;font-weight:700">$${parseFloat(totales[k] || 0).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      `).join('');

      this.renderTabla();
    } catch (e) {
      document.getElementById('gastos-tbody').innerHTML = `<tr><td colspan="6" class="alert alert-danger">Error: ${e.message}</td></tr>`;
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
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No hay gastos para este período</td></tr>';
      return;
    }

    const tipoLabels = { mantenimiento: 'Mantenimiento', medicamentos: 'Medicamentos', compras: 'Compras' };
    tbody.innerHTML = gastos.map(g => `
      <tr>
        <td>${new Date(g.mes + 'T00:00:00').toLocaleDateString('es-CO', { year: 'numeric', month: 'long' })}</td>
        <td>${g.descripcion}</td>
        <td><span class="badge badge-${g.tipo === 'medicamentos' ? 'naranja' : g.tipo === 'compras' ? 'rojo' : 'verde'}">${tipoLabels[g.tipo] || g.tipo}</span></td>
        <td>${g.rebano_nombre || '—'}</td>
        <td><strong>$${parseFloat(g.monto).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</strong></td>
        <td class="table-actions">
          <button class="btn btn-sm btn-secondary" onclick="GastosPage.editar(${JSON.stringify(g).replace(/"/g, '&quot;')})">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="GastosPage.eliminar(${g.id}, '${g.descripcion}')">🗑️</button>
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
      <div class="modal-overlay" onclick="if(event.target===this)GastosPage.cerrarModal()">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-title">${titulo}</span>
            <button class="modal-close" onclick="GastosPage.cerrarModal()">&times;</button>
          </div>
          <div class="modal-body">
            <form id="gasto-form" onsubmit="GastosPage.guardar(event${editando ? `, ${gasto.id}` : ''})">
              <div class="form-group">
                <label class="form-label">Tipo *</label>
                <select class="form-select" id="gasto-tipo" required>
                  <option value="">Seleccione...</option>
                  <option value="mantenimiento" ${gasto?.tipo === 'mantenimiento' ? 'selected' : ''}>Mantenimiento</option>
                  <option value="medicamentos" ${gasto?.tipo === 'medicamentos' ? 'selected' : ''}>Medicamentos</option>
                  <option value="compras" ${gasto?.tipo === 'compras' ? 'selected' : ''}>Compras</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Descripción *</label>
                <input type="text" class="form-input" id="gasto-descripcion" value="${gasto?.descripcion || ''}" placeholder="Ej: Alimento concentrado" required>
              </div>
              <div class="form-group">
                <label class="form-label">Monto ($) *</label>
                <input type="number" step="0.01" min="0" class="form-input" id="gasto-monto" value="${gasto?.monto || ''}" placeholder="Ej: 500000" required>
              </div>
              <div class="form-group">
                <label class="form-label">Mes *</label>
                <input type="month" class="form-input" id="gasto-mes" value="${gasto ? (gasto.mes || '').substring(0, 7) : this.mesActual}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Rebaño (opcional)</label>
                <select class="form-select" id="gasto-rebano">
                  <option value="">Ninguno</option>
                  ${rebanosList.map(r => `<option value="${r.id}" ${gasto?.rebano_id == r.id ? 'selected' : ''}>${r.nombre}</option>`).join('')}
                </select>
              </div>
              <div style="display:flex;gap:0.5rem;justify-content:flex-end;margin-top:1rem">
                <button type="button" class="btn btn-secondary" onclick="GastosPage.cerrarModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">${editando ? 'Guardar' : 'Crear'}</button>
              </div>
            </form>
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
      alert(err.response?.data?.error || 'Error al guardar');
    }
  },

  async editar(gasto) {
    this.mostrarFormulario(gasto);
  },

  async eliminar(id, desc) {
    if (!confirm(`¿Eliminar el gasto "${desc}"?`)) return;
    try {
      await API.delete(`/gastos/${id}`);
      this.cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar');
    }
  },

  cerrarModal() {
    document.getElementById('gasto-modal').innerHTML = '';
  },
};
