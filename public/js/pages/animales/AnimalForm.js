/**
 * Página: Formulario de Animal (crear/editar)
 */
const AnimalFormPage = {
  editandoId: null,

  async render(params) {
    const editando = !!params.id;
    this.editandoId = editando ? parseInt(params.id) : null;

    try {
      const { data: rebanos } = await API.get('/rebanos');
      const { data: animales } = await API.get('/animales', { por_pagina: 1000 });

      let animal = {};
      if (editando) {
        const { data } = await API.get(`/animales/${params.id}`);
        animal = data.data || {};
      }

      const madres = (animales.data || []).filter(a => a.sexo === 'Hembra');
      const padres = (animales.data || []).filter(a => a.sexo === 'Macho');
      const hembra = animal.sexo === 'Hembra';
      const titulo = editando ? 'Editar Animal' : 'Nuevo Animal';

      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title">${titulo}</h1>
          <button class="btn btn-secondary" onclick="history.back()">Volver</button>
        </div>

        <div class="card">
          <div class="card-body">
            <form id="animal-form" onsubmit="AnimalFormPage.guardar(event)">
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Nombre *</label>
                  <input type="text" class="form-input" id="animal-nombre" value="${animal.nombre || ''}" required>
                </div>

                <div class="form-group">
                  <label class="form-label">Identificación (arete/caravana)</label>
                  <input type="text" class="form-input" id="animal-identificacion" value="${animal.identificacion || ''}">
                </div>

                <div class="form-group">
                  <label class="form-label">Sexo *</label>
                  <select class="form-select" id="animal-sexo" required onchange="AnimalFormPage.cambioSexo()">
                    <option value="">Seleccione...</option>
                    <option value="Macho" ${animal.sexo === 'Macho' ? 'selected' : ''}>Macho</option>
                    <option value="Hembra" ${animal.sexo === 'Hembra' ? 'selected' : ''}>Hembra</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Fecha de Nacimiento *</label>
                  <input type="date" class="form-input" id="animal-fecha" value="${DateUtil.formatoInput(animal.fecha_nacimiento) || ''}" required>
                </div>

                <div class="form-group">
                  <label class="form-label">Rebaño *</label>
                  <select class="form-select" id="animal-rebano" required>
                    <option value="">Seleccione...</option>
                    ${(rebanos.data || []).map(r => `
                      <option value="${r.id}" ${animal.rebano_id == r.id ? 'selected' : ''}>${r.nombre}</option>
                    `).join('')}
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Etapa</label>
                  <select class="form-select" id="animal-etapa">
                    <option value="Ternero" ${animal.etapa === 'Ternero' ? 'selected' : ''}>Ternero</option>
                    <option value="Novillo" ${animal.etapa === 'Novillo' ? 'selected' : ''}>Novillo</option>
                    <option value="Adulto" ${animal.etapa === 'Adulto' ? 'selected' : ''}>Adulto</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Peso de Entrada (kg)</label>
                  <input type="number" step="0.01" min="0" class="form-input" id="animal-peso-entrada" value="${animal.peso_entrada || ''}" placeholder="Ej: 450.50">
                </div>

                <div class="form-group">
                  <label class="form-label">Precio por kg ($)</label>
                  <input type="number" step="0.01" min="0" class="form-input" id="animal-precio-kg" value="${animal.precio_kg || ''}" placeholder="Ej: 3.20">
                </div>

                <div class="form-group" id="animal-estado-group" style="${hembra ? '' : 'display:none'}">
                  <label class="form-label">Estado Reproductivo</label>
                  <select class="form-select" id="animal-estado">
                    <option value="">Seleccione...</option>
                    <option value="Vacia" ${animal.estado_reproductivo === 'Vacia' ? 'selected' : ''}>Vacía</option>
                    <option value="Prenada" ${animal.estado_reproductivo === 'Prenada' ? 'selected' : ''}>Preñada</option>
                    <option value="Lactando" ${animal.estado_reproductivo === 'Lactando' ? 'selected' : ''}>Lactando</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Madre</label>
                  <select class="form-select" id="animal-madre">
                    <option value="">Sin madre</option>
                    ${madres.map(m => `
                      <option value="${m.id}" ${animal.madre_id == m.id ? 'selected' : ''}>${m.nombre}</option>
                    `).join('')}
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Padre</label>
                  <select class="form-select" id="animal-padre">
                    <option value="">Sin padre</option>
                    ${padres.map(p => `
                      <option value="${p.id}" ${animal.padre_id == p.id ? 'selected' : ''}>${p.nombre}</option>
                    `).join('')}
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Foto</label>
                <div>
                  <input type="file" id="animal-foto" accept="image/jpeg,image/png,image/webp">
                  ${animal.foto ? `<p style="margin-top:8px"><img src="/api/${animal.foto}" style="width:80px;height:80px;object-fit:cover;border-radius:4px;"></p>` : ''}
                </div>
              </div>

              <div style="margin-top: 1.5rem; display:flex; gap: 0.5rem; justify-content: flex-end;">
                <button type="button" class="btn btn-secondary" onclick="history.back()">Cancelar</button>
                <button type="submit" class="btn btn-primary">${editando ? 'Guardar Cambios' : 'Crear Animal'}</button>
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
    document.getElementById('animal-estado-group').style.display = sexo === 'Hembra' ? '' : 'none';
  },

  async guardar(e) {
    e.preventDefault();

    const formData = new FormData();
    formData.append('nombre', document.getElementById('animal-nombre').value);
    formData.append('identificacion', document.getElementById('animal-identificacion').value);
    formData.append('sexo', document.getElementById('animal-sexo').value);
    formData.append('fecha_nacimiento', document.getElementById('animal-fecha').value);
    formData.append('rebano_id', document.getElementById('animal-rebano').value);
    formData.append('etapa', document.getElementById('animal-etapa').value);
    formData.append('madre_id', document.getElementById('animal-madre').value || '');
    formData.append('padre_id', document.getElementById('animal-padre').value || '');

    const pesoEntrada = document.getElementById('animal-peso-entrada').value;
    if (pesoEntrada) formData.append('peso_entrada', pesoEntrada);

    const precioKg = document.getElementById('animal-precio-kg').value;
    if (precioKg) formData.append('precio_kg', precioKg);

    const estadoSelect = document.getElementById('animal-estado');
    if (estadoSelect.style.display !== 'none') {
      formData.append('estado_reproductivo', estadoSelect.value);
    }

    const fotoInput = document.getElementById('animal-foto');
    if (fotoInput.files.length > 0) {
      formData.append('foto', fotoInput.files[0]);
    }

    try {
      if (this.editandoId) {
        await API.post(`/animales/${this.editandoId}`, Object.fromEntries(formData));
      } else {
        await API.post('/animales', Object.fromEntries(formData));
      }
      Router.navegar('/animales');
    } catch (error) {
      alert(error.response?.data?.error || 'Error al guardar');
    }
  },
};
