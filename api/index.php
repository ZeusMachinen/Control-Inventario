<?php
/**
 * Front Controller — API REST
 * Punto de entrada único. Carga configuración, aplica CORS,
 * autoload básico, enruta la petición al controlador correspondiente.
 */

// ─── Configuración ──────────────────────────────────────────
require_once __DIR__ . '/config/app.php';
require_once __DIR__ . '/config/database.php';

// ─── CORS ───────────────────────────────────────────────────
require_once __DIR__ . '/middleware/CorsMiddleware.php';

// ─── Autoload básico ───────────────────────────────────────
spl_autoload_register(function (string $clase) {
    $rutas = [
        __DIR__ . '/helpers/'      . $clase . '.php',
        __DIR__ . '/controllers/'  . $clase . '.php',
        __DIR__ . '/middleware/'   . $clase . '.php',
        __DIR__ . '/models/'       . $clase . '.php',
    ];

    foreach ($rutas as $ruta) {
        if (file_exists($ruta)) {
            require_once $ruta;
            return;
        }
    }
});

// ─── Enrutador ─────────────────────────────────────────────
$rutas = require __DIR__ . '/routes/web.php';

$metodo = $_SERVER['REQUEST_METHOD'];
$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Normalizar URI (quitar trailing slash)
$uri = rtrim($uri, '/') ?: '/';

// Buscar ruta exacta o con parámetros {id}
$controladorLlamado = null;
$parametros = [];

foreach ($rutas as $rutaKey => $accion) {
    [$rutaMetodo, $rutaUri] = explode('|', $rutaKey, 2);

    if ($metodo !== $rutaMetodo) continue;

    // Convertir {param} a regex
    $patron = preg_replace('/\{(\w+)\}/', '(?P<$1>[^/]+)', $rutaUri);
    $patron = '#^' . $patron . '$#';

    if (preg_match($patron, $uri, $matches)) {
        $controladorLlamado = $accion;
        // Extraer solo los parámetros nombrados
        foreach ($matches as $key => $value) {
            if (is_string($key)) {
                $parametros[$key] = $value;
            }
        }
        break;
    }
}

if ($controladorLlamado === null) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'error' => 'Ruta no encontrada']);
    exit;
}

[$nombreControlador, $metodoControlador, $requiereAuth] = $controladorLlamado;

// ─── Autenticación ─────────────────────────────────────────
if ($requiereAuth) {
    require_once __DIR__ . '/middleware/AuthMiddleware.php';
    AuthMiddleware::ejecutar();
}

// ─── Ejecutar controlador ──────────────────────────────────
$archivoControlador = __DIR__ . '/controllers/' . $nombreControlador . '.php';

if (!file_exists($archivoControlador)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Controlador no encontrado']);
    exit;
}

require_once $archivoControlador;
$controlador = new $nombreControlador();

// Llamar al método con los parámetros de la URL
call_user_func_array([$controlador, $metodoControlador], $parametros);
