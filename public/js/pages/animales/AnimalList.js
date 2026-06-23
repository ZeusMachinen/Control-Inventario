const AnimalListPage = {
  paginaActual: 1,
  filtros: {},
  seleccionados: new Set(),
  columnaOrden: null,
  direccionOrden: 'asc',
  datosPagina: [],
  modoVista: 'lista',   // 'lista' | 'galeria'

  filtroRebanoUrl: null,

  async render() {
    try {
      this.filtroRebanoUrl = null;
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
      const defaultRebano = this.filtroRebanoUrl || '';

      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title">Animales ${defaultRebano ? '(' + (rebanosList.find(r => r.id == defaultRebano)?.nombre || '') + ')' : ''}</h1>
          <div class="d-flex gap-2 flex-wrap">
            <button class="btn btn-primary" onclick="Router.navegar('/animales/nuevo')">
              <i class="fas fa-plus"></i> Nuevo Animal
            </button>
            <button class="btn btn-outline-secondary" id="btn-toggle-vista" onclick="AnimalListPage.toggleVista()" title="Cambiar vista">
              <i class="fas fa-th-large"></i> Galería
            </button>
            <button class="btn btn-outline-secondary d-none" id="btn-mover-multiples" onclick="AnimalListPage.mostrarMoverModal()">
              <i class="fas fa-arrows-alt"></i> Mover (<span id="seleccionados-count">0</span>)
            </button>
            <button class="btn btn-outline-danger d-none" id="btn-vender-multiples" onclick="AnimalListPage.mostrarVenderModal()">
              <i class="fas fa-dollar-sign"></i> Vender (<span id="vender-seleccionados-count">0</span>)
            </button>
            <button class="btn btn-outline-danger d-none" id="btn-eliminar-multiples" onclick="AnimalListPage.mostrarEliminarModal()">
              <i class="fas fa-trash"></i> Eliminar (<span id="eliminar-seleccionados-count">0</span>)
            </button>
          </div>
        </div>

        <div class="stats-grid" id="animales-stats">
          <div class="stat-card" style="border-left-color:var(--verde-principal);cursor:pointer" onclick="AnimalListPage.filtrarPorSexo('')" id="stat-todos">
            <div class="stat-card-icon" style="background:var(--verde-bg);color:var(--verde-principal)"><i class="fas fa-paw"></i></div>
            <div class="stat-card-info">
              <h3 id="kpi-animales-total">···</h3>
              <p>Total Activos</p>
            </div>
          </div>
          <div class="stat-card" style="border-left-color:var(--azul);cursor:pointer" onclick="AnimalListPage.filtrarPorSexo('Macho')" id="stat-machos">
            <div class="stat-card-icon" style="background:var(--azul-claro);color:var(--azul)"><i class="fas fa-mars"></i></div>
            <div class="stat-card-info">
              <h3 id="kpi-animales-machos">···</h3>
              <p>Machos</p>
            </div>
          </div>
          <div class="stat-card" style="border-left-color:#C2185B;cursor:pointer" onclick="AnimalListPage.filtrarPorSexo('Hembra')" id="stat-hembras">
            <div class="stat-card-icon" style="background:#FCE4EC;color:#C2185B"><i class="fas fa-venus"></i></div>
            <div class="stat-card-info">
              <h3 id="kpi-animales-hembras">···</h3>
              <p>Hembras</p>
            </div>
          </div>
        </div>

        <div class="filter-panel">
          <div class="form-group">
            <label class="form-label">Buscar nombre</label>
            <input type="text" class="form-control form-control-sm" id="filtro-nombre" placeholder="Nombre..." oninput="AnimalListPage.aplicarFiltro()">
          </div>
          <div class="form-group">
            <label class="form-label">Sexo</label>
            <select class="form-select form-select-sm" id="filtro-sexo" onchange="AnimalListPage.aplicarFiltro()">
              <option value="">Todos</option>
              <option value="Macho">Macho</option>
              <option value="Hembra">Hembra</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Rebaño</label>
            <select class="form-select form-select-sm" id="filtro-rebano" onchange="AnimalListPage.aplicarFiltro()">
              <option value="">Todos</option>
              ${rebanosList.map(r => `<option value="${r.id}" ${r.id == defaultRebano ? 'selected' : ''}>${r.nombre}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Etapa</label>
            <select class="form-select form-select-sm" id="filtro-etapa" onchange="AnimalListPage.aplicarFiltro()">
              <option value="">Todas</option>
              <option value="Ternero">Ternero</option>
              <option value="Novillo">Novillo</option>
              <option value="Adulto">Adulto</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Estado</label>
            <select class="form-select form-select-sm" id="filtro-estado" onchange="AnimalListPage.aplicarFiltro()">
              <option value="">Todos</option>
              <option value="Vacia">Vacía</option>
              <option value="Prenada">Preñada</option>
              <option value="Lactando">Lactando</option>
            </select>
          </div>
        </div>

        <div class="card" id="animales-contenedor">
          <div class="table-responsive" id="animales-tabla">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th style="width:40px"><input type="checkbox" id="seleccionar-todos" onchange="AnimalListPage.toggleTodos(this)"></th>
                  <th onclick="AnimalListPage.ordenarPor('nombre')" data-columna="nombre" class="th-sortable">Nombre</th>
                  <th onclick="AnimalListPage.ordenarPor('sexo')" data-columna="sexo" class="th-sortable">Sexo</th>
                  <th onclick="AnimalListPage.ordenarPor('edad')" data-columna="edad" class="th-sortable">Edad</th>
                  <th onclick="AnimalListPage.ordenarPor('rebano_nombre')" data-columna="rebano_nombre" class="th-sortable">Rebaño</th>
                  <th onclick="AnimalListPage.ordenarPor('etapa')" data-columna="etapa" class="th-sortable">Etapa</th>
                  <th onclick="AnimalListPage.ordenarPor('peso_entrada')" data-columna="peso_entrada" class="th-sortable">Peso Entrada</th>
                  <th onclick="AnimalListPage.ordenarPor('precio_kg')" data-columna="precio_kg" class="th-sortable">Precio/kg</th>
                  <th onclick="AnimalListPage.ordenarPor('precio_final')" data-columna="precio_final" class="th-sortable">Precio Final</th>
                  <th onclick="AnimalListPage.ordenarPor('estado_reproductivo')" data-columna="estado_reproductivo" class="th-sortable">Estado</th>
                  <th style="width:130px">Acciones</th>
                </tr>
              </thead>
              <tbody id="animales-tbody">
                <tr><td colspan="11" class="text-center py-5 text-secondary"><div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>Cargando...</td></tr>
              </tbody>
            </table>
          </div>
          <div id="animales-galeria" class="row g-3 p-3" style="display:none"></div>
          <div id="animales-pagination" class="pagination-custom"></div>
        </div>

        <div id="animal-move-modal"></div>
        <div id="animal-sell-modal"></div>
      `);
    } catch (error) {
      return MainLayout.render(`<div class="alert alert-danger mb-0">Error al cargar: ${error.message}</div>`);
    }
  },

  afterRender() {
    this.paginaActual = 1;
    this.filtros = {};
    this.seleccionados = new Set();
    if (this.filtroRebanoUrl) this.filtros.rebano_id = this.filtroRebanoUrl;

    // Restaurar preferencia de vista
    try {
      const saved = localStorage.getItem('animales-vista');
      if (saved === 'galeria') this.modoVista = 'galeria';
    } catch(e) {}

    // Sincronizar botón y visibilidad
    const btn = document.getElementById('btn-toggle-vista');
    const tabla = document.getElementById('animales-tabla');
    const galeria = document.getElementById('animales-galeria');
    if (this.modoVista === 'galeria') {
      if (btn) btn.innerHTML = '<i class="fas fa-list"></i> Lista';
      if (tabla) tabla.style.display = 'none';
      if (galeria) galeria.style.display = '';
    } else {
      if (btn) btn.innerHTML = '<i class="fas fa-th-large"></i> Galería';
      if (tabla) tabla.style.display = '';
      if (galeria) galeria.style.display = 'none';
    }

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

    // En galería, actualizar bordes visuales de todas las tarjetas
    if (this.modoVista === 'galeria') {
      document.querySelectorAll('.animal-card').forEach(card => {
        card.classList.toggle('border-primary', checkbox.checked);
      });
    }
  },

  toggleAnimal(checkbox, id) {
    if (checkbox.checked) this.seleccionados.add(id);
    else this.seleccionados.delete(id);
    this.actualizarBotonMove();

    // En galería, actualizar borde visual de la tarjeta
    if (this.modoVista === 'galeria') {
      const card = checkbox.closest('.animal-card');
      if (card) card.classList.toggle('border-primary', checkbox.checked);
    }
  },

  actualizarBotonMove() {
    const count = this.seleccionados.size;
    const btnMove = document.getElementById('btn-mover-multiples');
    const spanMove = document.getElementById('seleccionados-count');
    if (btnMove && spanMove) {
      btnMove.classList.toggle('d-none', count === 0);
      spanMove.textContent = count;
    }
    const btnSell = document.getElementById('btn-vender-multiples');
    const spanSell = document.getElementById('vender-seleccionados-count');
    if (btnSell && spanSell) {
      btnSell.classList.toggle('d-none', count === 0);
      spanSell.textContent = count;
    }
    const btnDelete = document.getElementById('btn-eliminar-multiples');
    const spanDelete = document.getElementById('eliminar-seleccionados-count');
    if (btnDelete && spanDelete) {
      btnDelete.classList.toggle('d-none', count === 0);
      spanDelete.textContent = count;
    }
  },

  async mostrarMoverModal() {
    try {
      const { data: rebanos } = await API.get('/rebanos');
      const rebanosList = rebanos.data || [];
      const hoy = new Date().toISOString().substring(0, 10);
      document.getElementById('animal-move-modal').innerHTML = `
        <div class="modal fade show d-block" tabindex="-1" style="background:rgba(0,0,0,0.5)" onclick="if(event.target===this)document.getElementById('animal-move-modal').innerHTML=''">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title"><i class="fas fa-arrows-alt me-2"></i>Mover ${this.seleccionados.size} animal(es)</h5>
                <button class="btn-close" onclick="document.getElementById('animal-move-modal').innerHTML=''"></button>
              </div>
              <div class="modal-body">
                <div class="mb-3">
                  <label class="form-label">Rebaño Destino *</label>
                  <select class="form-select" id="move-rebano-destino" required>
                    <option value="">Seleccione...</option>
                    ${rebanosList.map(r => `<option value="${r.id}">${r.nombre}</option>`).join('')}
                  </select>
                </div>
                <div class="mb-3">
                  <label class="form-label">Fecha del movimiento</label>
                  <input type="date" class="form-control" id="move-fecha" value="${hoy}">
                  <small class="text-secondary d-block mt-1">Fecha real en que se movieron los animales. Si fue antes de hoy, indicalo para que los costos se calculen correctamente.</small>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary" onclick="document.getElementById('animal-move-modal').innerHTML=''">Cancelar</button>
                <button type="button" class="btn btn-primary" onclick="AnimalListPage.ejecutarMove()">Mover</button>
              </div>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      Toast.error(err.response?.data?.error || 'Error al cargar rebaños para mover');
    }
  },

  async mostrarVenderModal() {
    try {
      const seleccionados = Array.from(this.seleccionados);
      const hoy = new Date().toISOString().substring(0, 10);
      document.getElementById('animal-sell-modal').innerHTML = `
        <div class="modal fade show d-block" tabindex="-1" style="background:rgba(0,0,0,0.5)" onclick="if(event.target===this)document.getElementById('animal-sell-modal').innerHTML=''">
          <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title"><i class="fas fa-dollar-sign me-2"></i>Vender ${seleccionados.length} animal(es)</h5>
                <button class="btn-close" onclick="document.getElementById('animal-sell-modal').innerHTML=''"></button>
              </div>
              <div class="modal-body">
                <div class="row g-3">
                  <div class="col-md-6">
                    <label class="form-label">Precio unitario *</label>
                    <input type="number" step="1" min="0" class="form-control" id="sell-precio" placeholder="0" required>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Fecha *</label>
                    <input type="date" class="form-control" id="sell-fecha" value="${hoy}" required>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Comprador</label>
                    <input type="text" class="form-control" id="sell-comprador" placeholder="Nombre del comprador">
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Tipo</label>
                    <select class="form-select" id="sell-tipo">
                      <option value="Venta">Venta</option>
                      <option value="Transferencia">Transferencia</option>
                    </select>
                  </div>
                  <div class="col-12">
                    <label class="form-label">Peso Total del Lote (kg) <small class="text-secondary">opcional — si lo ponés, se distribuye según peso de entrada</small></label>
                    <input type="number" step="0.01" min="0" class="form-control" id="sell-peso" placeholder="Ej: suma de todos los animales">
                  </div>
                  <div class="col-12">
                    <label class="form-label">Notas</label>
                    <textarea class="form-control" id="sell-notas" placeholder="Detalles de la venta..." rows="2"></textarea>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-outline-secondary" onclick="document.getElementById('animal-sell-modal').innerHTML=''">Cancelar</button>
                <button type="button" class="btn btn-danger" onclick="AnimalListPage.ejecutarVenta()">
                  <i class="fas fa-dollar-sign"></i> Vender ${seleccionados.length} animal(es)
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      Toast.error(err.response?.data?.error || 'Error al abrir ventana de venta');
    }
  },

  async ejecutarVenta() {
    const precio = document.getElementById('sell-precio').value;
    const fecha = document.getElementById('sell-fecha').value;
    const comprador = document.getElementById('sell-comprador').value.trim();
    const tipo = document.getElementById('sell-tipo').value;
    const peso = document.getElementById('sell-peso').value;
    const notas = document.getElementById('sell-notas').value.trim();

    if (!precio || parseFloat(precio) <= 0) { Toast.warning('Ingresá un precio válido'); return; }
    if (!fecha) { Toast.warning('Seleccioná la fecha de venta'); return; }

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
      Toast.error(err.response?.data?.error || 'Error al vender animales');
    }
  },

  async ejecutarMove() {
    const destino = document.getElementById('move-rebano-destino').value;
    if (!destino) { Toast.warning('Seleccione un rebaño destino'); return; }
    const fecha = document.getElementById('move-fecha')?.value || null;
    try {
      await API.post('/rebanos/mover-multiples', {
        animal_ids: Array.from(this.seleccionados),
        rebano_destino_id: parseInt(destino),
        fecha,
      });
      document.getElementById('animal-move-modal').innerHTML = '';
      this.seleccionados = new Set();
      this.actualizarBotonMove();
      this.cargarAnimales();
    } catch (err) {
      Toast.error(err.response?.data?.error || 'Error al mover animales');
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
      precio_final: parseFloat(item.precio_final) || 0,
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
    this.paginaActual = 1;
    this.cargarAnimales();
  },

  async cargarAnimales() {
    if (this.modoVista === 'lista') {
      const tbody = document.getElementById('animales-tbody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="11" class="text-center py-5 text-secondary"><div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>Cargando...</td></tr>';
    } else {
      const galeria = document.getElementById('animales-galeria');
      if (galeria) galeria.innerHTML = '<div class="col-12 text-center py-5 text-secondary"><div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>Cargando...</div>';
    }

    try {
      const params = { pagina: this.paginaActual, ...this.filtros };
      if (this.columnaOrden) {
        params.ordenar_por = this.columnaOrden;
        params.direccion = this.direccionOrden;
      }
      const { data } = await API.get('/animales', params);
      this.datosPagina = data.data || [];
      this.total = data.total || 0;
      this.porPagina = data.por_pagina || 20;

      const counters = data.counters || {};
      const elTotal = document.getElementById('kpi-animales-total');
      const elMachos = document.getElementById('kpi-animales-machos');
      const elHembras = document.getElementById('kpi-animales-hembras');
      if (elTotal) elTotal.textContent = Formateador.numero(counters.total ?? 0);
      if (elMachos) elMachos.textContent = Formateador.numero(counters.machos ?? 0);
      if (elHembras) elHembras.textContent = Formateador.numero(counters.hembras ?? 0);

      this.actualizarHighlightStats();

      if (this.modoVista === 'lista') {
        this.renderTabla();
      } else {
        this.renderGaleria();
      }
    } catch (error) {
      if (this.modoVista === 'lista') {
        const tbody = document.getElementById('animales-tbody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="11" class="text-danger py-3 text-center">Error: ${error.message}</td></tr>`;
      } else {
        const galeria = document.getElementById('animales-galeria');
        if (galeria) galeria.innerHTML = `<div class="col-12 text-danger py-3 text-center">Error: ${error.message}</div>`;
      }
    }
  },

  toggleVista() {
    this.modoVista = this.modoVista === 'lista' ? 'galeria' : 'lista';
    const btn = document.getElementById('btn-toggle-vista');
    const tabla = document.getElementById('animales-tabla');
    const galeria = document.getElementById('animales-galeria');

    if (this.modoVista === 'galeria') {
      if (btn) btn.innerHTML = '<i class="fas fa-list"></i> Lista';
      if (tabla) tabla.style.display = 'none';
      if (galeria) galeria.style.display = '';
    } else {
      if (btn) btn.innerHTML = '<i class="fas fa-th-large"></i> Galería';
      if (tabla) tabla.style.display = '';
      if (galeria) galeria.style.display = 'none';
    }

    // Guardar preferencia
    try { localStorage.setItem('animales-vista', this.modoVista); } catch(e) {}

    // Recargar con el modo nuevo
    this.paginaActual = 1;
    this.cargarAnimales();
  },

  renderGaleria() {
    const galeria = document.getElementById('animales-galeria');
    const animales = [...this.datosPagina];

    if (animales.length === 0) {
      galeria.innerHTML = '<div class="col-12 text-center py-5 text-secondary">No hay animales registrados</div>';
      return;
    }

    galeria.innerHTML = animales.map(a => {
      const fotoSrc = a.foto ? `/api/${a.foto}` : null;
      const sexoClass = a.sexo === 'Macho' ? 'badge-sexo-macho' : 'badge-sexo-hembra';
      const sexoIcono = a.sexo === 'Macho' ? 'fa-mars' : 'fa-venus';
      const seleccionado = this.seleccionados.has(a.id);
      const etapaColor = { 'Ternero': 'bg-info', 'Novillo': 'bg-success', 'Adulto': 'bg-primary' }[a.etapa] || 'bg-secondary';

      return `
        <div class="col-6 col-md-4 col-lg-3">
          <div class="card animal-card h-100 ${seleccionado ? 'border-primary border-2' : ''}" style="cursor:pointer" onclick="Router.navegar('/animales/${a.id}')">
            <div class="position-relative" style="height:160px;overflow:hidden">
              ${fotoSrc
                ? `<img src="${fotoSrc}" class="card-img-top w-100 h-100" style="object-fit:cover" alt="${a.nombre}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                   <div class="d-flex align-items-center justify-content-center bg-light w-100 h-100" style="display:none"><i class="fas fa-image fa-3x text-secondary"></i></div>`
                : `<div class="d-flex align-items-center justify-content-center bg-light w-100 h-100"><i class="fas fa-image fa-3x text-secondary"></i></div>`
              }
              <span class="position-absolute top-0 end-0 m-2">
                <input type="checkbox" class="form-check-input animal-checkbox" data-id="${a.id}" ${seleccionado ? 'checked' : ''} onclick="event.stopPropagation();AnimalListPage.toggleAnimal(this, ${a.id})" style="width:18px;height:18px;background:white">
              </span>
            </div>
            <div class="card-body p-2">
              <h6 class="card-title mb-1 fw-bold text-truncate">${a.nombre}</h6>
              <div class="d-flex gap-1 flex-wrap mb-1">
                <span class="badge ${sexoClass}"><i class="fas ${sexoIcono} me-1"></i>${a.sexo}</span>
                <span class="badge ${etapaColor}">${a.etapa}</span>
              </div>
            </div>
            <div class="card-footer bg-transparent p-2 d-flex gap-1 justify-content-center" onclick="event.stopPropagation()">
              <button class="btn btn-outline-secondary btn-sm" onclick="Router.navegar('/animales/${a.id}')" title="Ver detalle">
                <i class="fas fa-eye"></i>
              </button>
              <button class="btn btn-outline-success btn-sm" onclick="Router.navegar('/animales/${a.id}/arbol')" title="Árbol genealógico">
                <i class="fas fa-sitemap"></i>
              </button>
              ${a.estado_general === 'Activo' ? `
              <button class="btn btn-outline-info btn-sm" onclick="AnimalListPage.moverIndividual(${a.id})" title="Mover a otro rebaño">
                <i class="fas fa-arrows-alt"></i>
              </button>
              <button class="btn btn-outline-warning btn-sm" onclick="AnimalListPage.darDeBajaIndividual(${a.id}, '${a.nombre.replace(/'/g, "\\'")}')" title="Dar de baja (Vender/Muerto)">
                <i class="fas fa-sign-out-alt"></i>
              </button>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    const totalPaginas = Math.ceil(this.total / this.porPagina);
    this.renderPaginacion(totalPaginas);
  },

  renderTabla() {
    const tbody = document.getElementById('animales-tbody');
    const animales = this.datosPagina;

    if (animales.length === 0) {
      tbody.innerHTML = '<tr><td colspan="11" class="text-center py-5 text-secondary">No hay animales registrados</td></tr>';
      return;
    }

    tbody.innerHTML = animales.map(a => `
        <tr>
          <td><input type="checkbox" class="animal-checkbox" data-id="${a.id}" onchange="AnimalListPage.toggleAnimal(this, ${a.id})"></td>
          <td><a href="#/animales/${a.id}" class="animal-link fw-medium">${a.nombre}</a></td>
          <td><span class="badge ${a.sexo === 'Macho' ? 'badge-sexo-macho' : 'badge-sexo-hembra'}">${a.sexo}</span></td>
          <td class="text-secondary">${DateUtil.edadTexto(a.fecha_nacimiento)}</td>
          <td>${a.rebano_nombre || '-'}</td>
          <td><span class="badge bg-primary">${a.etapa}</span></td>
          <td>${a.peso_entrada ? `${a.peso_entrada} kg` : '-'}</td>
          <td>${a.precio_kg ? `$${a.precio_kg}` : '-'}</td>
          <td>${a.precio_final ? `$${Number(a.precio_final).toLocaleString('es-CO')}` : '-'}</td>
          <td>${a.estado_reproductivo ? `<span class="badge ${a.estado_reproductivo === 'Prenada' ? 'bg-warning' : 'bg-info'}">${a.estado_reproductivo}</span>` : '-'}</td>
          <td>
            <div class="d-flex gap-1">
              <button class="btn btn-outline-secondary btn-sm" onclick="Router.navegar('/animales/${a.id}')" title="Ver detalle">
                <i class="fas fa-eye"></i>
              </button>
              ${a.estado_general === 'Activo' ? `
              <button class="btn btn-outline-info btn-sm" onclick="AnimalListPage.moverIndividual(${a.id})" title="Mover a otro rebaño">
                <i class="fas fa-arrows-alt"></i>
              </button>
              <button class="btn btn-outline-warning btn-sm" onclick="AnimalListPage.darDeBajaIndividual(${a.id}, '${a.nombre.replace(/'/g, "\\'")}')" title="Dar de baja (Vender/Muerto)">
                <i class="fas fa-sign-out-alt"></i>
              </button>` : ''}
            </div>
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

  /**
   * Activa el filtro de sexo desde las tarjetas de stats.
   * @param {string} sexo - '' (todos), 'Macho' o 'Hembra'
   */
  filtrarPorSexo(sexo) {
    const select = document.getElementById('filtro-sexo');
    if (select) select.value = sexo;
    this.aplicarFiltro();
  },

  /**
   * Resalta la tarjeta de stats que corresponde al filtro de sexo activo.
   */
  actualizarHighlightStats() {
    const statsEl = document.getElementById('animales-stats');
    if (!statsEl) return;
    const sexo = this.filtros.sexo || '';
    statsEl.querySelectorAll('.stat-card').forEach(el => el.style.opacity = '0.6');
    const id = sexo === '' ? 'stat-todos' : sexo === 'Macho' ? 'stat-machos' : 'stat-hembras';
    const active = document.getElementById(id);
    if (active) active.style.opacity = '1';
  },

  moverIndividual(id) {
    this.seleccionados = new Set([id]);
    this.mostrarMoverModal();
  },

  /**
   * Da de baja un animal individual (Vender/Muerto).
   */
  darDeBajaIndividual(id, nombre) {
    const modalId = `baja-modal-${id}`;
    document.getElementById(modalId)?.remove();

    const div = document.createElement('div');
    div.id = modalId;
    div.className = 'modal fade show d-block';
    div.setAttribute('tabindex', '-1');
    div.style.background = 'rgba(0,0,0,0.5)';
    div.onclick = function(e) { if (e.target === this) this.remove(); };
    div.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"><i class="fas fa-door-open me-2"></i>Dar de baja: ${nombre}</h5>
            <button class="btn-close" onclick="this.closest('.modal.fade').remove()"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Estado *</label>
              <select class="form-select" id="${modalId}-estado">
                <option value="Vendido">Vendido</option>
                <option value="Muerto">Muerto</option>
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label">Fecha</label>
              <input type="date" class="form-control" id="${modalId}-fecha" value="${new Date().toISOString().substring(0, 10)}">
            </div>
            <div class="mb-3">
              <label class="form-label">Motivo</label>
              <input type="text" class="form-control" id="${modalId}-motivo" placeholder="Ej: Murió por enfermedad">
            </div>
            <div class="mb-3">
              <label class="form-label">Peso de salida (kg)</label>
              <input type="number" step="0.01" class="form-control" id="${modalId}-peso" placeholder="Peso al momento de la baja">
            </div>
            <div class="mb-3" id="${modalId}-precio-group">
              <label class="form-label">Precio de venta</label>
              <input type="number" step="1" class="form-control" id="${modalId}-precio" placeholder="Precio de venta">
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" onclick="this.closest('.modal.fade').remove()">Cancelar</button>
            <button type="button" class="btn btn-danger" id="${modalId}-btn">Dar de baja</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(div);

    // Mostrar/ocultar precio según estado
    const estadoSelect = document.getElementById(`${modalId}-estado`);
    const precioGroup = document.getElementById(`${modalId}-precio-group`);
    estadoSelect.onchange = () => {
      precioGroup.style.display = estadoSelect.value === 'Vendido' ? '' : 'none';
    };

    // Botón confirmar
    document.getElementById(`${modalId}-btn`).onclick = async () => {
      const estado = estadoSelect.value;
      const fecha = document.getElementById(`${modalId}-fecha`).value;
      const motivo = document.getElementById(`${modalId}-motivo`).value.trim();
      const peso = document.getElementById(`${modalId}-peso`).value;
      const precio = document.getElementById(`${modalId}-precio`).value;

      try {
        const body = {
          estado_general: estado,
          fecha_salida: fecha || null,
          motivo_salida: motivo || null,
          peso_salida: peso ? parseFloat(peso) : null,
        };
        if (estado === 'Vendido' && precio) {
          body.precio_venta = parseFloat(precio);
        }

        await API.post(`/animales/${id}/baja`, body);
        document.getElementById(modalId)?.remove();
        Toast.success(`"${nombre}" dado de baja como ${estado}`);
        this.cargarAnimales();
      } catch (err) {
        Toast.error(err.response?.data?.error || 'Error al dar de baja');
      }
    };
  },

  // ─── Eliminar ─────────────────────────────────────────

  /**
   * Elimina (soft delete) un animal con confirmación.
   */
  async eliminarAnimal(id) {
    if (!confirm('¿Eliminar este animal? Se marcará como inactivo.')) return;

    try {
      await API.delete(`/animales/${id}`);
      Toast.success('Animal eliminado');
      this.cargarAnimales();
    } catch (err) {
      Toast.error(err.response?.data?.error || 'Error al eliminar animal');
    }
  },

  /**
   * Muestra modal de confirmación para eliminar múltiples animales.
   */
  mostrarEliminarModal() {
    const count = this.seleccionados.size;
    const ids = Array.from(this.seleccionados);
    document.getElementById('animal-eliminar-modal')?.remove();

    const div = document.createElement('div');
    div.id = 'animal-eliminar-modal';
    div.className = 'modal fade show d-block';
    div.setAttribute('tabindex', '-1');
    div.style.background = 'rgba(0,0,0,0.5)';
    div.onclick = function (e) {
      if (e.target === this) div.remove();
    };
    div.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"><i class="fas fa-trash text-danger me-2"></i>Eliminar ${count} animal(es)</h5>
            <button class="btn-close" onclick="this.closest('.modal.fade').remove()"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-warning mb-0">
              <i class="fas fa-exclamation-triangle me-2"></i>
              Se van a marcar como <strong>inactivos</strong> ${count} animal(es).
              <br><small>Esta acción no se puede deshacer fácilmente.</small>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" onclick="this.closest('.modal.fade').remove()">Cancelar</button>
            <button type="button" class="btn btn-danger" onclick="AnimalListPage.ejecutarEliminar()">
              <i class="fas fa-trash"></i> Eliminar ${count} animal(es)
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(div);
  },

  /**
   * Ejecuta la eliminación en bloque vía API.
   */
  async ejecutarEliminar() {
    const ids = Array.from(this.seleccionados);
    if (ids.length === 0) return;

    try {
      await API.post('/animales/eliminar-multiples', { animal_ids: ids });
      document.getElementById('animal-eliminar-modal')?.remove();
      this.seleccionados = new Set();
      this.actualizarBotonMove();
      this.cargarAnimales();
      Toast.success(`${ids.length} animales eliminados`);
    } catch (err) {
      Toast.error(err.response?.data?.error || 'Error al eliminar animales');
    }
  },

  // ─── Exportar / Importar ───────────────────────────────

  /**
   * Descarga JSON con todos los animales y datos relacionados.
   */
  async exportarCSV() {
    try {
      await API.download('/exportar/animales', 'animales_export.json');
      Toast.success('Exportación iniciada');
    } catch (err) {
      Toast.error(err.message || 'Error al exportar animales');
    }
  },

  /**
   * Muestra el modal para importar animales desde JSON.
   */
  mostrarImportarModal() {
    const idModal = 'animal-import-modal';
    document.getElementById(idModal)?.remove();

    const div = document.createElement('div');
    div.id = idModal;
    div.className = 'modal fade show d-block';
    div.setAttribute('tabindex', '-1');
    div.style.background = 'rgba(0,0,0,0.5)';
    div.onclick = function (e) {
      if (e.target === this) div.remove();
    };
    div.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"><i class="fas fa-file-import me-2"></i>Importar Animales</h5>
            <button class="btn-close" onclick="this.closest('.modal.fade').remove()"></button>
          </div>
          <div class="modal-body">
            <p class="text-secondary small mb-3">
              Seleccioná un archivo <strong>JSON</strong> con el campo <code>animales</code>.
              Cada animal necesita <code>nombre</code>, <code>sexo</code> (Macho/Hembra),
              <code>fecha_nacimiento</code> y <code>rebano_nombre</code> o <code>rebano_id</code>.
            </p>
            <div class="mb-3">
              <label class="form-label">Archivo JSON</label>
              <input type="file" class="form-control" id="import-file" accept=".json,application/json">
            </div>
            <div id="import-result" class="d-none"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" onclick="this.closest('.modal.fade').remove()">Cancelar</button>
            <button type="button" class="btn btn-primary" onclick="AnimalListPage.ejecutarImportacion()">
              <i class="fas fa-upload"></i> Importar
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(div);
  },

  /**
   * Lee el archivo seleccionado y envía la importación.
   */
  async ejecutarImportacion() {
    const fileInput = document.getElementById('import-file');
    const resultDiv = document.getElementById('import-result');
    const file = fileInput?.files?.[0];

    if (!file) {
      Toast.warning('Seleccioná un archivo JSON');
      return;
    }

    try {
      const texto = await file.text();
      const datos = JSON.parse(texto);

      if (!datos.animales || !Array.isArray(datos.animales)) {
        Toast.error('El JSON debe contener un array en el campo "animales"');
        return;
      }

      const { data } = await API.post('/importar/animales', datos);
      const r = data.data || data;

      resultDiv.classList.remove('d-none', 'alert-success', 'alert-danger');
      resultDiv.className = 'alert ' + (r.errores?.length ? 'alert-warning' : 'alert-success');
      resultDiv.innerHTML = `<strong>${r.mensaje}</strong>`;
      if (r.errores?.length) {
        resultDiv.innerHTML += '<ul class="mb-0 mt-1 small">' +
          r.errores.map(e => `<li>${e}</li>`).join('') + '</ul>';
      }

      if (r.importados > 0) {
        // Si estamos en la página de animales, recargar la lista
        if (document.getElementById('animales-tbody')) {
          this.cargarAnimales();
        }
      }
    } catch (err) {
      resultDiv.classList.remove('d-none');
      resultDiv.className = 'alert alert-danger';
      resultDiv.textContent = err.response?.data?.error || err.message || 'Error al importar';
    }
  },
};

