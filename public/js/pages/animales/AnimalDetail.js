/**
 * Página: Detalle de Animal
 */
const AnimalDetailPage = {
  async render(params) {
    try {
      const { data } = await API.get(`/animales/${params.id}`);
      const a = data.data || {};

      const edad = DateUtil.calcularEdad(a.fecha_nacimiento);

      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title">${a.nombre}</h1>
          <div style="display:flex;gap:0.5rem">
            ${a.estado_general === 'Activo' ? `
              <button class="btn btn-secondary" onclick="Router.navegar('/animales/${a.id}/editar')">✏️ Editar</button>
              <button class="btn btn-danger" onclick="AnimalDetailPage.mostrarBajaModal(${a.id})">Dar de Baja</button>
            ` : `<span class="badge badge-${a.estado_general === 'Vendido' ? 'azul' : 'rojo'}" style="font-size:1rem;padding:0.5rem 1rem">${a.estado_general}</span>`}
            <button class="btn btn-secondary" onclick="Router.navegar('/animales')">← Volver</button>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
            <div style="display:flex;gap:2rem;flex-wrap:wrap">
              <div>
                ${a.foto
                  ? `<img src="/api/${a.foto}" class="animal-foto" alt="${a.nombre}">`
                  : `<div class="animal-foto" style="background:var(--gris-fondo);display:flex;align-items:center;justify-content:center;font-size:3rem">🐄</div>`
                }
              </div>
              <div style="flex:1;min-width:250px">
                <div class="form-grid" style="grid-template-columns:1fr 1fr">
                  <div><strong>Sexo:</strong> <span class="badge ${a.sexo === 'Macho' ? 'badge-sexo-macho' : 'badge-sexo-hembra'}">${a.sexo}</span></div>
                  <div><strong>Identificación:</strong> ${a.identificacion || '-'}</div>
                  <div><strong>Edad:</strong> ${edad.anios} años ${edad.meses} meses</div>
                  <div><strong>Fecha de Nacimiento:</strong> ${DateUtil.formatear(a.fecha_nacimiento)}</div>
                  <div><strong>Rebaño:</strong> ${a.rebano_nombre || '-'}</div>
                  <div><strong>Etapa:</strong> <span class="badge badge-verde">${a.etapa}</span></div>
                  <div><strong>Estado Reproductivo:</strong> ${a.estado_reproductivo ? `<span class="badge badge-naranja">${a.estado_reproductivo}</span>` : '-'}</div>
                  <div><strong>Peso Entrada:</strong> ${a.peso_entrada ? `${a.peso_entrada} kg` : '-'}</div>
                  <div><strong>Precio/kg:</strong> ${a.precio_kg ? `$${a.precio_kg}` : '-'}</div>
                  <div><strong>Madre:</strong> ${a.madre_nombre ? `<a href="#/animales/${a.madre_id}">${a.madre_nombre}</a>` : '-'}</div>
                  <div><strong>Padre:</strong> ${a.padre_nombre ? `<a href="#/animales/${a.padre_id}">${a.padre_nombre}</a>` : '-'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Hijos -->
        <div class="card" style="margin-top:1rem">
          <div class="card-header"><strong>🐄 Hijos</strong></div>
          <div class="card-body" id="seccion-hijos">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>

        <!-- Historial reproductivo (timeline) -->
        <div class="card" style="margin-top:1rem">
          <div class="card-header"><strong>🔄 Historial Reproductivo</strong></div>
          <div class="card-body" id="historial-reproductivo">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>

        <!-- Historial de vacunas -->
        <div class="card" style="margin-top:1rem">
          <div class="card-header"><strong>💉 Historial de Vacunación</strong></div>
          <div class="card-body" id="historial-vacunas">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>

        <!-- Historial de movimientos -->
        <div class="card" style="margin-top:1rem">
          <div class="card-header"><strong>📦 Historial de Movimientos</strong></div>
          <div class="card-body" id="historial-movimientos">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>
      `);
    } catch (error) {
      return MainLayout.render(`<div class="alert alert-danger">Error: ${error.message}</div>`);
    }
  },

  afterRender(params) {
    const id = params?.id || Router.obtenerRutaActiva()?.params?.id;
    if (id) this.cargarHistoriales(id);
  },

  async cargarHistoriales(id) {

    // ─── Hijos ───────────────────────────────────────
    try {
      const { data: resHijos } = await API.get(`/animales/${id}/hijos`);
      const hijosDiv = document.getElementById('seccion-hijos');
      const hijos = resHijos.data || [];
      if (hijos.length === 0) {
        hijosDiv.innerHTML = '<p class="empty-state">Esta vaca no tiene hijos registrados</p>';
      } else {
        hijosDiv.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:0.75rem">${hijos.map(h => `
          <a href="#/animales/${h.id}" class="card" style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;text-decoration:none;color:var(--texto-principal);transition:box-shadow var(--transition)">
            <div style="font-size:2rem">${h.sexo === 'Hembra' ? '🐄' : '🐂'}</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:var(--font-size-base)">${h.nombre}</div>
              <div style="font-size:var(--font-size-xs);color:var(--gris-texto)">
                ${h.etapa} · ${h.estado_general}
                ${h.estado_reproductivo ? ` · ${h.estado_reproductivo}` : ''}
              </div>
              <div style="font-size:var(--font-size-xs);color:var(--gris-texto)">${DateUtil.formatear(h.fecha_nacimiento)}</div>
            </div>
            <span style="color:var(--gris-texto);font-size:1.2rem">→</span>
          </a>
        `).join('')}</div>`;
      }
    } catch (e) {
      document.getElementById('seccion-hijos').innerHTML = '<p class="empty-state">Error al cargar hijos</p>';
    }

    // ─── Historial Reproductivo (timeline) ────────────
    try {
      const { data: res } = await API.get(`/reproduccion/timeline/${id}`);
      const div = document.getElementById('historial-reproductivo');
      const timeline = res?.data || {};
      const eventos = timeline.eventos || [];
      if (eventos.length === 0) {
        div.innerHTML = '<p class="empty-state">Sin eventos reproductivos</p>';
      } else {
        div.innerHTML = `<div class="timeline">${eventos.map(ev => {
          let icono = '🔍', detalle = '';
          if (ev.evento_tipo === 'diagnostico_celo') { icono = '🔍'; detalle = ev.sintomas || ev.comportamiento || ''; }
          else if (ev.evento_tipo === 'servicio') { icono = '🤝'; detalle = ev.subtipo || ''; }
          else if (ev.evento_tipo === 'diagnostico_gestacion') { icono = '🩺'; detalle = `${ev.subtipo || ''} — ${ev.resultado || ''}`; }
          else if (ev.evento_tipo === 'parto') {
            icono = '🍼';
            const criasArr = typeof ev.crias === 'string' ? JSON.parse(ev.crias) : (ev.crias || []);
            detalle = Array.isArray(criasArr) && criasArr.length > 0
              ? criasArr.map(c => c.nombre || `Cría`).join(', ') + ` (${criasArr.length})`
              : 'Sin datos de cría';
          }
          return `<div style="display:flex;gap:0.75rem;padding:0.4rem 0;border-bottom:1px solid var(--gris-borde)">
            <span style="min-width:40px;text-align:center">${icono}</span>
            <span style="min-width:130px;font-size:0.85rem;color:var(--gris-texto)">${DateUtil.formatear(ev.fecha)}</span>
            <span style="flex:1"><strong>${ev.evento_nombre}</strong>${detalle ? ' — ' + detalle : ''}</span>
          </div>`;
        }).join('')}</div>`;
      }
    } catch (e) {
      document.getElementById('historial-reproductivo').innerHTML = '<p class="empty-state">Error al cargar historial</p>';
    }

    // ─── Vacunas ──────────────────────────────────────
    try {
      const { data: vac } = await API.get(`/animales/${id}/vacunas`);
      const vacDiv = document.getElementById('historial-vacunas');
      const vacunas = vac.data || [];
      if (vacunas.length === 0) {
        vacDiv.innerHTML = '<p class="empty-state">Sin registros de vacunación</p>';
      } else {
        vacDiv.innerHTML = `<ul>${vacunas.map(v => `<li>${DateUtil.formatear(v.fecha)} — ${v.medicamento_nombre || 'N/A'}</li>`).join('')}</ul>`;
      }
    } catch (e) {
      document.getElementById('historial-vacunas').innerHTML = '<p class="empty-state">Error al cargar historial</p>';
    }

    // ─── Movimientos ──────────────────────────────────
    try {
      const { data: mov } = await API.get(`/animales/${id}/movimientos`);
      const movDiv = document.getElementById('historial-movimientos');
      const movimientos = mov.data || [];
      if (movimientos.length === 0) {
        movDiv.innerHTML = '<p class="empty-state">Sin movimientos registrados</p>';
      } else {
        movDiv.innerHTML = `<ul>${movimientos.map(m => `
          <li>${new Date(m.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}
            — <strong>${m.rebano_origen || 'Sin rebaño'}</strong> → <strong>${m.rebano_destino}</strong>
          </li>
        `).join('')}</ul>`;
      }
    } catch (e) {
      document.getElementById('historial-movimientos').innerHTML = '<p class="empty-state">Error al cargar movimientos</p>';
    }
  },

  mostrarBajaModal(id) {
    document.getElementById('baja-modal')?.remove();
    const div = document.createElement('div');
    div.id = 'baja-modal';
    div.innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this)this.parentElement.remove()">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-title">Dar de Baja Animal</span>
            <button class="modal-close" onclick="this.closest('#baja-modal').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <form id="baja-form" onsubmit="AnimalDetailPage.confirmarBaja(event, ${id})">
              <div class="form-group">
                <label class="form-label">Motivo *</label>
                <select class="form-select" id="baja-motivo" required onchange="AnimalDetailPage.cambioMotivoBaja()">
                  <option value="">Seleccione...</option>
                  <option value="Venta">Venta</option>
                  <option value="Muerte">Muerte</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Fecha de salida *</label>
                <input type="date" class="form-input" id="baja-fecha" value="${new Date().toISOString().substring(0, 10)}" required>
              </div>
              <div class="form-group" id="baja-peso-group" style="display:none">
                <label class="form-label">Peso de salida (kg)</label>
                <input type="number" step="0.1" min="0" class="form-input" id="baja-peso" placeholder="Ej: 500">
              </div>
              <div class="form-group" id="baja-detalle-venta" style="display:none">
                <div class="form-group">
                  <label class="form-label">Precio de venta ($)</label>
                  <input type="number" step="0.01" min="0" class="form-input" id="baja-precio" placeholder="Ej: 2500000">
                </div>
                <div class="form-group">
                  <label class="form-label">Comprador</label>
                  <input type="text" class="form-input" id="baja-comprador" placeholder="Nombre del comprador">
                </div>
              </div>
              <div class="form-group" id="baja-detalle-muerte" style="display:none">
                <label class="form-label">Causa de muerte</label>
                <input type="text" class="form-input" id="baja-causa" placeholder="Ej: Enfermedad, Accidente, Vejez...">
              </div>
              <div style="display:flex;gap:0.5rem;justify-content:flex-end;margin-top:1rem">
                <button type="button" class="btn btn-secondary" onclick="this.closest('#baja-modal').remove()">Cancelar</button>
                <button type="submit" class="btn btn-danger">Confirmar Baja</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(div);
  },

  cambioMotivoBaja() {
    const motivo = document.getElementById('baja-motivo').value;
    const ventaDiv = document.getElementById('baja-detalle-venta');
    const muerteDiv = document.getElementById('baja-detalle-muerte');
    const pesoGroup = document.getElementById('baja-peso-group');
    ventaDiv.style.display = motivo === 'Venta' ? '' : 'none';
    muerteDiv.style.display = motivo === 'Muerte' ? '' : 'none';
    pesoGroup.style.display = motivo ? '' : 'none';
    // Resetear campos ocultos para evitar enviar datos incorrectos
    if (motivo !== 'Venta') {
      document.getElementById('baja-precio').value = '';
      document.getElementById('baja-comprador').value = '';
    }
    if (motivo !== 'Muerte') {
      document.getElementById('baja-causa').value = '';
    }
  },

  async confirmarBaja(e, id) {
    e.preventDefault();
    const motivo = document.getElementById('baja-motivo').value;

    const payload = {
      estado_general: motivo === 'Venta' ? 'Vendido' : 'Muerto',
      fecha_salida: document.getElementById('baja-fecha').value,
      peso_salida: document.getElementById('baja-peso').value || null,
    };

    if (motivo === 'Venta') {
      payload.precio_venta = document.getElementById('baja-precio').value || null;
      payload.comprador = document.getElementById('baja-comprador').value || null;
    } else {
      payload.motivo_salida = document.getElementById('baja-causa').value || null;
    }

    try {
      await API.post(`/animales/${id}/baja`, payload);
      document.getElementById('baja-modal').remove();
      location.reload();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al dar de baja');
    }
  },
};
