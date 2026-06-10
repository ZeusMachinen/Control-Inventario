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
                <th onclick="VacunacionListPage.ordenarPor('gasto_monto')" data-columna="gasto_monto" class="th-sortable">Costo Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="vac-tbody">
              <tr><td colspan="8" class="loading"><div class="spinner"></div>Cargando...</td></tr>
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
      const { data } = await API.get('/vacunaciones');
      this.datos = data.data || [];
      this.renderTabla();
    } catch (e) {
      document.getElementById('vac-tbody').innerHTML = `<tr><td colspan="8" class="alert alert-danger">Error: ${e.message}</td></tr>`;
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
      tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No hay vacunaciones registradas</td></tr>';
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
        <td>${v.gasto_monto ? Formateador.moneda(v.gasto_monto) : '-'}</td>
        <td class="table-actions">
          <button class="btn btn-sm btn-secondary" onclick="VacunacionListPage.verAnimales(${v.id})">👁️</button>
          <button class="btn btn-sm btn-secondary" onclick="Router.navegar('/vacunacion/${v.id}/editar')">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="VacunacionListPage.eliminar(${v.id})">🗑️</button>
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
        <div class="modal-overlay" onclick="if(event.target===this) VacunacionListPage.cerrarModal()">
          <div class="modal" style="max-width:600px">
            <div class="modal-header">
              <span class="modal-title">Animales vacunados — ${DateUtil.formatear(v.fecha)}</span>
              <button class="modal-close" onclick="VacunacionListPage.cerrarModal()">&times;</button>
            </div>
            <div class="modal-body">
              <div style="margin-bottom:1rem;font-size:0.9rem;color:var(--texto-secundario)">
                💉 ${v.medicamento_nombre} ${v.rebano_nombre ? `· 🐑 ${v.rebano_nombre}` : ''}
              </div>
              ${!v.animales || v.animales.length === 0
                ? '<p class="empty-state">Sin animales registrados en esta vacunación</p>'
                : `<div class="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Sexo</th>
                          <th>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${v.animales.map(a => `
                          <tr>
                            <td><strong>${a.animal_nombre}</strong></td>
                            <td><span class="badge ${a.sexo === 'Macho' ? 'badge-sexo-macho' : 'badge-sexo-hembra'}">${a.sexo}</span></td>
                            <td class="table-actions">
                              <button class="btn btn-sm btn-secondary" onclick="VacunacionListPage.cerrarModal();Router.navegar('/animales/${a.animal_id}')">Ver</button>
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
      `;
      document.body.appendChild(div);
    } catch (e) {
      alert('Error al cargar animales: ' + (e.response?.data?.error || e.message));
    }
  },

  cerrarModal() {
    const el = document.getElementById('vac-animales-modal');
    if (el) el.remove();
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
