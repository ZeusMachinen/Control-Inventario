/**
 * Página: Formulario de Diagnóstico de Celo
 * POST /api/reproduccion/celos
 */
const DiagnosticoCeloFormPage = {
  async render() {
    try {
      const { data: animals } = await API.get('/animales', {
        por_pagina: 1000,
        sexo: 'Hembra',
        edad_min: 15,
      });

      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title">Registrar Diagnóstico de Celo</h1>
          <button class="btn btn-secondary" onclick="Router.navegar('/reproduccion')">Volver</button>
        </div>

        <div class="card">
          <div class="card-body">
            <form id="celo-form" onsubmit="DiagnosticoCeloFormPage.guardar(event)">
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
                  <input type="date" class="form-input" id="celo-fecha"
                    value="${new Date().toISOString().substring(0, 10)}" required>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Síntomas</label>
                <input type="text" class="form-input" id="celo-sintomas"
                  placeholder="Ej: Vulva hinchada, secreción clara">
              </div>

              <div class="form-group">
                <label class="form-label">Comportamiento</label>
                <select class="form-select" id="celo-comportamiento">
                  <option value="">Seleccione...</option>
                  <option value="Quieta">Quieta</option>
                  <option value="Nerviosa">Nerviosa</option>
                  <option value="Monta a otras">Monta a otras</option>
                  <option value="Se deja montar">Se deja montar</option>
                  <option value="Brama">Brama</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Observaciones</label>
                <textarea class="form-textarea" id="celo-observaciones"
                  placeholder="Detalles adicionales..."></textarea>
              </div>

              <div style="display:flex;gap:0.5rem;justify-content:flex-end">
                <button type="button" class="btn btn-secondary" onclick="Router.navegar('/reproduccion')">Cancelar</button>
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

  async guardar(e) {
    e.preventDefault();
    const payload = {
      animal_id: document.getElementById('celo-animal').value,
      fecha_inicio: document.getElementById('celo-fecha').value,
      sintomas: document.getElementById('celo-sintomas').value || null,
      comportamiento: document.getElementById('celo-comportamiento').value || null,
      observaciones: document.getElementById('celo-observaciones').value || null,
    };

    try {
      await API.post('/reproduccion/celos', payload);
      Router.navegar('/reproduccion');
    } catch (err) {
      alert(err.response?.data?.error || 'Error al guardar');
    }
  },
};
