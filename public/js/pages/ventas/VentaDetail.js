const VentaDetailPage = {
  async render(params) {
    const id = params?.id;
    if (!id) return MainLayout.render(`<div class="alert alert-danger">ID de venta no especificado</div>`);

    try {
      const { data: res } = await API.get(`/ventas/${id}`);
      const v = res.data || res;

      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title"><i class="fas fa-sack-dollar me-2"></i>Venta #${v.id}</h1>
          <div class="d-flex gap-2">
            <button class="btn btn-outline-primary btn-sm" onclick="Router.navegar('/ventas/${v.id}/editar')"><i class="fas fa-pen me-1"></i>Editar</button>
            <button class="btn btn-outline-secondary btn-sm" onclick="Router.navegar('/ventas')"><i class="fas fa-arrow-left me-1"></i>Volver</button>
          </div>
        </div>

        <div class="card mb-3">
          <div class="card-header"><strong><i class="fas fa-receipt me-2"></i>Datos de la Venta</strong></div>
          <div class="card-body">
            <div class="row g-2">
              <div class="col-md-4"><strong class="small text-secondary d-block">Fecha</strong>${DateUtil.formatear(v.fecha)}</div>
              <div class="col-md-4"><strong class="small text-secondary d-block">Tipo</strong><span class="badge ${v.tipo === 'Venta' ? 'bg-success' : 'bg-primary'}">${v.tipo}</span></div>
              <div class="col-md-4"><strong class="small text-secondary d-block">Precio</strong><strong>${Formateador.moneda(v.precio)}</strong></div>
              <div class="col-md-4"><strong class="small text-secondary d-block">Comprador</strong>${v.comprador_nombre || 'Usuario interno'}</div>
              <div class="col-md-4"><strong class="small text-secondary d-block">Vendedor</strong>${v.vendedor_nombre}</div>
              <div class="col-md-4"><strong class="small text-secondary d-block">Peso de Salida</strong>${v.peso_salida ? `${v.peso_salida} kg` : '-'}</div>
              ${v.notas ? `<div class="col-12"><strong class="small text-secondary d-block">Notas</strong>${v.notas}</div>` : ''}
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><strong><i class="fas fa-horse me-2"></i>Animal Vendido</strong></div>
          <div class="card-body">
            <div class="row g-2">
              <div class="col-md-4"><strong class="small text-secondary d-block">Nombre</strong><a href="#/animales/${v.animal_id}" class="animal-link">${v.animal_nombre}</a></div>
              <div class="col-md-4"><strong class="small text-secondary d-block">Sexo</strong>${v.animal_sexo || '-'}</div>
              <div class="col-md-4"><strong class="small text-secondary d-block">Identificación</strong>${v.animal_identificacion || '-'}</div>
              <div class="col-md-4"><strong class="small text-secondary d-block">Fecha de Nacimiento</strong>${v.animal_fecha_nacimiento ? DateUtil.formatear(v.animal_fecha_nacimiento) : '-'}</div>
              <div class="col-md-4"><strong class="small text-secondary d-block">Etapa</strong>${v.animal_etapa || '-'}</div>
              <div class="col-md-4"><strong class="small text-secondary d-block">Estado Reproductivo</strong>${v.animal_estado_reproductivo || '-'}</div>
              <div class="col-md-4"><strong class="small text-secondary d-block">Peso de Entrada</strong>${v.animal_peso_entrada ? `${v.animal_peso_entrada} kg` : '-'}</div>
              <div class="col-md-4"><strong class="small text-secondary d-block">Peso de Salida</strong>${v.animal_peso_salida ? `${v.animal_peso_salida} kg` : '-'}</div>
              <div class="col-md-4"><strong class="small text-secondary d-block">Rebaño de origen</strong>${v.animal_rebano_nombre || '-'}</div>
            </div>
            ${v.animal_foto ? `
            <div class="mt-3">
              <img src="/api/${v.animal_foto}" style="max-width:200px;max-height:200px;border-radius:8px;object-fit:cover;">
            </div>` : ''}
          </div>
        </div>
      `);
    } catch (e) {
      return MainLayout.render(`<div class="alert alert-danger">Error: ${e.message}</div>`);
    }
  },
};