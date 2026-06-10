const VacunacionListPage = {
  columnaOrden: null,
  direccionOrden: 'asc',
  datos: [],

  async render() {
    return MainLayout.render(`
      <div class="page-header">
        <h1 class="page-title"><i class="fas fa-syringe me-2"></i>Vacunaciones</h1>
        <button class="btn btn-primary" onclick="Router.navegar('/vacunacion/nuevo')"><i class="fas fa-plus me-1"></i>Nueva Vacunación</button>
      </div>

      <div class="card">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th onclick="VacunacionListPage.ordenarPor('fecha')" data-columna="fecha" class="th-sortable">Fecha</th>
                <th onclick="VacunacionListPage.ordenarPor('medicamento_nombre')" data-columna="medicamento_nombre" class="th-sortable">Medicamento</th>
                <th onclick="VacunacionListPage.ordenarPor('rebano_nombre')" data-columna="rebano_nombre" class="th-sortable">Rebaño</th>
                <th onclick="VacunacionListPage.ordenarPor('total_animales')" data-columna="total_animales" class="th-sortable">Animales</th>
                <th onclick="VacunacionListPage.ordenarPor('observaciones')" data-columna="observaciones" class="th-sortable">Observaciones</th>
                <th onclick="VacunacionListPage.ordenarPor('costo_veterinario')" data-columna="costo_veterinario" class="th-sortable">Costo Vet.</th>
                <th onclick="VacunacionListPage.ordenarPor('gasto_monto')" data-columna="gasto_monto" class="th-sortable">Costo Total</th>
                <th style="width:130px">Acciones</th>
              </tr>
            </thead>
            <tbody id="vac-tbody">
              <tr><td colspan="8" class="text-center py-4 text-secondary"><div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `);
  },

  afterRender() { this.cargar(); },

  obtenerValor(columna, item) {
    const map = {
      fecha: item.fecha,
      medicamento_nombre: item.medicamento_nombre,
      rebano_nombre: item.rebano_nombre,
      total_animales: parseInt(item.total_animales) || 0,
      observaciones: item.observaciones,
      costo_veterinario: parseFloat(item.costo_veterinario) || 0,
      gasto_monto: parseFloat(item.gasto_monto) || 0,
    };
    return map[columna];
  },

  ordenarPor(columna) {
    if (this.columnaOrden === columna) {
      this.direccionOrden = SortUtil.toggleDir(this.direccionOrden);
    } else {
      this.columnaOrden = columna;
      this.direccionOrden = 'asc';
    }
    SortUtil.actualizarEncabezados('vac-tbody', this.columnaOrden, this.direccionOrden);
    this.renderTabla();
  },

  async cargar() {
    try {
      const { data } = await API.get('/vacunaciones');
      this.datos = data.data || [];
      this.renderTabla();
    } catch (e) {
      document.getElementById('vac-tbody').innerHTML = `<tr><td colspan="8" class="text-danger py-3 text-center">Error: ${e.message}</td></tr>`;
    }
  },

  renderTabla() {
    const tbody = document.getElementById('vac-tbody');
    const list = [...this.datos];

    if (this.columnaOrden) {
      list.sort((a, b) => SortUtil.comparar(
        this.obtenerValor(this.columnaOrden, a),
        this.obtenerValor(this.columnaOrden, b),
        this.direccionOrden
      ));
    }

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-secondary">No hay vacunaciones registradas</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(v => `
      <tr>
        <td>${DateUtil.formatear(v.fecha)}</td>
        <td>${v.medicamento_nombre}</td>
        <td>${v.rebano_nombre || '-'}</td>
        <td><span class="badge bg-primary">${v.total_animales} animales</span></td>
        <td>${v.observaciones || '-'}</td>
        <td>${v.costo_veterinario ? Formateador.moneda(v.costo_veterinario) : '-'}</td>
        <td>${v.gasto_monto ? Formateador.moneda(v.gasto_monto) : '-'}</td>
        <td>
          <div class="d-flex gap-1">
            <button class="btn btn-outline-secondary btn-sm" onclick="VacunacionListPage.verAnimales(${v.id})" title="Ver animales"><i class="fas fa-eye"></i></button>
            <button class="btn btn-outline-primary btn-sm" onclick="Router.navegar('/vacunacion/${v.id}/editar')" title="Editar"><i class="fas fa-pen"></i></button>
            <button class="btn btn-outline-danger btn-sm" onclick="VacunacionListPage.eliminar(${v.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
    SortUtil.actualizarEncabezados('vac-tbody', this.columnaOrden, this.direccionOrden);
  },

  async verAnimales(id) {
    try {
      const { data: res } = await API.get(`/vacunaciones/${id}`);
      const v = res.data || {};

      const div = document.createElement('div');
      div.id = 'vac-animales-modal';
      div.innerHTML = `
        <div class="modal fade d-block" tabindex="-1" style="background:rgba(0,0,0,0.5)" onclick="if(event.target===this)VacunacionListPage.cerrarModal()">
          <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title"><i class="fas fa-syringe me-2"></i>Animales vacunados — ${DateUtil.formatear(v.fecha)}</h5>
                <button class="btn-close" onclick="VacunacionListPage.cerrarModal()"></button>
              </div>
              <div class="modal-body">
                <p class="mb-3 small text-secondary"><i class="fas fa-syringe me-1"></i>${v.medicamento_nombre} ${v.rebano_nombre ? `· <i class="fas fa-people-group me-1"></i>${v.rebano_nombre}` : ''}</p>
                ${!v.animales || v.animales.length === 0
                  ? '<p class="text-center text-secondary py-3">Sin animales registrados en esta vacunación</p>'
                  : `<div class="table-responsive">
                      <table class="table table-hover align-middle mb-0">
                        <thead class="table-light">
                          <tr>
                            <th>Nombre</th>
                            <th>Sexo</th>
                            <th style="width:80px">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${v.animales.map(a => `
                            <tr>
                              <td class="fw-medium">${a.animal_nombre}</td>
                              <td><span class="badge ${a.sexo === 'Macho' ? 'bg-info' : 'bg-warning'}">${a.sexo}</span></td>
                              <td>
                                <button class="btn btn-outline-secondary btn-sm" onclick="VacunacionListPage.cerrarModal();Router.navegar('/animales/${a.animal_id}')"><i class="fas fa-eye"></i></button>
                              </td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    </div>`
                }
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(div);
    } catch (e) {
      Toast.error('Error al cargar animales: ' + (e.response?.data?.error || e.message));
    }
  },

  cerrarModal() {
    const el = document.getElementById('vac-animales-modal');
    if (el) el.remove();
  },

  async eliminar(id) {
    if (!(await Confirm.show('¿Eliminar esta vacunación?'))) return;
    try {
      await API.delete(`/vacunaciones/${id}`);
      this.cargar();
    } catch (err) {
      Toast.error(err.response?.data?.error || 'Error al eliminar');
    }
  },
};

