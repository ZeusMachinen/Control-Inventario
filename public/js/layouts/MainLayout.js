/**
 * Layout principal — Sidebar + Navbar + Contenido
 */
const MainLayout = {
  /**
   * Renderiza el shell completo con navbar y sidebar,
   * y el contenido específico de la página.
   */
  render(contenidoHtml) {
    return `
      <div class="app-shell">
        ${Sidebar.render()}
        <div class="main-content">
          ${Navbar.render()}
          <main class="page-content">
            ${contenidoHtml}
          </main>
        </div>
      </div>
    `;
  },
};
