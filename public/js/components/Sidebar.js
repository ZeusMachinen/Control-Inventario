/**
 * Componente Sidebar — Navegación principal (Bootstrap + FontAwesome)
 */
const Sidebar = {
  render() {
    return `
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-logo d-flex align-items-center gap-2">
          <i class="fas fa-leaf sidebar-logo-icon" style="width:auto"></i>
          <span>Control Ganadero</span>
        </div>

        <nav class="sidebar-nav flex-grow-1">
          <a class="sidebar-link d-flex align-items-center gap-3" href="#/estadisticas">
            <i class="fas fa-chart-bar sidebar-link-icon"></i>
            Estadísticas
          </a>

          <div class="sidebar-section-title">Registro</div>

          <a class="sidebar-link d-flex align-items-center gap-3" href="#/animales">
            <i class="fas fa-paw sidebar-link-icon"></i>
            Animales
          </a>
          <a class="sidebar-link d-flex align-items-center gap-3" href="#/rebanos">
            <i class="fas fa-people-group sidebar-link-icon"></i>
            Rebaños
          </a>
          <a class="sidebar-link d-flex align-items-center gap-3" href="#/historial">
            <i class="fas fa-archive sidebar-link-icon"></i>
            Inactivos
          </a>

          <div class="sidebar-section-title">Sanidad</div>

          <a class="sidebar-link d-flex align-items-center gap-3" href="#/vacunacion">
            <i class="fas fa-syringe sidebar-link-icon"></i>
            Vacunación
          </a>
          <a class="sidebar-link d-flex align-items-center gap-3" href="#/medicamentos">
            <i class="fas fa-box sidebar-link-icon"></i>
            Medicamentos
          </a>
          <a class="sidebar-link d-flex align-items-center gap-3" href="#/reproduccion">
            <i class="fas fa-repeat sidebar-link-icon"></i>
            Reproducción
          </a>

          <div class="sidebar-section-title">Comercial</div>

          <a class="sidebar-link d-flex align-items-center gap-3" href="#/compras">
            <i class="fas fa-cart-plus sidebar-link-icon"></i>
            Compras
          </a>
          <a class="sidebar-link d-flex align-items-center gap-3" href="#/ventas">
            <i class="fas fa-dollar-sign sidebar-link-icon"></i>
            Ventas
          </a>

          <div class="sidebar-section-title">Finanzas</div>

          <a class="sidebar-link d-flex align-items-center gap-3" href="#/gastos">
            <i class="fas fa-credit-card sidebar-link-icon"></i>
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
