/**
 * Página: Listado de Animales con filtros
 */
const AnimalListPage = {
  paginaActual: 1,
  filtros: {},

  async render() {
    try {
      const { data: rebanos } = await API.get('/rebanos');
      const rebanosList = rebanos.data || [];

      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title">🐂 Animales</h1>
          <button class="btn btn-primary" onclick="Router.navegar('/animales/nuevo')">
            + Nuevo Animal
          </button>
        </div>

        <!-- Filtros -->
        <div class="filter-panel">
          <div class="form-group">
            <label class="form-label">Sexo</label>
            <select class="form-select" id="filtro-sexo" onchange="AnimalListPage.aplicarFiltro()">
              <option value="">Todos</option>
              <option value="Macho">Macho</option>
              <option value="Hembra">Hembra</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Rebaño</label>
            <select class="form-select" id="filtro-rebano" onchange="AnimalListPage.aplicarFiltro()">
              <option value="">Todos</option>
              ${rebanosList.map(r => `<option value="${r.id}">${r.nombre}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Etapa</label>
            <select class="form-select" id="filtro-etapa" onchange="AnimalListPage.aplicarFiltro()">
              <option value="">Todas</option>
              <option value="Ternero">Ternero</option>
              <option value="Novillo">Novillo</option>
              <option value="Adulto">Adulto</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Estado</label>
            <select class="form-select" id="filtro-estado" onchange="AnimalListPage.aplicarFiltro()">
              <option value="">Todos</option>
              <option value="Vacia">Vacía</option>
              <option value="Prenada">Preñada</option>
              <option value="Lactando">Lactando</option>
            </select>
          </div>
        </div>

        <!-- Tabla -->
        <div class="card">
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Sexo</th>
                  <th>Edad</th>
                  <th>Rebaño</th>
                  <th>Etapa</th>
                  <th>Peso Entrada</th>
                  <th>Precio/kg</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="animales-tbody">
                <tr><td colspan="9" class="loading"><div class="spinner"></div>Cargando...</td></tr>
              </tbody>
            </table>
          </div>
          <div id="animales-pagination" class="pagination"></div>
        </div>
      `);
    } catch (error) {
      return MainLayout.render(`<div class="alert alert-danger">Error al cargar: ${error.message}</div>`);
    }
  },

  afterRender() {
    this.paginaActual = 1;
    this.filtros = {};
    this.cargarAnimales();
  },

  async cargarAnimales() {
    const tbody = document.getElementById('animales-tbody');
    tbody.innerHTML = '<tr><td colspan="9" class="loading"><div class="spinner"></div>Cargando...</td></tr>';

    try {
      const params = { pagina: this.paginaActual, ...this.filtros };
      const { data } = await API.get('/animales', params);
      const animales = data.data || [];
      const total = data.total || 0;

      if (animales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No hay animales registrados</td></tr>';
        return;
      }

      tbody.innerHTML = animales.map(a => `
        <tr>
          <td><strong>${a.nombre}</strong></td>
          <td><span class="badge ${a.sexo === 'Macho' ? 'badge-sexo-macho' : 'badge-sexo-hembra'}">${a.sexo}</span></td>
          <td>${DateUtil.edadTexto(a.fecha_nacimiento)}</td>
          <td>${a.rebano_nombre || '-'}</td>
          <td><span class="badge badge-verde">${a.etapa}</span></td>
          <td>${a.peso_entrada ? `${a.peso_entrada} kg` : '-'}</td>
          <td>${a.precio_kg ? `$${a.precio_kg}` : '-'}</td>
          <td>${a.estado_reproductivo ? `<span class="badge badge-${a.estado_reproductivo === 'Prenada' ? 'naranja' : 'azul'}">${a.estado_reproductivo}</span>` : '-'}</td>
          <td class="table-actions">
            <button class="btn btn-sm btn-secondary" onclick="Router.navegar('/animales/${a.id}')">Ver</button>
            <button class="btn btn-sm btn-secondary" onclick="Router.navegar('/animales/${a.id}/editar')">✏️</button>
            <button class="btn btn-sm btn-danger" onclick="AnimalListPage.eliminar(${a.id}, '${a.nombre}')">🗑️</button>
          </td>
        </tr>
      `).join('');

      // Paginación
      const totalPaginas = Math.ceil(total / (data.por_pagina || 20));
      this.renderPaginacion(totalPaginas);

    } catch (error) {
      tbody.innerHTML = `<tr><td colspan="9" class="alert alert-danger">Error: ${error.message}</td></tr>`;
    }
  },

  renderPaginacion(totalPaginas) {
    const el = document.getElementById('animales-pagination');
    if (totalPaginas <= 1) { el.innerHTML = ''; return; }

    let html = '';
    html += `<button ${this.paginaActual <= 1 ? 'disabled' : ''} onclick="AnimalListPage.irPagina(${this.paginaActual - 1})">‹</button>`;

    for (let i = 1; i <= totalPaginas; i++) {
      html += `<button class="${i === this.paginaActual ? 'active' : ''}" onclick="AnimalListPage.irPagina(${i})">${i}</button>`;
    }

    html += `<button ${this.paginaActual >= totalPaginas ? 'disabled' : ''} onclick="AnimalListPage.irPagina(${this.paginaActual + 1})">›</button>`;
    el.innerHTML = html;
  },

  irPagina(pagina) {
    this.paginaActual = pagina;
    this.cargarAnimales();
  },

  aplicarFiltro() {
    this.filtros = {};
    const sexo = document.getElementById('filtro-sexo')?.value;
    const rebano = document.getElementById('filtro-rebano')?.value;
    const etapa = document.getElementById('filtro-etapa')?.value;
    const estado = document.getElementById('filtro-estado')?.value;

    if (sexo) this.filtros.sexo = sexo;
    if (rebano) this.filtros.rebano_id = rebano;
    if (etapa) this.filtros.etapa = etapa;
    if (estado) this.filtros.estado = estado;

    this.paginaActual = 1;
    this.cargarAnimales();
  },

  async eliminar(id, nombre) {
    if (!confirm(`¿Eliminar a "${nombre}"?`)) return;
    try {
      await API.delete(`/animales/${id}`);
      this.cargarAnimales();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al eliminar');
    }
  },
};
