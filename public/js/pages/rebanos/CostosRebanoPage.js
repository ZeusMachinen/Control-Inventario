/**
 * Página: Costos Mensuales por Cabeza de un Rebaño
 */
const CostosRebanoPage = {
  rebanoId: null,

  async render(params) {
    this.rebanoId = params.id;
    try {
      const { data: reb } = await API.get(`/rebanos/${this.rebanoId}`);
      const rebano = reb.data || {};

      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title">💰 Costos Mensuales</h1>
          <div style="display:flex;gap:0.5rem">
            <span style="font-size:1.1rem;font-weight:600;color:var(--muted);align-self:center">${rebano.nombre}</span>
            <button class="btn btn-secondary" onclick="CostosRebanoPage.recalcular()">🔄 Recalcular</button>
            <button class="btn btn-secondary" onclick="Router.navegar('/rebanos')">← Volver</button>
          </div>
        </div>

        <div id="costos-resumen" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:1rem"></div>

        <div class="card">
          <div class="table-container">
            <table>
              <thead>
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
                <tr><td colspan="6" class="loading"><div class="spinner"></div>Cargando...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="card" style="margin-top:1rem">
          <div class="card-header"><strong>📋 Detalle por Mes</strong></div>
          <div class="card-body" id="costos-detalle">
            <p class="empty-state">Seleccioná un mes para ver el detalle</p>
          </div>
        </div>
      `);
    } catch (e) {
      return MainLayout.render(`<div class="alert alert-danger">Error: ${e.message}</div>`);
    }
  },

  afterRender() {
    this.cargar();
  },

  async cargar() {
    try {
      const { data: resp } = await API.get(`/rebanos/${this.rebanoId}/costos`);
      const data = resp.data || {};
      const porMes = data.por_mes || [];

      // Resumen total
      const totalGastos = porMes.reduce((s, m) => s + m.gastos, 0);
      const totalInversiones = porMes.reduce((s, m) => s + m.inversiones, 0);
      const totalGeneral = totalGastos + totalInversiones;
      const totalCabezasProm = porMes.reduce((s, m) => s + m.cabezas, 0) / (porMes.length || 1);

      document.getElementById('costos-resumen').innerHTML = `
        <div class="card"><div class="card-body" style="padding:1rem;text-align:center">
          <div style="font-size:0.8rem;color:var(--muted)">Total Gastos</div>
          <div style="font-size:1.3rem;font-weight:700;color:var(--danger)">$${totalGastos.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</div>
        </div></div>
        <div class="card"><div class="card-body" style="padding:1rem;text-align:center">
          <div style="font-size:0.8rem;color:var(--muted)">Total Inversiones</div>
          <div style="font-size:1.3rem;font-weight:700;color:var(--primary)">$${totalInversiones.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</div>
        </div></div>
        <div class="card"><div class="card-body" style="padding:1rem;text-align:center">
          <div style="font-size:0.8rem;color:var(--muted)">Total General</div>
          <div style="font-size:1.3rem;font-weight:700">$${totalGeneral.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</div>
        </div></div>
      `;

      // Tabla por mes
      const tbody = document.getElementById('costos-tbody');
      if (porMes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Sin costos registrados. Presioná "Recalcular" para generarlos.</td></tr>';
        return;
      }

      tbody.innerHTML = porMes.map(m => `
        <tr style="cursor:pointer" onclick="CostosRebanoPage.mostrarDetalle('${m.mes}')">
          <td><strong>${new Date(m.mes + 'T00:00:00').toLocaleDateString('es-CO', { year: 'numeric', month: 'long' })}</strong></td>
          <td><span class="badge badge-verde">${m.cabezas}</span></td>
          <td>${m.gastos ? '$' + m.gastos.toLocaleString('es-CO', { minimumFractionDigits: 2 }) : '—'}</td>
          <td>${m.inversiones ? '$' + m.inversiones.toLocaleString('es-CO', { minimumFractionDigits: 2 }) : '—'}</td>
          <td><strong>$${m.total.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</strong></td>
          <td><span class="badge badge-${m.costo_cabeza > 0 ? 'naranja' : 'gris'}">$${m.costo_cabeza.toLocaleString('es-CO', { minimumFractionDigits: 2 })}</span></td>
        </tr>
      `).join('');
    } catch (e) {
      document.getElementById('costos-tbody').innerHTML = `<tr><td colspan="6" class="alert alert-danger">Error: ${e.message}</td></tr>`;
    }
  },

  mostrarDetalle(mes) {
    const detalleDiv = document.getElementById('costos-detalle');
    detalleDiv.innerHTML = '<div class="loading"><div class="spinner"></div>Cargando...</div>';

    API.get(`/rebanos/${this.rebanoId}/costos`).then(({ data }) => {
      const porMes = (data.data?.por_mes || []);
      const mesData = porMes.find(m => m.mes === mes);
      if (!mesData) {
        detalleDiv.innerHTML = '<p class="empty-state">Sin datos para este mes</p>';
        return;
      }

      detalleDiv.innerHTML = `
        <h3 style="margin:0 0 1rem">${new Date(mes + 'T00:00:00').toLocaleDateString('es-CO', { year: 'numeric', month: 'long' })}</h3>
        <p><strong>Cabezas (Novillo/Adulto):</strong> ${mesData.cabezas}</p>
        <table>
          <thead>
            <tr><th>Tipo</th><th>Concepto</th><th>Monto</th></tr>
          </thead>
          <tbody>
            ${mesData.items.map(item => `
              <tr>
                <td><span class="badge badge-${item.tipo === 'inversion' ? 'azul' : 'verde'}">${item.tipo === 'inversion' ? 'Inversión' : 'Gasto'}</span></td>
                <td>${item.concepto}</td>
                <td><strong>$${parseFloat(item.monto).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</strong></td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
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
      `;
    }).catch(() => {
      detalleDiv.innerHTML = '<p class="alert alert-danger">Error al cargar detalle</p>';
    });
  },

  async recalcular() {
    if (!confirm('¿Recalcular todos los costos e headcounts?\nEsto puede tomar unos segundos.')) return;
    try {
      const btn = document.querySelector('.page-header button');
      if (btn) { btn.disabled = true; btn.textContent = '⏳ Recalculando...'; }
      await API.post(`/rebanos/${this.rebanoId}/costos/recalcular`);
      this.cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al recalcular');
    } finally {
      const btn = document.querySelector('.page-header button');
      if (btn) { btn.disabled = false; btn.textContent = '🔄 Recalcular'; }
    }
  },
};
