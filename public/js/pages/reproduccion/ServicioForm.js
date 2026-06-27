const ServicioFormPage = {
  editandoId: null,
  celosSinServicio: [],
  _animalesCache: [],
  _reproductoresCache: [],

  async render(params) {
    this.editandoId = params?.id ? parseInt(params.id) : null;
    try {
      const [animalsRes, reproductoresRes] = await Promise.all([
        API.get('/animales', { por_pagina: 1000, sexo: 'Hembra', edad_min: 18 }),
        API.get('/animales', { por_pagina: 1000, sexo: 'Macho', edad_min: 18 }),
      ]);

      const animals = animalsRes.data.data || [];
      const reproductores = reproductoresRes.data.data || [];
      this._animalesCache = animals;
      this._reproductoresCache = reproductores;

      try {
        const { data: celos } = await API.get('/reproduccion/celos');
        this.celosSinServicio = celos?.data || [];
      } catch (_) {}

      let editData = null;
      if (this.editandoId) {
        const { data: res } = await API.get(`/reproduccion/servicios/${this.editandoId}`);
        editData = res.data || {};
        // Si el animal/reproductor no está en las listas, cargarlos
        if (editData.animal_id && !animals.find(a => a.id == editData.animal_id)) {
          try { const { data: m } = await API.get(`/animales/${editData.animal_id}`); if (m.data) animals.unshift(m.data); } catch (_) {}
        }
        if (editData.reproductor_id && !reproductores.find(r => r.id == editData.reproductor_id)) {
          try { const { data: p } = await API.get(`/animales/${editData.reproductor_id}`); if (p.data) reproductores.unshift(p.data); } catch (_) {}
        }
      }

      const titulo = this.editandoId ? 'Editar Servicio' : 'Registrar Servicio';
      const btnTexto = this.editandoId ? 'Guardar Cambios' : 'Registrar Servicio';
      const fecha = editData?.fecha ? DateUtil.formatoInput(editData.fecha) : new Date().toISOString().substring(0, 10);

      const animalSel = editData?.animal_id ? animals.find(a => a.id == editData.animal_id) : null;
      const animalDisplay = animalSel
        ? `${animalSel.nombre} (${DateUtil.edadTexto(animalSel.fecha_nacimiento)})`
        : 'Seleccione una hembra...';

      const repSel = editData?.reproductor_id ? reproductores.find(r => r.id == editData.reproductor_id) : null;
      const repDisplay = repSel
        ? `${repSel.nombre} (${DateUtil.edadTexto(repSel.fecha_nacimiento)})`
        : 'Seleccione un reproductor...';

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
                  <div class="parent-picker" id="animal-picker">
                    <button class="parent-picker-btn form-select text-start text-truncate" type="button"
                            data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-expanded="false"
                            id="animal-picker-btn">
                      <span id="animal-display-text">${animalDisplay}</span>
                    </button>
                    <div class="dropdown-menu shadow-sm parent-picker-menu" id="animal-picker-menu">
                      <div class="px-2 pt-2 pb-1">
                        <input type="text" class="form-control form-control-sm parent-picker-search"
                               placeholder="Buscar hembra..." data-target="animal"
                               oninput="ServicioFormPage.filtrarDropdown(this, 'animal')"
                               onclick="event.stopPropagation()">
                      </div>
                      <div class="dropdown-divider my-1"></div>
                      <div class="parent-picker-list" id="animal-options-list">
                        ${animals.map(a => `
                          <button type="button" class="dropdown-item parent-option"
                                  data-id="${a.id}"
                                  data-search="${(a.nombre || '').toLowerCase()} ${(a.rebano_nombre || '').toLowerCase()}"
                                  onclick="ServicioFormPage.seleccionarAnimal(event, 'animal', '${a.id}')">
                            <span class="fw-medium">${(a.nombre || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
                            <small class="text-secondary ms-2">${DateUtil.edadTexto(a.fecha_nacimiento)}${a.rebano_nombre ? ' · ' + a.rebano_nombre : ''}${a.estado_reproductivo ? ' · ' + a.estado_reproductivo : ''}</small>
                          </button>
                        `).join('')}
                      </div>
                    </div>
                    <input type="hidden" id="servicio-animal" value="${editData?.animal_id || ''}">
                  </div>
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
                  <div class="parent-picker" id="reproductor-picker">
                    <button class="parent-picker-btn form-select text-start text-truncate" type="button"
                            data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-expanded="false"
                            id="reproductor-picker-btn">
                      <span id="reproductor-display-text">${repDisplay}</span>
                    </button>
                    <div class="dropdown-menu shadow-sm parent-picker-menu" id="reproductor-picker-menu">
                      <div class="px-2 pt-2 pb-1">
                        <input type="text" class="form-control form-control-sm parent-picker-search"
                               placeholder="Buscar reproductor..." data-target="reproductor"
                               oninput="ServicioFormPage.filtrarDropdown(this, 'reproductor')"
                               onclick="event.stopPropagation()">
                      </div>
                      <div class="dropdown-divider my-1"></div>
                      <div class="parent-picker-list" id="reproductor-options-list">
                        <button type="button" class="dropdown-item parent-option"
                                data-id=""
                                onclick="ServicioFormPage.seleccionarAnimal(event, 'reproductor', '')">
                          <span class="text-secondary fst-italic">Sin reproductor</span>
                        </button>
                        ${reproductores.map(r => `
                          <button type="button" class="dropdown-item parent-option"
                                  data-id="${r.id}"
                                  data-search="${(r.nombre || '').toLowerCase()} ${(r.rebano_nombre || '').toLowerCase()}"
                                  onclick="ServicioFormPage.seleccionarAnimal(event, 'reproductor', '${r.id}')">
                            <span class="fw-medium">${(r.nombre || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
                            <small class="text-secondary ms-2">${DateUtil.edadTexto(r.fecha_nacimiento)}${r.rebano_nombre ? ' · ' + r.rebano_nombre : ''}</small>
                          </button>
                        `).join('')}
                      </div>
                    </div>
                    <input type="hidden" id="servicio-reproductor" value="${editData?.reproductor_id || ''}">
                  </div>
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
    this._setupDropdownClose();
    if (this.editandoId) {
      this.filtrarCelos();
    }
  },

  /** Filtra opciones de un dropdown por texto */
  filtrarDropdown(input, target) {
    const search = input.value.toLowerCase();
    const list = document.getElementById(target + '-options-list');
    if (!list) return;
    const options = list.querySelectorAll('.parent-option');
    options.forEach(opt => {
      const text = (opt.dataset.search || '') + ' ' + (opt.textContent || '').toLowerCase();
      opt.style.display = !search || text.includes(search) ? '' : 'none';
    });
  },

  /** Selecciona un animal/reproductor del dropdown */
  seleccionarAnimal(event, type, id) {
    const hiddenId = type === 'animal' ? 'servicio-animal' : 'servicio-reproductor';
    document.getElementById(hiddenId).value = id;

    let displayText;
    if (!id && type === 'reproductor') {
      displayText = 'Sin reproductor';
    } else {
      const btn = event.target.closest('.dropdown-item');
      const nameEl = btn ? btn.querySelector('.fw-medium') : null;
      const smallEl = btn ? btn.querySelector('small') : null;
      const name = nameEl ? nameEl.textContent.trim() : '';
      const info = smallEl ? smallEl.textContent.trim().replace(/ · /g, ', ') : '';
      displayText = name + (info ? ' (' + info + ')' : '');
    }

    const displayEl = document.getElementById(type + '-display-text');
    if (displayEl) displayEl.textContent = displayText;

    // Cerrar dropdown
    const toggleBtn = document.getElementById(type + '-picker-btn');
    if (toggleBtn) {
      try {
        const bsDropdown = bootstrap.Dropdown.getInstance(toggleBtn);
        if (bsDropdown) bsDropdown.hide();
      } catch (_) {
        toggleBtn.classList.remove('show');
        toggleBtn.setAttribute('aria-expanded', 'false');
        const menu = document.getElementById(type + '-picker-menu');
        if (menu) menu.classList.remove('show');
      }
    }

    // Si cambió el animal, recargar celos asociados
    if (type === 'animal') this.filtrarCelos();
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
