/**
 * Página: Listado de Rebaños
 */
const RebanoListPage = {
  async render() {
    return MainLayout.render(`
      <div class="page-header">
        <h1 class="page-title">🐑 Rebaños</h1>
        <button class="btn btn-primary" onclick="RebanoListPage.mostrarFormulario()">+ Nuevo Rebaño</button>
      </div>

      <div class="card" id="rebanos-contenedor">
        <div class="table-container">
          <table>
            <thead>
              <tr><th>Nombre</th><th>Animales</th><th>Acciones</th></tr>
            </thead>
            <tbody id="rebanos-tbody">
              <tr><td colspan="3" class="loading"><div class="spinner"></div>Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal -->
      <div id="rebano-modal"></div>
    `);
  },

  afterRender() { this.cargar(); },

  async cargar() {
    try {
      const { data } = await API.get('/rebanos');
      const rebanos = data.data || [];
      const tbody = document.getElementById('rebanos-tbody');

      if (rebanos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty-state">No hay rebaños creados</td></tr>';
        return;
      }

      tbody.innerHTML = rebanos.map(r => `
        <tr>
          <td><strong>${r.nombre}</strong></td>
          <td><span class="badge badge-verde">${r.total_animales} animales</span></td>
          <td class="table-actions">
            <button class="btn btn-sm btn-secondary" onclick="RebanoListPage.editar(${r.id}, '${r.nombre}')">✏️</button>
            <button class="btn btn-sm btn-danger" onclick="RebanoListPage.eliminar(${r.id}, '${r.nombre}')">🗑️</button>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      document.getElementById('rebanos-tbody').innerHTML = `<tr><td colspan="3" class="alert alert-danger">Error: ${e.message}</td></tr>`;
    }
  },

  mostrarFormulario() {
    document.getElementById('rebano-modal').innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this)RebanoListPage.cerrarModal()">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-title">Nuevo Rebaño</span>
            <button class="modal-close" onclick="RebanoListPage.cerrarModal()">&times;</button>
          </div>
          <div class="modal-body">
            <form id="rebano-form" onsubmit="RebanoListPage.guardar(event)">
              <div class="form-group">
                <label class="form-label">Nombre del Rebaño *</label>
                <input type="text" class="form-input" id="rebano-nombre" placeholder="Ej: Rebaño Norte" required>
              </div>
              <div style="display:flex;gap:0.5rem;justify-content:flex-end;margin-top:1rem">
                <button type="button" class="btn btn-secondary" onclick="RebanoListPage.cerrarModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Crear</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  },

  async guardar(e) {
    e.preventDefault();
    const nombre = document.getElementById('rebano-nombre').value;
    try {
      await API.post('/rebanos', { nombre });
      this.cerrarModal();
      this.cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al guardar');
    }
  },

  async editar(id, nombreActual) {
    document.getElementById('rebano-modal').innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this)RebanoListPage.cerrarModal()">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-title">Editar Rebaño</span>
            <button class="modal-close" onclick="RebanoListPage.cerrarModal()">&times;</button>
          </div>
          <div class="modal-body">
            <form id="rebano-form" onsubmit="RebanoListPage.actualizar(event, ${id})">
              <div class="form-group">
                <label class="form-label">Nombre del Rebaño *</label>
                <input type="text" class="form-input" id="rebano-nombre" value="${nombreActual}" required>
              </div>
              <div style="display:flex;gap:0.5rem;justify-content:flex-end;margin-top:1rem">
                <button type="button" class="btn btn-secondary" onclick="RebanoListPage.cerrarModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  },

  async actualizar(e, id) {
    e.preventDefault();
    const nombre = document.getElementById('rebano-nombre').value;
    try {
      await API.put(`/rebanos/${id}`, { nombre });
      this.cerrarModal();
      this.cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al actualizar');
    }
  },

  async eliminar(id, nombre) {
    if (!confirm(`¿Eliminar el rebaño "${nombre}"?`)) return;
    try {
      await API.delete(`/rebanos/${id}`);
      this.cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar');
    }
  },

  cerrarModal() {
    document.getElementById('rebano-modal').innerHTML = '';
  },
};
