const AnimalListPage = {
  paginaActual: 1,
  filtros: {},
  seleccionados: new Set(),

  filtroRebanoUrl: null,

  async render() {
    try {
      // Leer query params del hash
      const hash = window.location.hash;
      const qIdx = hash.indexOf('?');
      if (qIdx !== -1) {
        const qs = hash.substring(qIdx + 1);
        qs.split('&').forEach(pair => {
          const [k, v] = pair.split('=');
          if (k === 'rebano_id') this.filtroRebanoUrl = v || null;
        });
      }

      const { data: rebanos } = await API.get('/rebanos');
      const rebanosList = rebanos.data || [];

      // Si hay rebano_id en URL, pre-seleccionar filtro
      const defaultRebano = this.filtroRebanoUrl || '';

      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title">Animales ${defaultRebano ? '(' + (rebanosList.find(r => r.id == defaultRebano)?.nombre || '') + ')' : ''}</h1>
          <div style="display:flex;gap:0.5rem">
            <button class="btn btn-primary" onclick="Router.navegar('/animales/nuevo')">+ Nuevo Animal</button>
            <button class="btn btn-secondary" id="btn-mover-multiples" style="display:none" onclick="AnimalListPage.mostrarMoverModal()">
              Mover Seleccionados (<span id="seleccionados-count">0</span>)
            </button>
          </div>
        </div>

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
              ${rebanosList.map(r => `<option value="${r.id}" ${r.id == defaultRebano ? 'selected' : ''}>${r.nombre}</option>`).join('')}
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

        <div class="card">
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th><input type="checkbox" id="seleccionar-todos" onchange="AnimalListPage.toggleTodos(this)"></th>
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
                <tr><td colspan="10" class="loading"><div class="spinner"></div>Cargando...</td></tr>
              </tbody>
            </table>
          </div>
          <div id="animales-pagination" class="pagination"></div>
        </div>

        <div id="animal-move-modal"></div>
      `);
    } catch (error) {
      return MainLayout.render(`<div class="alert alert-danger">Error al cargar: ${error.message}</div>`);
    }
  },

  afterRender() {
    this.paginaActual = 1;
    this.filtros = {};
    this.seleccionados = new Set();
    if (this.filtroRebanoUrl) this.filtros.rebano_id = this.filtroRebanoUrl;
    this.cargarAnimales();
  },

  toggleTodos(checkbox) {
    const checks = document.querySelectorAll('.animal-checkbox');
    checks.forEach(c => {
      c.checked = checkbox.checked;
      const id = parseInt(c.dataset.id);
      if (checkbox.checked) this.seleccionados.add(id);
      else this.seleccionados.delete(id);
    });
    this.actualizarBotonMove();
  },

  toggleAnimal(checkbox, id) {
    if (checkbox.checked) this.seleccionados.add(id);
    else this.seleccionados.delete(id);
    this.actualizarBotonMove();
  },

  actualizarBotonMove() {
    const count = this.seleccionados.size;
    const btn = document.getElementById('btn-mover-multiples');
    const span = document.getElementById('seleccionados-count');
    if (!btn || !span) return;
    btn.style.display = count > 0 ? '' : 'none';
    span.textContent = count;
  },

  async mostrarMoverModal() {
    const { data: rebanos } = await API.get('/rebanos');
    const rebanosList = rebanos.data || [];
    document.getElementById('animal-move-modal').innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this)document.getElementById('animal-move-modal').innerHTML=''">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-title">Mover ${this.seleccionados.size} animal(es)</span>
            <button class="modal-close" onclick="document.getElementById('animal-move-modal').innerHTML=''">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Rebaño Destino *</label>
              <select class="form-select" id="move-rebano-destino" required>
                <option value="">Seleccione...</option>
                ${rebanosList.map(r => `<option value="${r.id}">${r.nombre}</option>`).join('')}
              </select>
            </div>
            <div style="display:flex;gap:0.5rem;justify-content:flex-end;margin-top:1rem">
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('animal-move-modal').innerHTML=''">Cancelar</button>
              <button type="button" class="btn btn-primary" onclick="AnimalListPage.ejecutarMove()">Mover</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async ejecutarMove() {
    const destino = document.getElementById('move-rebano-destino').value;
    if (!destino) { alert('Seleccione un rebaño destino'); return; }
    try {
      await API.post('/rebanos/mover-multiples', {
        animal_ids: Array.from(this.seleccionados),
        rebano_destino_id: parseInt(destino),
      });
      document.getElementById('animal-move-modal').innerHTML = '';
      this.seleccionados = new Set();
      this.actualizarBotonMove();
      this.cargarAnimales();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al mover animales');
    }
  },

  async cargarAnimales() {
    const tbody = document.getElementById('animales-tbody');
    tbody.innerHTML = '<tr><td colspan="10" class="loading"><div class="spinner"></div>Cargando...</td></tr>';

    try {
      const params = { pagina: this.paginaActual, ...this.filtros };
      const { data } = await API.get('/animales', params);
      const animales = data.data || [];
      const total = data.total || 0;

      if (animales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="empty-state">No hay animales registrados</td></tr>';
        return;
      }

      tbody.innerHTML = animales.map(a => `
        <tr>
          <td><input type="checkbox" class="animal-checkbox" data-id="${a.id}" onchange="AnimalListPage.toggleAnimal(this, ${a.id})"></td>
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
            <button class="btn btn-sm btn-info" onclick="AnimalListPage.moverIndividual(${a.id})" title="Mover a otro rebaño">↗️ Mover</button>
            <button class="btn btn-sm btn-danger" onclick="AnimalListPage.eliminar(${a.id}, '${a.nombre}')">🗑️</button>
          </td>
        </tr>
      `).join('');

      const totalPaginas = Math.ceil(total / (data.por_pagina || 20));
      this.renderPaginacion(totalPaginas);
    } catch (error) {
      tbody.innerHTML = `<tr><td colspan="10" class="alert alert-danger">Error: ${error.message}</td></tr>`;
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

  moverIndividual(id) {
    this.seleccionados = new Set([id]);
    this.mostrarMoverModal();
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
