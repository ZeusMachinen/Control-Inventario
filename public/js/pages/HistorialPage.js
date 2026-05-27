const HistorialPage = {
  paginaActual: 1,

  async render() {
    return MainLayout.render(`
      <div class="page-header">
        <h1 class="page-title">Historial de Animales</h1>
        <button class="btn btn-secondary" onclick="Router.navegar('/animales')">Volver a Activos</button>
      </div>

      <div class="card">
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Estado</th>
                <th>Fecha Salida</th>
                <th>Motivo</th>
                <th>Peso Salida</th>
                <th>Rebaño</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="historial-tbody">
              <tr><td colspan="7" class="loading"><div class="spinner"></div>Cargando...</td></tr>
            </tbody>
          </table>
        </div>
        <div id="historial-pagination" class="pagination"></div>
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
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hay animales en el historial</td></tr>';
        return;
      }

      const badgeColor = { Vendido: 'azul', Muerto: 'rojo' };
      tbody.innerHTML = animales.map(a => `
        <tr>
          <td><strong>${a.nombre}</strong></td>
          <td><span class="badge badge-${badgeColor[a.estado_general] || 'gris'}">${a.estado_general}</span></td>
          <td>${a.fecha_salida ? new Date(a.fecha_salida + 'T00:00:00').toLocaleDateString('es-CO') : '—'}</td>
          <td>${a.motivo_salida || '—'}</td>
          <td>${a.peso_salida ? a.peso_salida + ' kg' : '—'}</td>
          <td>${a.rebano_nombre || '—'}</td>
          <td class="table-actions">
            <button class="btn btn-sm btn-secondary" onclick="Router.navegar('/animales/${a.id}')">Ver</button>
          </td>
        </tr>
      `).join('');

      // Paginación
      const totalPaginas = Math.ceil(total / (data.por_pagina || 20));
      const el = document.getElementById('historial-pagination');
      if (totalPaginas <= 1) { el.innerHTML = ''; return; }
      let html = '';
      html += `<button ${this.paginaActual <= 1 ? 'disabled' : ''} onclick="HistorialPage.irPagina(${this.paginaActual - 1})">‹</button>`;
      for (let i = 1; i <= totalPaginas; i++) {
        html += `<button class="${i === this.paginaActual ? 'active' : ''}" onclick="HistorialPage.irPagina(${i})">${i}</button>`;
      }
      html += `<button ${this.paginaActual >= totalPaginas ? 'disabled' : ''} onclick="HistorialPage.irPagina(${this.paginaActual + 1})">›</button>`;
      el.innerHTML = html;
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="7" class="alert alert-danger">Error: ${e.message}</td></tr>`;
    }
  },

  irPagina(pagina) {
    this.paginaActual = pagina;
    this.cargar();
  },
};
