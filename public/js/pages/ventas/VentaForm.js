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
          <h1 class="page-title"><i class="fas fa-sack-dollar me-2"></i>${titulo}</h1>
          <button class="btn btn-outline-secondary" onclick="Router.navegar('/ventas')"><i class="fas fa-arrow-left me-1"></i>Volver</button>
        </div>

        <div class="card">
          <div class="card-body">
            <form id="venta-form" onsubmit="VentaFormPage.guardar(event)">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Animal *</label>
                  <select class="form-select" id="venta-animal" required ${venta ? 'disabled' : ''}>
                    <option value="">Seleccione...</option>
                    ${(animals.data || []).map(a => `
                      <option value="${a.id}" ${venta && venta.animal_id == a.id ? 'selected' : ''}>${a.nombre} — ${a.sexo}</option>
                    `).join('')}
                  </select>
                  ${venta ? `<input type="hidden" id="venta-animal-hidden" value="${venta.animal_id}">` : ''}
                </div>
                <div class="col-md-6">
                  <label class="form-label">Tipo</label>
                  <select class="form-select" id="venta-tipo">
                    <option value="Venta" ${venta && venta.tipo === 'Venta' ? 'selected' : ''}>Venta</option>
                    <option value="Transferencia" ${venta && venta.tipo === 'Transferencia' ? 'selected' : ''}>Transferencia</option>
                  </select>
                </div>
              </div>

              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Precio *</label>
                  <input type="number" step="1000" class="form-control" id="venta-precio" placeholder="0" value="${venta ? venta.precio : ''}" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Fecha *</label>
                  <input type="date" class="form-control" id="venta-fecha" value="${venta ? venta.fecha : new Date().toISOString().substring(0, 10)}" required>
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Comprador</label>
                <input type="text" class="form-control" id="venta-comprador" placeholder="Nombre del comprador o usuario interno" value="${venta ? (venta.comprador_nombre || '') : ''}">
              </div>

              <div class="mb-3">
                <label class="form-label">Peso de Salida (kg)</label>
                <input type="number" step="0.01" min="0" class="form-control" id="venta-peso-salida" placeholder="Ej: 460.00" value="${venta ? (venta.peso_salida || '') : ''}">
              </div>

              <div class="mb-3">
                <label class="form-label">Notas</label>
                <textarea class="form-control" id="venta-notas" rows="2" placeholder="Detalles de la venta...">${venta ? (venta.notas || '') : ''}</textarea>
              </div>

              <div class="d-flex gap-2 justify-content-end">
                <button type="button" class="btn btn-outline-secondary" onclick="Router.navegar('/ventas')">Cancelar</button>
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
      Toast.error(err.response?.data?.error || 'Error al guardar');
    }
  },
};
