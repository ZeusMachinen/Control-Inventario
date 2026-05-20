/**
 * Componente Navbar — Barra superior con usuario y logout
 */
const Navbar = {
  render() {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

    return `
      <nav class="navbar">
        <div class="navbar-left">
          <button class="menu-toggle" onclick="Sidebar.toggle()" aria-label="Menú">
            ☰
          </button>
          <span class="navbar-title" id="navbar-title">Dashboard</span>
        </div>
        <div class="navbar-right">
          <div class="navbar-user">
            <span>👤</span>
            <span>${this.escapeHtml(usuario.nombre || 'Usuario')}</span>
          </div>
          <button class="btn-logout" onclick="Navbar.logout()">
            Salir
          </button>
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
