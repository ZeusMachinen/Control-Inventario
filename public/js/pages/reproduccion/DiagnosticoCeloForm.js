const DiagnosticoCeloFormPage = {
  editandoId: null,
  _animalesCache: [],

  async render(params) {
    this.editandoId = params?.id ? parseInt(params.id) : null;
    try {
      const { data: animals } = await API.get('/animales', {
        por_pagina: 1000, sexo: 'Hembra', edad_min: 18,
      });
      const animalsList = animals.data || [];
      this._animalesCache = animalsList;

      let editData = null;
      if (this.editandoId) {
        const { data: res } = await API.get(`/reproduccion/celos/${this.editandoId}`);
        editData = res.data || {};
        if (editData.animal_id && !animalsList.find(a => a.id == editData.animal_id)) {
          try { const { data: m } = await API.get(`/animales/${editData.animal_id}`); if (m.data) animalsList.unshift(m.data); } catch (_) {}
        }
      }

      const titulo = this.editandoId ? 'Editar Diagnóstico de Celo' : 'Registrar Diagnóstico de Celo';
      const btnTexto = this.editandoId ? 'Guardar Cambios' : 'Registrar';
      const fecha = editData?.fecha_inicio ? DateUtil.formatoInput(editData.fecha_inicio) : new Date().toISOString().substring(0, 10);

      const animalSel = editData?.animal_id ? animalsList.find(a => a.id == editData.animal_id) : null;
      const animalDisplay = animalSel
        ? `${animalSel.nombre} (${DateUtil.edadTexto(animalSel.fecha_nacimiento)})`
        : 'Seleccione una hembra...';

      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title"><i class="fas fa-search me-2"></i>${titulo}</h1>
          <button class="btn btn-outline-secondary" onclick="Router.navegar('/reproduccion')"><i class="fas fa-arrow-left me-1"></i>Volver</button>
        </div>

        <div class="card">
          <div class="card-body">
            <form id="celo-form" onsubmit="DiagnosticoCeloFormPage.guardar(event)">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Animal (Hembra) *</label>
                  <div class="parent-picker" id="celo-picker">
                    <button class="parent-picker-btn form-select text-start text-truncate" type="button"
                            data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-expanded="false"
                            id="celo-picker-btn">
                      <span id="celo-display-text">${animalDisplay}</span>
                    </button>
                    <div class="dropdown-menu shadow-sm parent-picker-menu" id="celo-picker-menu">
                      <div class="px-2 pt-2 pb-1">
                        <input type="text" class="form-control form-control-sm parent-picker-search"
                               placeholder="Buscar hembra..." data-target="celo"
                               oninput="DiagnosticoCeloFormPage.filtrarDropdown(this)"
                               onclick="event.stopPropagation()">
                      </div>
                      <div class="dropdown-divider my-1"></div>
                      <div class="parent-picker-list" id="celo-options-list">
                        ${animalsList.map(a => `
                          <button type="button" class="dropdown-item parent-option"
                                  data-id="${a.id}"
                                  data-search="${(a.nombre || '').toLowerCase()} ${(a.rebano_nombre || '').toLowerCase()}"
                                  onclick="DiagnosticoCeloFormPage.seleccionarAnimal(event, '${a.id}')">
                            <span class="fw-medium">${(a.nombre || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
                            <small class="text-secondary ms-2">${DateUtil.edadTexto(a.fecha_nacimiento)}${a.rebano_nombre ? ' · ' + a.rebano_nombre : ''}${a.estado_reproductivo ? ' · ' + a.estado_reproductivo : ''}</small>
                          </button>
                        `).join('')}
                      </div>
                    </div>
                    <input type="hidden" id="celo-animal" value="${editData?.animal_id || ''}">
                  </div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Fecha de Inicio *</label>
                  <input type="date" class="form-control" id="celo-fecha" value="${fecha}" required>
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Síntomas</label>
                <input type="text" class="form-control" id="celo-sintomas" placeholder="Ej: Vulva hinchada, secreción clara" value="${editData?.sintomas || ''}">
              </div>

              <div class="mb-3">
                <label class="form-label">Comportamiento</label>
                <select class="form-select" id="celo-comportamiento">
                  <option value="">Seleccione...</option>
                  <option value="Quieta" ${editData?.comportamiento === 'Quieta' ? 'selected' : ''}>Quieta</option>
                  <option value="Nerviosa" ${editData?.comportamiento === 'Nerviosa' ? 'selected' : ''}>Nerviosa</option>
                  <option value="Monta a otras" ${editData?.comportamiento === 'Monta a otras' ? 'selected' : ''}>Monta a otras</option>
                  <option value="Se deja montar" ${editData?.comportamiento === 'Se deja montar' ? 'selected' : ''}>Se deja montar</option>
                  <option value="Brama" ${editData?.comportamiento === 'Brama' ? 'selected' : ''}>Brama</option>
                </select>
              </div>

              <div class="mb-3">
                <label class="form-label">Observaciones</label>
                <textarea class="form-control" id="celo-observaciones" rows="2" placeholder="Detalles adicionales...">${editData?.observaciones || ''}</textarea>
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
    const list = document.getElementById('celo-options-list');
    if (!list) return;
    const options = list.querySelectorAll('.parent-option');
    options.forEach(opt => {
      const text = (opt.dataset.search || '') + ' ' + (opt.textContent || '').toLowerCase();
      opt.style.display = !search || text.includes(search) ? '' : 'none';
    });
  },

  seleccionarAnimal(event, id) {
    document.getElementById('celo-animal').value = id;

    const btn = event.target.closest('.dropdown-item');
    const nameEl = btn ? btn.querySelector('.fw-medium') : null;
    const smallEl = btn ? btn.querySelector('small') : null;
    const name = nameEl ? nameEl.textContent.trim() : '';
    const info = smallEl ? smallEl.textContent.trim().replace(/ · /g, ', ') : '';
    const displayText = name + (info ? ' (' + info + ')' : '');

    const displayEl = document.getElementById('celo-display-text');
    if (displayEl) displayEl.textContent = displayText;

    const toggleBtn = document.getElementById('celo-picker-btn');
    if (toggleBtn) {
      try {
        const bsDropdown = bootstrap.Dropdown.getInstance(toggleBtn);
        if (bsDropdown) bsDropdown.hide();
      } catch (_) {
        toggleBtn.classList.remove('show');
        toggleBtn.setAttribute('aria-expanded', 'false');
        const menu = document.getElementById('celo-picker-menu');
        if (menu) menu.classList.remove('show');
      }
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
      animal_id: document.getElementById('celo-animal').value,
      fecha_inicio: document.getElementById('celo-fecha').value,
      sintomas: document.getElementById('celo-sintomas').value || null,
      comportamiento: document.getElementById('celo-comportamiento').value || null,
      observaciones: document.getElementById('celo-observaciones').value || null,
    };

    try {
      if (this.editandoId) {
        await API.put(`/reproduccion/celos/${this.editandoId}`, payload);
        Toast.success('Diagnóstico de celo actualizado');
      } else {
        await API.post('/reproduccion/celos', payload);
      }
      Router.navegar('/reproduccion');
    } catch (err) {
      Toast.error(err.response?.data?.error || 'Error al guardar');
    }
  },
};
