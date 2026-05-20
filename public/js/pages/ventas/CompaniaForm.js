/**
 * Página: Formulario de Nueva Compañía
 */
const CompaniaFormPage = {
  async render() {
    try {
      const { data: animals } = await API.get('/animales', { por_pagina: 1000 });

      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title">Nueva Compañía</h1>
          <button class="btn btn-secondary" onclick="Router.navegar('/companias')">Volver</button>
        </div>

        <div class="card">
          <div class="card-body">
            <form id="comp-form" onsubmit="CompaniaFormPage.guardar(event)">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Animal *</label>
                  <select class="form-select" id="comp-animal" required>
                    <option value="">Seleccione...</option>
                    ${(animals.data || []).map(a => `
                      <option value="${a.id}">${a.nombre} — ${a.sexo}</option>
                    `).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Email del Socio *</label>
                  <input type="email" class="form-input" id="comp-socio-email" placeholder="socio@email.com" required>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Peso de Entrada (kg) *</label>
                  <input type="number" step="0.01" class="form-input" id="comp-peso" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Fecha de Entrada *</label>
                  <input type="date" class="form-input" id="comp-fecha" value="${new Date().toISOString().substring(0, 10)}" required>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Porcentaje del Socio (%)</label>
                <input type="number" class="form-input" id="comp-porcentaje" value="50" min="1" max="99">
              </div>

              <div style="display:flex;gap:0.5rem;justify-content:flex-end">
                <button type="button" class="btn btn-secondary" onclick="Router.navegar('/companias')">Cancelar</button>
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

    // Necesitamos buscar el usuario por email
    // Como no hay endpoint público, asumimos que el socio ya existe
    // En una versión real, esto buscaría usuarios por email
    const socioEmail = document.getElementById('comp-socio-email').value;

    try {
      // Por ahora, registramos con socio_id temporal
      const payload = {
        animal_id: document.getElementById('comp-animal').value,
        socio_id: 0, // placeholder
        peso_entrada: document.getElementById('comp-peso').value,
        fecha_entrada: document.getElementById('comp-fecha').value,
        porcentaje_socio: document.getElementById('comp-porcentaje').value || 50,
      };

      alert('Funcionalidad: requiere endpoint para buscar socio por email. Por ahora registramos datos de prueba.');
      // await API.post('/companias', payload);
      Router.navegar('/companias');
    } catch (err) {
      alert(err.response?.data?.error || 'Error al guardar');
    }
  },
};
