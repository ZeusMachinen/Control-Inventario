const CompraListPage = {
  columnaOrden: null,
  direccionOrden: 'asc',
  datos: [],

  async render() {
    try {
      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title"><i class="fas fa-cart-shopping me-2"></i>Compras</h1>
          <button class="btn btn-primary" onclick="Router.navegar('/compras/nuevo')"><i class="fas fa-plus me-1"></i>Nueva Compra</button>
        </div>

        <div class="card">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th onclick="CompraListPage.ordenarPor('fecha_compra')" data-columna="fecha_compra" class="th-sortable">Fecha</th>
                  <th onclick="CompraListPage.ordenarPor('proveedor')" data-columna="proveedor" class="th-sortable">Proveedor</th>
                  <th onclick="CompraListPage.ordenarPor('total_animales')" data-columna="total_animales" class="th-sortable">Animales</th>
                  <th onclick="CompraListPage.ordenarPor('total_costo')" data-columna="total_costo" class="th-sortable">Total</th>
                  <th onclick="CompraListPage.ordenarPor('notas')" data-columna="notas" class="th-sortable">Notas</th>
                  <th style="width:80px">Acciones</th>
                </tr>
              </thead>
              <tbody id="compras-tbody">
                <tr><td colspan="6" class="text-center py-4 text-secondary"><div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>Cargando...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      `);
    } catch (e) {
      return MainLayout.render(`<div class="alert alert-danger">Error: ${e.message}</div>`);
    }
  },

  afterRender() { this.cargar(); },

  obtenerValor(columna, item) {
    const map = {
      fecha_compra: item.fecha_compra,
      proveedor: item.proveedor,
      total_animales: parseInt(item.total_animales) || 0,
      total_costo: parseFloat(item.total_costo) || 0,
      notas: item.notas,
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
    SortUtil.actualizarEncabezados('compras-tbody', this.columnaOrden, this.direccionOrden);
    this.renderTabla();
  },

  async cargar() {
    const tbody = document.getElementById('compras-tbody');
    if (!tbody) return;

    try {
      const { data: res } = await API.get('/compras');
      this.datos = res.data || [];
      this.renderTabla();
    } catch (e) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-danger py-3 text-center">Error: ${e.message}</td></tr>`;
    }
  },

  renderTabla() {
    const tbody = document.getElementById('compras-tbody');
    const compras = [...this.datos];

    if (this.columnaOrden) {
      compras.sort((a, b) => SortUtil.comparar(
        this.obtenerValor(this.columnaOrden, a),
        this.obtenerValor(this.columnaOrden, b),
        this.direccionOrden
      ));
    }

    if (compras.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-secondary">Todavía no hay compras registradas</td></tr>';
      return;
    }

    tbody.innerHTML = compras.map(c => `
      <tr>
        <td>${DateUtil.formatear(c.fecha_compra)}</td>
        <td class="fw-medium">${c.proveedor}</td>
        <td>${c.total_animales} animales</td>
        <td class="fw-bold">${Formateador.moneda(c.total_costo)}</td>
        <td>${c.notas || '-'}</td>
        <td>
          <button class="btn btn-outline-secondary btn-sm" onclick="Router.navegar('/compras/${c.id}')" title="Ver"><i class="fas fa-eye"></i></button>
        </td>
      </tr>
    `).join('');
    SortUtil.actualizarEncabezados('compras-tbody', this.columnaOrden, this.direccionOrden);
  },
};