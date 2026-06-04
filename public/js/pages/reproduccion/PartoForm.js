/**
 * Página: Formulario de Parto
 * POST /api/reproduccion/partos
 * Crías dinámicas con add/remove
 */
const PartoFormPage = {
  contadorCrias: 0,

  async render() {
    try {
      const { data: animals } = await API.get('/animales', {
        por_pagina: 1000,
        sexo: 'Hembra',
      });
      const animalsList = animals.data || [];

      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title">Registrar Parto</h1>
          <button class="btn btn-secondary" onclick="Router.navegar('/reproduccion')">Volver</button>
        </div>

        <div class="card">
          <div class="card-body">
            <form id="parto-form" onsubmit="PartoFormPage.guardar(event)">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Madre (Hembra preñada) *</label>
                  <select class="form-select" id="parto-animal" required>
                    <option value="">Seleccione...</option>
                    ${animalsList.map(a => `
                      <option value="${a.id}">${a.nombre} — ${DateUtil.edadTexto(a.fecha_nacimiento)}</option>
                    `).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Fecha del Parto *</label>
                  <input type="date" class="form-input" id="parto-fecha"
                    value="${new Date().toISOString().substring(0, 10)}" required>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Observaciones</label>
                <textarea class="form-textarea" id="parto-observaciones"
                  placeholder="Complicaciones, atención recibida, estado de la madre..."></textarea>
              </div>

              <div class="form-group">
                <label class="form-label">
                  <strong>Crías</strong>
                  <button type="button" class="btn btn-sm btn-primary" style="margin-left:0.5rem"
                    onclick="PartoFormPage.agregarCria()">+ Agregar Cría</button>
                </label>
                <div id="crias-container" style="margin-top:0.5rem">
                  <p class="empty-state" id="crias-empty">No hay crías registradas. Agregue al menos una.</p>
                </div>
              </div>

              <div style="display:flex;gap:0.5rem;justify-content:flex-end">
                <button type="button" class="btn btn-secondary" onclick="Router.navegar('/reproduccion')">Cancelar</button>
                <button type="submit" class="btn btn-primary">Registrar Parto</button>
              </div>
            </form>
          </div>
        </div>
      `);
    } catch (e) {
      return MainLayout.render(`<div class="alert alert-danger">Error: ${e.message}</div>`);
    }
  },

  agregarCria(nombre, sexo, peso) {
    this.contadorCrias++;
    const idx = this.contadorCrias;
    const container = document.getElementById('crias-container');
    const empty = document.getElementById('crias-empty');
    if (empty) empty.remove();

    const div = document.createElement('div');
    div.className = 'cria-row';
    div.id = `cria-row-${idx}`;
    div.style.cssText = 'display:flex;gap:0.5rem;margin-bottom:0.5rem;align-items:center';
    div.innerHTML = `
      <input type="text" class="form-input" id="cria-nombre-${idx}"
        placeholder="Nombre" value="${nombre || ''}" style="flex:2">
      <select class="form-select" id="cria-sexo-${idx}" style="flex:1">
        <option value="Macho" ${sexo === 'Hembra' ? '' : 'selected'}>Macho</option>
        <option value="Hembra" ${sexo === 'Hembra' ? 'selected' : ''}>Hembra</option>
      </select>
      <input type="number" step="0.1" min="0" class="form-input" id="cria-peso-${idx}"
        placeholder="Peso kg" value="${peso || ''}" style="flex:1">
      <button type="button" class="btn btn-sm btn-danger"
        onclick="PartoFormPage.eliminarCria(${idx})">×</button>
    `;
    container.appendChild(div);
  },

  eliminarCria(idx) {
    const row = document.getElementById(`cria-row-${idx}`);
    if (row) {
      row.remove();
      // Show empty state if no rows left
      if (document.querySelectorAll('[id^="cria-row-"]').length === 0) {
        const container = document.getElementById('crias-container');
        if (container && !document.getElementById('crias-empty')) {
          const p = document.createElement('p');
          p.className = 'empty-state';
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
      alert('Debe seleccionar un animal');
      return;
    }

    // Collect crías
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
      await API.post('/reproduccion/partos', payload);
      Router.navegar('/reproduccion');
    } catch (err) {
      alert(err.response?.data?.error || 'Error al guardar');
    }
  },
};
