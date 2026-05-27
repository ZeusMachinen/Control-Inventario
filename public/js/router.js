/**
 * Router SPA basado en hash
 * Maneja navegación, lazy rendering y estado activo del sidebar
 */
const Router = (() => {
  const rutas = {};

  /**
   * Registra una ruta con su callback de renderizado.
   * @param {string} hash - '#/animales'
   * @param {Function} render - (params) => html
   * @param {boolean} requiereAuth - por defecto true
   */
  function registrar(hash, render, requiereAuth = true) {
    const patron = hash.replace(/:(\w+)/g, '(?<$1>[^/]+)');
    rutas[hash] = { render, patron: new RegExp(`^${patron}$`), requiereAuth };
  }

  /**
   * Navega a una ruta.
   */
  function navegar(hash) {
    window.location.hash = hash;
  }

  /**
   * Obtiene la ruta activa y sus parámetros.
   */
  function obtenerRutaActiva() {
    let hash = window.location.hash.replace(/^#/, '') || '/login';
    const queryParams = {};
    const qIdx = hash.indexOf('?');
    if (qIdx !== -1) {
      const qs = hash.substring(qIdx + 1);
      hash = hash.substring(0, qIdx);
      qs.split('&').forEach(pair => {
        const [k, v] = pair.split('=');
        if (k) queryParams[decodeURIComponent(k)] = v ? decodeURIComponent(v) : '';
      });
    }

    for (const [, ruta] of Object.entries(rutas)) {
      const match = hash.match(ruta.patron);
      if (match) {
        const params = {};
        for (const [key, value] of Object.entries(match.groups || {})) {
          params[key] = value;
        }
        return { ...ruta, params, hash, query: queryParams };
      }
    }

    return null;
  }

  /**
   * Resuelve la ruta actual y renderiza.
   */
  async function resolver() {
    const ruta = obtenerRutaActiva();

    if (!ruta) {
      document.getElementById('app').innerHTML = '<h2>Página no encontrada</h2>';
      return;
    }

    const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');

    if (ruta.requiereAuth && !usuario) {
      navegar('/login');
      return;
    }

    if (!ruta.requiereAuth && usuario && ruta.hash === '/login') {
      navegar('/dashboard');
      return;
    }

    const app = document.getElementById('app');

    try {
      const html = await ruta.render(ruta.params);
      app.innerHTML = html;

      // Actualizar sidebar activo
      document.querySelectorAll('.sidebar-link').forEach((link) => {
        const href = link.getAttribute('href');
        link.classList.toggle('active', href === `#${ruta.hash}`);
      });

      // Ejecutar afterRender si existe
      if (window._afterRender) {
        window._afterRender(ruta.hash);
        window._afterRender = null;
      }
    } catch (error) {
      console.error('Error al renderizar ruta:', error);
      app.innerHTML = `
        <div class="page-content">
          <div class="alert alert-danger">
            Error al cargar la página. ${error.message}
          </div>
        </div>
      `;
    }
  }

  // Inicializar — usa Router.resolver para que app.js pueda overriarlo con afterRender
  window.addEventListener('hashchange', () => Router.resolver());

  return {
    registrar,
    navegar,
    resolver,
    obtenerRutaActiva,
  };
})();
