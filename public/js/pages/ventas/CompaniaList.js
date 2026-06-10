const CompaniaListPage = {
  async render() {
    return MainLayout.render(`
      <div class="page-header">
        <h1 class="page-title"><i class="fas fa-handshake me-2"></i>Compañías</h1>
        <button class="btn btn-primary" onclick="Router.navegar('/companias/nuevo')"><i class="fas fa-plus me-1"></i>Nueva Compañía</button>
      </div>

      <div class="card">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr><th>Animal</th><th>Socio</th><th>Peso Entrada</th><th>Estado</th><th style="width:120px">Acciones</th></tr>
            </thead>
            <tbody id="comp-tbody">
              <tr><td colspan="5" class="text-center py-4 text-secondary"><div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>Cargando...</td></tr>
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
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-secondary">No hay compañías registradas</td></tr>';
        return;
      }

      tbody.innerHTML = list.map(c => `
        <tr>
          <td class="fw-medium">${c.animal_nombre}</td>
          <td>${c.socio_nombre}</td>
          <td>${Formateador.numero(c.peso_entrada, 2)} kg</td>
          <td><span class="badge ${c.estado === 'Activa' ? 'bg-success' : 'bg-warning'}">${c.estado}</span></td>
          <td>
            <div class="d-flex gap-1">
              <button class="btn btn-outline-secondary btn-sm" onclick="CompaniaListPage.verDetalle(${c.id})" title="Ver"><i class="fas fa-eye"></i></button>
              <button class="btn btn-outline-danger btn-sm" onclick="CompaniaListPage.eliminar(${c.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      document.getElementById('comp-tbody').innerHTML = `<tr><td colspan="5" class="text-danger py-3 text-center">Error: ${e.message}</td></tr>`;
    }
  },

  async verDetalle(id) {
    try {
      const { data } = await API.get(`/companias/${id}`);
      const c = data.data;

      const gananciaCreador = c.ganancia_creador || 0;
      const gananciaSocio = c.ganancia_socio || 0;

      const detalle = [
        `📍 ${c.animal_nombre}`,
        `🤝 Socio: ${c.socio_nombre}`,
        `📅 Entrada: ${DateUtil.formatear(c.fecha_entrada)}`,
        `⚖️ Peso entrada: ${c.peso_entrada} kg`,
        ...(c.peso_salida ? [`⚖️ Peso salida: ${c.peso_salida} kg`] : []),
        ...(c.precio_venta ? [`💰 Precio venta: ${Formateador.moneda(c.precio_venta)}`] : []),
        ...(c.estado === 'Finalizada' ? [`📊 Ganancia (tuyo): ${Formateador.moneda(c.usuario_id === JSON.parse(localStorage.getItem('usuario') || '{}').id ? gananciaCreador : gananciaSocio)}`] : []),
        `📌 Estado: ${c.estado}`,
      ].join('\n');
      Toast.info(detalle, 'Detalle de Compañía');
    } catch (e) {
      Toast.error('Error al cargar detalle');
    }
  },

  async eliminar(id) {
    if (!(await Confirm.show('¿Eliminar esta compañía?'))) return;
    try {
      await API.delete(`/companias/${id}`);
      this.cargar();
    } catch (err) {
      Toast.error(err.response?.data?.error || 'Error');
    }
  },
};

