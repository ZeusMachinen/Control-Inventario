const RebanoMovimientosPage = {
  rebanoId: null,

  async render(params) {
    this.rebanoId = params.id;
    return MainLayout.render(`
      <div class="page-header">
        <h1 class="page-title">Movimientos de Rebaño</h1>
        <button class="btn btn-secondary" onclick="history.back()">Volver</button>
      </div>

      <div class="card">
        <div class="card-body">
          <div id="movimientos-info" style="margin-bottom:1rem"></div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Animal</th>
                  <th>Rebaño Origen</th>
                  <th>Rebaño Destino</th>
                </tr>
              </thead>
              <tbody id="movimientos-tbody">
                <tr><td colspan="4" class="loading"><div class="spinner"></div>Cargando...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `);
  },

  afterRender() { this.cargar(); },

  async cargar() {
    try {
      const { data } = await API.get(`/rebanos/${this.rebanoId}`);
      const rebano = data.data;
      document.getElementById('movimientos-info').innerHTML = `
        <strong>Rebaño:</strong> ${rebano.nombre} &nbsp;|&nbsp;
        <strong>Animales:</strong> ${rebano.total_animales}
        ${rebano.costo_cabeza ? `&nbsp;|&nbsp; <strong>Costo/Cabeza:</strong> $${parseFloat(rebano.costo_cabeza).toFixed(2)}` : ''}
      `;

      const { data: movs } = await API.get(`/rebanos/${this.rebanoId}/movimientos`);
      const movimientos = movs.data || [];
      const tbody = document.getElementById('movimientos-tbody');

      if (movimientos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Sin movimientos registrados</td></tr>';
        return;
      }

      tbody.innerHTML = movimientos.map(m => `
        <tr>
          <td>${new Date(m.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
          <td><a href="#" onclick="Router.navegar('/animales/${m.animal_id}')" style="color:var(--primary)">${m.animal_nombre}</a></td>
          <td>${m.rebano_origen || '—'}</td>
          <td>${m.rebano_destino}</td>
        </tr>
      `).join('');
    } catch (e) {
      document.getElementById('movimientos-tbody').innerHTML = `<tr><td colspan="4" class="alert alert-danger">Error: ${e.message}</td></tr>`;
    }
  },
};
