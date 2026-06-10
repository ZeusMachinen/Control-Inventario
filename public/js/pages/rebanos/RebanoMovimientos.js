const RebanoMovimientosPage = {
  rebanoId: null,

  async render(params) {
    this.rebanoId = params.id;
    return MainLayout.render(`
      <div class="page-header">
        <h1 class="page-title"><i class="fas fa-right-left me-2"></i>Movimientos de Rebaño</h1>
        <button class="btn btn-outline-secondary" onclick="history.back()"><i class="fas fa-arrow-left me-1"></i>Volver</button>
      </div>

      <div class="card">
        <div class="card-body">
          <div id="movimientos-info" class="mb-3"></div>
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th>Fecha</th>
                  <th>Animal</th>
                  <th>Rebaño Origen</th>
                  <th>Rebaño Destino</th>
                </tr>
              </thead>
              <tbody id="movimientos-tbody">
                <tr><td colspan="4" class="text-center py-4 text-secondary"><div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>Cargando...</td></tr>
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
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-secondary">Sin movimientos registrados</td></tr>';
        return;
      }

      tbody.innerHTML = movimientos.map(m => `
        <tr>
          <td>${new Date(m.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
          <td><a href="#" onclick="Router.navegar('/animales/${m.animal_id}')" class="text-primary">${m.animal_nombre}</a></td>
          <td>${m.rebano_origen || '—'}</td>
          <td>${m.rebano_destino}</td>
        </tr>
      `).join('');
    } catch (e) {
      document.getElementById('movimientos-tbody').innerHTML = `<tr><td colspan="4" class="text-danger py-3 text-center">Error: ${e.message}</td></tr>`;
    }
  },
};