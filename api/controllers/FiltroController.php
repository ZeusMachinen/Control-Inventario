<?php
/**
 * Controlador de Filtros Guardados
 */
require_once __DIR__ . '/../helpers/Database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Validator.php';

class FiltroController
{
    private function usuarioId(): int
    {
        return (int)AuthMiddleware::ejecutar()->sub;
    }

    /**
     * Lista filtros guardados del usuario.
     * GET /api/filtros
     */
    public function index(): void
    {
        $uid = $this->usuarioId();
        $filtros = Database::query(
            'SELECT * FROM filtros_guardados WHERE usuario_id = :uid ORDER BY nombre',
            [':uid' => $uid]
        );
        Response::json($filtros);
    }

    /**
     * Guarda un nuevo filtro.
     * POST /api/filtros
     */
    public function store(): void
    {
        $uid = $this->usuarioId();
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];

        $validador = new Validator();
        if (!$validador->validar($datos, [
            'nombre' => 'requerido|max:100',
            'datos_filtro' => 'requerido',
        ])) {
            Response::error('Datos inválidos', 422, $validador->errores());
        }

        $datosFiltro = is_string($datos['datos_filtro'])
            ? $datos['datos_filtro']
            : json_encode($datos['datos_filtro'], JSON_UNESCAPED_UNICODE);

        Database::execute(
            'INSERT INTO filtros_guardados (nombre, modulo, usuario_id, datos_filtro)
             VALUES (:nombre, :modulo, :uid, :datos)',
            [
                ':nombre' => $datos['nombre'],
                ':modulo' => $datos['modulo'] ?? 'animales',
                ':uid'    => $uid,
                ':datos'  => $datosFiltro,
            ]
        );

        $id = Database::lastInsertId();
        $this->show($id);
    }

    /**
     * Muestra un filtro.
     * GET /api/filtros/{id}
     */
    public function show(string $id): void
    {
        $uid = $this->usuarioId();
        $filtro = Database::queryOne(
            'SELECT * FROM filtros_guardados WHERE id = :id AND usuario_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        );
        if (!$filtro) Response::error('Filtro no encontrado', 404);
        Response::json($filtro);
    }

    /**
     * Actualiza un filtro.
     * PUT /api/filtros/{id}
     */
    public function update(string $id): void
    {
        $uid = $this->usuarioId();
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];

        $existente = Database::queryOne(
            'SELECT id FROM filtros_guardados WHERE id = :id AND usuario_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        );
        if (!$existente) Response::error('Filtro no encontrado', 404);

        $datosFiltro = isset($datos['datos_filtro'])
            ? (is_string($datos['datos_filtro']) ? $datos['datos_filtro'] : json_encode($datos['datos_filtro'], JSON_UNESCAPED_UNICODE))
            : null;

        $sql = 'UPDATE filtros_guardados SET nombre = :nombre';
        $params = [':nombre' => $datos['nombre'] ?? '', ':id' => (int)$id];
        if ($datosFiltro) {
            $sql .= ', datos_filtro = :datos';
            $params[':datos'] = $datosFiltro;
        }
        $sql .= ' WHERE id = :id';
        Database::execute($sql, $params);

        $this->show($id);
    }

    /**
     * Elimina un filtro.
     * DELETE /api/filtros/{id}
     */
    public function destroy(string $id): void
    {
        $uid = $this->usuarioId();
        Database::execute(
            'DELETE FROM filtros_guardados WHERE id = :id AND usuario_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        );
        Response::json(['mensaje' => 'Filtro eliminado']);
    }
}
