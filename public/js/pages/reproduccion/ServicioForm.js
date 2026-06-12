const ServicioFormPage = {
  editandoId: null,
  celosSinServicio: [],

  async render(params) {
    this.editandoId = params?.id ? parseInt(params.id) : null;
    try {
      const [animalsRes, reproductoresRes] = await Promise.all([
        API.get('/animales', { por_pagina: 1000, sexo: 'Hembra', edad_min: 15 }),
        API.get('/animales', { por_pagina: 1000, sexo: 'Macho', edad_min: 15 }),
      ]);

      const animals = animalsRes.data.data || [];
      const reproductores = reproductoresRes.data.data || [];

      try {
        const { data: celos } = await API.get('/reproduccion/celos');
        this.celosSinServicio = celos?.data || [];
      } catch (_) {}

      let editData = null;
      if (this.editandoId) {
        const { data: res } = await API.get(`/reproduccion/servicios/${this.editandoId}`);
        editData = res.data || {};
      }

      const titulo = this.editandoId ? 'Editar Servicio' : 'Registrar Servicio';
      const btnTexto = this.editandoId ? 'Guardar Cambios' : 'Registrar Servicio';
      const fecha = editData?.fecha ? DateUtil.formatoInput(editData.fecha) : new Date().toISOString().substring(0, 10);

      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title"><i class="fas fa-handshake me-2"></i>${titulo}</h1>
          <button class="btn btn-outline-secondary" onclick="Router.navegar('/reproduccion')"><i class="fas fa-arrow-left me-1"></i>Volver</button>
        </div>

        <div class="card">
          <div class="card-body">
            <form id="servicio-form" onsubmit="ServicioFormPage.guardar(event)">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Animal (Hembra) *</label>
                  <select class="form-select" id="servicio-animal" required onchange="ServicioFormPage.filtrarCelos()">
                    <option value="">Seleccione...</option>
                    ${animals.map(a => `
                      <option value="${a.id}" ${editData?.animal_id == a.id ? 'selected' : ''}>${a.nombre} — ${DateUtil.edadTexto(a.fecha_nacimiento)}</option>
                    `).join('')}
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Tipo de Servicio *</label>
                  <select class="form-select" id="servicio-tipo" required>
                    <option value="Monta Natural" ${editData?.tipo === 'Monta Natural' ? 'selected' : ''}>Monta Natural</option>
                    <option value="Inseminación Artificial" ${editData?.tipo === 'Inseminación Artificial' ? 'selected' : ''}>Inseminación Artificial</option>
                    <option value="Transferencia de Embriones" ${editData?.tipo === 'Transferencia de Embriones' ? 'selected' : ''}>Transferencia de Embriones</option>
                  </select>
                </div>
              </div>

              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Reproductor (Macho)</label>
                  <select class="form-select" id="servicio-reproductor">
                    <option value="">Seleccione...</option>
                    ${reproductores.map(r => `
                      <option value="${r.id}" ${editData?.reproductor_id == r.id ? 'selected' : ''}>${r.nombre}</option>
                    `).join('')}
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Nombre del Reproductor</label>
                  <input type="text" class="form-control" id="servicio-reproductor-nombre" placeholder="Nombre alternativo" value="${editData?.reproductor_nombre || ''}">
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Diagnóstico de Celo asociado</label>
                <select class="form-select" id="servicio-celo">
                  <option value="">Sin diagnóstico asociado</option>
                </select>
              </div>

              <div class="mb-3">
                <label class="form-label">Fecha del Servicio *</label>
                <input type="date" class="form-control" id="servicio-fecha" value="${fecha}" required style="max-width:250px">
              </div>

              <div class="mb-3">
                <label class="form-label">Observaciones</label>
                <textarea class="form-control" id="servicio-observaciones" rows="2" placeholder="Detalles del servicio...">${editData?.observaciones || ''}</textarea>
              </div>

              <div class="d-flex gap-2 justify-content-end">
                <button type="button" class="btn btn-outline-secondary" onclick="Router.navegar('/reproduccion')">Cancelar</button>
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

  afterRender() {
    if (this.editandoId) {
      this.filtrarCelos();
    }
  },

  filtrarCelos() {
    const animalId = document.getElementById('servicio-animal').value;
    const select = document.getElementById('servicio-celo');
    select.innerHTML = '<option value="">Sin diagnóstico asociado</option>';
    if (animalId) {
      this.celosSinServicio
        .filter(c => c.animal_id == animalId)
        .forEach(c => {
          select.innerHTML += `<option value="${c.id}">#${c.id} — ${DateUtil.formatear(c.fecha_inicio)}</option>`;
        });
    }
  },

  async guardar(e) {
    e.preventDefault();
    const payload = {
      animal_id: document.getElementById('servicio-animal').value,
      tipo: document.getElementById('servicio-tipo').value,
      fecha: document.getElementById('servicio-fecha').value,
      reproductor_id: document.getElementById('servicio-reproductor').value || null,
      reproductor_nombre: document.getElementById('servicio-reproductor-nombre').value || null,
      diagnostico_celo_id: document.getElementById('servicio-celo').value || null,
      observaciones: document.getElementById('servicio-observaciones').value || null,
    };

    try {
      if (this.editandoId) {
        await API.put(`/reproduccion/servicios/${this.editandoId}`, payload);
        Toast.success('Servicio actualizado');
      } else {
        await API.post('/reproduccion/servicios', payload);
      }
      Router.navegar('/reproduccion');
    } catch (err) {
      Toast.error(err.response?.data?.error || 'Error al guardar');
    }
  },
};
