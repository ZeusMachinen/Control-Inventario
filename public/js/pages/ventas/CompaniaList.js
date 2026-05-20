/**
 * Página: Listado de Compañías (Sociedades)
 */
const CompaniaListPage = {
  async render() {
    return MainLayout.render(`
      <div class="page-header">
        <h1 class="page-title">🤝 Compañías</h1>
        <button class="btn btn-primary" onclick="Router.navegar('/companias/nuevo')">+ Nueva Compañía</button>
      </div>

      <div class="card">
        <div class="table-container">
          <table>
            <thead>
              <tr><th>Animal</th><th>Socio</th><th>Peso Entrada</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody id="comp-tbody">
              <tr><td colspan="5" class="loading"><div class="spinner"></div>Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `);
  },

  afterRender() { this.cargar(); },

  async cargar() {
    try {
      const { data } = await API.get('/companias');
      const list = data.data || [];
      const tbody = document.getElementById('comp-tbody');

      if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No hay compañías registradas</td></tr>';
        return;
      }

      tbody.innerHTML = list.map(c => `
        <tr>
          <td><strong>${c.animal_nombre}</strong></td>
          <td>${c.socio_nombre}</td>
          <td>${Formateador.numero(c.peso_entrada, 2)} kg</td>
          <td><span class="badge ${c.estado === 'Activa' ? 'badge-verde' : 'badge-naranja'}">${c.estado}</span></td>
          <td class="table-actions">
            <button class="btn btn-sm btn-secondary" onclick="CompaniaListPage.verDetalle(${c.id})">Ver</button>
            <button class="btn btn-sm btn-danger" onclick="CompaniaListPage.eliminar(${c.id})">🗑️</button>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      document.getElementById('comp-tbody').innerHTML = `<tr><td colspan="5" class="alert alert-danger">Error: ${e.message}</td></tr>`;
    }
  },

  async verDetalle(id) {
    try {
      const { data } = await API.get(`/companias/${id}`);
      const c = data.data;

      const gananciaCreador = c.ganancia_creador || 0;
      const gananciaSocio = c.ganancia_socio || 0;

      alert(
        `📍 ${c.animal_nombre}\n` +
        `🤝 Socio: ${c.socio_nombre}\n` +
        `📅 Entrada: ${DateUtil.formatear(c.fecha_entrada)}\n` +
        `⚖️ Peso entrada: ${c.peso_entrada} kg\n` +
        `${c.peso_salida ? `⚖️ Peso salida: ${c.peso_salida} kg\n` : ''}` +
        `${c.precio_venta ? `💰 Precio venta: ${Formateador.moneda(c.precio_venta)}\n` : ''}` +
        `${c.estado === 'Finalizada' ? `📊 Ganancia (tuyo): ${Formateador.moneda(c.usuario_id === JSON.parse(localStorage.getItem('usuario') || '{}').id ? gananciaCreador : gananciaSocio)}\n` : ''}` +
        `📌 Estado: ${c.estado}`
      );
    } catch (e) {
      alert('Error al cargar detalle');
    }
  },

  async eliminar(id) {
    if (!confirm('¿Eliminar esta compañía?')) return;
    try {
      await API.delete(`/companias/${id}`);
      this.cargar();
    } catch (err) {
      alert(err.response?.data?.error || 'Error');
    }
  },
};
