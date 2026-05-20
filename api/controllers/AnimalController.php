<?php
/**
 * Controlador de Animales — CRUD completo
 */
require_once __DIR__ . '/../helpers/Database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Validator.php';
require_once __DIR__ . '/../helpers/CalculadorEdad.php';
require_once __DIR__ . '/../helpers/FileUploader.php';

class AnimalController
{
    private function usuarioId(): int
    {
        return (int)AuthMiddleware::ejecutar()->sub;
    }

    /**
     * Lista animales con filtros y paginación.
     * GET /api/animales
     */
    public function index(): void
    {
        $uid = $this->usuarioId();
        $pagina = max(1, (int)($_GET['pagina'] ?? 1));
        $porPagina = min(50, max(1, (int)($_GET['por_pagina'] ?? ITEMS_POR_PAGINA)));
        $offset = ($pagina - 1) * $porPagina;

        $where = ['a.usuario_id = :uid', 'a.activo = 1'];
        $params = [':uid' => $uid];

        // Filtros opcionales
        if (!empty($_GET['sexo'])) {
            $where[] = 'a.sexo = :sexo';
            $params[':sexo'] = $_GET['sexo'];
        }
        if (!empty($_GET['rebano_id'])) {
            $where[] = 'a.rebano_id = :rebano_id';
            $params[':rebano_id'] = (int)$_GET['rebano_id'];
        }
        if (!empty($_GET['etapa'])) {
            $where[] = 'a.etapa = :etapa';
            $params[':etapa'] = $_GET['etapa'];
        }
        if (!empty($_GET['estado'])) {
            $where[] = 'a.estado_reproductivo = :estado';
            $params[':estado'] = $_GET['estado'];
        }
        if (!empty($_GET['search'])) {
            $where[] = 'a.nombre LIKE :search';
            $params[':search'] = '%' . $_GET['search'] . '%';
        }
        if (!empty($_GET['edad_min'])) {
            $where[] = 'TIMESTAMPDIFF(MONTH, a.fecha_nacimiento, CURDATE()) >= :edad_min';
            $params[':edad_min'] = (int)$_GET['edad_min'];
        }
        if (!empty($_GET['edad_max'])) {
            $where[] = 'TIMESTAMPDIFF(MONTH, a.fecha_nacimiento, CURDATE()) <= :edad_max';
            $params[':edad_max'] = (int)$_GET['edad_max'];
        }

        $whereClause = implode(' AND ', $where);

        // Total
        $total = Database::queryOne(
            "SELECT COUNT(*) as total FROM animales a WHERE $whereClause",
            $params
        )['total'];

        // Datos
        $animales = Database::query(
            "SELECT a.*, r.nombre as rebano_nombre,
                    m.nombre as madre_nombre,
                    p.nombre as padre_nombre
             FROM animales a
             LEFT JOIN rebanos r ON r.id = a.rebano_id
             LEFT JOIN animales m ON m.id = a.madre_id
             LEFT JOIN animales p ON p.id = a.padre_id
             WHERE $whereClause
             ORDER BY a.created_at DESC
             LIMIT $porPagina OFFSET $offset",
            $params
        );

        Response::paginar($animales, (int)$total, $pagina, $porPagina);
    }

    /**
     * Crea un nuevo animal.
     * POST /api/animales
     */
    public function store(): void
    {
        $uid = $this->usuarioId();
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];

        $validador = new Validator();
        if (!$validador->validar($datos, [
            'nombre'            => 'requerido|max:100',
            'sexo'              => 'requerido|enum:Macho,Hembra',
            'fecha_nacimiento'  => 'requerido|fecha',
            'rebano_id'         => 'requerido|numerico',
            'etapa'             => 'enum:Ternero,Novillo,Adulto',
            'estado_reproductivo' => 'enum:Vacia,Prenada,Lactando',
        ])) {
            Response::error('Datos inválidos', 422, $validador->errores());
        }

        // Validar que el rebaño pertenece al usuario
        $rebano = Database::queryOne(
            'SELECT id FROM rebanos WHERE id = :id AND usuario_id = :uid',
            [':id' => $datos['rebano_id'], ':uid' => $uid]
        );
        if (!$rebano) Response::error('Rebaño no encontrado', 404);

        // Si es hembra, estado reproductivo por defecto
        $estado = $datos['estado_reproductivo'] ?? null;
        if ($datos['sexo'] === 'Hembra' && empty($estado)) {
            $estado = 'Vacia';
        }
        if ($datos['sexo'] === 'Macho') $estado = null;

