/**
 * Página: Formulario de Diagnóstico de Gestación
 * POST /api/reproduccion/diagnosticos-gestacion
 */
const DiagnosticoGestacionFormPage = {
  async render() {
    try {
      const [animalsRes, serviciosRes] = await Promise.all([
        API.get('/animales', { por_pagina: 1000, sexo: 'Hembra' }),
        API.get('/reproduccion/servicios'),
      ]);

      const animals = animalsRes.data.data || [];
      const servicios = serviciosRes.data?.data || [];

      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title">Registrar Diagnóstico de Gestación</h1>
          <button class="btn btn-secondary" onclick="Router.navegar('/reproduccion')">Volver</button>
        </div>

        <div class="card">
          <div class="card-body">
            <form id="dg-form" onsubmit="DiagnosticoGestacionFormPage.guardar(event)">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Animal *</label>
                  <select class="form-select" id="dg-animal" required
                    onchange="DiagnosticoGestacionFormPage.cambioAnimal()">
                    <option value="">Seleccione...</option>
                    ${animals.map(a => `
                      <option value="${a.id}">${a.nombre} — ${DateUtil.edadTexto(a.fecha_nacimiento)}</option>
                    `).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Fecha *</label>
                  <input type="date" class="form-input" id="dg-fecha"
                    value="${new Date().toISOString().substring(0, 10)}" required>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Servicio asociado</label>
                <select class="form-select" id="dg-servicio">
                  <option value="">Seleccione un animal primero...</option>
                </select>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Método *</label>
                  <select class="form-select" id="dg-metodo" required>
                    <option value="Palpación">Palpación</option>
                    <option value="Ecografía">Ecografía</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Resultado *</label>
                  <select class="form-select" id="dg-resultado" required>
                    <option value="">Seleccione...</option>
                    <option value="Positivo">Positivo — Preñada</option>
                    <option value="Negativo">Negativo — Vacía</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Observaciones</label>
                <textarea class="form-textarea" id="dg-observaciones"
                  placeholder="Detalles del diagnóstico..."></textarea>
              </div>

              <div style="display:flex;gap:0.5rem;justify-content:flex-end">
                <button type="button" class="btn btn-secondary" onclick="Router.navegar('/reproduccion')">Cancelar</button>
                <button type="submit" class="btn btn-primary">Registrar Diagnóstico</button>
              </div>
            </form>
          </div>
        </div>
      `);
    } catch (e) {
      return MainLayout.render(`<div class="alert alert-danger">Error: ${e.message}</div>`);
    }
  },

  cambioAnimal() {
    const animalId = document.getElementById('dg-animal').value;
    const select = document.getElementById('dg-servicio');

    // This will be populated if servicios were pre-fetched
    // For now, show a message or fetch servicios for this animal
    if (!animalId) {
      select.innerHTML = '<option value="">Seleccione un animal primero...</option>';
      return;
    }

    // Filter servicios for this animal from pre-fetched data
    // The servicios were loaded in render, need to filter client-side
    select.innerHTML = '<option value="">Cargando...</option>';

    // Re-fetch servicios filtered
    API.get('/reproduccion/servicios').then(({ data: res }) => {
      const servicios = res?.data || [];
      const filtrados = servicios.filter(s => String(s.animal_id) === animalId);
      if (filtrados.length === 0) {
        select.innerHTML = '<option value="">Sin servicios registrados</option>';
        return;
      }
      select.innerHTML = '<option value="">Seleccione...</option>' +
        filtrados.map(s =>
          `<option value="${s.id}">#${s.id} — ${s.tipo} — ${DateUtil.formatear(s.fecha)}</option>`
        ).join('');
    }).catch(() => {
      select.innerHTML = '<option value="">Error al cargar servicios</option>';
    });
  },

  async guardar(e) {
    e.preventDefault();
    const payload = {
      servicio_id: document.getElementById('dg-servicio').value,
      fecha: document.getElementById('dg-fecha').value,
      metodo: document.getElementById('dg-metodo').value,
      resultado: document.getElementById('dg-resultado').value,
      observaciones: document.getElementById('dg-observaciones').value || null,
    };

    if (!payload.servicio_id) {
      alert('Debe seleccionar un servicio asociado');
      return;
    }

    try {
      await API.post('/reproduccion/diagnosticos-gestacion', payload);
      Router.navegar('/reproduccion');
    } catch (err) {
      alert(err.response?.data?.error || 'Error al guardar');
    }
  },
};
