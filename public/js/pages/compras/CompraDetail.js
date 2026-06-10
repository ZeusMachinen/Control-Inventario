const CompraDetailPage = {
  async render(params) {
    const id = params?.id;
    if (!id) return MainLayout.render(`<div class="alert alert-danger">ID de compra no especificado</div>`);

    try {
      const { data: res } = await API.get(`/compras/${id}`);
      const compra = res.data || res;

      const animalesHtml = (compra.animales || []).map(a => `
        <tr>
          <td><a href="#/animales/${a.id}" class="animal-link">${a.nombre}</a></td>
          <td>${a.identificacion || '-'}</td>
          <td>${a.sexo}</td>
          <td>${DateUtil.formatear(a.fecha_nacimiento)}</td>
          <td><span class="badge bg-success">${a.etapa}</span></td>
          <td>${a.fecha_ingreso ? DateUtil.formatear(a.fecha_ingreso) : '-'}</td>
          <td>${a.peso_entrada ? `${a.peso_entrada} kg` : '-'}</td>
          <td>${a.precio_compra ? Formateador.moneda(a.precio_compra) : '-'}</td>
          <td>${a.rebano_nombre || '-'}</td>
        </tr>
      `).join('') || '<tr><td colspan="9" class="text-center py-4 text-secondary">Sin animales registrados</td></tr>';

      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title"><i class="fas fa-cart-shopping me-2"></i>Compra #${compra.id}</h1>
          <button class="btn btn-outline-secondary" onclick="Router.navegar('/compras')"><i class="fas fa-arrow-left me-1"></i>Volver</button>
        </div>

        <div class="card mb-3">
          <div class="card-body">
            <div class="row g-2">
              <div class="col-md-4"><strong class="small text-secondary d-block">Proveedor</strong>${compra.proveedor}</div>
              <div class="col-md-4"><strong class="small text-secondary d-block">Fecha de Compra</strong>${DateUtil.formatear(compra.fecha_compra)}</div>
              <div class="col-md-4"><strong class="small text-secondary d-block">Total Animales</strong>${compra.total_animales}</div>
              <div class="col-md-4"><strong class="small text-secondary d-block">Total Pagado</strong><strong>${Formateador.moneda(compra.total_costo)}</strong></div>
              ${compra.notas ? `<div class="col-12"><strong class="small text-secondary d-block">Notas</strong>${compra.notas}</div>` : ''}
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><strong><i class="fas fa-horse me-2"></i>Animales de esta compra (${compra.total_animales})</strong></div>
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
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