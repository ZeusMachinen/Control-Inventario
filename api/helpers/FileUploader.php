<?php
/**
 * Helper para subida de archivos (fotos de animales)
 */
class FileUploader
{
    private array $formatosPermitidos = ['jpg', 'jpeg', 'png', 'webp'];
    private int $tamanoMaximo;

    public function __construct()
    {
        $this->tamanoMaximo = defined('UPLOAD_MAX_SIZE') ? UPLOAD_MAX_SIZE : 5 * 1024 * 1024;
    }

    /**
     * Sube un archivo al directorio de destino.
     * @param array $archivo Elemento de $_FILES
     * @return string Ruta relativa del archivo guardado
     * @throws Exception
     */
    public function subir(array $archivo): string
    {
        $this->validar($archivo);

        $directorio = defined('UPLOAD_PATH') ? UPLOAD_PATH : __DIR__ . '/../uploads/fotos/animales/';

        if (!is_dir($directorio)) {
            mkdir($directorio, 0755, true);
        }

        $extension = strtolower(pathinfo($archivo['name'], PATHINFO_EXTENSION));
        $nombre = $this->generarNombre($extension);
        $rutaDestino = $directorio . $nombre;

        if (!move_uploaded_file($archivo['tmp_name'], $rutaDestino)) {
            throw new \RuntimeException('Error al guardar el archivo');
        }

        return 'uploads/fotos/animales/' . $nombre;
    }

    /**
     * Elimina un archivo del sistema.
     */
    public function eliminar(string $ruta): bool
    {
        $rutaCompleta = __DIR__ . '/../' . $ruta;
        if (file_exists($rutaCompleta)) {
            return unlink($rutaCompleta);
        }
        return false;
    }

    /**
     * Valida que el archivo cumpla con los requisitos.
     * @throws \InvalidArgumentException
     */
    private function validar(array $archivo): void
    {
        if (!isset($archivo['tmp_name']) || !is_uploaded_file($archivo['tmp_name'])) {
            throw new \InvalidArgumentException('No se recibió un archivo válido');
        }

        if ($archivo['error'] !== UPLOAD_ERR_OK) {
            $mensajes = [
                UPLOAD_ERR_INI_SIZE   => 'El archivo excede el tamaño máximo permitido',
                UPLOAD_ERR_FORM_SIZE  => 'El archivo excede el tamaño máximo del formulario',
                UPLOAD_ERR_PARTIAL    => 'El archivo se subió parcialmente',
                UPLOAD_ERR_NO_FILE    => 'No se subió ningún archivo',
            ];
            throw new \InvalidArgumentException($mensajes[$archivo['error']] ?? 'Error desconocido al subir archivo');
        }

        if ($archivo['size'] > $this->tamanoMaximo) {
            throw new \InvalidArgumentException('El archivo excede el tamaño máximo de ' . ($this->tamanoMaximo / 1024 / 1024) . ' MB');
        }

        // Validar MIME type real con finfo
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $archivo['tmp_name']);
        finfo_close($finfo);

        $mimesPermitidos = [
            'image/jpeg',
            'image/png',
            'image/webp',
        ];

        if (!in_array($mimeType, $mimesPermitidos, true)) {
            throw new \InvalidArgumentException('Tipo de archivo no permitido. Solo JPG, PNG y WebP');
        }
    }

    /**
     * Genera un nombre único para el archivo.
     */
    private function generarNombre(string $extension): string
    {
        return time() . '_' . bin2hex(random_bytes(8)) . '.' . $extension;
    }
}