        Database::execute(
            'INSERT INTO animales (nombre, identificacion, sexo, fecha_nacimiento, rebano_id, madre_id, padre_id, etapa, estado_reproductivo, peso_entrada, precio_kg, usuario_id)
             VALUES (:nombre, :identificacion, :sexo, :fecha, :rebano, :madre, :padre, :etapa, :estado, :peso_entrada, :precio_kg, :uid)',
            [
                ':nombre'           => $datos['nombre'],
                ':identificacion'   => $datos['identificacion'] ?? null,
                ':sexo'             => $datos['sexo'],
                ':fecha'            => $datos['fecha_nacimiento'],
                ':rebano'           => $datos['rebano_id'],
                ':madre'            => $datos['madre_id'] ?: null,
                ':padre'            => $datos['padre_id'] ?: null,
                ':etapa'            => $datos['etapa'] ?? 'Ternero',
                ':estado'           => $estado,
                ':peso_entrada'     => isset($datos['peso_entrada']) ? (float)$datos['peso_entrada'] : null,
                ':precio_kg'        => isset($datos['precio_kg']) ? (float)$datos['precio_kg'] : null,
                ':uid'              => $uid,
            ]
        );

        $id = Database::lastInsertId();
        $this->show($id);
    }

    /**
     * Muestra un animal por ID.
     * GET /api/animales/{id}
     */
    public function show(string $id): void
    {
        $uid = $this->usuarioId();

        $animal = Database::queryOne(
            "SELECT a.*, r.nombre as rebano_nombre,
                    m.nombre as madre_nombre,
                    p.nombre as padre_nombre
             FROM animales a
             LEFT JOIN rebanos r ON r.id = a.rebano_id
             LEFT JOIN animales m ON m.id = a.madre_id
             LEFT JOIN animales p ON p.id = a.padre_id
             WHERE a.id = :id AND a.usuario_id = :uid AND a.activo = 1",
            [':id' => (int)$id, ':uid' => $uid]
        );

        if (!$animal) Response::error('Animal no encontrado', 404);

        $edad = CalculadorEdad::calcular($animal['fecha_nacimiento']);
        $animal['edad_anios'] = $edad['anios'];
        $animal['edad_meses'] = $edad['meses'];
        $animal['edad_total_meses'] = $edad['total_meses'];

        Response::json($animal);
    }

    /**
     * Actualiza un animal.
     * PUT /api/animales/{id}
     */
    public function update(string $id): void
    {
        $uid = $this->usuarioId();
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];

        $existente = Database::queryOne(
            'SELECT * FROM animales WHERE id = :id AND usuario_id = :uid AND activo = 1',
            [':id' => (int)$id, ':uid' => $uid]
        );
        if (!$existente) Response::error('Animal no encontrado', 404);

        $campos = [];
        $params = [':id' => (int)$id];

        foreach (['nombre', 'identificacion', 'sexo', 'fecha_nacimiento', 'rebano_id', 'madre_id', 'padre_id', 'etapa', 'estado_reproductivo', 'foto', 'peso_entrada', 'precio_kg'] as $campo) {
            if (isset($datos[$campo])) {
                $campos[] = "$campo = :$campo";
                $params[":$campo"] = $datos[$campo];
            }
        }

        if (empty($campos)) Response::error('No hay datos para actualizar', 422);

        Database::execute(
            'UPDATE animales SET ' . implode(', ', $campos) . ' WHERE id = :id',
            $params
        );

        $this->show($id);
    }

    /**
     * Elimina (soft delete) un animal.
     * DELETE /api/animales/{id}
     */
    public function destroy(string $id): void
    {
        $uid = $this->usuarioId();

        Database::execute(
            'UPDATE animales SET activo = 0 WHERE id = :id AND usuario_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        );

        Response::json(['mensaje' => 'Animal eliminado']);
    }

    /**
     * Historial de celo de un animal.
     * GET /api/animales/{id}/celos
     */
    public function celos(string $id): void
    {
        $uid = $this->usuarioId();
        $celos = Database::query(
            'SELECT cc.* FROM ciclos_celo cc
             JOIN animales a ON a.id = cc.animal_id
             WHERE cc.animal_id = :id AND a.usuario_id = :uid
             ORDER BY cc.fecha_inicio DESC',
            [':id' => (int)$id, ':uid' => $uid]
        );
        Response::json($celos);
    }

    /**
     * Historial de vacunas de un animal.
     * GET /api/animales/{id}/vacunas
     */
    public function vacunas(string $id): void
    {
        $uid = $this->usuarioId();
        $vacunas = Database::query(
            'SELECT v.id, v.fecha, v.observaciones, m.nombre as medicamento_nombre, va.dosis_aplicada
             FROM vacunacion_animales va
             JOIN vacunaciones v ON v.id = va.vacunacion_id
             JOIN medicamentos m ON m.id = v.medicamento_id
             JOIN animales a ON a.id = va.animal_id
             WHERE va.animal_id = :id AND a.usuario_id = :uid
             ORDER BY v.fecha DESC',
            [':id' => (int)$id, ':uid' => $uid]
        );
        Response::json($vacunas);
    }
}
