/**
 * Componente Sidebar — Navegación principal
 */
const Sidebar = {
  render() {
    return `
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-logo">
          <span class="sidebar-logo-icon">🐄</span>
          <span>Control Ganadero</span>
        </div>

        <nav class="sidebar-nav">
          <a class="sidebar-link" href="#/estadisticas">
            <span class="sidebar-link-icon">📊</span>
            Estadísticas
          </a>

          <div class="sidebar-section-title">Registro</div>

          <a class="sidebar-link" href="#/animales">
            <span class="sidebar-link-icon">🐂</span>
            Animales
          </a>
          <a class="sidebar-link" href="#/rebanos">
            <span class="sidebar-link-icon">🐑</span>
            Rebaños
          </a>
          <a class="sidebar-link" href="#/historial">
            <span class="sidebar-link-icon">📜</span>
            Inactivos
          </a>

          <div class="sidebar-section-title">Sanidad</div>

          <a class="sidebar-link" href="#/vacunacion">
            <span class="sidebar-link-icon">💉</span>
            Vacunación
          </a>
          <a class="sidebar-link" href="#/medicamentos">
            <span class="sidebar-link-icon">📦</span>
            Medicamentos
          </a>
          <a class="sidebar-link" href="#/reproduccion">
            <span class="sidebar-link-icon">🔄</span>
            Reproducción
          </a>

          <div class="sidebar-section-title">Comercial</div>

          <a class="sidebar-link" href="#/ventas">
            <span class="sidebar-link-icon">💰</span>
            Ventas
          </a>

          <div class="sidebar-section-title">Finanzas</div>

          <a class="sidebar-link" href="#/gastos">
            <span class="sidebar-link-icon">💳</span>
            Gastos
          </a>
        </nav>
      </aside>
    `;
  },

  toggle() {
    document.getElementById('sidebar').classList.toggle('open');
  },

  cerrar() {
    document.getElementById('sidebar')?.classList.remove('open');
  },
};
