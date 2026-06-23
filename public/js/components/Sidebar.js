/**
 * Componente Sidebar — Navegación principal (Bootstrap + FontAwesome)
 */
const Sidebar = {
  render() {
    return `
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-logo d-flex align-items-center gap-3 px-4 py-3">
          <i class="fas fa-cow sidebar-logo-icon"></i>
          <span class="fs-5 fw-bold">Control Ganadero</span>
        </div>

        <nav class="sidebar-nav flex-grow-1">
          <a class="sidebar-link d-flex align-items-center gap-4 px-4 py-2" href="#/estadisticas">
            <i class="fas fa-chart-bar sidebar-link-icon"></i>
            Estadísticas
          </a>

          <div class="sidebar-section-title px-4">Registro</div>

          <a class="sidebar-link d-flex align-items-center gap-4 px-4 py-2" href="#/animales">
            <i class="fas fa-cow sidebar-link-icon"></i>
            Animales
          </a>
          <a class="sidebar-link d-flex align-items-center gap-4 px-4 py-2" href="#/rebanos">
            <i class="fas fa-people-group sidebar-link-icon"></i>
            Rebaños
          </a>
          <a class="sidebar-link d-flex align-items-center gap-4 px-4 py-2" href="#/historial">
            <i class="fas fa-archive sidebar-link-icon"></i>
            Inactivos
          </a>

          <div class="sidebar-section-title px-4">Sanidad</div>

          <a class="sidebar-link d-flex align-items-center gap-4 px-4 py-2" href="#/vacunacion">
            <i class="fas fa-syringe sidebar-link-icon"></i>
            Vacunación
          </a>
          <a class="sidebar-link d-flex align-items-center gap-4 px-4 py-2" href="#/medicamentos">
            <i class="fas fa-box sidebar-link-icon"></i>
            Medicamentos
          </a>
          <a class="sidebar-link d-flex align-items-center gap-4 px-4 py-2" href="#/reproduccion">
            <i class="fas fa-repeat sidebar-link-icon"></i>
            Reproducción
          </a>

          <div class="sidebar-section-title px-4">Comercial</div>

          <a class="sidebar-link d-flex align-items-center gap-4 px-4 py-2" href="#/compras">
            <i class="fas fa-cart-plus sidebar-link-icon"></i>
            Compras
          </a>
          <a class="sidebar-link d-flex align-items-center gap-4 px-4 py-2" href="#/ventas">
            <i class="fas fa-dollar-sign sidebar-link-icon"></i>
            Ventas
          </a>

          <div class="sidebar-section-title px-4">Finanzas</div>

          <a class="sidebar-link d-flex align-items-center gap-4 px-4 py-2" href="#/gastos">
            <i class="fas fa-credit-card sidebar-link-icon"></i>
            Gastos
          </a>
        </nav>

        <div class="sidebar-footer px-4 py-3 border-top d-flex flex-column gap-2">
          <button class="btn btn-outline-success btn-sm w-100" onclick="Sidebar.exportarAnimales()">
            <i class="fas fa-download me-1"></i> Exportar Animales
          </button>
          <button class="btn btn-outline-info btn-sm w-100" onclick="Sidebar.mostrarImportar()">
            <i class="fas fa-upload me-1"></i> Importar Animales
          </button>
        </div>
      </aside>
    `;
  },

  async exportarAnimales() {
    try {
      await API.download('/exportar/animales', 'animales_export.json');
      Toast.success('Exportación de animales iniciada');
    } catch (err) {
      Toast.error(err.message || 'Error al exportar animales');
    }
  },

  mostrarImportar() {
    // Reusa el modal de AnimalListPage si existe
    if (typeof AnimalListPage !== 'undefined' && AnimalListPage.mostrarImportarModal) {
      AnimalListPage.mostrarImportarModal();
    } else {
      Toast.error('No se puede abrir importación desde esta página. Andá a Animales primero.');
    }
  },

  toggle() {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth > 768) {
      sidebar.classList.toggle('collapsed');
      localStorage.setItem('sidebar_collapsed', sidebar.classList.contains('collapsed') ? '1' : '0');
    } else {
      sidebar.classList.toggle('open');
    }
  },

  cerrar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    if (window.innerWidth > 768) {
      sidebar.classList.add('collapsed');
    } else {
      sidebar.classList.remove('open');
    }
  },

  estaAbierto() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return false;
    if (window.innerWidth > 768) {
      return !sidebar.classList.contains('collapsed');
    }
    return sidebar.classList.contains('open');
  },
};
