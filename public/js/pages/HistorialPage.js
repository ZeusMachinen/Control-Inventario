const HistorialPage = {
  paginaActual: 1,

  async render() {
    return MainLayout.render(`
      <div class="page-header">
        <h1 class="page-title"><i class="fas fa-clock-rotate me-2"></i>Historial de Animales</h1>
        <button class="btn btn-outline-secondary" onclick="Router.navegar('/animales')"><i class="fas fa-arrow-left me-1"></i>Volver a Activos</button>
      </div>

      <div class="card">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th>Nombre</th>
                <th>Estado</th>
                <th>Fecha Salida</th>
                <th>Motivo</th>
                <th>Peso Salida</th>
                <th>Precio/kg</th>
                <th>Rebaño</th>
                <th style="width:80px">Acciones</th>
              </tr>
            </thead>
            <tbody id="historial-tbody">
              <tr><td colspan="8" class="text-center py-4 text-secondary"><div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>Cargando...</td></tr>
            </tbody>
          </table>
        </div>
        <div id="historial-pagination" class="pagination-custom d-flex justify-content-center gap-1 py-3"></div>
      </div>
    `);
  },

  afterRender() {
    this.paginaActual = 1;
    this.cargar();
  },

  async cargar() {
    const tbody = document.getElementById('historial-tbody');
    try {
      const { data } = await API.get('/animales/historial', { pagina: this.paginaActual });
      const animales = data.data || [];
      const total = data.total || 0;

      if (animales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-secondary">No hay animales en el historial</td></tr>';
        return;
      }

      const badgeColor = { Vendido: 'bg-primary', Muerto: 'bg-danger' };
      tbody.innerHTML = animales.map(a => `
        <tr>
          <td class="fw-medium">${a.nombre}</td>
          <td><span class="badge ${badgeColor[a.estado_general] || 'bg-secondary'}">${a.estado_general}</span></td>
          <td>${a.fecha_salida ? new Date(a.fecha_salida + 'T00:00:00').toLocaleDateString('es-CO') : '—'}</td>
          <td>${a.motivo_salida || '—'}</td>
          <td>${a.peso_salida ? a.peso_salida + ' kg' : '—'}</td>
          <td>${a.precio_kg ? '$' + Number(a.precio_kg).toLocaleString('es-CO', { minimumFractionDigits: 2 }) : '—'}</td>
          <td>${a.rebano_nombre || '—'}</td>
          <td>
            <button class="btn btn-outline-secondary btn-sm" onclick="Router.navegar('/animales/${a.id}')" title="Ver"><i class="fas fa-eye"></i></button>
          </td>
        </tr>
      `).join('');

      const totalPaginas = Math.ceil(total / (data.por_pagina || 20));
      const el = document.getElementById('historial-pagination');
      if (totalPaginas <= 1) { el.innerHTML = ''; return; }
      let html = '';
      html += `<button class="btn btn-sm btn-outline-secondary" ${this.paginaActual <= 1 ? 'disabled' : ''} onclick="HistorialPage.irPagina(${this.paginaActual - 1})">&lsaquo;</button>`;
      for (let i = 1; i <= totalPaginas; i++) {
        html += `<button class="btn btn-sm ${i === this.paginaActual ? 'btn-primary' : 'btn-outline-secondary'}" onclick="HistorialPage.irPagina(${i})">${i}</button>`;
      }
      html += `<button class="btn btn-sm btn-outline-secondary" ${this.paginaActual >= totalPaginas ? 'disabled' : ''} onclick="HistorialPage.irPagina(${this.paginaActual + 1})">&rsaquo;</button>`;
      el.innerHTML = html;
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-danger py-3 text-center">Error: ${e.message}</td></tr>`;
    }
  },

  irPagina(pagina) {
    this.paginaActual = pagina;
    this.cargar();
  },
};