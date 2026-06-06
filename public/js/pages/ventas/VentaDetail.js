/**
 * Página: Detalle de Venta
 * Muestra la información de la venta y las características del animal vendido.
 */
const VentaDetailPage = {
  async render(params) {
    const id = params?.id;
    if (!id) return MainLayout.render(`<div class="alert alert-danger">ID de venta no especificado</div>`);

    try {
      const { data: res } = await API.get(`/ventas/${id}`);
      const v = res.data || res;

      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title">💰 Venta #${v.id}</h1>
          <div style="display:flex;gap:0.5rem">
            <button class="btn btn-secondary" onclick="Router.navegar('/ventas/${v.id}/editar')">✏️ Editar</button>
            <button class="btn btn-secondary" onclick="Router.navegar('/ventas')">← Volver</button>
          </div>
        </div>

        <div class="card" style="margin-bottom:1rem">
          <div class="card-header"><strong>Datos de la Venta</strong></div>
          <div class="card-body">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Fecha</span>
                <span class="detail-value">${DateUtil.formatear(v.fecha)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Tipo</span>
                <span class="detail-value"><span class="badge ${v.tipo === 'Venta' ? 'badge-verde' : 'badge-azul'}">${v.tipo}</span></span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Precio</span>
                <span class="detail-value"><strong>${Formateador.moneda(v.precio)}</strong></span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Comprador</span>
                <span class="detail-value">${v.comprador_nombre || 'Usuario interno'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Vendedor</span>
                <span class="detail-value">${v.vendedor_nombre}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Peso de Salida</span>
                <span class="detail-value">${v.peso_salida ? `${v.peso_salida} kg` : '-'}</span>
              </div>
              ${v.notas ? `
              <div class="detail-item" style="grid-column: 1 / -1">
                <span class="detail-label">Notas</span>
                <span class="detail-value">${v.notas}</span>
              </div>` : ''}
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><strong>Animal Vendido</strong></div>
          <div class="card-body">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Nombre</span>
                <span class="detail-value"><a href="#/animales/${v.animal_id}" class="table-link">${v.animal_nombre}</a></span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Sexo</span>
                <span class="detail-value">${v.animal_sexo || '-'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Identificación</span>
                <span class="detail-value">${v.animal_identificacion || '-'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Fecha de Nacimiento</span>
                <span class="detail-value">${v.animal_fecha_nacimiento ? DateUtil.formatear(v.animal_fecha_nacimiento) : '-'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Etapa</span>
                <span class="detail-value">${v.animal_etapa || '-'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Estado Reproductivo</span>
                <span class="detail-value">${v.animal_estado_reproductivo || '-'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Peso de Entrada</span>
                <span class="detail-value">${v.animal_peso_entrada ? `${v.animal_peso_entrada} kg` : '-'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Peso de Salida</span>
                <span class="detail-value">${v.animal_peso_salida ? `${v.animal_peso_salida} kg` : '-'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Rebaño de origen</span>
                <span class="detail-value">${v.animal_rebano_nombre || '-'}</span>
              </div>
            </div>
            ${v.animal_foto ? `
            <div style="margin-top:1rem">
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
