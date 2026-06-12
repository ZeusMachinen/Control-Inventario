/**
 * Componente Navbar — Barra superior con usuario y logout (Bootstrap)
 */
const Navbar = {
  render() {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

    return `
      <nav class="navbar navbar-expand navbar-light bg-white border-bottom px-3 sticky-top" style="z-index:50">
        <div class="container-fluid">
          <div class="d-flex align-items-center gap-2">
            <button class="menu-toggle btn btn-link text-decoration-none p-1" onclick="Sidebar.toggle()" aria-label="Menú">
              <i class="fas fa-bars fs-5" style="color:var(--texto-principal)"></i>
            </button>
            <span class="navbar-brand d-none d-sm-inline-flex align-items-center gap-2 me-3 pe-3 border-end small">
              <i class="fas fa-cow text-success"></i>
              <span class="fw-semibold text-secondary">Control Ganadero</span>
            </span>
            <span class="navbar-title fw-semibold fs-5" id="navbar-title">Dashboard</span>
          </div>
          <div class="d-flex align-items-center gap-2">
            <button class="btn btn-link text-secondary p-1" id="dark-mode-toggle" onclick="DarkMode.toggle()" title="${document.documentElement.classList.contains('dark-mode') ? 'Modo claro' : 'Modo oscuro'}" style="font-size:1.15rem;text-decoration:none">
              <i class="fas ${document.documentElement.classList.contains('dark-mode') ? 'fa-sun' : 'fa-moon'}"></i>
            </button>
            <div class="d-flex align-items-center gap-2 text-secondary small">
              <i class="fas fa-user"></i>
              <span>${this.escapeHtml(usuario.nombre || 'Usuario')}</span>
            </div>
            <button class="btn btn-outline-secondary btn-sm" onclick="Navbar.logout()">
              <i class="fas fa-sign-out-alt"></i> Salir
            </button>
          </div>
        </div>
      </nav>
    `;
  },

  logout() {
    const refreshToken = localStorage.getItem('refresh_token');

    API.post('/auth/logout', { refresh_token: refreshToken }).catch(() => {});

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('usuario');
    Router.navegar('/login');
  },

  escapeHtml(texto) {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
  },
};
