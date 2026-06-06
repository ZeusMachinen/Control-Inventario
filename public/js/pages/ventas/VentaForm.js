/**
 * Página: Formulario de Venta (nueva / editar)
 */
const VentaFormPage = {
  editandoId: null,

  async render(params) {
    this.editandoId = params?.id ? parseInt(params.id) : null;

    try {
      const { data: animals } = await API.get('/animales', { por_pagina: 1000 });

      let venta = null;
      if (this.editandoId) {
        const { data: res } = await API.get(`/ventas/${this.editandoId}`);
        venta = res.data || res;
      }

      const titulo = venta ? `Editar Venta #${venta.id}` : 'Nueva Venta / Transferencia';
      const btnTexto = venta ? 'Guardar Cambios' : 'Registrar Venta';

      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title">${titulo}</h1>
          <button class="btn btn-secondary" onclick="Router.navegar('/ventas')">Volver</button>
        </div>

        <div class="card">
          <div class="card-body">
            <form id="venta-form" onsubmit="VentaFormPage.guardar(event)">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Animal *</label>
                  <select class="form-select" id="venta-animal" required ${venta ? 'disabled' : ''}>
                    <option value="">Seleccione...</option>
                    ${(animals.data || []).map(a => `
                      <option value="${a.id}" ${venta && venta.animal_id == a.id ? 'selected' : ''}>${a.nombre} — ${a.sexo}</option>
                    `).join('')}
                  </select>
                  ${venta ? `<input type="hidden" id="venta-animal-hidden" value="${venta.animal_id}">` : ''}
                </div>
                <div class="form-group">
                  <label class="form-label">Tipo</label>
                  <select class="form-select" id="venta-tipo">
                    <option value="Venta" ${venta && venta.tipo === 'Venta' ? 'selected' : ''}>Venta</option>
                    <option value="Transferencia" ${venta && venta.tipo === 'Transferencia' ? 'selected' : ''}>Transferencia</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Precio *</label>
                  <input type="number" step="1000" class="form-input" id="venta-precio" placeholder="0"
                    value="${venta ? venta.precio : ''}" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Fecha *</label>
                  <input type="date" class="form-input" id="venta-fecha"
                    value="${venta ? venta.fecha : new Date().toISOString().substring(0, 10)}" required>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Comprador</label>
                <input type="text" class="form-input" id="venta-comprador" placeholder="Nombre del comprador o usuario interno"
                  value="${venta ? (venta.comprador_nombre || '') : ''}">
              </div>

              <div class="form-group">
                <label class="form-label">Peso de Salida (kg)</label>
                <input type="number" step="0.01" min="0" class="form-input" id="venta-peso-salida" placeholder="Ej: 460.00"
                  value="${venta ? (venta.peso_salida || '') : ''}">
              </div>

              <div class="form-group">
                <label class="form-label">Notas</label>
                <textarea class="form-textarea" id="venta-notas" placeholder="Detalles de la venta...">${venta ? (venta.notas || '') : ''}</textarea>
              </div>

              <div style="display:flex;gap:0.5rem;justify-content:flex-end">
                <button type="button" class="btn btn-secondary" onclick="Router.navegar('/ventas')">Cancelar</button>
                <button type="submit" class="btn btn-primary">${btnTexto}</button>
              </div>
            </form>
          </div>
        </div>
      `);
    } catch (e) {
      return MainLayout.render(`<div class="alert alert-danger">Error: ${e.message}</div>`);
    }
  },

  async guardar(e) {
    e.preventDefault();
    const animalId = document.getElementById('venta-animal-hidden')?.value || document.getElementById('venta-animal').value;
    const payload = {
      animal_id: parseInt(animalId),
      precio: parseFloat(document.getElementById('venta-precio').value),
      fecha: document.getElementById('venta-fecha').value,
      tipo: document.getElementById('venta-tipo').value,
      comprador_nombre: document.getElementById('venta-comprador').value || null,
      peso_salida: document.getElementById('venta-peso-salida').value || null,
      notas: document.getElementById('venta-notas').value || null,
    };

    try {
      if (this.editandoId) {
        await API.put(`/ventas/${this.editandoId}`, payload);
      } else {
        await API.post('/ventas', payload);
      }
      Router.navegar('/ventas');
    } catch (err) {
      alert(err.response?.data?.error || 'Error al guardar');
    }
  },
};
