const PartoFormPage = {
  editandoId: null,
  contadorCrias: 0,

  async render(params) {
    this.editandoId = params?.id ? parseInt(params.id) : null;
    try {
      const { data: animals } = await API.get('/animales', {
        por_pagina: 1000, sexo: 'Hembra', edad_min: 15,
      });
      const animalsList = animals.data || [];

      let editData = null;
      if (this.editandoId) {
        const { data: res } = await API.get(`/reproduccion/partos/${this.editandoId}`);
        editData = res.data || {};
        if (editData.crias && typeof editData.crias === 'string') {
          editData.crias = JSON.parse(editData.crias);
        }
      }

      const titulo = this.editandoId ? 'Editar Parto' : 'Registrar Parto';
      const btnTexto = this.editandoId ? 'Guardar Cambios' : 'Registrar Parto';
      const fecha = editData?.fecha ? DateUtil.formatoInput(editData.fecha) : new Date().toISOString().substring(0, 10);

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
                  <label class="form-label">Madre (Hembra preñada) *</label>
                  <select class="form-select" id="parto-animal" required>
                    <option value="">Seleccione...</option>
                    ${animalsList.map(a => `
                      <option value="${a.id}" ${editData?.animal_id == a.id ? 'selected' : ''}>${a.nombre} — ${DateUtil.edadTexto(a.fecha_nacimiento)}</option>
                    `).join('')}
                  </select>
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
    if (this.editandoId) {
      setTimeout(() => {
        // Cargar las crías desde editData (las guardamos al inicio)
        this.cargarCriasExistente();
      }, 100);
    }
  },

  cargarCriasExistente() {
    // Recuperar editData de las promise del render — recargamos del API
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
      Toast.warning('Debe seleccionar un animal');
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

