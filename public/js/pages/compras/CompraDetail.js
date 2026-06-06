/**
 * Página: Detalle de una compra (lote con sus animales)
 */
const CompraDetailPage = {
  async render(params) {
    const id = params?.id;
    if (!id) return MainLayout.render(`<div class="alert alert-danger">ID de compra no especificado</div>`);

    try {
      const { data: res } = await API.get(`/compras/${id}`);
      const compra = res.data || res;

      const animalesHtml = (compra.animales || []).map(a => `
        <tr>
          <td><a href="#/animales/${a.id}" class="table-link">${a.nombre}</a></td>
          <td>${a.identificacion || '-'}</td>
          <td>${a.sexo}</td>
          <td>${DateUtil.formatear(a.fecha_nacimiento)}</td>
          <td>${a.etapa}</td>
          <td>${a.fecha_ingreso ? DateUtil.formatear(a.fecha_ingreso) : '-'}</td>
          <td>${a.peso_entrada ? `${a.peso_entrada} kg` : '-'}</td>
          <td>${a.precio_compra ? Formateador.moneda(a.precio_compra) : '-'}</td>
          <td>${a.rebano_nombre || '-'}</td>
        </tr>
      `).join('') || '<tr><td colspan="9" class="empty-state">Sin animales registrados</td></tr>';

      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title">📥 Compra #${compra.id}</h1>
          <button class="btn btn-secondary" onclick="Router.navegar('/compras')">← Volver</button>
        </div>

        <div class="card" style="margin-bottom:1rem">
          <div class="card-body">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Proveedor</span>
                <span class="detail-value">${compra.proveedor}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Fecha de Compra</span>
                <span class="detail-value">${DateUtil.formatear(compra.fecha_compra)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Total Animales</span>
                <span class="detail-value">${compra.total_animales}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Total Pagado</span>
                <span class="detail-value"><strong>${Formateador.moneda(compra.total_costo)}</strong></span>
              </div>
              ${compra.notas ? `
              <div class="detail-item" style="grid-column: 1 / -1">
                <span class="detail-label">Notas</span>
                <span class="detail-value">${compra.notas}</span>
              </div>` : ''}
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><strong>Animales de esta compra (${compra.total_animales})</strong></div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Identificación</th>
                  <th>Sexo</th>
                  <th>Fecha Nac.</th>
                  <th>Etapa</th>
                  <th>Ingreso</th>
                  <th>Peso Entrada</th>
                  <th>Precio Compra</th>
                  <th>Rebaño</th>
                </tr>
              </thead>
              <tbody>${animalesHtml}</tbody>
            </table>
          </div>
        </div>
      `);
    } catch (e) {
      return MainLayout.render(`<div class="alert alert-danger">Error: ${e.message}</div>`);
    }
  },
};
