const CompaniaFormPage = {
  async render() {
    try {
      const { data: animals } = await API.get('/animales', { por_pagina: 1000 });

      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title"><i class="fas fa-handshake me-2"></i>Nueva Compañía</h1>
          <button class="btn btn-outline-secondary" onclick="Router.navegar('/companias')"><i class="fas fa-arrow-left me-1"></i>Volver</button>
        </div>

        <div class="card">
          <div class="card-body">
            <form id="comp-form" onsubmit="CompaniaFormPage.guardar(event)">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Animal *</label>
                  <select class="form-select" id="comp-animal" required>
                    <option value="">Seleccione...</option>
                    ${(animals.data || []).map(a => `
                      <option value="${a.id}">${a.nombre} — ${a.sexo}</option>
                    `).join('')}
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Email del Socio *</label>
                  <input type="email" class="form-control" id="comp-socio-email" placeholder="socio@email.com" required>
                </div>
              </div>

              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Peso de Entrada (kg) *</label>
                  <input type="number" step="0.01" class="form-control" id="comp-peso" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Fecha de Entrada *</label>
                  <input type="date" class="form-control" id="comp-fecha" value="${new Date().toISOString().substring(0, 10)}" required>
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Porcentaje del Socio (%)</label>
                <input type="number" class="form-control" id="comp-porcentaje" value="50" min="1" max="99" style="max-width:120px">
              </div>

              <div class="d-flex gap-2 justify-content-end">
                <button type="button" class="btn btn-outline-secondary" onclick="Router.navegar('/companias')">Cancelar</button>
                <button type="submit" class="btn btn-primary">Crear Compañía</button>
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

    const socioEmail = document.getElementById('comp-socio-email').value;

    try {
      const payload = {
        animal_id: document.getElementById('comp-animal').value,
        socio_id: 0,
        peso_entrada: document.getElementById('comp-peso').value,
        fecha_entrada: document.getElementById('comp-fecha').value,
        porcentaje_socio: document.getElementById('comp-porcentaje').value || 50,
      };

      Toast.warning('Funcionalidad: requiere endpoint para buscar socio por email. Por ahora registramos datos de prueba.');
      Router.navegar('/companias');
    } catch (err) {
      Toast.error(err.response?.data?.error || 'Error al guardar');
    }
  },
};

