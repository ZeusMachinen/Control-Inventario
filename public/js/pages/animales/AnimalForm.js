/**
 * Página: Formulario de Animal (crear/editar)
 */
const AnimalFormPage = {
  editandoId: null,
  estadoOriginal: '',

  async render(params) {
    const editando = !!params.id;
    this.editandoId = editando ? parseInt(params.id) : null;
    this.estadoOriginal = '';

    try {
      const { data: rebanos } = await API.get('/rebanos');
      const { data: animales } = await API.get('/animales', { por_pagina: 1000 });

      let animal = {};
      if (editando) {
        const { data } = await API.get(`/animales/${params.id}`);
        animal = data.data || {};
        this.estadoOriginal = animal.estado_reproductivo || '';
      }

      const madres = (animales.data || []).filter(a => a.sexo === 'Hembra');
      const padres = (animales.data || []).filter(a => a.sexo === 'Macho');
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

                <div class="col-md-6">
                  <label class="form-label">Peso de Entrada (kg)</label>
                  <input type="number" step="0.01" min="0" class="form-control" id="animal-peso-entrada" value="${animal.peso_entrada || ''}" placeholder="Ej: 450.50">
                </div>

                <div class="col-md-6">
                  <label class="form-label">Precio por kg ($)</label>
                  <input type="number" step="0.01" min="0" class="form-control" id="animal-precio-kg" value="${animal.precio_kg || ''}" placeholder="Ej: 3.20">
                </div>

                <div class="col-md-6 d-none" id="animal-estado-group">
                  <label class="form-label">Estado</label>
                  <select class="form-select" id="animal-estado">
                    <option value="">Seleccione...</option>
                  </select>
                </div>

                <div class="col-md-6">
                  <label class="form-label">Madre</label>
                  <select class="form-select" id="animal-madre">
                    <option value="">Sin madre</option>
                    ${madres.map(m => `
                      <option value="${m.id}" ${animal.madre_id == m.id ? 'selected' : ''}>${m.nombre}</option>
                    `).join('')}
                  </select>
                </div>

                <div class="col-md-6">
                  <label class="form-label">Padre</label>
                  <select class="form-select" id="animal-padre">
                    <option value="">Sin padre</option>
                    ${padres.map(p => `
                      <option value="${p.id}" ${animal.padre_id == p.id ? 'selected' : ''}>${p.nombre}</option>
                    `).join('')}
                  </select>
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

  afterRender() {
    this.calcularEtapaPorFecha();
    this.cambioSexo();
  },

  async guardar(e) {
    e.preventDefault();

    const rebanoSelect = document.getElementById('animal-rebano');
    if (!rebanoSelect) {
      Toast.warning('Primero debes crear un rebaño para asignar el animal');
      return;
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
