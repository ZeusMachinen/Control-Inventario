/**
 * Bootstrap de la aplicación SPA
 * Registra rutas, verifica autenticación e inicializa el router.
 */
(function () {
  'use strict';

  // ─── Registrar rutas ─────────────────────────────────
  Router.registrar('/login',        () => LoginPage.render(), false);
  Router.registrar('/dashboard',    () => DashboardPage.render());
  Router.registrar('/animales',     () => AnimalListPage.render());
  Router.registrar('/animales/nuevo', () => AnimalFormPage.render({}));
  Router.registrar('/animales/:id', (p) => AnimalDetailPage.render(p));
  Router.registrar('/animales/:id/editar', (p) => AnimalFormPage.render(p));
  Router.registrar('/rebanos',      () => RebanoListPage.render());
  Router.registrar('/vacunacion',   () => VacunacionListPage.render());
  Router.registrar('/vacunacion/nuevo', () => VacunacionFormPage.render({}));
  Router.registrar('/vacunacion/:id/editar', (p) => VacunacionFormPage.render(p));
  Router.registrar('/medicamentos', () => MedicamentoListPage.render());
  Router.registrar('/celos',        () => CeloListPage.render());
  Router.registrar('/celos/nuevo',  () => CeloFormPage.render());
  Router.registrar('/estadisticas', () => DashboardStatsPage.render());
  Router.registrar('/companias',    () => CompaniaListPage.render());
  Router.registrar('/companias/nuevo', () => CompaniaFormPage.render());
  Router.registrar('/ventas',       () => VentaListPage.render());
  Router.registrar('/ventas/nuevo', () => VentaFormPage.render());
  Router.registrar('/rebanos/:id/movimientos', (p) => RebanoMovimientosPage.render(p));
  Router.registrar('/historial',     () => HistorialPage.render());
  Router.registrar('/gastos',       () => GastosPage.render());

  // ─── AfterRender hook ─────────────────────────────────
  const afterRenderMap = {
    '/dashboard':                    () => DashboardPage.afterRender(),
    '/animales':                     () => AnimalListPage.afterRender(),
    '/animales/nuevo':               () => AnimalFormPage.afterRender(),
    '/animales/:id':                 (p) => AnimalDetailPage.afterRender(),
    '/animales/:id/editar':          (p) => AnimalFormPage.afterRender(),
    '/rebanos':                      () => RebanoListPage.afterRender(),
    '/rebanos/:id/movimientos':      (p) => RebanoMovimientosPage.afterRender(),
    '/vacunacion':                   () => VacunacionListPage.afterRender(),
    '/medicamentos':                 () => MedicamentoListPage.afterRender(),
    '/celos':                        () => CeloListPage.afterRender(),
    '/estadisticas':                 () => DashboardStatsPage.afterRender(),
    '/companias':                    () => CompaniaListPage.afterRender(),
    '/historial':                    () => HistorialPage.afterRender(),
    '/gastos':                       () => GastosPage.afterRender(),
    // VentaListPage carga datos en render(), no necesita afterRender
  };

  const originalResolver = Router.resolver.bind(Router);
  Router.resolver = async function () {
    const ruta = Router.obtenerRutaActiva();
    await originalResolver();

    if (ruta) {
      // Buscar coincidencia exacta o con parámetros
      let handler = afterRenderMap[ruta.hash];
      if (!handler) {
        // Buscar patrón con parámetros
        for (const [patron, fn] of Object.entries(afterRenderMap)) {
          const regex = new RegExp('^' + patron.replace(/:(\w+)/g, '([^/]+)') + '$');
          if (regex.test(ruta.hash)) {
            handler = () => fn(ruta.params);
            break;
          }
        }
      }
      if (handler) {
        setTimeout(handler, 50);
      }
    }
  };

  // ─── Inicializar ─────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    // Si no hay hash, redirigir según auth
    if (!window.location.hash) {
      const usuario = localStorage.getItem('usuario');
      window.location.hash = usuario ? '#/dashboard' : '#/login';
    }

    // Cerrar sidebar al hacer clic fuera en mobile
    document.addEventListener('click', (e) => {
      const sidebar = document.getElementById('sidebar');
      if (window.innerWidth <= 768 && sidebar?.classList.contains('open')) {
        if (!sidebar.contains(e.target) && !e.target.classList.contains('menu-toggle')) {
          sidebar.classList.remove('open');
        }
      }
    });

    Router.resolver();
  });
})();
