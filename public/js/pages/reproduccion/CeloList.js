/**
 * Página: Listado de Ciclos de Celo
 */
const CeloListPage = {
  async render() {
    return MainLayout.render(`
      <div class="page-header">
        <h1 class="page-title">🔄 Reproducción / Celo</h1>
        <button class="btn btn-primary" onclick="Router.navegar('/celos/nuevo')">+ Registrar Celo</button>
      </div>

      <!-- Alertas próximas -->
      <div id="celo-proximos"></div>

      <div class="card" style="margin-top:1rem">
        <div class="card-header"><strong>Historial de Ciclos</strong></div>
        <div class="table-container">
          <table>
            <thead>
              <tr><th>Animal</th><th>Inicio</th><th>Fin</th><th>Servicio</th><th>Próximo Servicio</th><th>Observaciones</th><th>Acciones</th></tr>
            </thead>
            <tbody id="celo-tbody">
              <tr><td colspan="7" class="loading"><div class="spinner"></div>Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `);
  },

  afterRender() { this.cargar(); },

  async cargar() {
    try {
      const { data: celos } = await API.get('/celos');
      const { data: prox } = await API.get('/celos/proximos');
      const list = celos.data || [];
      const proximos = prox.data || [];

      // Alertas próximas
      const proxDiv = document.getElementById('celo-proximos');
      if (proximos.length > 0) {
        proxDiv.innerHTML = `
          <div class="alert alert-warning">
            <strong>📅 Próximos servicios estimados:</strong>
            <ul style="margin-top:0.5rem">
              ${proximos.slice(0, 5).map(p => `
                <li>${p.animal_nombre} — ${DateUtil.formatear(p.fecha_posible_servicio)}</li>
              `).join('')}
            </ul>
          </div>
        `;
      } else {
        proxDiv.innerHTML = '';
      }

      // Tabla
      const tbody = document.getElementById('celo-tbody');
      if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hay registros de celo</td></tr>';
        return;
      }

      tbody.innerHTML = list.map(c => `
        <tr>
          <td><strong>${c.animal_nombre}</strong></td>
          <td>${DateUtil.formatear(c.fecha_inicio)}</td>
          <td>${c.fecha_fin ? DateUtil.formatear(c.fecha_fin) : '-'}</td>
          <td>${c.servicio_realizado ? '<span class="badge badge-verde">✅ Realizado</span>' : '<span class="badge badge-naranja">⏳ Pendiente</span>'}</td>
          <td>${c.fecha_posible_servicio ? DateUtil.formatear(c.fecha_posible_servicio) : '-'}</td>
          <td>${c.observaciones || '-'}</td>
          <td class="table-actions">
            <button class="btn btn-sm btn-secondary"
              onclick="CeloListPage.marcarServicio(${c.id}, ${c.animal_id})">✅ Servicio</button>
            <button class="btn btn-sm btn-danger" onclick="CeloListPage.eliminar(${c.id})">🗑️</button>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      document.getElementById('celo-tbody').innerHTML = `<tr><td colspan="7" class="alert alert-danger">Error: ${e.message}</td></tr>`;
    }
  },

  async marcarServicio(id, animalId) {
    if (!confirm('¿Marcar servicio como realizado?')) return;
    try {
      await API.put(`/celos/${id}`, { servicio_realizado: 1 });
      this.cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'Error');
    }
  },

  async eliminar(id) {
    if (!confirm('¿Eliminar este registro?')) return;
    try {
      await API.delete(`/celos/${id}`);
      this.cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'Error');
    }
  },
};
