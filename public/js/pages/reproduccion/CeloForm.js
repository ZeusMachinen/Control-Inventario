/**
 * Página: Formulario de Registro de Celo
 */
const CeloFormPage = {
  async render() {
    try {
      const { data: animals } = await API.get('/animales', { por_pagina: 1000, sexo: 'Hembra' });

      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title">Registrar Ciclo de Celo</h1>
          <button class="btn btn-secondary" onclick="Router.navegar('/celos')">Volver</button>
        </div>

        <div class="card">
          <div class="card-body">
            <form id="celo-form" onsubmit="CeloFormPage.guardar(event)">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Animal (Hembra) *</label>
                  <select class="form-select" id="celo-animal" required>
                    <option value="">Seleccione...</option>
                    ${(animals.data || []).map(a => `
                      <option value="${a.id}">${a.nombre} — ${DateUtil.edadTexto(a.fecha_nacimiento)}</option>
                    `).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Fecha de Inicio *</label>
                  <input type="date" class="form-input" id="celo-fecha" value="${new Date().toISOString().substring(0, 10)}" required>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">
                  <input type="checkbox" id="celo-servicio" onchange="CeloFormPage.cambioServicio()">
                  Se realizó servicio (monta/inseminación)
                </label>
              </div>

              <div id="celo-fecha-servicio-group" class="form-group" style="display:none">
                <label class="form-label">Fecha del Servicio</label>
                <input type="date" class="form-input" id="celo-fecha-servicio" value="${new Date().toISOString().substring(0, 10)}">
              </div>

              <div class="form-group">
                <label class="form-label">Observaciones</label>
                <textarea class="form-textarea" id="celo-observaciones" placeholder="Síntomas, comportamiento, torre utilizado..."></textarea>
              </div>

              <div style="display:flex;gap:0.5rem;justify-content:flex-end">
                <button type="button" class="btn btn-secondary" onclick="Router.navegar('/celos')">Cancelar</button>
                <button type="submit" class="btn btn-primary">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      `);
    } catch (e) {
      return MainLayout.render(`<div class="alert alert-danger">Error: ${e.message}</div>`);
    }
  },

  cambioServicio() {
    document.getElementById('celo-fecha-servicio-group').style.display =
      document.getElementById('celo-servicio').checked ? '' : 'none';
  },

  async guardar(e) {
    e.preventDefault();
    const payload = {
      animal_id: document.getElementById('celo-animal').value,
      fecha_inicio: document.getElementById('celo-fecha').value,
      servicio_realizado: document.getElementById('celo-servicio').checked ? 1 : 0,
      observaciones: document.getElementById('celo-observaciones').value,
    };

    try {
      await API.post('/celos', payload);
      Router.navegar('/celos');
    } catch (err) {
      alert(err.response?.data?.error || 'Error al guardar');
    }
  },
};
