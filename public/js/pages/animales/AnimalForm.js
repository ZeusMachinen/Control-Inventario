/**
 * Página: Formulario de Animal (crear/editar)
 */
const AnimalFormPage = {
  editandoId: null,
  estadoOriginal: '',
  /** Datos cacheados de madres y padres para validación en guardar() */
  parentCache: { madres: [], padres: [] },

  async render(params) {
    const editando = !!params.id;
    this.editandoId = editando ? parseInt(params.id) : null;
    this.estadoOriginal = '';
    this.parentCache = { madres: [], padres: [] };

    try {
      const { data: rebanos } = await API.get('/rebanos');

      // Obtener todas las hembras candidatas a madre (≥12 meses, estados válidos, incluyendo inactivas)
      const { data: resMadres } = await API.get('/animales', {
        por_pagina: 500,
        sexo: 'Hembra',
        edad_min: 12,
        incluir_inactivos: 1,
      });
      const madres = (resMadres.data || []).filter(a =>
        ['Vacia', 'Prenada', 'Lactando'].includes(a.estado_reproductivo)
      ).map(a => {
        a._inactivo = !a.activo || a.estado_general === 'Muerto' || a.estado_general === 'Vendido';
        return a;
      }).filter(a => {
        // Si está inactivo hace más de 12 meses, no puede ser padre biológico
        if (a._inactivo && a.fecha_salida) {
          const mesesDesdeBaja = DateUtil.calcularEdad(a.fecha_salida).totalMeses;
          return mesesDesdeBaja <= 12;
        }
        return true;
      });

      // Obtener todos los machos candidatos a padre (≥18 meses, estados válidos, incluyendo inactivos)
      const { data: resPadres } = await API.get('/animales', {
        por_pagina: 500,
        sexo: 'Macho',
        edad_min: 18,
        incluir_inactivos: 1,
      });
      const padres = (resPadres.data || []).filter(a =>
        ['Padrote', 'Ceba'].includes(a.estado_reproductivo)
      ).map(a => {
        a._inactivo = !a.activo || a.estado_general === 'Muerto' || a.estado_general === 'Vendido';
        return a;
      }).filter(a => {
        // Si está inactivo hace más de 12 meses, no puede ser padre biológico
        if (a._inactivo && a.fecha_salida) {
          const mesesDesdeBaja = DateUtil.calcularEdad(a.fecha_salida).totalMeses;
          return mesesDesdeBaja <= 12;
        }
        return true;
      });

      this.parentCache = { madres, padres };

      let animal = {};
      if (editando) {
        const { data } = await API.get(`/animales/${params.id}`);
        animal = data.data || {};
        this.estadoOriginal = animal.estado_reproductivo || '';

        // Si está editando y la madre/padre actual no está en las listas filtradas,
        // cargarlos individualmente para que sigan apareciendo como opción
        if (animal.madre_id && !madres.find(m => m.id == animal.madre_id)) {
          try {
            const { data: mData } = await API.get(`/animales/${animal.madre_id}`);
            if (mData.data) {
              mData.data._inactivo = !mData.data.activo || mData.data.estado_general === 'Muerto' || mData.data.estado_general === 'Vendido';
              madres.unshift(mData.data);
            }
          } catch (_) { /* ignorar si no se encuentra */ }
        }
        if (animal.padre_id && !padres.find(p => p.id == animal.padre_id)) {
          try {
            const { data: pData } = await API.get(`/animales/${animal.padre_id}`);
            if (pData.data) {
              pData.data._inactivo = !pData.data.activo || pData.data.estado_general === 'Muerto' || pData.data.estado_general === 'Vendido';
              padres.unshift(pData.data);
            }
          } catch (_) { /* ignorar si no se encuentra */ }
        }
        this.parentCache = { madres, padres };
      }

      // Datos para mostrar el seleccionado actual en el botón del dropdown
      const madreSel = animal.madre_id ? madres.find(m => m.id == animal.madre_id) : null;
      const padreSel = animal.padre_id ? padres.find(p => p.id == animal.padre_id) : null;

      const parentDisplay = (p, tipo) => {
        if (!p) return 'Sin ' + tipo;
        const extra = p._inactivo ? ' ⚠️ Inactivo' : '';
        return p.nombre + ' (' + (p.edad_meses || '?') + ' m, ' + (p.estado_reproductivo || '?') + ')' + extra;
      };

      const titulo = editando ? 'Editar Animal' : 'Nuevo Animal';

      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title">${titulo}</h1>
          <button class="btn btn-outline-secondary" onclick="history.back()">
            <i class="fas fa-arrow-left"></i> Volver
          </button>
        </div>

        <div class="card">
          <div class="card-body">
            <form id="animal-form" onsubmit="AnimalFormPage.guardar(event)">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Nombre *</label>
                  <input type="text" class="form-control" id="animal-nombre" value="${animal.nombre || ''}" required>
                </div>

                <div class="col-md-6">
                  <label class="form-label">Identificación (arete/caravana)</label>
                  <input type="text" class="form-control" id="animal-identificacion" value="${animal.identificacion || ''}">
                </div>

                <div class="col-md-6">
                  <label class="form-label">Sexo *</label>
                  <select class="form-select" id="animal-sexo" required onchange="AnimalFormPage.cambioSexo()">
                    <option value="">Seleccione...</option>
                    <option value="Macho" ${animal.sexo === 'Macho' ? 'selected' : ''}>Macho</option>
                    <option value="Hembra" ${animal.sexo === 'Hembra' ? 'selected' : ''}>Hembra</option>
                  </select>
                </div>

                <div class="col-md-6">
                  <label class="form-label">Fecha de Nacimiento *</label>
                  <input type="date" class="form-control" id="animal-fecha" value="${DateUtil.formatoInput(animal.fecha_nacimiento) || ''}" required onchange="AnimalFormPage.calcularEtapaPorFecha()">
                </div>

                <div class="col-md-6">
                  <label class="form-label">Rebaño *</label>
                  ${(rebanos.data || []).length === 0 ? `
                    <div class="alert alert-warning py-2 mb-2">
                      No hay rebaños creados. <a href="#" onclick="Router.navegar('/rebanos');return false">Crear uno primero</a>
                    </div>
                    <select class="form-select" disabled>
                      <option value="">— Creá un rebaño primero —</option>
                    </select>
                  ` : `
                    <select class="form-select" id="animal-rebano" required>
                      <option value="">Seleccione...</option>
                      ${(rebanos.data || []).map(r => `
                        <option value="${r.id}" ${animal.rebano_id == r.id ? 'selected' : ''}>${r.nombre}</option>
                      `).join('')}
                    </select>
                  `}
                </div>

                <div class="col-md-6">
                  <label class="form-label">Etapa <small class="text-secondary">(calculada automáticamente)</small></label>
                  <input type="text" class="form-control" id="animal-etapa" value="${animal.etapa || '—'}" readonly style="background:#f5f5f5;font-weight:600">
                </div>

                <div class="col-md-4">
                  <label class="form-label">Peso de Entrada (kg)</label>
                  <input type="number" step="0.01" min="0" class="form-control" id="animal-peso-entrada" value="${animal.peso_entrada || ''}" placeholder="Ej: 450.50" oninput="AnimalFormPage.calcularDesdePeso()">
                </div>

                <div class="col-md-4">
                  <label class="form-label">Precio Final ($) <small class="text-secondary">opcional</small></label>
                  <input type="number" step="0.01" min="0" class="form-control" id="animal-precio-final" value="${animal.precio_final || ''}" placeholder="Ej: 1500000" oninput="AnimalFormPage.calcularDesdePrecioFinal()">
                </div>

                <div class="col-md-4">
                  <label class="form-label">Precio por kg ($)</label>
                  <input type="number" step="0.01" min="0" class="form-control" id="animal-precio-kg" value="${animal.precio_kg || ''}" placeholder="Ej: 3.20" oninput="AnimalFormPage.calcularDesdePrecioKg()">
                  <small class="text-secondary" id="animal-precio-kg-hint" style="display:none">
                    <i class="fas fa-calculator me-1"></i>Calculado desde peso y precio final
                  </small>
                  <small class="text-secondary" id="animal-precio-final-hint" style="display:none">
                    <i class="fas fa-calculator me-1"></i>Calculado desde peso y precio/kg
                  </small>
                </div>

                <div class="col-md-6 d-none" id="animal-estado-group">
                  <label class="form-label">Estado</label>
                  <select class="form-select" id="animal-estado">
                    <option value="">Seleccione...</option>
                  </select>
                </div>

                <!-- ─── Madre ─────────────────────────────── -->
                <div class="col-md-6">
                  <label class="form-label">Madre</label>
                  <div class="parent-picker" id="madre-picker">
                    <button class="parent-picker-btn form-select text-start text-truncate" type="button"
                            data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-expanded="false"
                            id="madre-picker-btn">
                      <span id="madre-display-text">${parentDisplay(madreSel, 'madre')}</span>
                    </button>
                    <div class="dropdown-menu shadow-sm parent-picker-menu" id="madre-picker-menu">
                      <div class="px-2 pt-2 pb-1">
                        <input type="text" class="form-control form-control-sm parent-picker-search"
                               placeholder="Buscar madre..." data-target="madre"
                               oninput="AnimalFormPage.filtrarParentDropdown(this)"
                               onclick="event.stopPropagation()">
                      </div>
                      <div class="dropdown-divider my-1"></div>
                      <div class="parent-picker-list" id="madre-options-list">
                        <button type="button" class="dropdown-item" data-id=""
                                onclick="AnimalFormPage.seleccionarParent(event, 'madre', '')">
                          <span class="text-secondary fst-italic">Sin madre</span>
                        </button>
                        ${madres.map(m => `
                          <button type="button" class="dropdown-item parent-option ${m._inactivo ? 'text-muted' : ''}"
                                  data-parent="madre" data-id="${m.id}"
                                  data-search="${(m.nombre || '').toLowerCase()} ${(m.rebano_nombre || '').toLowerCase()}"
                                  data-edad="${m.edad_meses || 0}"
                                  data-inactivo="${m._inactivo ? '1' : '0'}"
                                  style="${m._inactivo ? 'opacity:0.6' : ''}"
                                  onclick="AnimalFormPage.seleccionarParent(event, 'madre', '${m.id}')">
                            <span class="fw-medium">${m.nombre.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
                            <small class="text-secondary ms-2">${m.edad_meses} m · ${m.estado_reproductivo}${m.rebano_nombre ? ' · ' + m.rebano_nombre : ''}${m._inactivo ? ' · ⚠️ Inactivo' : ''}</small>
                          </button>
                        `).join('')}
                      </div>
                    </div>
                    <input type="hidden" id="animal-madre" value="${animal.madre_id || ''}">
                  </div>
                </div>

                <!-- ─── Padre ─────────────────────────────── -->
                <div class="col-md-6">
                  <label class="form-label">Padre</label>
                  <div class="parent-picker" id="padre-picker">
                    <button class="parent-picker-btn form-select text-start text-truncate" type="button"
                            data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-expanded="false"
                            id="padre-picker-btn">
                      <span id="padre-display-text">${parentDisplay(padreSel, 'padre')}</span>
                    </button>
                    <div class="dropdown-menu shadow-sm parent-picker-menu" id="padre-picker-menu">
                      <div class="px-2 pt-2 pb-1">
                        <input type="text" class="form-control form-control-sm parent-picker-search"
                               placeholder="Buscar padre..." data-target="padre"
                               oninput="AnimalFormPage.filtrarParentDropdown(this)"
                               onclick="event.stopPropagation()">
                      </div>
                      <div class="dropdown-divider my-1"></div>
                      <div class="parent-picker-list" id="padre-options-list">
                        <button type="button" class="dropdown-item" data-id=""
                                onclick="AnimalFormPage.seleccionarParent(event, 'padre', '')">
                          <span class="text-secondary fst-italic">Sin padre</span>
                        </button>
                        ${padres.map(p => `
                          <button type="button" class="dropdown-item parent-option ${p._inactivo ? 'text-muted' : ''}"
                                  data-parent="padre" data-id="${p.id}"
                                  data-search="${(p.nombre || '').toLowerCase()} ${(p.rebano_nombre || '').toLowerCase()}"
                                  data-edad="${p.edad_meses || 0}"
                                  data-inactivo="${p._inactivo ? '1' : '0'}"
                                  style="${p._inactivo ? 'opacity:0.6' : ''}"
                                  onclick="AnimalFormPage.seleccionarParent(event, 'padre', '${p.id}')">
                            <span class="fw-medium">${p.nombre.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
                            <small class="text-secondary ms-2">${p.edad_meses} m · ${p.estado_reproductivo}${p.rebano_nombre ? ' · ' + p.rebano_nombre : ''}${p._inactivo ? ' · ⚠️ Inactivo' : ''}</small>
                          </button>
                        `).join('')}
                      </div>
                    </div>
                    <input type="hidden" id="animal-padre" value="${animal.padre_id || ''}">
                  </div>
                </div>

                <div class="col-12">
                  <label class="form-label">Foto</label>
                  <div>
                    <input type="file" class="form-control" id="animal-foto" accept="image/jpeg,image/png,image/webp">
                    ${animal.foto ? `<p class="mt-2"><img src="/api/${animal.foto}" class="rounded" style="width:80px;height:80px;object-fit:cover"></p>` : ''}
                  </div>
                </div>
              </div>

              <div class="mt-4 d-flex gap-2 justify-content-end">
                <button type="button" class="btn btn-outline-secondary" onclick="history.back()">
                  <i class="fas fa-times"></i> Cancelar
                </button>
                <button type="submit" class="btn btn-primary">
                  <i class="fas fa-save"></i> ${editando ? 'Guardar Cambios' : 'Crear Animal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      `);
    } catch (error) {
      return MainLayout.render(`<div class="alert alert-danger">Error: ${error.message}</div>`);
    }
  },

  cambioSexo() {
    const sexo = document.getElementById('animal-sexo').value;
    const select = document.getElementById('animal-estado');
    const group = document.getElementById('animal-estado-group');

    if (!sexo) {
      group.classList.add('d-none');
      return;
    }

    group.classList.remove('d-none');
    select.innerHTML = '<option value="">Seleccione...</option>';

    if (sexo === 'Hembra') {
      select.innerHTML += `
        <option value="Vacia">Vacía</option>
        <option value="Prenada">Preñada</option>
        <option value="Lactando">Lactando</option>
      `;
    } else {
      select.innerHTML += `
        <option value="Padrote">Padrote</option>
        <option value="Ceba">Ceba</option>
      `;
    }

    if (AnimalFormPage.estadoOriginal) select.value = AnimalFormPage.estadoOriginal;
  },

  calcularEtapaPorFecha() {
    const fecha = document.getElementById('animal-fecha').value;
    if (!fecha) {
      document.getElementById('animal-etapa').value = '—';
      return;
    }
    const { totalMeses } = DateUtil.calcularEdad(fecha);
    document.getElementById('animal-etapa').value = DateUtil.determinarEtapa(totalMeses);
  },

  /* ─── Cálculos automáticos de precio ────────────────────── */

  calcularDesdePeso() {
    const peso = parseFloat(document.getElementById('animal-peso-entrada').value);
    const precioKg = parseFloat(document.getElementById('animal-precio-kg').value);
    const precioFinal = parseFloat(document.getElementById('animal-precio-final').value);

    if (peso > 0 && precioKg > 0) {
      document.getElementById('animal-precio-final').value = (peso * precioKg).toFixed(2);
      document.getElementById('animal-precio-final-hint').style.display = 'block';
      return;
    }
    if (peso > 0 && precioFinal > 0) {
      document.getElementById('animal-precio-kg').value = (precioFinal / peso).toFixed(2);
      document.getElementById('animal-precio-kg-hint').style.display = 'block';
      document.getElementById('animal-precio-final-hint').style.display = 'none';
      return;
    }
    document.getElementById('animal-precio-kg-hint').style.display = 'none';
    document.getElementById('animal-precio-final-hint').style.display = 'none';
  },

  calcularDesdePrecioFinal() {
    const peso = parseFloat(document.getElementById('animal-peso-entrada').value);
    const precioFinal = parseFloat(document.getElementById('animal-precio-final').value);

    if (peso > 0 && precioFinal > 0) {
      document.getElementById('animal-precio-kg').value = (precioFinal / peso).toFixed(2);
      document.getElementById('animal-precio-kg-hint').style.display = 'block';
      document.getElementById('animal-precio-final-hint').style.display = 'none';
    } else {
      document.getElementById('animal-precio-kg-hint').style.display = 'none';
    }
  },

  calcularDesdePrecioKg() {
    const peso = parseFloat(document.getElementById('animal-peso-entrada').value);
    const precioKg = parseFloat(document.getElementById('animal-precio-kg').value);

    if (peso > 0 && precioKg > 0) {
      document.getElementById('animal-precio-final').value = (peso * precioKg).toFixed(2);
      document.getElementById('animal-precio-final-hint').style.display = 'block';
    }
    document.getElementById('animal-precio-kg-hint').style.display = 'none';
  },

  afterRender() {
    this.calcularEtapaPorFecha();
    this.cambioSexo();

    // Inicializar cálculos de precios desde los datos existentes
    const peso = document.getElementById('animal-peso-entrada').value;
    const precioKg = document.getElementById('animal-precio-kg').value;
    const precioFinal = document.getElementById('animal-precio-final').value;

    if (peso && precioFinal && !precioKg) {
      this.calcularDesdePrecioFinal();
    } else if (peso && precioKg && !precioFinal) {
      this.calcularDesdePrecioKg();
    } else if (peso && precioFinal && precioKg) {
      document.getElementById('animal-precio-kg-hint').style.display = 'none';
      document.getElementById('animal-precio-final-hint').style.display = 'none';
    }

    // Cerrar dropdowns al hacer clic fuera
    this._setupDropdownClose();
  },

  /** Filtra las opciones del dropdown de padre/madre según el texto ingresado */
  filtrarParentDropdown(input) {
    const target = input.dataset.target;
    const search = input.value.toLowerCase();
    const list = document.getElementById(target + '-options-list');
    if (!list) return;
    const options = list.querySelectorAll('.parent-option');
    options.forEach(opt => {
      const text = (opt.dataset.search || '') + ' ' + (opt.textContent || '').toLowerCase();
      opt.style.display = !search || text.includes(search) ? '' : 'none';
    });
  },

  /**
   * Selecciona un padre o madre desde el dropdown.
   * @param {Event}  event - El evento click
   * @param {string} type  - 'madre' o 'padre'
   * @param {string} id    - ID del animal seleccionado ('' para ninguno)
   */
  seleccionarParent(event, type, id) {
    document.getElementById('animal-' + type).value = id;

    // Construir el texto a mostrar desde el DOM (evita problemas de escaping)
    let displayText;
    if (!id) {
      displayText = 'Sin ' + type;
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

    // Cerrar el dropdown de Bootstrap
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
  },

  /** Configura el cierre de dropdowns al hacer clic fuera */
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

    const rebanoSelect = document.getElementById('animal-rebano');
    if (!rebanoSelect) {
      Toast.warning('Primero debes crear un rebaño para asignar el animal');
      return;
    }

    // Validar edad mínima para madre/padre usando parentCache
    const selectedMadreId = document.getElementById('animal-madre').value;
    if (selectedMadreId) {
      const madreData = this.parentCache.madres.find(m => m.id == selectedMadreId);
      if (!madreData) {
        Toast.warning('La madre seleccionada no es válida');
        return;
      }
      if (parseInt(madreData.edad_meses) < 12) {
        Toast.warning('La madre seleccionada debe tener al menos 12 meses de edad');
        return;
      }
    }

    const selectedPadreId = document.getElementById('animal-padre').value;
    if (selectedPadreId) {
      const padreData = this.parentCache.padres.find(p => p.id == selectedPadreId);
      if (!padreData) {
        Toast.warning('El padre seleccionado no es válido');
        return;
      }
      if (parseInt(padreData.edad_meses) < 18) {
        Toast.warning('El padre seleccionado debe tener al menos 18 meses de edad');
        return;
      }
    }

    const formData = new FormData();
    formData.append('nombre', document.getElementById('animal-nombre').value);
    formData.append('identificacion', document.getElementById('animal-identificacion').value);
    formData.append('sexo', document.getElementById('animal-sexo').value);
    formData.append('fecha_nacimiento', document.getElementById('animal-fecha').value);
    formData.append('rebano_id', rebanoSelect.value);
    const etapa = document.getElementById('animal-etapa').value;
    formData.append('etapa', etapa === '—' ? 'Ternero' : etapa);

    const madreId = document.getElementById('animal-madre').value;
    if (madreId) formData.append('madre_id', madreId);
    const padreId = document.getElementById('animal-padre').value;
    if (padreId) formData.append('padre_id', padreId);

    const pesoEntrada = document.getElementById('animal-peso-entrada').value;
    if (pesoEntrada) formData.append('peso_entrada', pesoEntrada);

    const precioKg = document.getElementById('animal-precio-kg').value;
    if (precioKg) formData.append('precio_kg', precioKg);

    const precioFinal = document.getElementById('animal-precio-final').value;
    if (precioFinal) formData.append('precio_final', precioFinal);

    const estadoGroup = document.getElementById('animal-estado-group');
    if (!estadoGroup.classList.contains('d-none')) {
      formData.append('estado_reproductivo', document.getElementById('animal-estado').value);
    }

    const fotoInput = document.getElementById('animal-foto');
    if (fotoInput.files.length > 0) {
      formData.append('foto', fotoInput.files[0]);
    }

    try {
      if (this.editandoId) {
        await API.put(`/animales/${this.editandoId}`, Object.fromEntries(formData));
      } else {
        await API.post('/animales', Object.fromEntries(formData));
      }
      Router.navegar('/animales');
    } catch (error) {
      Toast.error(error.response?.data?.error || 'Error al guardar');
    }
  },
};
