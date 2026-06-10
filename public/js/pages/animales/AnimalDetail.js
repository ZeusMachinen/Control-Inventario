/**
 * Página: Detalle de Animal (Bootstrap + FontAwesome)
 */
const AnimalDetailPage = {
  async render(params) {
    try {
      const { data } = await API.get(`/animales/${params.id}`);
      const a = data.data || {};

      const edad = DateUtil.calcularEdad(a.fecha_nacimiento);
      const fotoHtml = a.foto
        ? `<img src="/api/${a.foto}" class="animal-foto" alt="${a.nombre}">`
        : `<div class="animal-foto d-flex align-items-center justify-content-center" style="background:var(--gris-fondo);font-size:3rem"><i class="fas fa-question-circle text-secondary"></i></div>`;

      const estadoBadge = a.estado_general === 'Activo' ? '' :
        `<span class="badge ${a.estado_general === 'Vendido' ? 'bg-info' : 'bg-danger'} fs-6 py-2 px-3">${a.estado_general}</span>`;

      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title">${a.nombre}</h1>
          <div class="d-flex gap-2">
            ${a.estado_general === 'Activo' ? `
              <button class="btn btn-outline-primary" onclick="Router.navegar('/animales/${a.id}/editar')">
                <i class="fas fa-pen"></i> Editar
              </button>
              <button class="btn btn-outline-danger" onclick="AnimalDetailPage.mostrarBajaModal(${a.id})">
                <i class="fas fa-trash"></i> Dar de Baja
              </button>
            ` : estadoBadge}
            <button class="btn btn-outline-secondary" onclick="Router.navegar('/animales')">
              <i class="fas fa-arrow-left"></i> Volver
            </button>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
            <div class="d-flex gap-4 flex-wrap">
              <div>${fotoHtml}</div>
              <div class="flex-grow-1" style="min-width:250px">
                <div class="row g-3">
                  <div class="col-sm-6"><strong>Sexo:</strong> <span class="badge ${a.sexo === 'Macho' ? 'badge-sexo-macho' : 'badge-sexo-hembra'}">${a.sexo}</span></div>
                  <div class="col-sm-6"><strong>Identificación:</strong> ${a.identificacion || '-'}</div>
                  <div class="col-sm-6"><strong>Edad:</strong> ${edad.anios} años ${edad.meses} meses</div>
                  <div class="col-sm-6"><strong>Fecha de Nacimiento:</strong> ${DateUtil.formatear(a.fecha_nacimiento)}</div>
                  <div class="col-sm-6"><strong>Rebaño:</strong> ${a.rebano_nombre || '-'}</div>
                  <div class="col-sm-6"><strong>Etapa:</strong> <span class="badge bg-primary">${a.etapa}</span></div>
                  <div class="col-sm-6"><strong>Estado Reproductivo:</strong> ${a.estado_reproductivo ? `<span class="badge bg-warning">${a.estado_reproductivo}</span>` : '-'}</div>
                  <div class="col-sm-6"><strong>Peso Entrada:</strong> ${a.peso_entrada ? `${a.peso_entrada} kg` : '-'}</div>
                  <div class="col-sm-6"><strong>Precio/kg:</strong> ${a.precio_kg ? `$${a.precio_kg}` : '-'}</div>
                  <div class="col-sm-6"><strong>Madre:</strong> ${a.madre_nombre ? `<a href="#/animales/${a.madre_id}">${a.madre_nombre}</a>` : '-'}</div>
                  <div class="col-sm-6"><strong>Padre:</strong> ${a.padre_nombre ? `<a href="#/animales/${a.padre_id}">${a.padre_nombre}</a>` : '-'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card mt-3">
          <div class="card-header fw-semibold"><i class="fas fa-paw me-2"></i>Hijos</div>
          <div class="card-body" id="seccion-hijos">
            <div class="text-center py-4 text-secondary"><div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>Cargando...</div>
          </div>
        </div>

        <div class="card mt-3">
          <div class="card-header fw-semibold"><i class="fas fa-repeat me-2"></i>Historial Reproductivo</div>
          <div class="card-body" id="historial-reproductivo">
            <div class="text-center py-4 text-secondary"><div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>Cargando...</div>
          </div>
        </div>

        <div class="card mt-3">
          <div class="card-header fw-semibold"><i class="fas fa-syringe me-2"></i>Historial de Vacunación</div>
          <div class="card-body" id="historial-vacunas">
            <div class="text-center py-4 text-secondary"><div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>Cargando...</div>
          </div>
        </div>

        <div class="card mt-3">
          <div class="card-header fw-semibold"><i class="fas fa-box me-2"></i>Historial de Movimientos</div>
          <div class="card-body" id="historial-movimientos">
            <div class="text-center py-4 text-secondary"><div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>Cargando...</div>
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

    try {
      const { data: resHijos } = await API.get(`/animales/${id}/hijos`);
      const hijosDiv = document.getElementById('seccion-hijos');
      const hijos = resHijos.data || [];
      if (hijos.length === 0) {
        hijosDiv.innerHTML = '<p class="text-center py-3 text-secondary">Esta vaca no tiene hijos registrados</p>';
      } else {
        hijosDiv.innerHTML = `<div class="d-grid gap-2" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr))">${hijos.map(h => `
          <a href="#/animales/${h.id}" class="card text-decoration-none" style="color:var(--texto-principal);transition:box-shadow var(--transition)">
            <div class="card-body d-flex align-items-center gap-3 p-3">
              <div style="font-size:2rem"><i class="fas ${h.sexo === 'Hembra' ? 'fa-venus' : 'fa-mars'}"></i></div>
              <div class="flex-grow-1 min-w-0">
                <div class="fw-semibold">${h.nombre}</div>
                <div class="small text-secondary">
                  ${h.etapa} · ${h.estado_general}
                  ${h.estado_reproductivo ? ` · ${h.estado_reproductivo}` : ''}
                </div>
                <div class="small text-secondary">${DateUtil.formatear(h.fecha_nacimiento)}</div>
              </div>
              <i class="fas fa-chevron-right text-secondary"></i>
            </div>
          </a>
        `).join('')}</div>`;
      }
    } catch (e) {
      document.getElementById('seccion-hijos').innerHTML = '<p class="text-center py-3 text-danger">Error al cargar hijos</p>';
    }

    try {
      const { data: res } = await API.get(`/reproduccion/timeline/${id}`);
      const div = document.getElementById('historial-reproductivo');
      const timeline = res?.data || {};
      const eventos = timeline.eventos || [];
      if (eventos.length === 0) {
        div.innerHTML = '<p class="text-center py-3 text-secondary">Sin eventos reproductivos</p>';
      } else {
        div.innerHTML = `<div>${eventos.map(ev => {
          let icono = 'fa-search', detalle = '';
          if (ev.evento_tipo === 'diagnostico_celo') { icono = 'fa-search'; detalle = ev.sintomas || ev.comportamiento || ''; }
          else if (ev.evento_tipo === 'servicio') { icono = 'fa-handshake'; detalle = ev.subtipo || ''; }
          else if (ev.evento_tipo === 'diagnostico_gestacion') { icono = 'fa-stethoscope'; detalle = `${ev.subtipo || ''} — ${ev.resultado || ''}`; }
          else if (ev.evento_tipo === 'parto') {
            icono = 'fa-baby';
            const criasArr = typeof ev.crias === 'string' ? JSON.parse(ev.crias) : (ev.crias || []);
            detalle = Array.isArray(criasArr) && criasArr.length > 0
              ? criasArr.map(c => c.nombre || `Cría`).join(', ') + ` (${criasArr.length})`
              : 'Sin datos de cría';
          }
          return `<div class="d-flex gap-2 py-2 border-bottom">
            <span class="text-center" style="min-width:36px"><i class="fas ${icono} text-secondary"></i></span>
            <span class="small text-secondary" style="min-width:120px">${DateUtil.formatear(ev.fecha)}</span>
            <span class="flex-grow-1"><strong>${ev.evento_nombre}</strong>${detalle ? ' — ' + detalle : ''}</span>
          </div>`;
        }).join('')}</div>`;
      }
    } catch (e) {
      document.getElementById('historial-reproductivo').innerHTML = '<p class="text-center py-3 text-danger">Error al cargar historial</p>';
    }

    try {
      const { data: vac } = await API.get(`/animales/${id}/vacunas`);
      const vacDiv = document.getElementById('historial-vacunas');
      const vacunas = vac.data || [];
      if (vacunas.length === 0) {
        vacDiv.innerHTML = '<p class="text-center py-3 text-secondary">Sin registros de vacunación</p>';
      } else {
        vacDiv.innerHTML = `<ul class="list-unstyled mb-0">${vacunas.map(v => `<li class="py-1 border-bottom">${DateUtil.formatear(v.fecha)} — ${v.medicamento_nombre || 'N/A'}</li>`).join('')}</ul>`;
      }
    } catch (e) {
      document.getElementById('historial-vacunas').innerHTML = '<p class="text-center py-3 text-danger">Error al cargar historial</p>';
    }

    try {
      const { data: mov } = await API.get(`/animales/${id}/movimientos`);
      const movDiv = document.getElementById('historial-movimientos');
      const movimientos = mov.data || [];
      if (movimientos.length === 0) {
        movDiv.innerHTML = '<p class="text-center py-3 text-secondary">Sin movimientos registrados</p>';
      } else {
        movDiv.innerHTML = `<ul class="list-unstyled mb-0">${movimientos.map(m => `
          <li class="py-1 border-bottom small">
            ${new Date(m.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}
            — <strong>${m.rebano_origen || 'Sin rebaño'}</strong> <i class="fas fa-arrow-right mx-1"></i> <strong>${m.rebano_destino}</strong>
          </li>
        `).join('')}</ul>`;
      }
    } catch (e) {
      document.getElementById('historial-movimientos').innerHTML = '<p class="text-center py-3 text-danger">Error al cargar movimientos</p>';
    }
  },

  mostrarBajaModal(id) {
    document.getElementById('baja-modal')?.remove();
    const div = document.createElement('div');
    div.id = 'baja-modal';
    div.innerHTML = `
      <div class="modal fade d-block" tabindex="-1" style="background:rgba(0,0,0,0.5)" onclick="if(event.target===this)this.remove()">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title"><i class="fas fa-trash me-2"></i>Dar de Baja Animal</h5>
              <button class="btn-close" onclick="this.closest('#baja-modal').remove()"></button>
            </div>
            <div class="modal-body">
              <form id="baja-form" onsubmit="AnimalDetailPage.confirmarBaja(event, ${id})">
                <div class="mb-3">
                  <label class="form-label">Motivo *</label>
                  <select class="form-select" id="baja-motivo" required onchange="AnimalDetailPage.cambioMotivoBaja()">
                    <option value="">Seleccione...</option>
                    <option value="Venta">Venta</option>
                    <option value="Muerte">Muerte</option>
                  </select>
                </div>
                <div class="mb-3">
                  <label class="form-label">Fecha de salida *</label>
                  <input type="date" class="form-control" id="baja-fecha" value="${new Date().toISOString().substring(0, 10)}" required>
                </div>
                <div class="mb-3 d-none" id="baja-peso-group">
                  <label class="form-label">Peso de salida (kg)</label>
                  <input type="number" step="0.1" min="0" class="form-control" id="baja-peso" placeholder="Ej: 500">
                </div>
                <div class="d-none" id="baja-detalle-venta">
                  <div class="mb-3">
                    <label class="form-label">Precio de venta ($)</label>
                    <input type="number" step="0.01" min="0" class="form-control" id="baja-precio" placeholder="Ej: 2500000">
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Comprador</label>
                    <input type="text" class="form-control" id="baja-comprador" placeholder="Nombre del comprador">
                  </div>
                </div>
                <div class="d-none" id="baja-detalle-muerte">
                  <div class="mb-3">
                    <label class="form-label">Causa de muerte</label>
                    <input type="text" class="form-control" id="baja-causa" placeholder="Ej: Enfermedad, Accidente, Vejez...">
                  </div>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" onclick="this.closest('#baja-modal').remove()">
                <i class="fas fa-times"></i> Cancelar
              </button>
              <button type="submit" class="btn btn-danger" form="baja-form">
                <i class="fas fa-check"></i> Confirmar Baja
              </button>
            </div>
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
    ventaDiv.classList.toggle('d-none', motivo !== 'Venta');
    muerteDiv.classList.toggle('d-none', motivo !== 'Muerte');
    pesoGroup.classList.toggle('d-none', !motivo);
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
      Toast.error(err.response?.data?.error || 'Error al dar de baja');
    }
  },
};
