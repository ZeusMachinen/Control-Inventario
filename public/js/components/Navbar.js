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
            <span class="navbar-title fw-semibold fs-5" id="navbar-title">Dashboard</span>
          </div>
          <div class="d-flex align-items-center gap-3">
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
