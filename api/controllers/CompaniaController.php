<?php
/**
 * Controlador de Compañías (sociedades entre usuarios)
 */
require_once __DIR__ . '/../helpers/Database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Validator.php';

class CompaniaController
{
    private function usuarioId(): int
    {
        return (int)AuthMiddleware::ejecutar()->sub;
    }

    /**
     * Lista compañías donde el usuario es socio o creador.
     * GET /api/companias
     */
    public function index(): void
    {
        $uid = $this->usuarioId();
        $companias = Database::query(
            'SELECT c.*, a.nombre as animal_nombre,
                    u.nombre as creador_nombre,
                    s.nombre as socio_nombre
             FROM companias c
             JOIN animales a ON a.id = c.animal_id
             JOIN usuarios u ON u.id = c.usuario_id
             JOIN usuarios s ON s.id = c.socio_id
             WHERE c.usuario_id = :uid OR c.socio_id = :uid2
             ORDER BY c.created_at DESC',
            [':uid' => $uid, ':uid2' => $uid]
        );

        // Calcular ganancia estimada para cada una
        foreach ($companias as &$c) {
            $c['ganancia_creador'] = 0;
            $c['ganancia_socio'] = 0;
            if ($c['estado'] === 'Finalizada' && $c['precio_venta']) {
                $totalGanancia = (float)$c['precio_venta'] - (float)($c['gastos'] ?? 0);
                $porcentajeSocio = (float)($c['porcentaje_socio'] ?? 50);
                $c['ganancia_socio'] = round($totalGanancia * ($porcentajeSocio / 100), 2);
                $c['ganancia_creador'] = round($totalGanancia - $c['ganancia_socio'], 2);
            }
        }

        Response::json($companias);
    }

    /**
     * Crea una nueva compañía.
     * POST /api/companias
     */
    public function store(): void
    {
        $uid = $this->usuarioId();
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];

        $validador = new Validator();
        if (!$validador->validar($datos, [
            'animal_id'     => 'requerido|numerico',
            'socio_id'      => 'requerido|numerico',
            'peso_entrada'  => 'requerido|numerico',
            'fecha_entrada' => 'requerido|fecha',
        ])) {
            Response::error('Datos inválidos', 422, $validador->errores());
        }

        // Validar que el animal existe
        $animal = Database::queryOne(
            'SELECT id, nombre FROM animales WHERE id = :id AND activo = 1',
            [':id' => (int)$datos['animal_id']]
        );
        if (!$animal) Response::error('Animal no encontrado', 404);

        // Validar que el socio existe y no es el mismo usuario
        if ((int)$datos['socio_id'] === $uid) {
            Response::error('No puedes crear una compañía contigo mismo', 422);
        }
        $socio = Database::queryOne(
            'SELECT id, nombre FROM usuarios WHERE id = :id AND activo = 1',
            [':id' => (int)$datos['socio_id']]
        );
        if (!$socio) Response::error('Socio no encontrado', 404);

        Database::execute(
            'INSERT INTO companias (animal_id, socio_id, usuario_id, peso_entrada, fecha_entrada, porcentaje_socio, estado)
             VALUES (:animal, :socio, :uid, :peso, :fecha, :porcentaje, \'Activa\')',
            [
                ':animal'     => (int)$datos['animal_id'],
                ':socio'      => (int)$datos['socio_id'],
                ':uid'        => $uid,
                ':peso'       => (float)$datos['peso_entrada'],
                ':fecha'      => $datos['fecha_entrada'],
                ':porcentaje' => (float)($datos['porcentaje_socio'] ?? 50),
            ]
        );

        $id = Database::lastInsertId();
        $this->show($id);
    }

    /**
     * Muestra una compañía.
     * GET /api/companias/{id}
     */
    public function show(string $id): void
    {
        $uid = $this->usuarioId();
        $c = Database::queryOne(
            'SELECT c.*, a.nombre as animal_nombre, u.nombre as creador_nombre, s.nombre as socio_nombre
             FROM companias c
             JOIN animales a ON a.id = c.animal_id
             JOIN usuarios u ON u.id = c.usuario_id
             JOIN usuarios s ON s.id = c.socio_id
             WHERE c.id = :id AND (c.usuario_id = :uid OR c.socio_id = :uid2)',
            [':id' => (int)$id, ':uid' => $uid, ':uid2' => $uid]
        );
        if (!$c) Response::error('Compañía no encontrada', 404);

        // Calcular ganancias
        $c['ganancia_creador'] = 0;
        $c['ganancia_socio'] = 0;
        if ($c['estado'] === 'Finalizada' && $c['precio_venta']) {
            $totalGanancia = (float)$c['precio_venta'] - (float)($c['gastos'] ?? 0);
            $porcentajeSocio = (float)($c['porcentaje_socio'] ?? 50);
            $c['ganancia_socio'] = round($totalGanancia * ($porcentajeSocio / 100), 2);
            $c['ganancia_creador'] = round($totalGanancia - $c['ganancia_socio'], 2);
        }

        Response::json($c);
    }

    /**
     * Actualiza una compañía (ej. finalizar con datos de venta).
     * PUT /api/companias/{id}
     */
    public function update(string $id): void
    {
        $uid = $this->usuarioId();
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];

        $existente = Database::queryOne(
            'SELECT id FROM companias WHERE id = :id AND usuario_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        );
        if (!$existente) Response::error('Compañía no encontrada', 404);

        $campos = [];
        $params = [':id' => (int)$id];
        foreach (['peso_salida', 'fecha_salida', 'precio_venta', 'gastos', 'porcentaje_socio', 'estado'] as $c) {
            if (isset($datos[$c])) {
                $campos[] = "$c = :$c";
                $params[":$c"] = $datos[$c];
            }
        }
        if (empty($campos)) Response::error('No hay datos', 422);

        Database::execute(
            'UPDATE companias SET ' . implode(', ', $campos) . ' WHERE id = :id',
            $params
        );

        $this->show($id);
    }

    /**
     * Elimina una compañía.
     * DELETE /api/companias/{id}
     */
    public function destroy(string $id): void
    {
        $uid = $this->usuarioId();
        Database::execute(
            'DELETE FROM companias WHERE id = :id AND usuario_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        );
        Response::json(['mensaje' => 'Compañía eliminada']);
    }
}
