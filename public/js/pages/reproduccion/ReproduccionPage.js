const ReproduccionPage = {
  modoFiltro: 'todo',
  mesActual: new Date().toISOString().substring(0, 7),
  anioActual: new Date().getFullYear().toString(),
  searchTerm: '',
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
        <h1 class="page-title">🔄 Reproducción</h1>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="Router.navegar('/reproduccion/celos/nuevo')">+ Diagnóstico Celo</button>
          <button class="btn btn-primary" onclick="Router.navegar('/reproduccion/servicios/nuevo')">+ Servicio</button>
          <button class="btn btn-primary" onclick="Router.navegar('/reproduccion/diagnosticos/nuevo')">+ Diagnóstico Gestación</button>
          <button class="btn btn-primary" onclick="Router.navegar('/reproduccion/partos/nuevo')">+ Parto</button>
        </div>
      </div>

      <div class="filter-panel">
        <div class="form-group">
          <label class="form-label">Buscar animal</label>
          <input type="text" class="form-input" id="repro-search" placeholder="Nombre..." oninput="ReproduccionPage.aplicarFiltro()">
        </div>
        <div class="form-group">
          <label class="form-label">Período</label>
          <select class="form-select" id="repro-filtro-modo" onchange="ReproduccionPage.cambiarModo()">
            <option value="todo">Todo</option>
            <option value="mes">Mes</option>
            <option value="anio">Año</option>
          </select>
        </div>
        <div class="form-group" id="repro-filtro-mes-group" style="display:none">
          <label class="form-label">Mes</label>
          <input type="month" class="form-input" id="repro-filtro-mes" value="${this.mesActual}" onchange="ReproduccionPage.cargar()">
        </div>
        <div class="form-group" id="repro-filtro-anio-group" style="display:none">
          <label class="form-label">Año</label>
          <select class="form-select" id="repro-filtro-anio" onchange="ReproduccionPage.cargar()">
            ${this.generarOpcionesAnio()}
          </select>
        </div>
        <div class="form-group" style="display:flex;align-items:flex-end;padding-bottom:2px">
          <label style="display:flex;align-items:center;gap:0.3rem;font-size:0.85rem;cursor:pointer">
            <input type="checkbox" id="repro-toggle-inactivos" onchange="ReproduccionPage.toggleInactivos()">
            Mostrar inactivos
          </label>
        </div>
      </div>

      <div class="stats-grid" style="margin-bottom:1rem" id="repro-stats">
        <div class="stat-card"><div class="stat-card-info"><h3 id="repro-total-eventos">0</h3><p>Total Eventos</p></div></div>
        <div class="stat-card"><div class="stat-card-info"><h3 id="repro-celos">0</h3><p>Diagnósticos Celo</p></div></div>
        <div class="stat-card"><div class="stat-card-info"><h3 id="repro-servicios">0</h3><p>Servicios</p></div></div>
        <div class="stat-card"><div class="stat-card-info"><h3 id="repro-partos">0</h3><p>Partos</p></div></div>
      </div>

      <div id="timeline-container">
        <div class="card"><div class="card-body"><p class="empty-state"><div class="spinner"></div> Cargando...</p></div></div>
      </div>
    `);
  },

  afterRender() {
    this.cargar();
  },

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

  obtenerFiltroFechas() {
    if (this.modoFiltro === 'todo') return { desde: null, hasta: null };

    if (this.modoFiltro === 'mes') {
      const mes = document.getElementById('repro-filtro-mes')?.value;
      if (!mes) return { desde: null, hasta: null };
      const [y, m] = mes.split('-');
      const ultimoDia = new Date(parseInt(y), parseInt(m), 0).getDate();
      return {
        desde: mes + '-01',
        hasta: mes + '-' + String(ultimoDia).padStart(2, '0'),
      };
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
        if (!porAnimal[key]) porAnimal[key] = { animal_id: key, animal_nombre: c.animal_nombre, eventos: [] };
        porAnimal[key].eventos.push({ ...c, tipo: 'celo', fecha: c.fecha_inicio, label: 'Diagnóstico de Celo' });
      });

      servicios.forEach(s => {
        const key = s.animal_id;
        if (!porAnimal[key]) porAnimal[key] = { animal_id: key, animal_nombre: s.animal_nombre, eventos: [] };
        porAnimal[key].eventos.push({ ...s, tipo: 'servicio', label: 'Servicio' });
      });

      diagnosticos.forEach(d => {
        const key = d.animal_id;
        if (!porAnimal[key]) porAnimal[key] = { animal_id: key, animal_nombre: d.animal_nombre, eventos: [] };
        porAnimal[key].eventos.push({ ...d, tipo: 'diagnostico', label: 'Diagnóstico de Gestación' });
      });

      partos.forEach(p => {
        p.crias = typeof p.crias === 'string' ? JSON.parse(p.crias) : (p.crias || []);
        const key = p.animal_id;
        if (!porAnimal[key]) porAnimal[key] = { animal_id: key, animal_nombre: p.animal_nombre, eventos: [] };
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
      if (this.searchTerm && !grupo.animal_nombre.toLowerCase().includes(this.searchTerm)) return false;
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
            <p class="empty-state">No hay eventos reproductivos para este período o criterio de búsqueda.</p>
          </div>
        </div>`;
      return;
    }

    container.innerHTML = gruposFiltrados.map(grupo => {
      const isExpanded = this.expanded.has(grupo.animal_id);
      const ultimaFecha = grupo.eventos[grupo.eventos.length - 1]?.fecha;
      return `
        <div class="card" style="margin-bottom:0.75rem">
          <div class="card-header repro-card-header" onclick="ReproduccionPage.toggleAnimal(${grupo.animal_id})">
            <div style="display:flex;align-items:center;gap:0.75rem;flex:1">
              <span style="font-size:0.75rem;color:var(--gris-texto);transition:transform 0.2s">${isExpanded ? '▼' : '▶'}</span>
              <strong>${grupo.animal_nombre}</strong>
              <span class="badge badge-azul">${grupo.eventos.length} evento${grupo.eventos.length !== 1 ? 's' : ''}</span>
              ${ultimaFecha ? `<span style="font-size:0.8rem;color:var(--gris-texto);margin-left:auto">Último: ${DateUtil.formatear(ultimaFecha)}</span>` : ''}
            </div>
          </div>
          <div class="card-body repro-card-body" style="${isExpanded ? '' : 'display:none'}">
            <div class="timeline">
              ${grupo.eventos.map((ev, i) => `
                <div class="timeline-item" style="display:flex;gap:0.75rem;padding:0.5rem 0;${i < grupo.eventos.length - 1 ? 'border-bottom:1px solid var(--gris-borde);' : ''}">
                  <div style="min-width:100px;font-size:0.85rem;color:var(--gris-texto)">${DateUtil.formatear(ev.fecha)}</div>
                  <div style="min-width:40px;text-align:center">
                    ${ev.tipo === 'celo' ? '🔍' : ''}
                    ${ev.tipo === 'servicio' ? '🤝' : ''}
                    ${ev.tipo === 'diagnostico' ? '🩺' : ''}
                    ${ev.tipo === 'parto' ? '🍼' : ''}
                  </div>
                  <div style="flex:1">
                    <strong>${ev.label}</strong>
                    ${ev.subtipo ? `<br><span style="font-size:0.85rem">${ev.subtipo}</span>` : ''}
                    ${ev.resultado ? `<br><span class="badge ${ev.resultado === 'Positivo' ? 'badge-verde' : 'badge-naranja'}">${ev.resultado}</span>` : ''}
                    ${ev.tipo === 'parto' && Array.isArray(ev.crias) && ev.crias.length > 0 ? `<br><span style="font-size:0.85rem">${ev.crias.map(c => c.nombre || 'Cría').join(', ')} (${ev.crias.length})</span>` : ''}
                    ${ev.observaciones ? `<br><span style="font-size:0.8rem;color:var(--gris-texto)">${ev.observaciones}</span>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
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
};
