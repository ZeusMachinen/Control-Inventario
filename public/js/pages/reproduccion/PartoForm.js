const PartoFormPage = {
  editandoId: null,
  contadorCrias: 0,
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
        const { data: res } = await API.get(`/reproduccion/partos/${this.editandoId}`);
        editData = res.data || {};
        if (editData.crias && typeof editData.crias === 'string') {
          editData.crias = JSON.parse(editData.crias);
        }
        // Si la madre seleccionada no está en la lista (ej. inactiva), cargarla
        if (editData.animal_id && !animalsList.find(a => a.id == editData.animal_id)) {
          try {
            const { data: m } = await API.get(`/animales/${editData.animal_id}`);
            if (m.data) animalsList.unshift(m.data);
          } catch (_) {}
        }
      }

      const titulo = this.editandoId ? 'Editar Parto' : 'Registrar Parto';
      const btnTexto = this.editandoId ? 'Guardar Cambios' : 'Registrar Parto';
      const fecha = editData?.fecha ? DateUtil.formatoInput(editData.fecha) : new Date().toISOString().substring(0, 10);

      const madreSel = editData?.animal_id ? animalsList.find(a => a.id == editData.animal_id) : null;
      const madreDisplay = madreSel
        ? `${madreSel.nombre} (${DateUtil.edadTexto(madreSel.fecha_nacimiento)})`
        : 'Seleccione una madre...';

      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title"><i class="fas fa-baby me-2"></i>${titulo}</h1>
          <button class="btn btn-outline-secondary" onclick="Router.navegar('/reproduccion')"><i class="fas fa-arrow-left me-1"></i>Volver</button>
        </div>

        <div class="card">
          <div class="card-body">
            <form id="parto-form" onsubmit="PartoFormPage.guardar(event)">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Madre (Hembra) *</label>
                  <div class="parent-picker" id="madre-picker">
                    <button class="parent-picker-btn form-select text-start text-truncate" type="button"
                            data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-expanded="false"
                            id="madre-picker-btn">
                      <span id="madre-display-text">${madreDisplay}</span>
                    </button>
                    <div class="dropdown-menu shadow-sm parent-picker-menu" id="madre-picker-menu">
                      <div class="px-2 pt-2 pb-1">
                        <input type="text" class="form-control form-control-sm parent-picker-search"
                               placeholder="Buscar madre..." data-target="madre"
                               oninput="PartoFormPage.filtrarAnimalDropdown(this)"
                               onclick="event.stopPropagation()">
                      </div>
                      <div class="dropdown-divider my-1"></div>
                      <div class="parent-picker-list" id="madre-options-list">
                        ${animalsList.map(a => `
                          <button type="button" class="dropdown-item parent-option"
                                  data-id="${a.id}"
                                  data-search="${(a.nombre || '').toLowerCase()} ${(a.rebano_nombre || '').toLowerCase()}"
                                  onclick="PartoFormPage.seleccionarAnimal(event, '${a.id}')">
                            <span class="fw-medium">${(a.nombre || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
                            <small class="text-secondary ms-2">${DateUtil.edadTexto(a.fecha_nacimiento)}${a.rebano_nombre ? ' · ' + a.rebano_nombre : ''}</small>
                          </button>
                        `).join('')}
                      </div>
                    </div>
                    <input type="hidden" id="parto-animal" value="${editData?.animal_id || ''}">
                  </div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Fecha del Parto *</label>
                  <input type="date" class="form-control" id="parto-fecha" value="${fecha}" required>
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Observaciones</label>
                <textarea class="form-control" id="parto-observaciones" rows="2" placeholder="Complicaciones, atención recibida, estado de la madre...">${editData?.observaciones || ''}</textarea>
              </div>

              <div class="mb-3">
                <label class="form-label d-flex align-items-center gap-2">
                  <strong>Crías</strong>
                  <button type="button" class="btn btn-sm btn-primary" onclick="PartoFormPage.agregarCria()"><i class="fas fa-plus me-1"></i>Agregar Cría</button>
                </label>
                <div id="crias-container">
                  <p class="text-center text-secondary py-3" id="crias-empty">No hay crías registradas. Agregue al menos una.</p>
                </div>
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
      setTimeout(() => {
        this.cargarCriasExistente();
      }, 100);
    }
  },

  /** Filtra las opciones del dropdown según el texto ingresado */
  filtrarAnimalDropdown(input) {
    const search = input.value.toLowerCase();
    const list = document.getElementById('madre-options-list');
    if (!list) return;
    const options = list.querySelectorAll('.parent-option');
    options.forEach(opt => {
      const text = (opt.dataset.search || '') + ' ' + (opt.textContent || '').toLowerCase();
      opt.style.display = !search || text.includes(search) ? '' : 'none';
    });
  },

  /** Selecciona un animal del dropdown y cierra el menú */
  seleccionarAnimal(event, id) {
    document.getElementById('parto-animal').value = id;

    // Construir texto para mostrar en el botón
    const btn = event.target.closest('.dropdown-item');
    const nameEl = btn ? btn.querySelector('.fw-medium') : null;
    const smallEl = btn ? btn.querySelector('small') : null;
    const name = nameEl ? nameEl.textContent.trim() : '';
    const info = smallEl ? smallEl.textContent.trim().replace(/ · /g, ', ') : '';
    const displayText = name + (info ? ' (' + info + ')' : '');

    const displayEl = document.getElementById('madre-display-text');
    if (displayEl) displayEl.textContent = displayText;

    // Cerrar dropdown
    const toggleBtn = document.getElementById('madre-picker-btn');
    if (toggleBtn) {
      try {
        const bsDropdown = bootstrap.Dropdown.getInstance(toggleBtn);
        if (bsDropdown) bsDropdown.hide();
      } catch (_) {
        toggleBtn.classList.remove('show');
        toggleBtn.setAttribute('aria-expanded', 'false');
        const menu = document.getElementById('madre-picker-menu');
        if (menu) menu.classList.remove('show');
      }
    }
  },

  /** Cierra dropdowns al hacer clic fuera */
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

  cargarCriasExistente() {
    if (!this.editandoId) return;
    API.get(`/reproduccion/partos/${this.editandoId}`).then(({ data: res }) => {
      const editData = res.data || {};
      let crias = editData.crias || [];
      if (typeof crias === 'string') crias = JSON.parse(crias);
      if (Array.isArray(crias) && crias.length > 0) {
        crias.forEach(c => this.agregarCria(c.nombre || '', c.sexo || 'Macho', c.peso || ''));
      }
    }).catch(() => {});
  },

  agregarCria(nombre, sexo, peso) {
    this.contadorCrias++;
    const idx = this.contadorCrias;
    const container = document.getElementById('crias-container');
    const empty = document.getElementById('crias-empty');
    if (empty) empty.remove();

    const div = document.createElement('div');
    div.className = 'd-flex gap-2 mb-2 align-items-center';
    div.id = `cria-row-${idx}`;
    div.innerHTML = `
      <input type="text" class="form-control" id="cria-nombre-${idx}" placeholder="Nombre" value="${nombre || ''}" style="flex:2">
      <select class="form-select" id="cria-sexo-${idx}" style="flex:1">
        <option value="Macho" ${sexo === 'Hembra' ? '' : 'selected'}>Macho</option>
        <option value="Hembra" ${sexo === 'Hembra' ? 'selected' : ''}>Hembra</option>
      </select>
      <input type="number" step="0.1" min="0" class="form-control" id="cria-peso-${idx}" placeholder="Peso kg" value="${peso || ''}" style="flex:1">
      <button type="button" class="btn btn-outline-danger btn-sm" onclick="PartoFormPage.eliminarCria(${idx})"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(div);
  },

  eliminarCria(idx) {
    const row = document.getElementById(`cria-row-${idx}`);
    if (row) {
      row.remove();
      if (document.querySelectorAll('[id^="cria-row-"]').length === 0) {
        const container = document.getElementById('crias-container');
        if (container && !document.getElementById('crias-empty')) {
          const p = document.createElement('p');
          p.className = 'text-center text-secondary py-3';
          p.id = 'crias-empty';
          p.textContent = 'No hay crías registradas. Agregue al menos una.';
          container.appendChild(p);
        }
      }
    }
  },

  async guardar(e) {
    e.preventDefault();

    const animalId = document.getElementById('parto-animal').value;
    if (!animalId) {
      Toast.warning('Debe seleccionar una madre');
      return;
    }

    const crias = [];
    document.querySelectorAll('[id^="cria-row-"]').forEach(row => {
      const id = row.id.replace('cria-row-', '');
      const nombre = document.getElementById(`cria-nombre-${id}`)?.value || '';
      const sexo = document.getElementById(`cria-sexo-${id}`)?.value || 'Macho';
      const peso = document.getElementById(`cria-peso-${id}`)?.value || null;
      crias.push({ nombre, sexo, peso: peso ? parseFloat(peso) : null });
    });

    const payload = {
      animal_id: animalId,
      fecha: document.getElementById('parto-fecha').value,
      observaciones: document.getElementById('parto-observaciones').value || null,
      crias: crias,
    };

    try {
      if (this.editandoId) {
        await API.put(`/reproduccion/partos/${this.editandoId}`, payload);
        Toast.success('Parto actualizado');
      } else {
        await API.post('/reproduccion/partos', payload);
      }
      Router.navegar('/reproduccion');
    } catch (err) {
      Toast.error(err.response?.data?.error || 'Error al guardar');
    }
  },
};
