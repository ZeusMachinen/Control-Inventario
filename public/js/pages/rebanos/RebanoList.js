const RebanoListPage = {
  mostrarInactivos: false,
  filtroNombre: '',

  async render() {
    return MainLayout.render(`
      <div class="page-header">
        <h1 class="page-title">Rebaños</h1>
        <button class="btn btn-primary" onclick="RebanoListPage.mostrarFormulario()">+ Nuevo Rebaño</button>
      </div>

      <div class="stats-grid" id="rebanos-kpis">
        <div class="stat-card" style="border-left-color:var(--azul)">
          <div class="stat-card-icon" style="background:var(--azul-claro);color:var(--azul)">🐮</div>
          <div class="stat-card-info">
            <h3 id="kpi-animales">0</h3>
            <p>Animales Activos</p>
          </div>
        </div>
        <div class="stat-card" style="border-left-color:var(--verde-principal)">
          <div class="stat-card-icon" style="background:var(--verde-bg);color:var(--verde-principal)">🐣</div>
          <div class="stat-card-info">
            <h3 id="kpi-nacidos">0</h3>
            <p>Nacidos Totales</p>
          </div>
        </div>
        <div class="stat-card" style="border-left-color:var(--rojo)">
          <div class="stat-card-icon" style="background:var(--rojo-claro);color:var(--rojo)">💀</div>
          <div class="stat-card-info">
            <h3 id="kpi-muertes">0</h3>
            <p>Muertes</p>
          </div>
        </div>
        <div class="stat-card" style="border-left-color:var(--naranja)">
          <div class="stat-card-icon" style="background:var(--naranja-claro);color:var(--naranja)">📦</div>
          <div class="stat-card-info">
            <h3 id="kpi-rebanos">0</h3>
            <p>Rebaños Activos</p>
          </div>
        </div>
      </div>

      <div class="filter-panel">
        <div class="form-group">
          <label class="form-label">Buscar rebaño</label>
          <input type="text" class="form-input" id="filtro-nombre" placeholder="Nombre..." oninput="RebanoListPage.aplicarFiltros()">
        </div>
        <div class="form-group" style="display:flex;align-items:flex-end;padding-bottom:2px">
          <label style="display:flex;align-items:center;gap:0.3rem;font-size:0.85rem;cursor:pointer">
            <input type="checkbox" id="toggle-inactivos" onchange="RebanoListPage.toggleInactivos()">
            Mostrar inactivos
          </label>
        </div>
      </div>

      <div class="card" id="rebanos-contenedor">
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Inicio</th>
                <th>Animales</th>
                <th>Costo/Cabeza</th>
                <th>Valor Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="rebanos-tbody">
              <tr><td colspan="6" class="loading"><div class="spinner"></div>Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div id="rebano-modal"></div>
    `);
  },

  afterRender() {
    this.cargarKpis();
    this.cargar();
  },

  async cargarKpis() {
    try {
      const { data } = await API.get('/rebanos/kpis');
      const k = data.data || {};
      document.getElementById('kpi-animales').textContent = k.total_animales ?? 0;
      document.getElementById('kpi-nacidos').textContent = k.total_nacidos ?? 0;
      document.getElementById('kpi-muertes').textContent = k.total_muertes ?? 0;
      document.getElementById('kpi-rebanos').textContent = k.rebanos_activos ?? 0;
    } catch (e) {
      // los KPIs se quedan en 0 si falla la carga
    }
  },

  toggleInactivos() {
    this.mostrarInactivos = document.getElementById('toggle-inactivos').checked;
    this.cargar();
  },

  aplicarFiltros() {
    this.filtroNombre = (document.getElementById('filtro-nombre')?.value || '').toLowerCase().trim();
    this.cargar();
  },

  async cargar() {
    try {
      const params = {};
      if (this.mostrarInactivos) params.inactivos = 1;
      const { data } = await API.get('/rebanos', params);
      let rebanos = Array.isArray(data) ? data : (data.data || []);
      const tbody = document.getElementById('rebanos-tbody');

      // Filtrar por nombre localmente
      if (this.filtroNombre) {
        rebanos = rebanos.filter(r => r.nombre.toLowerCase().includes(this.filtroNombre));
      }

      if (rebanos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No hay rebaños creados</td></tr>';
        return;
      }

      tbody.innerHTML = rebanos.map(r => {
        const costo = parseFloat(r.costo_cabeza) || 0;
        const total = (costo * (r.total_animales || 0)).toFixed(2);
        const fechaInicio = r.fecha_inicio ? new Date(r.fecha_inicio + 'T00:00:00').toLocaleDateString('es-CO') : '—';
        return `
          <tr style="${!r.activo ? 'opacity:0.5' : ''}">
            <td><a href="#/rebanos/${r.id}" class="animal-link"><strong>${r.nombre}</strong></a>${!r.activo ? ' <span class="badge badge-rojo">Inactivo</span>' : ''}</td>
            <td><span style="font-size:0.85rem;color:var(--muted)">${fechaInicio}</span></td>
            <td><span class="badge badge-verde">${r.total_animales} animales</span></td>
            <td>${costo ? '$' + costo.toFixed(2) : '—'}</td>
            <td>${costo ? '$' + total : '—'}</td>
            <td class="table-actions">
              <button class="btn btn-sm btn-info" onclick="RebanoListPage.verEstadisticas(${r.id}, '${r.nombre}')">📊</button>
              <button class="btn btn-sm btn-primary" onclick="Router.navegar('/rebanos/${r.id}/costos')" title="Costos mensuales">💰</button>
              ${r.activo ? `<button class="btn btn-sm btn-secondary" onclick="RebanoListPage.editar(${r.id}, '${r.nombre}', ${r.costo_cabeza || ''}, '${r.fecha_inicio || ''}')">✏️</button>` : ''}
              <button class="btn btn-sm btn-info" onclick="Router.navegar('/rebanos/${r.id}/movimientos')">📋</button>
              <button class="btn btn-sm btn-outline" onclick="Router.navegar('/animales?rebano_id=${r.id}')">🐮 Ver</button>
              <button class="btn btn-sm btn-danger" onclick="RebanoListPage.eliminar(${r.id}, '${r.nombre}')">🗑️</button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      document.getElementById('rebanos-tbody').innerHTML = `<tr><td colspan="6" class="alert alert-danger">Error: ${e.message}</td></tr>`;
    }
  },

  async verEstadisticas(id, nombre) {
    try {
      const { data } = await API.get(`/rebanos/${id}/estadisticas`);
      const e = data.data || data;
      document.getElementById('rebano-modal').innerHTML = `
        <div class="modal-overlay" onclick="if(event.target===this)RebanoListPage.cerrarModal()">
          <div class="modal" style="max-width:500px">
            <div class="modal-header">
              <span class="modal-title">📊 Estadísticas: ${nombre}</span>
              <button class="modal-close" onclick="RebanoListPage.cerrarModal()">&times;</button>
            </div>
            <div class="modal-body">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
                <div class="card"><div class="card-body" style="padding:1rem;text-align:center">
                  <div style="font-size:0.8rem;color:var(--muted)">Nacidos</div>
                  <div style="font-size:1.5rem;font-weight:700">${e.nacidos || 0}</div>
                </div></div>
                <div class="card"><div class="card-body" style="padding:1rem;text-align:center">
                  <div style="font-size:0.8rem;color:var(--muted)">Activos</div>
                  <div style="font-size:1.5rem;font-weight:700">${e.activos || 0}</div>
                </div></div>
                <div class="card"><div class="card-body" style="padding:1rem;text-align:center">
                  <div style="font-size:0.8rem;color:var(--muted)">Muertes</div>
                  <div style="font-size:1.5rem;font-weight:700;color:var(--danger)">${e.muertes || 0}</div>
                </div></div>
                <div class="card"><div class="card-body" style="padding:1rem;text-align:center">
                  <div style="font-size:0.8rem;color:var(--muted)">Vendidos</div>
                  <div style="font-size:1.5rem;font-weight:700;color:var(--primary)">${e.vendidos || 0}</div>
                </div></div>
              </div>
              <hr style="margin:1rem 0">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
                <div class="card"><div class="card-body" style="padding:1rem;text-align:center">
                  <div style="font-size:0.8rem;color:var(--muted)">Kg Producidos</div>
                  <div style="font-size:1.3rem;font-weight:700">${parseFloat(e.kilos_producidos || 0).toFixed(1)} kg</div>
                </div></div>
                <div class="card"><div class="card-body" style="padding:1rem;text-align:center">
                  <div style="font-size:0.8rem;color:var(--muted)">Ingresos Generados</div>
                  <div style="font-size:1.3rem;font-weight:700">$${parseFloat(e.ingresos_generados || 0).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</div>
                </div></div>
              </div>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      alert('Error al cargar estadísticas');
    }
  },

  mostrarFormulario() {
    document.getElementById('rebano-modal').innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this)RebanoListPage.cerrarModal()">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-title">Nuevo Rebaño</span>
            <button class="modal-close" onclick="RebanoListPage.cerrarModal()">&times;</button>
          </div>
          <div class="modal-body">
            <form id="rebano-form" onsubmit="RebanoListPage.guardar(event)">
              <div class="form-group">
                <label class="form-label">Nombre del Rebaño *</label>
                <input type="text" class="form-input" id="rebano-nombre" placeholder="Ej: Rebaño Norte" required>
              </div>
              <div class="form-group">
                <label class="form-label">Fecha de inicio</label>
                <input type="date" class="form-input" id="rebano-fecha-inicio" value="${new Date().toISOString().substring(0, 10)}">
              </div>
              <div class="form-group">
                <label class="form-label">Costo por Cabeza ($)</label>
                <input type="number" step="0.01" min="0" class="form-input" id="rebano-costo" placeholder="Ej: 1500.00">
              </div>
              <div style="display:flex;gap:0.5rem;justify-content:flex-end;margin-top:1rem">
                <button type="button" class="btn btn-secondary" onclick="RebanoListPage.cerrarModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Crear</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  },

  async guardar(e) {
    e.preventDefault();
    const nombre = document.getElementById('rebano-nombre').value;
    const costo = document.getElementById('rebano-costo').value;
    const fechaInicio = document.getElementById('rebano-fecha-inicio').value;
    try {
      await API.post('/rebanos', { nombre, costo_cabeza: costo || null, fecha_inicio: fechaInicio || null });
      this.cerrarModal();
      this.cargarKpis();
      this.cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al guardar');
    }
  },

  async editar(id, nombreActual, costoActual, fechaInicioActual) {
    document.getElementById('rebano-modal').innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this)RebanoListPage.cerrarModal()">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-title">Editar Rebaño</span>
            <button class="modal-close" onclick="RebanoListPage.cerrarModal()">&times;</button>
          </div>
          <div class="modal-body">
            <form id="rebano-form" onsubmit="RebanoListPage.actualizar(event, ${id})">
              <div class="form-group">
                <label class="form-label">Nombre del Rebaño *</label>
                <input type="text" class="form-input" id="rebano-nombre" value="${nombreActual}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Fecha de inicio</label>
                <input type="date" class="form-input" id="rebano-fecha-inicio" value="${fechaInicioActual || ''}">
              </div>
              <div class="form-group">
                <label class="form-label">Costo por Cabeza ($)</label>
                <input type="number" step="0.01" min="0" class="form-input" id="rebano-costo" value="${costoActual || ''}" placeholder="Ej: 1500.00">
              </div>
              <div style="display:flex;gap:0.5rem;justify-content:flex-end;margin-top:1rem">
                <button type="button" class="btn btn-secondary" onclick="RebanoListPage.cerrarModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  },

  async actualizar(e, id) {
    e.preventDefault();
    const nombre = document.getElementById('rebano-nombre').value;
    const costo = document.getElementById('rebano-costo').value;
    const fechaInicio = document.getElementById('rebano-fecha-inicio').value;
    try {
      await API.put(`/rebanos/${id}`, {
        nombre,
        costo_cabeza: costo || null,
        fecha_inicio: fechaInicio || null,
      });
      this.cerrarModal();
      this.cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al actualizar');
    }
  },

  async eliminar(id, nombre) {
    if (!confirm(`¿Eliminar el rebaño "${nombre}"?`)) return;
    try {
      await API.delete(`/rebanos/${id}`);
      this.cargarKpis();
      this.cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar');
    }
  },

  cerrarModal() {
    document.getElementById('rebano-modal').innerHTML = '';
  },
};
