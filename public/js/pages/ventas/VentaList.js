/**
 * Página: Listado de Ventas
 */
const VentaListPage = {
  async render() {
    try {
      const { data: ventas } = await API.get('/ventas');
      const { data: compras } = await API.get('/ventas/compras');

      const ventasList = ventas.data || [];
      const comprasList = compras.data || [];

      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title">💰 Ventas</h1>
          <button class="btn btn-primary" onclick="Router.navegar('/ventas/nuevo')">+ Nueva Venta</button>
        </div>

        <!-- Ventas realizadas -->
        <div class="card" style="margin-bottom:1rem">
          <div class="card-header"><strong>Ventas Realizadas</strong></div>
          <div class="table-container">
            <table>
              <thead>
                <tr><th>Animal</th><th>Comprador</th><th>Precio</th><th>Peso Salida</th><th>Fecha</th><th>Tipo</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                ${ventasList.length === 0
                  ? '<tr><td colspan="7" class="empty-state">Sin ventas registradas</td></tr>'
                  : ventasList.map(v => `
                    <tr>
                      <td>${v.animal_nombre}</td>
                      <td>${v.comprador_nombre || 'Usuario interno'}</td>
                      <td><strong>${Formateador.moneda(v.precio)}</strong></td>
                      <td>${v.peso_salida ? `${v.peso_salida} kg` : '-'}</td>
                      <td>${DateUtil.formatear(v.fecha)}</td>
                      <td><span class="badge ${v.tipo === 'Venta' ? 'badge-verde' : 'badge-azul'}">${v.tipo}</span></td>
                      <td class="table-actions">
                        <button class="btn btn-sm btn-danger" onclick="VentaListPage.eliminar(${v.id})">🗑️</button>
                      </td>
                    </tr>
                  `).join('')
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Compras -->
        <div class="card">
          <div class="card-header"><strong>Compras Realizadas</strong></div>
          <div class="table-container">
            <table>
              <thead>
                <tr><th>Animal</th><th>Vendedor</th><th>Precio</th><th>Fecha</th></tr>
              </thead>
              <tbody>
                ${comprasList.length === 0
                  ? '<tr><td colspan="4" class="empty-state">Sin compras registradas</td></tr>'
                  : comprasList.map(c => `
                    <tr>
                      <td>${c.animal_nombre}</td>
                      <td>${c.vendedor_nombre}</td>
                      <td><strong>${Formateador.moneda(c.precio)}</strong></td>
                      <td>${DateUtil.formatear(c.fecha)}</td>
                    </tr>
                  `).join('')
                }
              </tbody>
            </table>
          </div>
        </div>
      `);
    } catch (e) {
      return MainLayout.render(`<div class="alert alert-danger">Error: ${e.message}</div>`);
    }
  },

  async eliminar(id) {
    if (!confirm('¿Eliminar esta venta?')) return;
    try {
      await API.delete(`/ventas/${id}`);
      Router.resolver();
    } catch (err) {
      alert(err.response?.data?.error || 'Error');
    }
  },
};
