const VentaListPage = {
  modoFiltro: 'todo',
  tipoActual: 'todo',
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
          <h1 class="page-title"><i class="fas fa-sack-dollar me-2"></i>Ventas</h1>
          <button class="btn btn-primary" onclick="Router.navegar('/ventas/nuevo')"><i class="fas fa-plus me-1"></i>Nueva Venta</button>
        </div>

        <div class="filter-panel">
          <div class="mb-0">
            <label class="form-label">Tipo</label>
            <select class="form-select form-select-sm" id="ventas-filtro-tipo" onchange="VentaListPage.cambiarTipo()" style="min-width:160px">
              <option value="todo">Todas</option>
              <option value="Venta">Ventas</option>
              <option value="Transferencia">Transferencias</option>
            </select>
          </div>
          <div class="mb-0">
            <label class="form-label">Período</label>
            <select class="form-select form-select-sm" id="ventas-filtro-modo" onchange="VentaListPage.cambiarModo()" style="min-width:160px">
              <option value="todo">Todo</option>
              <option value="mes">Mes</option>
              <option value="anio">Año</option>
            </select>
          </div>
          <div class="mb-0" id="ventas-filtro-mes-group" style="display:none">
            <label class="form-label">Mes</label>
            <input type="month" class="form-control form-control-sm" id="ventas-filtro-mes" value="${this.mesActual}" onchange="VentaListPage.cargar()">
          </div>
          <div class="mb-0" id="ventas-filtro-anio-group" style="display:none">
            <label class="form-label">Año</label>
            <select class="form-select form-select-sm" id="ventas-filtro-anio" onchange="VentaListPage.cargar()">
              ${this.generarOpcionesAnio()}
            </select>
          </div>
        </div>

        <div id="ventas-resumen" class="row g-3 mb-3"></div>

        <div class="card mb-3">
          <div class="card-header"><strong><i class="fas fa-receipt me-2"></i>Ventas Realizadas</strong></div>
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th onclick="VentaListPage.ordenarPor('animal_nombre')" data-columna="animal_nombre" class="th-sortable">Animal</th>
                  <th onclick="VentaListPage.ordenarPor('comprador_nombre')" data-columna="comprador_nombre" class="th-sortable">Comprador</th>
                  <th onclick="VentaListPage.ordenarPor('precio')" data-columna="precio" class="th-sortable">Precio</th>
                  <th onclick="VentaListPage.ordenarPor('peso_salida')" data-columna="peso_salida" class="th-sortable">Peso Salida</th>
                  <th onclick="VentaListPage.ordenarPor('fecha')" data-columna="fecha" class="th-sortable">Fecha</th>
                  <th onclick="VentaListPage.ordenarPor('tipo')" data-columna="tipo" class="th-sortable">Tipo</th>
                  <th style="width:100px">Acciones</th>
                </tr>
              </thead>
              <tbody id="ventas-tbody">
                <tr><td colspan="7" class="text-center py-4 text-secondary"><div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>Cargando...</td></tr>
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
    this.modoFiltro = document.getElementById('ventas-filtro-modo').value;
    document.getElementById('ventas-filtro-mes-group').style.display = this.modoFiltro === 'mes' ? '' : 'none';
    document.getElementById('ventas-filtro-anio-group').style.display = this.modoFiltro === 'anio' ? '' : 'none';
    this.cargar();
  },

  cambiarTipo() {
    this.tipoActual = document.getElementById('ventas-filtro-tipo').value;
    this.cargar();
  },

  obtenerParamsFiltro() {
    if (this.modoFiltro === 'todo') return {};
    const params = {};
    if (this.modoFiltro === 'mes') {
      const mes = document.getElementById('ventas-filtro-mes')?.value;
      if (mes) {
        params.fecha_desde = mes + '-01';
        const [y, m] = mes.split('-');
        const ultimoDia = new Date(parseInt(y), parseInt(m), 0).getDate();
        params.fecha_hasta = mes + '-' + String(ultimoDia).padStart(2, '0');
      }
    } else if (this.modoFiltro === 'anio') {
      const anio = document.getElementById('ventas-filtro-anio')?.value;
      if (anio) {
        params.fecha_desde = anio + '-01-01';
        params.fecha_hasta = anio + '-12-31';
      }
    }
    return params;
  },

  obtenerValor(columna, item) {
    const map = {
      animal_nombre: item.animal_nombre,
      comprador_nombre: item.comprador_nombre,
      precio: parseFloat(item.precio) || 0,
      peso_salida: parseFloat(item.peso_salida) || 0,
      fecha: item.fecha,
      tipo: item.tipo,
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
    SortUtil.actualizarEncabezados('ventas-tbody', this.columnaOrden, this.direccionOrden);
    this.renderTabla();
  },

  async cargar() {
    const tbody = document.getElementById('ventas-tbody');
    if (!tbody) return;

    try {
      const params = this.obtenerParamsFiltro();
      if (this.tipoActual !== 'todo') params.tipo = this.tipoActual;
      const { data: res } = await API.get('/ventas', params);
      this.datos = res.data?.data || [];
      const totales = res.data?.totales || [];

      const container = document.getElementById('ventas-resumen');
      if (container) {
        const idxTotales = {};
        totales.forEach(t => { idxTotales[t.tipo] = { cantidad: parseInt(t.cantidad), total: parseFloat(t.total) || 0 }; });
        const Venta = idxTotales['Venta'] || { cantidad: 0, total: 0 };
        const Transferencia = idxTotales['Transferencia'] || { cantidad: 0, total: 0 };
        const sumaTotal = Venta.total + Transferencia.total;
        const sumaCant = Venta.cantidad + Transferencia.cantidad;
        container.innerHTML = `
          <div class="col-md-4">
            <div class="card text-center py-3 ${this.tipoActual === 'todo' ? 'border-primary border-2' : ''}" style="cursor:pointer" onclick="document.getElementById('ventas-filtro-tipo').value='todo';VentaListPage.cambiarTipo()">
              <div class="small text-secondary">Total General</div>
              <div class="fs-4 fw-bold">${Formateador.moneda(sumaTotal)}</div>
              <div class="small text-secondary">${sumaCant} operaciones</div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card text-center py-3 ${this.tipoActual === 'Venta' ? 'border-primary border-2' : ''}" style="cursor:pointer" onclick="document.getElementById('ventas-filtro-tipo').value='Venta';VentaListPage.cambiarTipo()">
              <div class="small text-secondary">Ventas</div>
              <div class="fs-4 fw-bold">${Formateador.moneda(Venta.total)}</div>
              <div class="small text-secondary">${Venta.cantidad} animales</div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card text-center py-3 ${this.tipoActual === 'Transferencia' ? 'border-primary border-2' : ''}" style="cursor:pointer" onclick="document.getElementById('ventas-filtro-tipo').value='Transferencia';VentaListPage.cambiarTipo()">
              <div class="small text-secondary">Transferencias</div>
              <div class="fs-4 fw-bold">${Formateador.moneda(Transferencia.total)}</div>
              <div class="small text-secondary">${Transferencia.cantidad} animales</div>
            </div>
          </div>
        `;
      }

      this.renderTabla();
    } catch (e) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-danger py-3 text-center">Error: ${e.message}</td></tr>`;
    }
  },

  renderTabla() {
    const tbody = document.getElementById('ventas-tbody');
    const ventasList = [...this.datos];

    if (this.columnaOrden) {
      ventasList.sort((a, b) => SortUtil.comparar(
        this.obtenerValor(this.columnaOrden, a),
        this.obtenerValor(this.columnaOrden, b),
        this.direccionOrden
      ));
    }

    if (ventasList.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-secondary">Sin ventas en este período</td></tr>';
      return;
    }

    tbody.innerHTML = ventasList.map(v => `
      <tr>
        <td>${v.animal_nombre}</td>
        <td>${v.comprador_nombre || 'Usuario interno'}</td>
        <td class="fw-bold">${Formateador.moneda(v.precio)}</td>
        <td>${v.peso_salida ? `${v.peso_salida} kg` : '-'}</td>
        <td>${DateUtil.formatear(v.fecha)}</td>
        <td><span class="badge ${v.tipo === 'Venta' ? 'bg-success' : 'bg-primary'}">${v.tipo}</span></td>
        <td>
          <div class="d-flex gap-1">
            <button class="btn btn-outline-secondary btn-sm" onclick="Router.navegar('/ventas/${v.id}')" title="Ver"><i class="fas fa-eye"></i></button>
            <button class="btn btn-outline-primary btn-sm" onclick="Router.navegar('/ventas/${v.id}/editar')" title="Editar"><i class="fas fa-pen"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
    SortUtil.actualizarEncabezados('ventas-tbody', this.columnaOrden, this.direccionOrden);
  },
};