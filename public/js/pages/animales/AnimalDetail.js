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
            <button class="btn btn-secondary" onclick="Router.navegar('/animales/${a.id}/editar')">✏️ Editar</button>
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

        <!-- Historial de vacunas -->
        <div class="card" style="margin-top:1rem">
          <div class="card-header"><strong>💉 Historial de Vacunación</strong></div>
          <div class="card-body" id="historial-vacunas">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>

        <!-- Historial de celos -->
        <div class="card" style="margin-top:1rem">
          <div class="card-header"><strong>🔄 Historial de Celo</strong></div>
          <div class="card-body" id="historial-celos">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>
      `);
    } catch (error) {
      return MainLayout.render(`<div class="alert alert-danger">Error: ${error.message}</div>`);
    }
  },

  afterRender() {
    this.cargarHistoriales();
  },

  async cargarHistoriales() {
    const id = Router.obtenerRutaActiva().params.id;

    try {
      // Vacunas
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

    try {
      const { data: cel } = await API.get(`/animales/${id}/celos`);
      const celDiv = document.getElementById('historial-celos');
      const celos = cel.data || [];
      if (celos.length === 0) {
        celDiv.innerHTML = '<p class="empty-state">Sin registros de celo</p>';
      } else {
        celDiv.innerHTML = `<ul>${celos.map(c => `<li>${DateUtil.formatear(c.fecha_inicio)} — ${c.servicio_realizado ? '✅ Servicio realizado' : '⏳ En observación'}</li>`).join('')}</ul>`;
      }
    } catch (e) {
      document.getElementById('historial-celos').innerHTML = '<p class="empty-state">Error al cargar historial</p>';
    }
  },
};
