<?php
/**
 * Tabla de rutas de la API REST
 *
 * Formato: 'metodo|/ruta' => ['Controlador', 'metodo', 'requiereAuth']
 */

return [
    // ─── Autenticación ─────────────────────────────────────
    'POST|/api/auth/registro'  => ['AuthController', 'registro',         false],
    'POST|/api/auth/login'     => ['AuthController', 'login',            false],
    'POST|/api/auth/logout'    => ['AuthController', 'logout',           true],
    'GET|/api/auth/verificar'  => ['AuthController', 'verificar',        true],
    'POST|/api/auth/refresh'   => ['AuthController', 'refreshToken',     false],

    // ─── Animales ──────────────────────────────────────────
    'GET|/api/animales'                => ['AnimalController', 'index',     true],
    'POST|/api/animales'               => ['AnimalController', 'store',    true],
    'GET|/api/animales/historial'      => ['AnimalController', 'historial', true],
    'GET|/api/animales/{id}'           => ['AnimalController', 'show',     true],
    'PUT|/api/animales/{id}'           => ['AnimalController', 'update',   true],
    'DELETE|/api/animales/{id}'        => ['AnimalController', 'destroy',  true],
    'GET|/api/animales/{id}/celos'       => ['AnimalController', 'celos',       true],
    'GET|/api/animales/{id}/vacunas'     => ['AnimalController', 'vacunas',     true],
    'GET|/api/animales/{id}/movimientos' => ['AnimalController', 'movimientos', true],
    'POST|/api/animales/{id}/baja'       => ['AnimalController', 'baja',        true],
    'GET|/api/animales/historial'        => ['AnimalController', 'historial',   true],

    // ─── Rebaños ──────────────────────────────────────────
    'GET|/api/rebanos'                => ['RebanoController', 'index',           true],
    'POST|/api/rebanos'               => ['RebanoController', 'store',          true],
    'GET|/api/rebanos/{id}'           => ['RebanoController', 'show',            true],
    'PUT|/api/rebanos/{id}'           => ['RebanoController', 'update',          true],
    'DELETE|/api/rebanos/{id}'        => ['RebanoController', 'destroy',         true],
    'GET|/api/rebanos/{id}/animales'  => ['RebanoController', 'animales',       true],
    'GET|/api/rebanos/{id}/conteo'    => ['RebanoController', 'conteo',         true],
    'POST|/api/rebanos/mover-multiples' => ['RebanoController', 'moverMultiples', true],
    'GET|/api/rebanos/{id}/movimientos' => ['RebanoController', 'movimientos',   true],
    'GET|/api/rebanos/{id}/estadisticas' => ['RebanoController', 'estadisticas',  true],

    // ─── Filtros Guardados ───────────────────────────────
    'GET|/api/filtros'           => ['FiltroController', 'index',       true],
    'POST|/api/filtros'          => ['FiltroController', 'store',      true],
    'GET|/api/filtros/{id}'      => ['FiltroController', 'show',       true],
    'PUT|/api/filtros/{id}'      => ['FiltroController', 'update',     true],
    'DELETE|/api/filtros/{id}'   => ['FiltroController', 'destroy',    true],

    // ─── Medicamentos ──────────────────────────────────────
    'GET|/api/medicamentos'                 => ['MedicamentoController', 'index',            true],
    'POST|/api/medicamentos'                => ['MedicamentoController', 'store',           true],
    'GET|/api/medicamentos/proximos-vencer' => ['MedicamentoController', 'proximosVencer',  true],
    'GET|/api/medicamentos/{id}'            => ['MedicamentoController', 'show',            true],
    'PUT|/api/medicamentos/{id}'            => ['MedicamentoController', 'update',          true],
    'DELETE|/api/medicamentos/{id}'         => ['MedicamentoController', 'destroy',         true],

    // ─── Vacunaciones ──────────────────────────────────────
    'GET|/api/vacunaciones'               => ['VacunacionController', 'index',        true],
    'POST|/api/vacunaciones'              => ['VacunacionController', 'store',       true],
    'GET|/api/vacunaciones/cobertura'     => ['VacunacionController', 'cobertura',   true],
    'GET|/api/vacunaciones/alertas'       => ['VacunacionController', 'alertas',     true],
    'GET|/api/vacunaciones/{id}'          => ['VacunacionController', 'show',        true],
    'PUT|/api/vacunaciones/{id}'          => ['VacunacionController', 'update',      true],
    'DELETE|/api/vacunaciones/{id}'       => ['VacunacionController', 'destroy',     true],

    // ─── Ciclos de Celo ──────────────────────────────────
    'GET|/api/celos'            => ['CeloController', 'index',          true],
    'POST|/api/celos'           => ['CeloController', 'store',         true],
    'GET|/api/celos/activos'    => ['CeloController', 'activos',        true],
    'GET|/api/celos/proximos'   => ['CeloController', 'proximos',       true],
    'GET|/api/celos/{id}'       => ['CeloController', 'show',           true],
    'PUT|/api/celos/{id}'       => ['CeloController', 'update',         true],
    'DELETE|/api/celos/{id}'    => ['CeloController', 'destroy',        true],

    // ─── Estadísticas ──────────────────────────────────────
    'GET|/api/estadisticas/resumen'       => ['EstadisticaController', 'resumen',          true],
    'GET|/api/estadisticas/poblacion'     => ['EstadisticaController', 'piramide',         true],
    'GET|/api/estadisticas/reproduccion'  => ['EstadisticaController', 'reproduccion',     true],
    'GET|/api/estadisticas/vacunacion'    => ['EstadisticaController', 'coberturaVacuna',  true],
    'GET|/api/estadisticas/comerciales'   => ['EstadisticaController', 'comerciales',      true],

    // ─── Compañías ──────────────────────────────────────────
    'GET|/api/companias'        => ['CompaniaController', 'index',      true],
    'POST|/api/companias'       => ['CompaniaController', 'store',     true],
    'GET|/api/companias/{id}'   => ['CompaniaController', 'show',       true],
    'PUT|/api/companias/{id}'   => ['CompaniaController', 'update',     true],
    'DELETE|/api/companias/{id}'=> ['CompaniaController', 'destroy',    true],

    // ─── Ventas ─────────────────────────────────────────
    'GET|/api/ventas'            => ['VentaController', 'index',       true],
    'POST|/api/ventas'           => ['VentaController', 'store',      true],
    'GET|/api/ventas/compras'    => ['VentaController', 'compras',     true],
    'GET|/api/ventas/{id}'       => ['VentaController', 'show',        true],
    'DELETE|/api/ventas/{id}'    => ['VentaController', 'destroy',     true],

    // ─── Gastos ─────────────────────────────────────────
    'GET|/api/gastos'            => ['GastosController', 'index',    true],
    'POST|/api/gastos'           => ['GastosController', 'store',   true],
    'GET|/api/gastos/{id}'       => ['GastosController', 'show',    true],
    'PUT|/api/gastos/{id}'       => ['GastosController', 'update',  true],
    'DELETE|/api/gastos/{id}'    => ['GastosController', 'destroy', true],

    // ─── Archivos / Subidas ────────────────────────────
    'POST|/api/upload/foto'     => ['UploadController', 'subir',       true],
    'GET|/api/uploads/{tipo}/{archivo}' => ['UploadController', 'servir', false],
];
