/**
 * Página: Formulario de Vacunación
 */
const VacunacionFormPage = {
  async render() {
    try {
      const { data: meds } = await API.get('/medicamentos');
      const { data: rebs } = await API.get('/rebanos');
      const { data: animals } = await API.get('/animales', { por_pagina: 1000 });

      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title">Nueva Vacunación</h1>
          <button class="btn btn-secondary" onclick="Router.navegar('/vacunacion')">Volver</button>
        </div>

        <div class="card">
          <div class="card-body">
            <form id="vac-form" onsubmit="VacunacionFormPage.guardar(event)">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Fecha *</label>
                  <input type="date" class="form-input" id="vac-fecha" value="${new Date().toISOString().substring(0, 10)}" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Medicamento *</label>
                  <select class="form-select" id="vac-medicamento" required>
                    <option value="">Seleccione...</option>
                    ${(meds.data || []).map(m => `<option value="${m.id}">${m.nombre}</option>`).join('')}
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Vacunar por Rebaño (opcional)</label>
                <select class="form-select" id="vac-rebano" onchange="VacunacionFormPage.cambioRebano()">
                  <option value="">Seleccionar animales individualmente</option>
                  ${(rebs.data || []).map(r => `<option value="${r.id}">${r.nombre} (${r.total_animales} animales)</option>`).join('')}
                </select>
              </div>

              <div class="form-group" id="vac-animales-group">
                <label class="form-label">Animales a vacunar</label>
                <div style="max-height:200px;overflow-y:auto;border:1px solid var(--gris-borde);border-radius:var(--border-radius);padding:var(--spacing-sm)">
                  ${(animals.data || []).map(a => `
                    <label style="display:flex;align-items:center;gap:0.5rem;padding:0.25rem 0">
                      <input type="checkbox" class="vac-animal" value="${a.id}">
                      <span>${a.nombre}</span>
                      <span class="badge ${a.sexo === 'Macho' ? 'badge-sexo-macho' : 'badge-sexo-hembra'}" style="font-size:10px">${a.sexo}</span>
                    </label>
                  `).join('')}
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Observaciones</label>
                <textarea class="form-textarea" id="vac-observaciones" placeholder="Dosis, lote, observaciones..."></textarea>
              </div>

              <div style="display:flex;gap:0.5rem;justify-content:flex-end">
                <button type="button" class="btn btn-secondary" onclick="Router.navegar('/vacunacion')">Cancelar</button>
                <button type="submit" class="btn btn-primary">Registrar Vacunación</button>
              </div>
            </form>
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

    if (rebanoId) {
      document.getElementById('vac-animales-group').style.display = 'none';
    } else {
      document.getElementById('vac-animales-group').style.display = '';
    }
  },

  async guardar(e) {
    e.preventDefault();

    const animales = [];
    const rebanoId = document.getElementById('vac-rebano').value;

    if (rebanoId) {
      // Vacunar todo el rebaño
      const payload = {
        fecha: document.getElementById('vac-fecha').value,
        medicamento_id: document.getElementById('vac-medicamento').value,
        rebano_id: rebanoId,
        vacunar_rebano: true,
        observaciones: document.getElementById('vac-observaciones').value,
      };
      try {
        await API.post('/vacunaciones', payload);
        Router.navegar('/vacunacion');
      } catch (err) {
        alert(err.response?.data?.error || 'Error al guardar');
      }
    } else {
      document.querySelectorAll('.vac-animal:checked').forEach(cb => animales.push(parseInt(cb.value)));
      if (animales.length === 0) {
        alert('Seleccione al menos un animal');
        return;
      }
      const payload = {
        fecha: document.getElementById('vac-fecha').value,
        medicamento_id: document.getElementById('vac-medicamento').value,
        animales,
        observaciones: document.getElementById('vac-observaciones').value,
      };
      try {
        await API.post('/vacunaciones', payload);
        Router.navegar('/vacunacion');
      } catch (err) {
        alert(err.response?.data?.error || 'Error al guardar');
      }
    }
  },
};
