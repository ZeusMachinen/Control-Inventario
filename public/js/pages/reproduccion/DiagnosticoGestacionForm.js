const DiagnosticoGestacionFormPage = {
  async render() {
    try {
      const [animalsRes, serviciosRes] = await Promise.all([
        API.get('/animales', { por_pagina: 1000, sexo: 'Hembra', edad_min: 15 }),
        API.get('/reproduccion/servicios'),
      ]);

      const animals = animalsRes.data.data || [];
      const servicios = serviciosRes.data?.data || [];

      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title"><i class="fas fa-stethoscope me-2"></i>Registrar Diagnóstico de Gestación</h1>
          <button class="btn btn-outline-secondary" onclick="Router.navegar('/reproduccion')"><i class="fas fa-arrow-left me-1"></i>Volver</button>
        </div>

        <div class="card">
          <div class="card-body">
            <form id="dg-form" onsubmit="DiagnosticoGestacionFormPage.guardar(event)">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Animal *</label>
                  <select class="form-select" id="dg-animal" required onchange="DiagnosticoGestacionFormPage.cambioAnimal()">
                    <option value="">Seleccione...</option>
                    ${animals.map(a => `
                      <option value="${a.id}">${a.nombre} — ${DateUtil.edadTexto(a.fecha_nacimiento)}</option>
                    `).join('')}
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Fecha *</label>
                  <input type="date" class="form-control" id="dg-fecha" value="${new Date().toISOString().substring(0, 10)}" required>
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Servicio asociado</label>
                <select class="form-select" id="dg-servicio">
                  <option value="">Seleccione un animal primero...</option>
                </select>
              </div>

              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Método *</label>
                  <select class="form-select" id="dg-metodo" required>
                    <option value="Palpación">Palpación</option>
                    <option value="Ecografía">Ecografía</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Resultado *</label>
                  <select class="form-select" id="dg-resultado" required>
                    <option value="">Seleccione...</option>
                    <option value="Positivo">Positivo — Preñada</option>
                    <option value="Negativo">Negativo — Vacía</option>
                  </select>
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Observaciones</label>
                <textarea class="form-control" id="dg-observaciones" rows="2" placeholder="Detalles del diagnóstico..."></textarea>
              </div>

              <div class="d-flex gap-2 justify-content-end">
                <button type="button" class="btn btn-outline-secondary" onclick="Router.navegar('/reproduccion')">Cancelar</button>
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

    if (!animalId) {
      select.innerHTML = '<option value="">Seleccione un animal primero...</option>';
      return;
    }

    select.innerHTML = '<option value="">Cargando...</option>';

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
      animal_id: document.getElementById('dg-animal').value,
      servicio_id: document.getElementById('dg-servicio').value || null,
      fecha: document.getElementById('dg-fecha').value,
      metodo: document.getElementById('dg-metodo').value,
      resultado: document.getElementById('dg-resultado').value,
      observaciones: document.getElementById('dg-observaciones').value || null,
    };

    try {
      await API.post('/reproduccion/diagnosticos-gestacion', payload);
      Router.navegar('/reproduccion');
    } catch (err) {
      Toast.error(err.response?.data?.error || 'Error al guardar');
    }
  },
};
