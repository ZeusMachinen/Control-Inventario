<?php
/**
 * Controlador de subida y servicio de archivos
 */
require_once __DIR__ . '/../helpers/FileUploader.php';
require_once __DIR__ . '/../helpers/Response.php';

class UploadController
{
    /**
     * Sube una foto de animal.
     * POST /api/upload/foto
     */
    public function subir(): void
    {
        if (!isset($_FILES['foto'])) {
            Response::error('No se recibió ninguna foto', 422);
        }

        try {
            $uploader = new FileUploader();
            $ruta = $uploader->subir($_FILES['foto']);

            Response::json([
                'ruta' => $ruta,
                'url'  => '/api/' . $ruta,
            ], 201);
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 422);
        } catch (\RuntimeException $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    /**
     * Sirve un archivo (foto) de forma segura.
     * GET /api/uploads/{tipo}/{archivo}
     */
    public function servir(string $tipo, string $archivo): void
    {
        // Prevenir path traversal
        $archivo = basename($archivo);
        $tipo = basename($tipo);

        $ruta = __DIR__ . '/../uploads/' . $tipo . '/' . $archivo;

        if (!file_exists($ruta)) {
            Response::error('Archivo no encontrado', 404);
        }

        $mimeTypes = [
            'jpg'  => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png'  => 'image/png',
            'webp' => 'image/webp',
        ];

        $extension = strtolower(pathinfo($archivo, PATHINFO_EXTENSION));
        $mime = $mimeTypes[$extension] ?? 'application/octet-stream';

        header('Content-Type: ' . $mime);
        header('Content-Length: ' . filesize($ruta));
        header('Cache-Control: public, max-age=86400');
        readfile($ruta);
        exit;
    }
}
