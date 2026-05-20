/**
 * Página: Listado de Vacunaciones
 */
const VacunacionListPage = {
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
              <tr><th>Fecha</th><th>Medicamento</th><th>Rebaño</th><th>Animales</th><th>Observaciones</th><th>Acciones</th></tr>
            </thead>
            <tbody id="vac-tbody">
              <tr><td colspan="6" class="loading"><div class="spinner"></div>Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `);
  },

  afterRender() { this.cargar(); },

  async cargar() {
    try {
      const { data } = await API.get('/vacunaciones');
      const list = data.data || [];
      const tbody = document.getElementById('vac-tbody');

      if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No hay vacunaciones registradas</td></tr>';
        return;
      }

      tbody.innerHTML = list.map(v => `
        <tr>
          <td>${DateUtil.formatear(v.fecha)}</td>
          <td>${v.medicamento_nombre}</td>
          <td>${v.rebano_nombre || '-'}</td>
          <td><span class="badge badge-azul">${v.total_animales} animales</span></td>
          <td>${v.observaciones || '-'}</td>
          <td class="table-actions">
            <button class="btn btn-sm btn-danger" onclick="VacunacionListPage.eliminar(${v.id})">🗑️</button>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      document.getElementById('vac-tbody').innerHTML = `<tr><td colspan="6" class="alert alert-danger">Error: ${e.message}</td></tr>`;
    }
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
