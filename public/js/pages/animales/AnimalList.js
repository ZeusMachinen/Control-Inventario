const AnimalListPage = {
  paginaActual: 1,
  filtros: {},
  seleccionados: new Set(),
  columnaOrden: null,
  direccionOrden: 'asc',
  datosPagina: [],

  filtroRebanoUrl: null,

  async render() {
    try {
      this.filtroRebanoUrl = null;
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
            <button class="btn btn-danger" id="btn-vender-multiples" style="display:none" onclick="AnimalListPage.mostrarVenderModal()">
              💰 Vender Seleccionados (<span id="vender-seleccionados-count">0</span>)
            </button>
          </div>
        </div>

        <div class="filter-panel">
          <div class="form-group">
            <label class="form-label">Buscar nombre</label>
            <input type="text" class="form-input" id="filtro-nombre" placeholder="Nombre..." oninput="AnimalListPage.aplicarFiltro()">
          </div>
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
                  <th onclick="AnimalListPage.ordenarPor('nombre')" data-columna="nombre" class="th-sortable">Nombre</th>
                  <th onclick="AnimalListPage.ordenarPor('sexo')" data-columna="sexo" class="th-sortable">Sexo</th>
                  <th onclick="AnimalListPage.ordenarPor('edad')" data-columna="edad" class="th-sortable">Edad</th>
                  <th onclick="AnimalListPage.ordenarPor('rebano_nombre')" data-columna="rebano_nombre" class="th-sortable">Rebaño</th>
                  <th onclick="AnimalListPage.ordenarPor('etapa')" data-columna="etapa" class="th-sortable">Etapa</th>
                  <th onclick="AnimalListPage.ordenarPor('peso_entrada')" data-columna="peso_entrada" class="th-sortable">Peso Entrada</th>
                  <th onclick="AnimalListPage.ordenarPor('precio_kg')" data-columna="precio_kg" class="th-sortable">Precio/kg</th>
                  <th onclick="AnimalListPage.ordenarPor('estado_reproductivo')" data-columna="estado_reproductivo" class="th-sortable">Estado</th>
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
        <div id="animal-sell-modal"></div>
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
    const btnMove = document.getElementById('btn-mover-multiples');
    const spanMove = document.getElementById('seleccionados-count');
    if (btnMove && spanMove) {
      btnMove.style.display = count > 0 ? '' : 'none';
      spanMove.textContent = count;
    }
    const btnSell = document.getElementById('btn-vender-multiples');
    const spanSell = document.getElementById('vender-seleccionados-count');
    if (btnSell && spanSell) {
      btnSell.style.display = count > 0 ? '' : 'none';
      spanSell.textContent = count;
    }
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

  async mostrarVenderModal() {
    const seleccionados = Array.from(this.seleccionados);
    const hoy = new Date().toISOString().substring(0, 10);
    document.getElementById('animal-sell-modal').innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this)document.getElementById('animal-sell-modal').innerHTML=''">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-title">💰 Vender ${seleccionados.length} animal(es)</span>
            <button class="modal-close" onclick="document.getElementById('animal-sell-modal').innerHTML=''">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Precio unitario *</label>
                <input type="number" step="1" min="0" class="form-input" id="sell-precio" placeholder="0" required>
              </div>
              <div class="form-group">
                <label class="form-label">Fecha *</label>
                <input type="date" class="form-input" id="sell-fecha" value="${hoy}" required>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Comprador</label>
                <input type="text" class="form-input" id="sell-comprador" placeholder="Nombre del comprador">
              </div>
              <div class="form-group">
                <label class="form-label">Tipo</label>
                <select class="form-select" id="sell-tipo">
                  <option value="Venta">Venta</option>
                  <option value="Transferencia">Transferencia</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Peso Total del Lote (kg) <small style="color:var(--gris-texto)">opcional — si lo ponés, se distribuye según peso de entrada</small></label>
              <input type="number" step="0.01" min="0" class="form-input" id="sell-peso" placeholder="Ej: suma de todos los animales">
            </div>
            <div class="form-group">
              <label class="form-label">Notas</label>
              <textarea class="form-textarea" id="sell-notas" placeholder="Detalles de la venta..."></textarea>
            </div>
            <div style="display:flex;gap:0.5rem;justify-content:flex-end;margin-top:1rem">
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('animal-sell-modal').innerHTML=''">Cancelar</button>
              <button type="button" class="btn btn-danger" onclick="AnimalListPage.ejecutarVenta()">💰 Vender ${seleccionados.length} animal(es)</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async ejecutarVenta() {
    const precio = document.getElementById('sell-precio').value;
    const fecha = document.getElementById('sell-fecha').value;
    const comprador = document.getElementById('sell-comprador').value.trim();
    const tipo = document.getElementById('sell-tipo').value;
    const peso = document.getElementById('sell-peso').value;
    const notas = document.getElementById('sell-notas').value.trim();

    if (!precio || parseFloat(precio) <= 0) { alert('Ingresá un precio válido'); return; }
    if (!fecha) { alert('Seleccioná la fecha de venta'); return; }

    try {
      await API.post('/ventas/multiple', {
        animal_ids: Array.from(this.seleccionados),
        precio: parseFloat(precio),
        fecha,
        comprador_nombre: comprador || null,
        tipo,
        peso_salida: peso ? parseFloat(peso) : null,
        notas: notas || null,
      });
      document.getElementById('animal-sell-modal').innerHTML = '';
      this.seleccionados = new Set();
      this.actualizarBotonMove();
      this.cargarAnimales();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al vender animales');
    }
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

  obtenerValor(columna, item) {
    const map = {
      nombre: item.nombre,
      sexo: item.sexo,
      edad: item.fecha_nacimiento,
      rebano_nombre: item.rebano_nombre,
      etapa: item.etapa,
      peso_entrada: parseFloat(item.peso_entrada) || 0,
      precio_kg: parseFloat(item.precio_kg) || 0,
      estado_reproductivo: item.estado_reproductivo,
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
    SortUtil.actualizarEncabezados('animales-tbody', this.columnaOrden, this.direccionOrden);
    this.renderTabla();
  },

  async cargarAnimales() {
    const tbody = document.getElementById('animales-tbody');
    tbody.innerHTML = '<tr><td colspan="10" class="loading"><div class="spinner"></div>Cargando...</td></tr>';

    try {
      const params = { pagina: this.paginaActual, ...this.filtros };
      const { data } = await API.get('/animales', params);
      this.datosPagina = data.data || [];
      this.total = data.total || 0;
      this.porPagina = data.por_pagina || 20;
      this.renderTabla();
    } catch (error) {
      tbody.innerHTML = `<tr><td colspan="10" class="alert alert-danger">Error: ${error.message}</td></tr>`;
    }
  },

  renderTabla() {
    const tbody = document.getElementById('animales-tbody');
    const animales = [...this.datosPagina];

    if (this.columnaOrden) {
      animales.sort((a, b) => SortUtil.comparar(
        this.obtenerValor(this.columnaOrden, a),
        this.obtenerValor(this.columnaOrden, b),
        this.direccionOrden
      ));
    }

    if (animales.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" class="empty-state">No hay animales registrados</td></tr>';
      return;
    }

    tbody.innerHTML = animales.map(a => `
        <tr>
          <td><input type="checkbox" class="animal-checkbox" data-id="${a.id}" onchange="AnimalListPage.toggleAnimal(this, ${a.id})"></td>
          <td><a href="#/animales/${a.id}" class="animal-link"><strong>${a.nombre}</strong></a></td>
          <td><span class="badge ${a.sexo === 'Macho' ? 'badge-sexo-macho' : 'badge-sexo-hembra'}">${a.sexo}</span></td>
          <td>${DateUtil.edadTexto(a.fecha_nacimiento)}</td>
          <td>${a.rebano_nombre || '-'}</td>
          <td><span class="badge badge-verde">${a.etapa}</span></td>
          <td>${a.peso_entrada ? `${a.peso_entrada} kg` : '-'}</td>
          <td>${a.precio_kg ? `$${a.precio_kg}` : '-'}</td>
          <td>${a.estado_reproductivo ? `<span class="badge badge-${a.estado_reproductivo === 'Prenada' ? 'naranja' : 'azul'}">${a.estado_reproductivo}</span>` : '-'}</td>
          <td class="table-actions">
            <button class="btn btn-sm btn-secondary" onclick="Router.navegar('/animales/${a.id}')">Ver</button>
            <button class="btn btn-sm btn-info" onclick="AnimalListPage.moverIndividual(${a.id})" title="Mover a otro rebaño">↗️ Mover</button>
          </td>
        </tr>
      `).join('');

    SortUtil.actualizarEncabezados('animales-tbody', this.columnaOrden, this.direccionOrden);
    const totalPaginas = Math.ceil(this.total / this.porPagina);
    this.renderPaginacion(totalPaginas);
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
    const nombre = document.getElementById('filtro-nombre')?.value.trim();
    const sexo = document.getElementById('filtro-sexo')?.value;
    const rebano = document.getElementById('filtro-rebano')?.value;
    const etapa = document.getElementById('filtro-etapa')?.value;
    const estado = document.getElementById('filtro-estado')?.value;
    if (nombre) this.filtros.search = nombre;
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
};
