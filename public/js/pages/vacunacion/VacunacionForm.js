const VacunacionFormPage = {
  editandoId: null,
  preciosMedicamentos: {},

  afterRender() {
    if (this.editandoId) {
      setTimeout(() => this.recalcularCosto(), 150);
    }
  },

  async render(params) {
    const editando = !!params.id;
    this.editandoId = editando ? parseInt(params.id) : null;

    try {
      const [{ data: meds }, { data: rebs }, { data: animals }, editData] = await Promise.all([
        API.get('/medicamentos'),
        API.get('/rebanos'),
        API.get('/animales', { por_pagina: 1000 }),
        editando ? API.get(`/vacunaciones/${params.id}`) : Promise.resolve(null),
      ]);

      const editar = editData?.data?.data || {};
      const animalesSeleccionados = new Set((editar.animales || []).map(a => a.animal_id));

      this.preciosMedicamentos = {};
      (meds.data || []).forEach(m => {
        this.preciosMedicamentos[m.id] = parseFloat(m.precio) || 0;
      });

      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title">${editando ? 'Editar Vacunación' : 'Nueva Vacunación'}</h1>
          <button class="btn btn-secondary" onclick="Router.navegar('/vacunacion')">Volver</button>
        </div>

        <div class="card">
          <div class="card-body">
            <form id="vac-form" onsubmit="VacunacionFormPage.guardar(event)">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Fecha *</label>
                  <input type="date" class="form-input" id="vac-fecha" value="${editar.fecha || new Date().toISOString().substring(0, 10)}" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Medicamento *</label>
                  <select class="form-select" id="vac-medicamento" required onchange="VacunacionFormPage.recalcularCosto()">
                    <option value="">Seleccione...</option>
                    ${(meds.data || []).map(m => `
                      <option value="${m.id}" ${editar.medicamento_id == m.id ? 'selected' : ''}>${m.nombre}</option>
                    `).join('')}
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Vacunar por Rebaño (opcional)</label>
                <select class="form-select" id="vac-rebano" onchange="VacunacionFormPage.cambioRebano();VacunacionFormPage.recalcularCosto()">
                  <option value="">Seleccionar animales individualmente</option>
                  ${(rebs.data || []).map(r => `
                    <option value="${r.id}" ${editar.rebano_id == r.id ? 'selected' : ''}>${r.nombre} (${r.total_animales} animales)</option>
                  `).join('')}
                </select>
              </div>

              <div class="form-group" id="vac-animales-group" style="${editar.rebano_id ? 'display:none' : ''}">
                <label class="form-label">Animales a vacunar</label>
                <div style="max-height:200px;overflow-y:auto;border:1px solid var(--gris-borde);border-radius:var(--border-radius);padding:var(--spacing-sm)">
                  ${(animals.data || []).map(a => `
                    <label style="display:flex;align-items:center;gap:0.5rem;padding:0.25rem 0">
                      <input type="checkbox" class="vac-animal" value="${a.id}" ${animalesSeleccionados.has(a.id) ? 'checked' : ''} onchange="VacunacionFormPage.recalcularCosto()">
                      <span>${a.nombre}</span>
                      <span class="badge ${a.sexo === 'Macho' ? 'badge-sexo-macho' : 'badge-sexo-hembra'}" style="font-size:10px">${a.sexo}</span>
                    </label>
                  `).join('')}
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Observaciones</label>
                <textarea class="form-textarea" id="vac-observaciones" placeholder="Dosis, lote, observaciones...">${editar.observaciones || ''}</textarea>
              </div>

              <div class="form-group">
                <label class="form-label">Costo Veterinario</label>
                <input type="number" step="0.01" min="0" class="form-input" id="vac-costo-vet" placeholder="0.00" value="${editar.costo_veterinario || ''}" oninput="VacunacionFormPage.recalcularCosto()">
              </div>

              <div id="vac-costo-estimado" class="costo-estimado" style="display:none;margin-top:0.5rem;padding:0.75rem;background:var(--gris-fondo);border-radius:var(--border-radius);border-left:3px solid var(--primary)">
                <strong>Costo estimado:</strong> <span id="vac-costo-total">$0</span><br>
                <small style="color:var(--texto-secundario)">
                  Droga: <span id="vac-costo-droga">$0</span> ·
                  Veterinario: <span id="vac-costo-vet-label">$0</span>
                </small>
              </div>

              <div style="display:flex;gap:0.5rem;justify-content:flex-end">
                <button type="button" class="btn btn-secondary" onclick="Router.navegar('/vacunacion')">Cancelar</button>
                <button type="submit" class="btn btn-primary">${editando ? 'Guardar Cambios' : 'Registrar Vacunación'}</button>
              </div>
            </form>
            ${editando ? '<div id="vac-form-edit-trigger" data-ready="true"></div>' : ''}
          </div>
        </div>
      `);
    } catch (e) {
      return MainLayout.render(`<div class="alert alert-danger">Error: ${e.message}</div>`);
    }
  },

  cambioRebano() {
    const rebanoId = document.getElementById('vac-rebano').value;
    const checkboxes = document.querySelectorAll('.vac-animal');
    checkboxes.forEach(cb => cb.checked = false);
    document.getElementById('vac-animales-group').style.display = rebanoId ? 'none' : '';
  },

  recalcularCosto() {
    const medId = document.getElementById('vac-medicamento')?.value;
    const precio = medId ? (this.preciosMedicamentos[medId] || 0) : 0;
    const costoVet = parseFloat(document.getElementById('vac-costo-vet')?.value) || 0;
    const rebanoId = document.getElementById('vac-rebano')?.value;

    let count = 0;
    if (rebanoId) {
      document.getElementById('vac-costo-estimado').style.display = 'none';
      return;
    }
    document.querySelectorAll('.vac-animal:checked').forEach(() => count++);

    const total = (precio * count) + costoVet;
    const estimadoDiv = document.getElementById('vac-costo-estimado');

    if (count === 0 && costoVet === 0) {
      estimadoDiv.style.display = 'none';
      return;
    }

    document.getElementById('vac-costo-total').textContent = Formateador.moneda(total);
    document.getElementById('vac-costo-droga').textContent = Formateador.moneda(precio * count);
    document.getElementById('vac-costo-vet-label').textContent = Formateador.moneda(costoVet);
    estimadoDiv.style.display = 'block';
  },

  async guardar(e) {
    e.preventDefault();
    const animales = [];
    const rebanoId = document.getElementById('vac-rebano').value;

    const basePayload = {
      fecha: document.getElementById('vac-fecha').value,
      medicamento_id: document.getElementById('vac-medicamento').value,
      observaciones: document.getElementById('vac-observaciones').value,
      costo_veterinario: document.getElementById('vac-costo-vet').value || null,
    };

    if (rebanoId) {
      basePayload.rebano_id = rebanoId;
      basePayload.vacunar_rebano = true;
    } else {
      document.querySelectorAll('.vac-animal:checked').forEach(cb => animales.push(parseInt(cb.value)));
      if (animales.length === 0) {
        alert('Seleccione al menos un animal');
        return;
      }
      basePayload.animales = animales;
    }

    try {
      if (this.editandoId) {
        await API.put(`/vacunaciones/${this.editandoId}`, basePayload);
      } else {
        await API.post('/vacunaciones', basePayload);
      }
      Router.navegar('/vacunacion');
    } catch (err) {
      alert(err.response?.data?.error || 'Error al guardar');
    }
  },
};
