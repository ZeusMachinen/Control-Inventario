const ReproduccionPage = {
  modoFiltro: 'todo',
  mesActual: new Date().toISOString().substring(0, 7),
  anioActual: new Date().getFullYear().toString(),
  searchTerm: '',
  estadoFiltro: '',
  mostrarInactivos: false,
  datos: [],
  expanded: new Set(),

  generarOpcionesAnio() {
    const anio = new Date().getFullYear();
    let opts = '';
    for (let a = anio; a >= anio - 10; a--) {
      opts += `<option value="${a}" ${a === parseInt(this.anioActual) ? 'selected' : ''}>${a}</option>`;
    }
    return opts;
  },

  async render() {
    return MainLayout.render(`
      <div class="page-header">
        <h1 class="page-title"><i class="fas fa-arrows-rotate me-2"></i>Reproducción</h1>
        <div class="d-flex gap-2 flex-wrap">
          <button class="btn btn-primary" onclick="Router.navegar('/reproduccion/celos/nuevo')"><i class="fas fa-plus me-1"></i>Diagnóstico Celo</button>
          <button class="btn btn-primary" onclick="Router.navegar('/reproduccion/servicios/nuevo')"><i class="fas fa-plus me-1"></i>Servicio</button>
          <button class="btn btn-primary" onclick="Router.navegar('/reproduccion/diagnosticos/nuevo')"><i class="fas fa-plus me-1"></i>Diagnóstico Gestación</button>
          <button class="btn btn-primary" onclick="Router.navegar('/reproduccion/partos/nuevo')"><i class="fas fa-plus me-1"></i>Parto</button>
        </div>
      </div>

      <div class="filter-panel">
        <div class="mb-0">
          <label class="form-label">Buscar</label>
          <input type="text" class="form-control form-control-sm" id="repro-search" placeholder="Nombre, observaciones, crías..." oninput="ReproduccionPage.aplicarFiltro()" style="min-width:160px">
        </div>
        <div class="mb-0">
          <label class="form-label">Período</label>
          <select class="form-select form-select-sm" id="repro-filtro-modo" onchange="ReproduccionPage.cambiarModo()" style="min-width:160px">
            <option value="todo">Todo</option>
            <option value="mes">Mes</option>
            <option value="anio">Año</option>
          </select>
        </div>
        <div class="mb-0" id="repro-filtro-mes-group" style="display:none">
          <label class="form-label">Mes</label>
          <input type="month" class="form-control form-control-sm" id="repro-filtro-mes" value="${this.mesActual}" onchange="ReproduccionPage.cargar()">
        </div>
        <div class="mb-0" id="repro-filtro-anio-group" style="display:none">
          <label class="form-label">Año</label>
          <select class="form-select form-select-sm" id="repro-filtro-anio" onchange="ReproduccionPage.cargar()">
            ${this.generarOpcionesAnio()}
          </select>
        </div>
        <div class="d-flex align-items-end pb-1">
          <label class="d-flex align-items-center gap-1 small" style="cursor:pointer">
            <input type="checkbox" id="repro-toggle-inactivos" onchange="ReproduccionPage.toggleInactivos()">
            Mostrar inactivos
          </label>
        </div>
        <div class="mb-0">
          <label class="form-label">Estado</label>
          <select class="form-select form-select-sm" id="repro-filtro-estado" onchange="ReproduccionPage.cambiarEstado()" style="min-width:150px">
            <option value="">Todos</option>
            <option value="Vacia">Vacía</option>
            <option value="Prenada">Preñada</option>
            <option value="Lactando">Lactando</option>
          </select>
        </div>
      </div>

      <div class="row g-3 mb-3" id="repro-stats">
        <div class="col-md-3 col-6">
          <div class="card text-center py-2"><div class="fs-4 fw-bold" id="repro-total-eventos">0</div><div class="small text-secondary">Total Eventos</div></div>
        </div>
        <div class="col-md-3 col-6">
          <div class="card text-center py-2"><div class="fs-4 fw-bold" id="repro-celos">0</div><div class="small text-secondary">Diagnósticos Celo</div></div>
        </div>
        <div class="col-md-3 col-6">
          <div class="card text-center py-2"><div class="fs-4 fw-bold" id="repro-servicios">0</div><div class="small text-secondary">Servicios</div></div>
        </div>
        <div class="col-md-3 col-6">
          <div class="card text-center py-2"><div class="fs-4 fw-bold" id="repro-partos">0</div><div class="small text-secondary">Partos</div></div>
        </div>
      </div>

      <div id="timeline-container">
        <div class="card"><div class="card-body"><p class="text-center text-secondary py-3"><span class="spinner-border spinner-border-sm text-primary me-2" role="status"></span>Cargando...</p></div></div>
      </div>
    `);
  },

  afterRender() { this.cargar(); },

  cambiarModo() {
    this.modoFiltro = document.getElementById('repro-filtro-modo').value;
    document.getElementById('repro-filtro-mes-group').style.display = this.modoFiltro === 'mes' ? '' : 'none';
    document.getElementById('repro-filtro-anio-group').style.display = this.modoFiltro === 'anio' ? '' : 'none';
    this.cargar();
  },

  aplicarFiltro() {
    this.searchTerm = (document.getElementById('repro-search')?.value || '').toLowerCase().trim();
    this.renderTimeline();
  },

  toggleInactivos() {
    this.mostrarInactivos = document.getElementById('repro-toggle-inactivos').checked;
    this.cargar();
  },

  cambiarEstado() {
    this.estadoFiltro = document.getElementById('repro-filtro-estado')?.value || '';
    this.renderTimeline();
  },

  obtenerFiltroFechas() {
    if (this.modoFiltro === 'todo') return { desde: null, hasta: null };

    if (this.modoFiltro === 'mes') {
      const mes = document.getElementById('repro-filtro-mes')?.value;
      if (!mes) return { desde: null, hasta: null };
      const [y, m] = mes.split('-');
      const ultimoDia = new Date(parseInt(y), parseInt(m), 0).getDate();
      return { desde: mes + '-01', hasta: mes + '-' + String(ultimoDia).padStart(2, '0') };
    }

    if (this.modoFiltro === 'anio') {
      const anio = document.getElementById('repro-filtro-anio')?.value;
      if (!anio) return { desde: null, hasta: null };
      return { desde: anio + '-01-01', hasta: anio + '-12-31' };
    }

    return { desde: null, hasta: null };
  },

  async cargar() {
    try {
      const params = this.mostrarInactivos ? { inactivos: 1 } : {};
      const [celosRes, serviciosRes, diagRes, partosRes] = await Promise.all([
        API.get('/reproduccion/celos', params),
        API.get('/reproduccion/servicios', params),
        API.get('/reproduccion/diagnosticos-gestacion', params),
        API.get('/reproduccion/partos', params),
      ]);

      const celos = celosRes.data?.data || [];
      const servicios = serviciosRes.data?.data || [];
      const diagnosticos = diagRes.data?.data || [];
      const partos = partosRes.data?.data || [];

      const porAnimal = {};

      celos.forEach(c => {
        const key = c.animal_id;
        if (!porAnimal[key]) porAnimal[key] = { animal_id: key, animal_nombre: c.animal_nombre, estado_reproductivo: c.estado_reproductivo || '', eventos: [] };
        porAnimal[key].eventos.push({ ...c, tipo: 'celo', fecha: c.fecha_inicio, label: 'Diagnóstico de Celo' });
      });

      servicios.forEach(s => {
        const key = s.animal_id;
        if (!porAnimal[key]) porAnimal[key] = { animal_id: key, animal_nombre: s.animal_nombre, estado_reproductivo: s.estado_reproductivo || '', eventos: [] };
        porAnimal[key].eventos.push({ ...s, tipo: 'servicio', label: 'Servicio' });
      });

      diagnosticos.forEach(d => {
        const key = d.animal_id;
        if (!porAnimal[key]) porAnimal[key] = { animal_id: key, animal_nombre: d.animal_nombre, estado_reproductivo: d.estado_reproductivo || '', eventos: [] };
        porAnimal[key].eventos.push({ ...d, tipo: 'diagnostico', label: 'Diagnóstico de Gestación' });
      });

      partos.forEach(p => {
        p.crias = typeof p.crias === 'string' ? JSON.parse(p.crias) : (p.crias || []);
        const key = p.animal_id;
        if (!porAnimal[key]) porAnimal[key] = { animal_id: key, animal_nombre: p.animal_nombre, estado_reproductivo: p.estado_reproductivo || '', eventos: [] };
        porAnimal[key].eventos.push({ ...p, tipo: 'parto', label: 'Parto' });
      });

      Object.values(porAnimal).forEach(grupo => {
        grupo.eventos.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
      });

      this.datos = Object.values(porAnimal).sort((a, b) => {
        const aLast = a.eventos[a.eventos.length - 1]?.fecha || '';
        const bLast = b.eventos[b.eventos.length - 1]?.fecha || '';
        return bLast.localeCompare(aLast);
      });

      this.expanded = new Set();
      this.renderTimeline();
    } catch (e) {
      document.getElementById('timeline-container').innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
  },

  renderTimeline() {
    const { desde, hasta } = this.obtenerFiltroFechas();

    const gruposFiltrados = this.datos.map(grupo => {
      let eventos = grupo.eventos;
      if (desde) eventos = eventos.filter(ev => ev.fecha && ev.fecha >= desde);
      if (hasta) eventos = eventos.filter(ev => ev.fecha && ev.fecha <= hasta);
      return { ...grupo, eventos };
    }).filter(grupo => {
      if (grupo.eventos.length === 0) return false;
      // Filtro por estado reproductivo
      if (this.estadoFiltro && grupo.estado_reproductivo !== this.estadoFiltro) return false;
      // Búsqueda amplia: nombre, observaciones, resultado, subtipo, crias, reproductor, sintomas
      if (this.searchTerm) {
        const term = this.searchTerm.toLowerCase();
        const nombreMatch = grupo.animal_nombre.toLowerCase().includes(term);
        if (nombreMatch) return true;
        // Buscar en todos los eventos del grupo
        return grupo.eventos.some(ev => {
          const campos = [
            ev.observaciones,
            ev.subtipo,
            ev.resultado,
            ev.reproductor_nombre,
            ev.reproductor_nombre_animal,
            ev.sintomas,
            ev.comportamiento,
            ev.label,
            // Nombres de crías (en partos)
            ...(Array.isArray(ev.crias) ? ev.crias.map(c => c.nombre || '') : []),
          ];
          return campos.some(c => c && String(c).toLowerCase().includes(term));
        });
      }
      return true;
    });

    let totalEventos = 0, totalCelos = 0, totalServicios = 0, totalPartos = 0;
    gruposFiltrados.forEach(g => {
      totalEventos += g.eventos.length;
      totalCelos += g.eventos.filter(e => e.tipo === 'celo').length;
      totalServicios += g.eventos.filter(e => e.tipo === 'servicio').length;
      totalPartos += g.eventos.filter(e => e.tipo === 'parto').length;
    });
    this.setText('repro-total-eventos', totalEventos);
    this.setText('repro-celos', totalCelos);
    this.setText('repro-servicios', totalServicios);
    this.setText('repro-partos', totalPartos);

    const container = document.getElementById('timeline-container');
    if (!container) return;

    if (gruposFiltrados.length === 0) {
      container.innerHTML = `
        <div class="card">
          <div class="card-body">
            <p class="text-center text-secondary py-3">No hay eventos reproductivos para este período o criterio de búsqueda.</p>
          </div>
        </div>`;
      return;
    }

    const iconMap = {
      celo: '<i class="fas fa-search text-info"></i>',
      servicio: '<i class="fas fa-handshake text-primary"></i>',
      diagnostico: '<i class="fas fa-stethoscope text-success"></i>',
      parto: '<i class="fas fa-baby text-warning"></i>',
    };

    const estadoColor = {
      Vacia: 'bg-info',
      Prenada: 'bg-warning',
      Lactando: 'bg-success',
    };

    container.innerHTML = gruposFiltrados.map(grupo => {
      const isExpanded = this.expanded.has(grupo.animal_id);
      const ultimaFecha = grupo.eventos[grupo.eventos.length - 1]?.fecha;
      const estadoBadge = grupo.estado_reproductivo
        ? `<span class="badge ${estadoColor[grupo.estado_reproductivo] || 'bg-secondary'}">${grupo.estado_reproductivo}</span>`
        : '';
      return `
        <div class="card mb-2">
          <div class="card-header repro-card-header" onclick="ReproduccionPage.toggleAnimal(${grupo.animal_id})" style="cursor:pointer">
            <div class="d-flex align-items-center gap-2">
              <span class="small text-secondary" style="transition:transform 0.2s">${isExpanded ? '▼' : '▶'}</span>
              <strong>${grupo.animal_nombre}</strong>
              ${estadoBadge}
              <span class="badge bg-primary">${grupo.eventos.length} evento${grupo.eventos.length !== 1 ? 's' : ''}</span>
              ${ultimaFecha ? `<span class="small text-secondary ms-auto">Último: ${DateUtil.formatear(ultimaFecha)}</span>` : ''}
            </div>
          </div>
          <div class="card-body py-2" style="${isExpanded ? '' : 'display:none'}">
            ${grupo.eventos.map((ev, i) => `
              <div class="d-flex gap-3 py-2 ${i < grupo.eventos.length - 1 ? 'border-bottom' : ''}">
                <div class="small text-secondary" style="min-width:100px">${DateUtil.formatear(ev.fecha)}</div>
                <div style="min-width:30px;text-align:center">${iconMap[ev.tipo] || ''}</div>
                <div class="flex-grow-1">
                  <strong>${ev.label}</strong>
                  ${ev.subtipo ? `<br><span class="small">${ev.subtipo}</span>` : ''}
                  ${ev.resultado ? `<br><span class="badge ${ev.resultado === 'Positivo' ? 'bg-success' : 'bg-warning'}">${ev.resultado}</span>` : ''}
                  ${ev.tipo === 'parto' && Array.isArray(ev.crias) && ev.crias.length > 0 ? `<br><span class="small">${ev.crias.map(c => c.nombre || 'Cría').join(', ')} (${ev.crias.length})</span>` : ''}
                  ${ev.observaciones ? `<br><span class="small text-secondary">${ev.observaciones}</span>` : ''}
                </div>
                <div class="d-flex gap-1 align-items-start" style="min-width:70px">
                  <button class="btn btn-outline-primary btn-sm" onclick="ReproduccionPage.editarEvento('${ev.tipo}', ${ev.id})" title="Editar"><i class="fas fa-pen"></i></button>
                  <button class="btn btn-outline-danger btn-sm" onclick="ReproduccionPage.eliminarEvento('${ev.tipo}', ${ev.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>`;
    }).join('');
  },

  setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  },

  toggleAnimal(animalId) {
    if (this.expanded.has(animalId)) {
      this.expanded.delete(animalId);
    } else {
      this.expanded.add(animalId);
    }
    this.renderTimeline();
  },

  editarEvento(tipo, id) {
    const rutas = {
      celo: '/reproduccion/celos',
      servicio: '/reproduccion/servicios',
      diagnostico: '/reproduccion/diagnosticos',
      parto: '/reproduccion/partos',
    };
    Router.navegar(`${rutas[tipo] || '/reproduccion'}/${id}/editar`);
  },

  async eliminarEvento(tipo, id) {
    const etiquetas = {
      celo: 'diagnóstico de celo',
      servicio: 'servicio',
      diagnostico: 'diagnóstico de gestación',
      parto: 'parto',
    };
    if (!(await Confirm.show(`¿Eliminar este ${etiquetas[tipo] || 'evento'}?`))) return;

    const endpoints = {
      celo: `/reproduccion/celos/${id}`,
      servicio: `/reproduccion/servicios/${id}`,
      diagnostico: `/reproduccion/diagnosticos-gestacion/${id}`,
      parto: `/reproduccion/partos/${id}`,
    };

    try {
      await API.delete(endpoints[tipo]);
      Toast.success(`${etiquetas[tipo] || 'Evento'} eliminado`);
      this.cargar();
    } catch (err) {
      Toast.error(err.response?.data?.error || 'Error al eliminar');
    }
  },
};