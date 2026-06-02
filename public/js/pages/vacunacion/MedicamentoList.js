/**
 * Página: Inventario de Medicamentos
 */
const MedicamentoListPage = {
  async render() {
    return MainLayout.render(`
      <div class="page-header">
        <h1 class="page-title">📦 Medicamentos</h1>
        <button class="btn btn-primary" onclick="MedicamentoListPage.mostrarFormulario()">+ Nuevo Medicamento</button>
      </div>

      <div class="card">
        <div class="table-container">
          <table>
              <thead>
                <tr><th>Nombre</th><th>Cantidad</th><th>Presentación</th><th>Precio</th><th>Vencimiento</th><th>Acciones</th></tr>
            </thead>
            <tbody id="med-tbody">
              <tr><td colspan="6" class="loading"><div class="spinner"></div>Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div id="med-modal"></div>
    `);
  },

  afterRender() { this.cargar(); },

  async cargar() {
    try {
      const { data } = await API.get('/medicamentos');
      const list = data.data || [];
      const tbody = document.getElementById('med-tbody');

      if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No hay medicamentos registrados</td></tr>';
        return;
      }

      tbody.innerHTML = list.map(m => `
        <tr>
          <td><strong>${m.nombre}</strong></td>
          <td><strong>${parseInt(m.stock)}</strong></td>
          <td>${m.unidad}</td>
          <td>${m.precio ? Formateador.moneda(m.precio) : '-'}</td>
          <td>${m.fecha_vencimiento ? DateUtil.formatear(m.fecha_vencimiento) : '-'}</td>
          <td class="table-actions">
            <button class="btn btn-sm btn-secondary" onclick="MedicamentoListPage.editar(${m.id})">✏️</button>
            <button class="btn btn-sm btn-danger" onclick="MedicamentoListPage.eliminar(${m.id})">🗑️</button>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      document.getElementById('med-tbody').innerHTML = `<tr><td colspan="6" class="alert alert-danger">Error: ${e.message}</td></tr>`;
    }
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
      <div class="modal-overlay" onclick="if(event.target===this)MedicamentoListPage.cerrarModal()">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-title">${titulo}</span>
            <button class="modal-close" onclick="MedicamentoListPage.cerrarModal()">&times;</button>
          </div>
          <div class="modal-body">
            <form id="med-form" onsubmit="MedicamentoListPage.guardar(event, ${id || 'null'})">
              <div class="form-group">
                <label class="form-label">Nombre *</label>
                <input type="text" class="form-input" id="med-nombre" required>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Cantidad (unidades enteras)</label>
                  <input type="number" step="1" min="0" class="form-input" id="med-stock" value="0">
                </div>
                <div class="form-group">
                  <label class="form-label">Presentación *</label>
                  <input type="text" class="form-input" id="med-unidad" placeholder="Ej: frasco, dosis, ml" required>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Precio por Unidad</label>
                <input type="number" step="0.01" min="0" class="form-input" id="med-precio" placeholder="0.00">
              </div>
              <div class="form-group">
                <label class="form-label">Descripción</label>
                <textarea class="form-textarea" id="med-descripcion"></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Fecha de Vencimiento</label>
                <input type="date" class="form-input" id="med-vencimiento">
              </div>
              <div style="display:flex;gap:0.5rem;justify-content:flex-end">
                <button type="button" class="btn btn-secondary" onclick="MedicamentoListPage.cerrarModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Guardar</button>
              </div>
            </form>
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
    } catch (e) { /* ignore */ }
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
      alert(err.response?.data?.error || 'Error al guardar');
    }
  },

  async eliminar(id) {
    if (!confirm('¿Eliminar este medicamento?')) return;
    try {
      await API.delete(`/medicamentos/${id}`);
      this.cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar');
    }
  },

  cerrarModal() { document.getElementById('med-modal').innerHTML = ''; },
};
