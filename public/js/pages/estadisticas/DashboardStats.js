/**
 * Página: Panel de Estadísticas Detalladas
 */
const DashboardStatsPage = {
  graficos: [],

  async render() {
    try {
      const { data: resumen } = await API.get('/estadisticas/resumen');
      const { data: pob } = await API.get('/estadisticas/poblacion');
      const { data: repro } = await API.get('/estadisticas/reproduccion');
      const { data: vac } = await API.get('/estadisticas/vacunacion');
      const { data: comercial } = await API.get('/estadisticas/comerciales');

      const r = resumen.data || {};
      const p = pob.data || {};
      const rep = repro.data || {};
      const v = vac.data || {};
      const c = comercial.data || {};

      return MainLayout.render(`
        <div class="page-header">
          <h1 class="page-title">📈 Estadísticas</h1>
        </div>

        <!-- KPIs -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-card-icon">🐄</div>
            <div class="stat-card-info">
              <h3>${Formateador.numero(r.total_animales || 0)}</h3>
              <p>Total Animales</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="background:#FCE4EC;color:#C2185B">♀️</div>
            <div class="stat-card-info">
              <h3>${Formateador.numero(r.total_hembras || 0)}</h3>
              <p>Hembras</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon">📊</div>
            <div class="stat-card-info">
              <h3>${r.tasa_natalidad || 0}%</h3>
              <p>Tasa Natalidad</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="background:var(--rojo-claro);color:var(--rojo)">📉</div>
            <div class="stat-card-info">
              <h3>${r.tasa_mortalidad || 0}%</h3>
              <p>Tasa Mortalidad</p>
            </div>
          </div>
        </div>

        <!-- Reproductive KPIs -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-card-icon" style="background:var(--naranja-claro);color:var(--naranja)">🤰</div>
            <div class="stat-card-info">
              <h3>${Formateador.numero(rep.prenadas_actuales || 0)}</h3>
              <p>Preñadas</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="background:var(--azul-claro);color:var(--azul)">🍼</div>
            <div class="stat-card-info">
              <h3>${Formateador.numero(rep.lactando_actuales || 0)}</h3>
              <p>Lactando</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="background:var(--verde-bg);color:var(--verde-principal)">💉</div>
            <div class="stat-card-info">
              <h3>${v.porcentaje || 0}%</h3>
              <p>Vacunados (3 meses)</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="background:#E8F5E9;color:#2E7D32">💰</div>
            <div class="stat-card-info">
              <h3>${Formateador.moneda(c.ganancia_neta || 0)}</h3>
              <p>Ganancia Neta</p>
            </div>
          </div>
        </div>

        <!-- Charts -->
        <div class="charts-grid">
          ${[
            { id: 'chart-piramide', title: 'Pirámide Poblacional por Edad', type: 'bar' },
            { id: 'chart-etapas-detalle', title: 'Distribución por Etapa', type: 'doughnut' },
            { id: 'chart-estados', title: 'Estado Reproductivo (Hembras)', type: 'doughnut' },
            { id: 'chart-comercial', title: 'KPIs Comerciales', type: 'bar' },
          ].map(ch => `
            <div class="chart-card">
              <h3>${ch.title}</h3>
              <canvas id="${ch.id}"></canvas>
            </div>
          `).join('')}
        </div>
      `);
    } catch (e) {
      return MainLayout.render(`<div class="alert alert-danger">Error al cargar estadísticas: ${e.message}</div>`);
    }
  },

  afterRender() {
    this.destruirGraficos();
    this.cargarGraficos();
  },

  destruirGraficos() {
    this.graficos.forEach(g => g.destroy());
    this.graficos = [];
  },

  async cargarGraficos() {
    if (typeof Chart === 'undefined') return;

    try {
      const { data: pob } = await API.get('/estadisticas/poblacion');
      const { data: repro } = await API.get('/estadisticas/reproduccion');
      const { data: comercial } = await API.get('/estadisticas/comerciales');

      const p = pob.data || {};
      const rep = repro.data || {};
      const c = comercial.data || {};

      // Pirámide de edades
      const ctx1 = document.getElementById('chart-piramide');
      if (ctx1 && p.piramide_edades) {
        const labels = Object.keys(p.piramide_edades);
        const data = Object.values(p.piramide_edades);
        this.graficos.push(new Chart(ctx1, {
          type: 'bar',
          data: {
            labels,
            datasets: [{
              label: 'Animales',
              data,
              backgroundColor: ['#A5D6A7', '#66BB6A', '#388E3C', '#1B5E20'],
            }],
          },
          options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
          },
        }));
      }

      // Etapas
      const ctx2 = document.getElementById('chart-etapas-detalle');
      if (ctx2 && p.etapas) {
        this.graficos.push(new Chart(ctx2, {
          type: 'doughnut',
          data: {
            labels: Object.keys(p.etapas),
            datasets: [{ data: Object.values(p.etapas), backgroundColor: ['#A5D6A7', '#66BB6A', '#2E7D32'] }],
          },
          options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
        }));
      }

      // Estados reproductivos
      const ctx3 = document.getElementById('chart-estados');
      if (ctx3 && p.estados_reproductivos) {
        this.graficos.push(new Chart(ctx3, {
          type: 'doughnut',
          data: {
            labels: Object.keys(p.estados_reproductivos),
            datasets: [{ data: Object.values(p.estados_reproductivos), backgroundColor: ['#F5F5F5', '#FFB74D', '#81C784'] }],
          },
          options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
        }));
      }

      // Comerciales
      const ctx4 = document.getElementById('chart-comercial');
      if (ctx4) {
        this.graficos.push(new Chart(ctx4, {
          type: 'bar',
          data: {
            labels: ['Ingresos', 'Gastos', 'Ganancia Neta'],
            datasets: [{
              label: 'COP',
              data: [c.ingresos_anuales || 0, c.gastos_anuales || 0, c.ganancia_neta || 0],
              backgroundColor: ['#66BB6A', '#EF5350', '#42A5F5'],
            }],
          },
          options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } },
          },
        }));
      }
    } catch (e) {
      console.warn('Error cargando gráficos:', e.message);
    }
  },
};
