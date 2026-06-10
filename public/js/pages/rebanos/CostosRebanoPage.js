const CostosRebanoPage = {
  rebanoId: null,

  async render(params) {
    this.rebanoId = params.id;
    try {
      const { data: reb } = await API.get(`/rebanos/${this.rebanoId}`);
      const rebano = reb.data || {};

      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title"><i class="fas fa-coins me-2"></i>Costos Mensuales</h1>
          <div class="d-flex gap-2 align-items-center">
            <span class="fw-semibold text-secondary">${rebano.nombre}</span>
            <button class="btn btn-outline-primary btn-sm" onclick="CostosRebanoPage.recalcular()"><i class="fas fa-rotate me-1"></i>Recalcular</button>
            <button class="btn btn-outline-secondary btn-sm" onclick="Router.navegar('/rebanos')"><i class="fas fa-arrow-left me-1"></i>Volver</button>
          </div>
        </div>

        <div id="costos-resumen" class="row g-3 mb-3"></div>

        <div class="card">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th>Mes</th>
                  <th>Cabezas</th>
                  <th>Gastos ($)</th>
                  <th>Inversiones ($)</th>
                  <th>Total ($)</th>
                  <th>Costo/Cabeza ($)</th>
                </tr>
              </thead>
              <tbody id="costos-tbody">
                <tr><td colspan="6" class="text-center py-4 text-secondary"><div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>Cargando...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="card mt-3">
          <div class="card-header"><strong><i class="fas fa-list me-2"></i>Detalle por Mes</strong></div>
          <div class="card-body" id="costos-detalle">
            <p class="text-center text-secondary py-3">Seleccioná un mes para ver el detalle</p>
          </div>
        </div>
      `);
    } catch (e) {
      return MainLayout.render(`<div class="alert alert-danger">Error: ${e.message}</div>`);
    }
  },

  afterRender() { this.cargar(); },

  async cargar() {
    try {
      const { data: resp } = await API.get(`/rebanos/${this.rebanoId}/costos`);
      const data = resp.data || {};
      const porMes = data.por_mes || [];

      const totalGastos = porMes.reduce((s, m) => s + m.gastos, 0);
      const totalInversiones = porMes.reduce((s, m) => s + m.inversiones, 0);
      const totalGeneral = totalGastos + totalInversiones;

      document.getElementById('costos-resumen').innerHTML = `
        <div class="col-md-4">
          <div class="card text-center py-3">
            <div class="small text-secondary">Total Gastos</div>
            <div class="fs-4 fw-bold text-danger">$${totalGastos.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card text-center py-3">
            <div class="small text-secondary">Total Inversiones</div>
            <div class="fs-4 fw-bold text-primary">$${totalInversiones.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card text-center py-3">
            <div class="small text-secondary">Total General</div>
            <div class="fs-4 fw-bold">$${totalGeneral.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      `;

      const tbody = document.getElementById('costos-tbody');
      if (porMes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-secondary">Sin costos registrados. Presioná "Recalcular" para generarlos.</td></tr>';
        return;
      }

      tbody.innerHTML = porMes.map(m => `
        <tr style="cursor:pointer" onclick="CostosRebanoPage.mostrarDetalle('${m.mes}')">
          <td class="fw-medium">${new Date(m.mes + 'T00:00:00').toLocaleDateString('es-CO', { year: 'numeric', month: 'long' })}</td>
          <td><span class="badge bg-success">${m.cabezas}</span></td>
          <td>${m.gastos ? '$' + m.gastos.toLocaleString('es-CO', { minimumFractionDigits: 2 }) : '—'}</td>
          <td>${m.inversiones ? '$' + m.inversiones.toLocaleString('es-CO', { minimumFractionDigits: 2 }) : '—'}</td>
          <td class="fw-bold">$${m.total.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</td>
          <td><span class="badge ${m.costo_cabeza > 0 ? 'bg-warning' : 'bg-secondary'}">$${m.costo_cabeza.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</span></td>
        </tr>
      `).join('');
    } catch (e) {
      document.getElementById('costos-tbody').innerHTML = `<tr><td colspan="6" class="text-danger py-3 text-center">Error: ${e.message}</td></tr>`;
    }
  },

  mostrarDetalle(mes) {
    const detalleDiv = document.getElementById('costos-detalle');
    detalleDiv.innerHTML = '<p class="text-center py-3"><span class="spinner-border spinner-border-sm text-primary me-2" role="status"></span>Cargando...</p>';

    API.get(`/rebanos/${this.rebanoId}/costos`).then(({ data }) => {
      const porMes = (data.data?.por_mes || []);
      const mesData = porMes.find(m => m.mes === mes);
      if (!mesData) {
        detalleDiv.innerHTML = '<p class="text-center text-secondary py-3">Sin datos para este mes</p>';
        return;
      }

      detalleDiv.innerHTML = `
        <h5 class="mb-3">${new Date(mes + 'T00:00:00').toLocaleDateString('es-CO', { year: 'numeric', month: 'long' })}</h5>
        <p><strong>Cabezas (Novillo/Adulto):</strong> ${mesData.cabezas}</p>
        <div class="table-responsive">
          <table class="table table-sm mb-0">
            <thead class="table-light">
              <tr><th>Tipo</th><th>Concepto</th><th>Monto</th></tr>
            </thead>
            <tbody>
              ${mesData.items.map(item => `
                <tr>
                  <td><span class="badge ${item.tipo === 'inversion' ? 'bg-primary' : 'bg-success'}">${item.tipo === 'inversion' ? 'Inversión' : 'Gasto'}</span></td>
                  <td>${item.concepto}</td>
                  <td class="fw-bold">$${parseFloat(item.monto).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot class="table-light">
              <tr>
                <td colspan="2"><strong>Total</strong></td>
                <td><strong>$${mesData.total.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</strong></td>
              </tr>
              <tr>
                <td colspan="2"><strong>Costo por Cabeza</strong></td>
                <td><strong>$${mesData.costo_cabeza.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      `;
    }).catch(() => {
      detalleDiv.innerHTML = '<p class="text-danger py-3">Error al cargar detalle</p>';
    });
  },

  async recalcular() {
    if (!(await Confirm.show('¿Recalcular todos los costos e headcounts?\nEsto puede tomar unos segundos.'))) return;
    try {
      const btn = document.querySelector('.page-header button');
      if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Recalculando...'; }
      await API.post(`/rebanos/${this.rebanoId}/costos/recalcular`);
      this.cargar();
    } catch (err) {
      Toast.error(err.response?.data?.error || 'Error al recalcular');
    } finally {
      const btn = document.querySelector('.page-header button');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-rotate me-1"></i>Recalcular'; }
    }
  },
};

