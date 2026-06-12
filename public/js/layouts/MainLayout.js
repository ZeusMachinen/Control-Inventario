/**
 * Layout principal — Sidebar + Navbar + Contenido (Bootstrap)
 */
const MainLayout = {
  /**
   * Renderiza el shell completo con navbar y sidebar,
   * y el contenido específico de la página.
   */
  render(contenidoHtml) {
    return `
      <div class="app-shell d-flex vh-100">
        ${Sidebar.render()}
        <div class="main-content flex-grow-1 d-flex flex-column">
          ${Navbar.render()}
          <main class="page-content flex-grow-1 p-4 overflow-auto">
            ${contenidoHtml}
          </main>
        </div>
      </div>
    `;
  },
};
