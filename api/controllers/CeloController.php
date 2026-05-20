<?php
/**
 * Controlador de Ciclos de Celo
 */
require_once __DIR__ . '/../helpers/Database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Validator.php';
require_once __DIR__ . '/../helpers/CalculadorEdad.php';

class CeloController
{
    private function usuarioId(): int
    {
        return (int)AuthMiddleware::ejecutar()->sub;
    }

    /**
     * Lista ciclos de celo.
     * GET /api/celos
     */
    public function index(): void
    {
        $uid = $this->usuarioId();
        $celos = Database::query(
            'SELECT cc.*, a.nombre as animal_nombre
             FROM ciclos_celo cc
             JOIN animales a ON a.id = cc.animal_id
             WHERE cc.usuario_id = :uid
             ORDER BY cc.fecha_inicio DESC',
            [':uid' => $uid]
        );
        Response::json($celos);
    }

    /**
     * Registra un nuevo ciclo de celo.
     * POST /api/celos
     */
    public function store(): void
    {
        $uid = $this->usuarioId();
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];

        $validador = new Validator();
        if (!$validador->validar($datos, [
            'animal_id'   => 'requerido|numerico',
            'fecha_inicio' => 'requerido|fecha',
        ])) {
            Response::error('Datos inválidos', 422, $validador->errores());
        }

        // Validar que el animal existe y es del usuario
        $animal = Database::queryOne(
            'SELECT id, sexo, estado_reproductivo FROM animales WHERE id = :id AND usuario_id = :uid AND activo = 1',
            [':id' => (int)$datos['animal_id'], ':uid' => $uid]
        );
        if (!$animal) Response::error('Animal no encontrado', 404);
        if ($animal['sexo'] !== 'Hembra') Response::error('Solo se puede registrar celo en hembras', 422);

        $fechaPosibleServicio = CalculadorEdad::proximoCelo($datos['fecha_inicio']);

        Database::execute(
            'INSERT INTO ciclos_celo (animal_id, fecha_inicio, servicio_realizado, fecha_posible_servicio, observaciones, usuario_id)
             VALUES (:animal, :fecha, :servicio, :proxima, :obs, :uid)',
            [
                ':animal'   => (int)$datos['animal_id'],
                ':fecha'    => $datos['fecha_inicio'],
                ':servicio' => !empty($datos['servicio_realizado']) ? 1 : 0,
                ':proxima'  => $fechaPosibleServicio,
                ':obs'      => $datos['observaciones'] ?? null,
                ':uid'      => $uid,
            ]
        );

        // Actualizar estado reproductivo si se realizó servicio
        if (!empty($datos['servicio_realizado'])) {
            Database::execute(
                'UPDATE animales SET estado_reproductivo = :estado WHERE id = :id',
                [':estado' => 'Prenada', ':id' => (int)$datos['animal_id']]
            );
        }

        $id = Database::lastInsertId();
        $this->show($id);
    }

    /**
     * Muestra un ciclo de celo.
     * GET /api/celos/{id}
     */
    public function show(string $id): void
    {
        $uid = $this->usuarioId();
        $celo = Database::queryOne(
            'SELECT cc.*, a.nombre as animal_nombre
             FROM ciclos_celo cc
             JOIN animales a ON a.id = cc.animal_id
             WHERE cc.id = :id AND cc.usuario_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        );
        if (!$celo) Response::error('Registro no encontrado', 404);
        Response::json($celo);
    }

    /**
     * Actualiza un ciclo de celo.
     * PUT /api/celos/{id}
     */
    public function update(string $id): void
    {
        $uid = $this->usuarioId();
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];

        $existente = Database::queryOne(
            'SELECT id, animal_id FROM ciclos_celo WHERE id = :id AND usuario_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        );
        if (!$existente) Response::error('Registro no encontrado', 404);

        $campos = [];
        $params = [':id' => (int)$id];
        foreach (['fecha_inicio', 'fecha_fin', 'servicio_realizado', 'observaciones', 'fecha_posible_servicio'] as $c) {
            if (isset($datos[$c])) {
                $campos[] = "$c = :$c";
                $params[":$c"] = $datos[$c];
            }
        }

        if (!empty($campos)) {
            Database::execute(
                'UPDATE ciclos_celo SET ' . implode(', ', $campos) . ' WHERE id = :id',
                $params
            );
        }

        // Si marcó servicio, actualizar estado del animal
        if (!empty($datos['servicio_realizado'])) {
            Database::execute(
                'UPDATE animales SET estado_reproductivo = \'Prenada\' WHERE id = :id',
                [':id' => $existente['animal_id']]
            );
        }

        $this->show($id);
    }

    /**
     * Elimina un ciclo de celo.
     * DELETE /api/celos/{id}
     */
    public function destroy(string $id): void
    {
        $uid = $this->usuarioId();
        Database::execute(
            'DELETE FROM ciclos_celo WHERE id = :id AND usuario_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        );
        Response::json(['mensaje' => 'Registro eliminado']);
    }

    /**
     * Ciclos de celo activos.
     * GET /api/celos/activos
     */
    public function activos(): void
    {
        $uid = $this->usuarioId();
        $activos = Database::query(
            'SELECT cc.*, a.nombre as animal_nombre
             FROM ciclos_celo cc
             JOIN animales a ON a.id = cc.animal_id
             WHERE cc.usuario_id = :uid AND cc.fecha_fin IS NULL AND cc.servicio_realizado = 0
             ORDER BY cc.fecha_inicio DESC',
            [':uid' => $uid]
        );
        Response::json($activos);
    }

    /**
     * Próximos servicios (celo estimado).
     * GET /api/celos/proximos
     */
    public function proximos(): void
    {
        $uid = $this->usuarioId();
        $proximos = Database::query(
            'SELECT cc.*, a.nombre as animal_nombre
             FROM ciclos_celo cc
             JOIN animales a ON a.id = cc.animal_id
             WHERE cc.usuario_id = :uid
               AND cc.fecha_posible_servicio IS NOT NULL
               AND cc.fecha_posible_servicio >= CURDATE()
               AND a.activo = 1
             ORDER BY cc.fecha_posible_servicio ASC',
            [':uid' => $uid]
        );
        Response::json($proximos);
    }
}
