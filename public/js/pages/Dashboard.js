const DashboardPage = {
  async render() {
    try {
      const { data: resumen } = await API.get('/estadisticas/resumen');
      const r = resumen.data || {};

      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title"><i class="fas fa-chart-bar me-2"></i>Dashboard</h1>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-card-icon"><i class="fas fa-paw"></i></div>
            <div class="stat-card-info">
              <h3>${Formateador.numero(r.total_animales || 0)}</h3>
              <p>Total Animales</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="background:var(--azul-claro);color:var(--azul)"><i class="fas fa-mars"></i></div>
            <div class="stat-card-info">
              <h3>${Formateador.numero(r.total_machos || 0)}</h3>
              <p>Machos</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="background:#FCE4EC;color:#C2185B"><i class="fas fa-venus"></i></div>
            <div class="stat-card-info">
              <h3>${Formateador.numero(r.total_hembras || 0)}</h3>
              <p>Hembras</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="background:var(--naranja-claro);color:var(--naranja)"><i class="fas fa-box"></i></div>
            <div class="stat-card-info">
              <h3>${Formateador.numero(r.total_rebanos || 0)}</h3>
              <p>Rebaños</p>
            </div>
          </div>
        </div>

        <div class="charts-grid">
          <div class="chart-card">
            <h3><i class="fas fa-chart-pie me-2"></i>Distribución por Etapa</h3>
            <canvas id="chart-etapa"></canvas>
          </div>
          <div class="chart-card">
            <h3><i class="fas fa-venus-mars me-2"></i>Distribución por Sexo</h3>
            <canvas id="chart-sexo"></canvas>
          </div>
        </div>
      `);
    } catch (error) {
      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title"><i class="fas fa-chart-bar me-2"></i>Dashboard</h1>
        </div>
        <div class="stats-grid">
          ${['Total Animales', 'Machos', 'Hembras', 'Rebaños'].map(label => `
            <div class="stat-card">
              <div class="stat-card-info">
                <h3>0</h3>
                <p>${label}</p>
              </div>
            </div>
          `).join('')}
        </div>
      `);
    }
  },

  afterRender() {
    this.cargarGraficos();
  },

  async cargarGraficos() {
    if (typeof Chart === 'undefined') return;

    try {
      const { data: pob } = await API.get('/estadisticas/poblacion');
      const poblacion = pob.data || {};

      const ctx1 = document.getElementById('chart-etapa');
      if (ctx1 && poblacion.etapas) {
        new Chart(ctx1, {
          type: 'doughnut',
          data: {
            labels: Object.keys(poblacion.etapas),
            datasets: [{
              data: Object.values(poblacion.etapas),
              backgroundColor: ['#A5D6A7', '#66BB6A', '#2E7D32'],
            }],
          },
          options: {
            responsive: true,
            plugins: {
              legend: { position: 'bottom' },
            },
          },
        });
      }

      const ctx2 = document.getElementById('chart-sexo');
      if (ctx2 && poblacion.sexo) {
        new Chart(ctx2, {
          type: 'pie',
          data: {
            labels: Object.keys(poblacion.sexo),
            datasets: [{
              data: Object.values(poblacion.sexo),
              backgroundColor: ['#1976D2', '#C2185B'],
            }],
          },
          options: {
            responsive: true,
            plugins: {
              legend: { position: 'bottom' },
            },
          },
        });
      }
    } catch (e) {
      console.warn('No se pudieron cargar gráficos:', e.message);
    }
  },
};