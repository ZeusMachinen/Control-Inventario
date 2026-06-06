/**
 * Página: Listado de Vacunaciones
 */
const VacunacionListPage = {
  columnaOrden: null,
  direccionOrden: 'asc',
  datos: [],

  async render() {
    return MainLayout.render(`
      <div class="page-header">
        <h1 class="page-title">💉 Vacunaciones</h1>
        <button class="btn btn-primary" onclick="Router.navegar('/vacunacion/nuevo')">+ Nueva Vacunación</button>
      </div>

      <div class="card">
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th onclick="VacunacionListPage.ordenarPor('fecha')" data-columna="fecha" class="th-sortable">Fecha</th>
                <th onclick="VacunacionListPage.ordenarPor('medicamento_nombre')" data-columna="medicamento_nombre" class="th-sortable">Medicamento</th>
                <th onclick="VacunacionListPage.ordenarPor('rebano_nombre')" data-columna="rebano_nombre" class="th-sortable">Rebaño</th>
                <th onclick="VacunacionListPage.ordenarPor('total_animales')" data-columna="total_animales" class="th-sortable">Animales</th>
                <th onclick="VacunacionListPage.ordenarPor('observaciones')" data-columna="observaciones" class="th-sortable">Observaciones</th>
                <th onclick="VacunacionListPage.ordenarPor('costo_veterinario')" data-columna="costo_veterinario" class="th-sortable">Costo Vet.</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="vac-tbody">
              <tr><td colspan="7" class="loading"><div class="spinner"></div>Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `);
  },

  afterRender() { this.cargar(); },

  obtenerValor(columna, item) {
    const map = {
      fecha: item.fecha,
      medicamento_nombre: item.medicamento_nombre,
      rebano_nombre: item.rebano_nombre,
      total_animales: parseInt(item.total_animales) || 0,
      observaciones: item.observaciones,
      costo_veterinario: parseFloat(item.costo_veterinario) || 0,
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
      const { data } = await API.get('/vacunaciones');
      this.datos = data.data || [];
      this.renderTabla();
    } catch (e) {
      document.getElementById('vac-tbody').innerHTML = `<tr><td colspan="7" class="alert alert-danger">Error: ${e.message}</td></tr>`;
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
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hay vacunaciones registradas</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(v => `
      <tr>
        <td>${DateUtil.formatear(v.fecha)}</td>
        <td>${v.medicamento_nombre}</td>
        <td>${v.rebano_nombre || '-'}</td>
        <td><span class="badge badge-azul">${v.total_animales} animales</span></td>
        <td>${v.observaciones || '-'}</td>
        <td>${v.costo_veterinario ? Formateador.moneda(v.costo_veterinario) : '-'}</td>
        <td class="table-actions">
          <button class="btn btn-sm btn-secondary" onclick="Router.navegar('/vacunacion/${v.id}/editar')">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="VacunacionListPage.eliminar(${v.id})">🗑️</button>
        </td>
      </tr>
      `).join('');
    SortUtil.actualizarEncabezados('vac-tbody', this.columnaOrden, this.direccionOrden);
  },

  async eliminar(id) {
    if (!confirm('¿Eliminar esta vacunación?')) return;
    try {
      await API.delete(`/vacunaciones/${id}`);
      this.cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar');
    }
  },
};
