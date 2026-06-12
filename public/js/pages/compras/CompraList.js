const CompraListPage = {
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
    try {
      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title"><i class="fas fa-cart-shopping me-2"></i>Compras</h1>
          <button class="btn btn-primary" onclick="Router.navegar('/compras/nuevo')"><i class="fas fa-plus me-1"></i>Nueva Compra</button>
        </div>

        <div class="filter-panel">
          <div class="form-group">
            <label class="form-label">Buscar</label>
            <input type="text" class="form-control form-control-sm" id="compras-search" placeholder="Proveedor..." oninput="CompraListPage.cargar()">
          </div>
          <div class="mb-0">
            <label class="form-label">Período</label>
            <select class="form-select form-select-sm" id="compras-filtro-modo" onchange="CompraListPage.cambiarModo()" style="min-width:160px">
              <option value="todo">Todo</option>
              <option value="mes">Mes</option>
              <option value="anio">Año</option>
            </select>
          </div>
          <div class="mb-0" id="compras-filtro-mes-group" style="display:none">
            <label class="form-label">Mes</label>
            <input type="month" class="form-control form-control-sm" id="compras-filtro-mes" value="${this.mesActual}" onchange="CompraListPage.cargar()">
          </div>
          <div class="mb-0" id="compras-filtro-anio-group" style="display:none">
            <label class="form-label">Año</label>
            <select class="form-select form-select-sm" id="compras-filtro-anio" onchange="CompraListPage.cargar()">
              ${this.generarOpcionesAnio()}
            </select>
          </div>
        </div>

        <div id="compras-resumen" class="row g-3 mb-3"></div>

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

  cambiarModo() {
    this.modoFiltro = document.getElementById('compras-filtro-modo').value;
    document.getElementById('compras-filtro-mes-group').style.display = this.modoFiltro === 'mes' ? '' : 'none';
    document.getElementById('compras-filtro-anio-group').style.display = this.modoFiltro === 'anio' ? '' : 'none';
    this.cargar();
  },

  obtenerParamsFiltro() {
    const params = {};
    const search = document.getElementById('compras-search')?.value.trim();
    if (search) params.search = search;

    if (this.modoFiltro === 'mes') {
      const mes = document.getElementById('compras-filtro-mes')?.value;
      if (mes) {
        params.fecha_desde = mes + '-01';
        const [y, m] = mes.split('-');
        const ultimoDia = new Date(parseInt(y), parseInt(m), 0).getDate();
        params.fecha_hasta = mes + '-' + String(ultimoDia).padStart(2, '0');
      }
    } else if (this.modoFiltro === 'anio') {
      const anio = document.getElementById('compras-filtro-anio')?.value;
      if (anio) {
        params.fecha_desde = anio + '-01-01';
        params.fecha_hasta = anio + '-12-31';
      }
    }
    return params;
  },

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
      const params = this.obtenerParamsFiltro();
      const { data: res } = await API.get('/compras', params);
      this.datos = res.data?.data || [];
      const totales = res.data?.totales || {};

      // Renderizar resumen
      const container = document.getElementById('compras-resumen');
      if (container) {
        container.innerHTML = `
          <div class="col-md-4">
            <div class="card text-center py-3 border-primary border-2">
              <div class="small text-secondary">Total Invertido</div>
              <div class="fs-4 fw-bold">${Formateador.moneda(totales.total_costo || 0)}</div>
              <div class="small text-secondary">${totales.cantidad || 0} compras</div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card text-center py-3">
              <div class="small text-secondary">Animales Comprados</div>
              <div class="fs-4 fw-bold">${parseInt(totales.total_animales) || 0}</div>
              <div class="small text-secondary">cabezas</div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card text-center py-3">
              <div class="small text-secondary">Promedio por Animal</div>
              <div class="fs-4 fw-bold">${totales.total_animales > 0 ? Formateador.moneda(totales.total_costo / totales.total_animales) : '$0'}</div>
              <div class="small text-secondary">por cabeza</div>
            </div>
          </div>
        `;
      }

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