const DiagnosticoGestacionFormPage = {
  editandoId: null,
  _animalesCache: [],

  async render(params) {
    this.editandoId = params?.id ? parseInt(params.id) : null;
    try {
      const [animalsRes, serviciosRes] = await Promise.all([
        API.get('/animales', { por_pagina: 1000, sexo: 'Hembra', edad_min: 18 }),
        API.get('/reproduccion/servicios'),
      ]);

      const animals = animalsRes.data.data || [];
      const servicios = serviciosRes.data?.data || [];
      this._animalesCache = animals;

      let editData = null;
      if (this.editandoId) {
        const { data: res } = await API.get(`/reproduccion/diagnosticos-gestacion/${this.editandoId}`);
        editData = res.data || {};
        if (editData.animal_id && !animals.find(a => a.id == editData.animal_id)) {
          try { const { data: m } = await API.get(`/animales/${editData.animal_id}`); if (m.data) animals.unshift(m.data); } catch (_) {}
        }
      }

      const titulo = this.editandoId ? 'Editar Diagnóstico de Gestación' : 'Registrar Diagnóstico de Gestación';
      const btnTexto = this.editandoId ? 'Guardar Cambios' : 'Registrar Diagnóstico';
      const fecha = editData?.fecha ? DateUtil.formatoInput(editData.fecha) : new Date().toISOString().substring(0, 10);
      const editAnimalId = editData?.animal_id || '';

      const animalSel = editAnimalId ? animals.find(a => a.id == editAnimalId) : null;
      const animalDisplay = animalSel
        ? `${animalSel.nombre} (${DateUtil.edadTexto(animalSel.fecha_nacimiento)})`
        : 'Seleccione un animal...';

      // Servicios del animal seleccionado (para editar)
      const serviciosAnimal = editAnimalId ? servicios.filter(s => String(s.animal_id) === String(editAnimalId)) : [];

      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title"><i class="fas fa-stethoscope me-2"></i>${titulo}</h1>
          <button class="btn btn-outline-secondary" onclick="Router.navegar('/reproduccion')"><i class="fas fa-arrow-left me-1"></i>Volver</button>
        </div>

        <div class="card">
          <div class="card-body">
            <form id="dg-form" onsubmit="DiagnosticoGestacionFormPage.guardar(event)">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Animal *</label>
                  <div class="parent-picker" id="dg-picker">
                    <button class="parent-picker-btn form-select text-start text-truncate" type="button"
                            data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-expanded="false"
                            id="dg-picker-btn">
                      <span id="dg-display-text">${animalDisplay}</span>
                    </button>
                    <div class="dropdown-menu shadow-sm parent-picker-menu" id="dg-picker-menu">
                      <div class="px-2 pt-2 pb-1">
                        <input type="text" class="form-control form-control-sm parent-picker-search"
                               placeholder="Buscar animal..." data-target="dg"
                               oninput="DiagnosticoGestacionFormPage.filtrarDropdown(this)"
                               onclick="event.stopPropagation()">
                      </div>
                      <div class="dropdown-divider my-1"></div>
                      <div class="parent-picker-list" id="dg-options-list">
                        ${animals.map(a => `
                          <button type="button" class="dropdown-item parent-option"
                                  data-id="${a.id}"
                                  data-search="${(a.nombre || '').toLowerCase()} ${(a.rebano_nombre || '').toLowerCase()}"
                                  onclick="DiagnosticoGestacionFormPage.seleccionarAnimal(event, '${a.id}')">
                            <span class="fw-medium">${(a.nombre || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
                            <small class="text-secondary ms-2">${DateUtil.edadTexto(a.fecha_nacimiento)}${a.rebano_nombre ? ' · ' + a.rebano_nombre : ''}${a.estado_reproductivo ? ' · ' + a.estado_reproductivo : ''}</small>
                          </button>
                        `).join('')}
                      </div>
                    </div>
                    <input type="hidden" id="dg-animal" value="${editAnimalId}">
                  </div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Fecha *</label>
                  <input type="date" class="form-control" id="dg-fecha" value="${fecha}" required>
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Servicio asociado</label>
                <select class="form-select" id="dg-servicio">
                  <option value="">${editAnimalId ? 'Sin servicio asociado' : 'Seleccione un animal primero...'}</option>
                  ${serviciosAnimal.map(s => `
                    <option value="${s.id}" ${editData?.servicio_id == s.id ? 'selected' : ''}>#${s.id} — ${s.tipo} — ${DateUtil.formatear(s.fecha)}</option>
                  `).join('')}
                </select>
              </div>

              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Método *</label>
                  <select class="form-select" id="dg-metodo" required>
                    <option value="Palpación" ${editData?.metodo === 'Palpación' ? 'selected' : ''}>Palpación</option>
                    <option value="Ecografía" ${editData?.metodo === 'Ecografía' ? 'selected' : ''}>Ecografía</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Resultado *</label>
                  <select class="form-select" id="dg-resultado" required>
                    <option value="">Seleccione...</option>
                    <option value="Positivo" ${editData?.resultado === 'Positivo' ? 'selected' : ''}>Positivo — Preñada</option>
                    <option value="Negativo" ${editData?.resultado === 'Negativo' ? 'selected' : ''}>Negativo — Vacía</option>
                  </select>
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Observaciones</label>
                <textarea class="form-control" id="dg-observaciones" rows="2" placeholder="Detalles del diagnóstico...">${editData?.observaciones || ''}</textarea>
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
    this._setupDropdownClose();
  },

  filtrarDropdown(input) {
    const search = input.value.toLowerCase();
    const list = document.getElementById('dg-options-list');
    if (!list) return;
    const options = list.querySelectorAll('.parent-option');
    options.forEach(opt => {
      const text = (opt.dataset.search || '') + ' ' + (opt.textContent || '').toLowerCase();
      opt.style.display = !search || text.includes(search) ? '' : 'none';
    });
  },

  seleccionarAnimal(event, id) {
    document.getElementById('dg-animal').value = id;

    const btn = event.target.closest('.dropdown-item');
    const nameEl = btn ? btn.querySelector('.fw-medium') : null;
    const smallEl = btn ? btn.querySelector('small') : null;
    const name = nameEl ? nameEl.textContent.trim() : '';
    const info = smallEl ? smallEl.textContent.trim().replace(/ · /g, ', ') : '';
    const displayText = name + (info ? ' (' + info + ')' : '');

    const displayEl = document.getElementById('dg-display-text');
    if (displayEl) displayEl.textContent = displayText;

    const toggleBtn = document.getElementById('dg-picker-btn');
    if (toggleBtn) {
      try {
        const bsDropdown = bootstrap.Dropdown.getInstance(toggleBtn);
        if (bsDropdown) bsDropdown.hide();
      } catch (_) {
        toggleBtn.classList.remove('show');
        toggleBtn.setAttribute('aria-expanded', 'false');
        const menu = document.getElementById('dg-picker-menu');
        if (menu) menu.classList.remove('show');
      }
    }

    // Recargar servicios asociados al cambiar animal
    this.cambioAnimal();
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

  _setupDropdownClose() {
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.parent-picker')) {
        document.querySelectorAll('.parent-picker-menu.show').forEach(menu => {
          menu.classList.remove('show');
        });
        document.querySelectorAll('.parent-picker-btn.show').forEach(btn => {
          btn.classList.remove('show');
          btn.setAttribute('aria-expanded', 'false');
        });
      }
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
      if (this.editandoId) {
        await API.put(`/reproduccion/diagnosticos-gestacion/${this.editandoId}`, payload);
        Toast.success('Diagnóstico de gestación actualizado');
      } else {
        await API.post('/reproduccion/diagnosticos-gestacion', payload);
      }
      Router.navegar('/reproduccion');
    } catch (err) {
      Toast.error(err.response?.data?.error || 'Error al guardar');
    }
  },
};
