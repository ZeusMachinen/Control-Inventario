<?php
/**
 * Router para PHP built-in server
 * Reemplaza la funcionalidad de .htaccess
 *
 * Uso: php -S localhost:8000 router.php
 * (ejecutar DESDE la carpeta del proyecto)
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$base = __DIR__;

// Mapeo de extensiones a MIME types
$mimeTypes = [
    'css'  => 'text/css',
    'js'   => 'application/javascript',
    'html' => 'text/html',
    'png'  => 'image/png',
    'jpg'  => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'webp' => 'image/webp',
    'svg'  => 'image/svg+xml',
    'ico'  => 'image/x-icon',
    'json' => 'application/json',
    'woff' => 'font/woff',
    'woff2'=> 'font/woff2',
];

// Función para servir un archivo estático con el MIME type correcto
function servirArchivo(string $ruta): void {
    global $mimeTypes;
    $ext = strtolower(pathinfo($ruta, PATHINFO_EXTENSION));
    $mime = $mimeTypes[$ext] ?? 'application/octet-stream';
    header('Content-Type: ' . $mime);
    header('Content-Length: ' . filesize($ruta));
    header('Cache-Control: public, max-age=3600');
    readfile($ruta);
    exit;
}

// 1. API — redirigir al front controller
if (str_starts_with($uri, '/api/')) {
    // Servir archivos de uploads
    if (str_starts_with($uri, '/api/uploads/')) {
        $archivo = $base . $uri;
        if (file_exists($archivo)) {
            servirArchivo($archivo);
        }
    }

    $_SERVER['SCRIPT_FILENAME'] = $base . '/api/index.php';
    require $base . '/api/index.php';
    return true;
}

// 2. Archivos estáticos en /public/
$rutaPublic = $base . '/public' . $uri;
if ($uri !== '/' && file_exists($rutaPublic) && !is_dir($rutaPublic)) {
    servirArchivo($rutaPublic);
}

// 3. SPA — todo lo demás va a index.html
$_SERVER['SCRIPT_FILENAME'] = $base . '/public/index.html';
require $base . '/public/index.html';
return true;
