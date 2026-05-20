<?php
/**
 * Controlador de Rebaños — CRUD con conteo de animales
 */
require_once __DIR__ . '/../helpers/Database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Validator.php';

class RebanoController
{
    private function usuarioId(): int
    {
        return (int)AuthMiddleware::ejecutar()->sub;
    }

    /**
     * Lista rebaños con conteo de animales.
     * GET /api/rebanos
     */
    public function index(): void
    {
        $uid = $this->usuarioId();

        $rebanos = Database::query(
            'SELECT r.*, (SELECT COUNT(*) FROM animales a WHERE a.rebano_id = r.id AND a.activo = 1) as total_animales
             FROM rebanos r
             WHERE r.usuario_id = :uid AND r.activo = 1
             ORDER BY r.nombre',
            [':uid' => $uid]
        );

        Response::json($rebanos);
    }

    /**
     * Crea un rebaño.
     * POST /api/rebanos
     */
    public function store(): void
    {
        $uid = $this->usuarioId();
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];

        $validador = new Validator();
        if (!$validador->validar($datos, ['nombre' => 'requerido|max:100'])) {
            Response::error('Datos inválidos', 422, $validador->errores());
        }

        Database::execute(
            'INSERT INTO rebanos (nombre, usuario_id) VALUES (:nombre, :uid)',
            [':nombre' => $datos['nombre'], ':uid' => $uid]
        );

        $id = Database::lastInsertId();
        $this->show($id);
    }

    /**
     * Muestra un rebaño.
     * GET /api/rebanos/{id}
     */
    public function show(string $id): void
    {
        $uid = $this->usuarioId();

        $rebano = Database::queryOne(
            'SELECT r.*, (SELECT COUNT(*) FROM animales a WHERE a.rebano_id = r.id AND a.activo = 1) as total_animales
             FROM rebanos r WHERE r.id = :id AND r.usuario_id = :uid AND r.activo = 1',
            [':id' => (int)$id, ':uid' => $uid]
        );

        if (!$rebano) Response::error('Rebaño no encontrado', 404);
        Response::json($rebano);
    }

    /**
     * Actualiza un rebaño.
     * PUT /api/rebanos/{id}
     */
    public function update(string $id): void
    {
        $uid = $this->usuarioId();
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];

        $existente = Database::queryOne(
            'SELECT id FROM rebanos WHERE id = :id AND usuario_id = :uid AND activo = 1',
            [':id' => (int)$id, ':uid' => $uid]
        );
        if (!$existente) Response::error('Rebaño no encontrado', 404);

        Database::execute(
            'UPDATE rebanos SET nombre = :nombre WHERE id = :id',
            [':nombre' => $datos['nombre'] ?? '', ':id' => (int)$id]
        );

        $this->show($id);
    }

    /**
     * Elimina (soft delete) un rebaño.
     * DELETE /api/rebanos/{id}
     */
    public function destroy(string $id): void
    {
        $uid = $this->usuarioId();
        Database::execute(
            'UPDATE rebanos SET activo = 0 WHERE id = :id AND usuario_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        );
        Response::json(['mensaje' => 'Rebaño eliminado']);
    }

    /**
     * Lista animales de un rebaño.
     * GET /api/rebanos/{id}/animales
     */
    public function animales(string $id): void
    {
        $uid = $this->usuarioId();
        $animales = Database::query(
            'SELECT id, nombre, sexo, fecha_nacimiento, etapa, estado_reproductivo
             FROM animales WHERE rebano_id = :id AND usuario_id = :uid AND activo = 1
             ORDER BY nombre',
            [':id' => (int)$id, ':uid' => $uid]
        );
        Response::json($animales);
    }

    /**
     * Conteo de animales en un rebaño.
     * GET /api/rebanos/{id}/conteo
     */
    public function conteo(string $id): void
    {
        $uid = $this->usuarioId();
        $conteo = Database::queryOne(
            'SELECT COUNT(*) as total FROM animales WHERE rebano_id = :id AND usuario_id = :uid AND activo = 1',
            [':id' => (int)$id, ':uid' => $uid]
        );
        Response::json($conteo);
    }
}
