/**
 * Página: Listado de Ventas con filtro de período
 */
const VentaListPage = {
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
          <h1 class="page-title">💰 Ventas</h1>
          <button class="btn btn-primary" onclick="Router.navegar('/ventas/nuevo')">+ Nueva Venta</button>
        </div>

        <div class="filter-panel">
          <div class="form-group">
            <label class="form-label">Período</label>
            <select class="form-select" id="ventas-filtro-modo" onchange="VentaListPage.cambiarModo()">
              <option value="todo">Todo</option>
              <option value="mes">Mes</option>
              <option value="anio">Año</option>
            </select>
          </div>
          <div class="form-group" id="ventas-filtro-mes-group" style="display:none">
            <label class="form-label">Mes</label>
            <input type="month" class="form-input" id="ventas-filtro-mes" value="${this.mesActual}" onchange="VentaListPage.cargar()">
          </div>
          <div class="form-group" id="ventas-filtro-anio-group" style="display:none">
            <label class="form-label">Año</label>
            <select class="form-select" id="ventas-filtro-anio" onchange="VentaListPage.cargar()">
              ${this.generarOpcionesAnio()}
            </select>
          </div>
        </div>

        <!-- Ventas realizadas -->
        <div class="card" style="margin-bottom:1rem">
          <div class="card-header"><strong>Ventas Realizadas</strong></div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th onclick="VentaListPage.ordenarPor('animal_nombre')" data-columna="animal_nombre" class="th-sortable">Animal</th>
                  <th onclick="VentaListPage.ordenarPor('comprador_nombre')" data-columna="comprador_nombre" class="th-sortable">Comprador</th>
                  <th onclick="VentaListPage.ordenarPor('precio')" data-columna="precio" class="th-sortable">Precio</th>
                  <th onclick="VentaListPage.ordenarPor('peso_salida')" data-columna="peso_salida" class="th-sortable">Peso Salida</th>
                  <th onclick="VentaListPage.ordenarPor('fecha')" data-columna="fecha" class="th-sortable">Fecha</th>
                  <th onclick="VentaListPage.ordenarPor('tipo')" data-columna="tipo" class="th-sortable">Tipo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="ventas-tbody">
                <tr><td colspan="7" class="loading"><div class="spinner"></div>Cargando...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

      `);
    } catch (e) {
      return MainLayout.render(`<div class="alert alert-danger">Error: ${e.message}</div>`);
    }
  },

  afterRender() {
    this.cargar();
  },

  cambiarModo() {
    this.modoFiltro = document.getElementById('ventas-filtro-modo').value;
    document.getElementById('ventas-filtro-mes-group').style.display = this.modoFiltro === 'mes' ? '' : 'none';
    document.getElementById('ventas-filtro-anio-group').style.display = this.modoFiltro === 'anio' ? '' : 'none';
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
      const { data: ventas } = await API.get('/ventas', params);
      this.datos = ventas.data || [];
      this.renderTabla();
    } catch (e) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="alert alert-danger">Error: ${e.message}</td></tr>`;
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
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Sin ventas en este período</td></tr>';
      return;
    }

    tbody.innerHTML = ventasList.map(v => `
      <tr>
        <td>${v.animal_nombre}</td>
        <td>${v.comprador_nombre || 'Usuario interno'}</td>
        <td><strong>${Formateador.moneda(v.precio)}</strong></td>
        <td>${v.peso_salida ? `${v.peso_salida} kg` : '-'}</td>
        <td>${DateUtil.formatear(v.fecha)}</td>
        <td><span class="badge ${v.tipo === 'Venta' ? 'badge-verde' : 'badge-azul'}">${v.tipo}</span></td>
        <td class="table-actions">
          <button class="btn btn-sm btn-secondary" onclick="Router.navegar('/ventas/${v.id}')">👁 Ver</button>
          <button class="btn btn-sm btn-secondary" onclick="Router.navegar('/ventas/${v.id}/editar')">✏️ Editar</button>
        </td>
      </tr>
      `).join('');
    SortUtil.actualizarEncabezados('ventas-tbody', this.columnaOrden, this.direccionOrden);
  },

};
