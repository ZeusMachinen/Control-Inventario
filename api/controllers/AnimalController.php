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
            'estado_reproductivo' => 'enum:Vacia,Prenada,Lactando,Padrote,Ceba',
        ])) {
            Response::error('Datos inválidos', 422, $validador->errores());
        }

        // Validar que el rebaño pertenece al usuario
        $rebano = Database::queryOne(
            'SELECT id FROM rebanos WHERE id = :id AND usuario_id = :uid',
            [':id' => $datos['rebano_id'], ':uid' => $uid]
        );
        if (!$rebano) Response::error('Rebaño no encontrado', 404);

        // Estado reproductivo según sexo
        $estado = $datos['estado_reproductivo'] ?? null;
        if ($datos['sexo'] === 'Hembra' && empty($estado)) {
            $estado = 'Vacia';
        }

        // Calcular etapa automáticamente desde la fecha de nacimiento
        $edad = CalculadorEdad::calcular($datos['fecha_nacimiento']);
        $etapaCalculada = CalculadorEdad::determinarEtapa($edad['total_meses']);

        Database::execute(
            'INSERT INTO animales (nombre, identificacion, sexo, fecha_nacimiento, rebano_id, madre_id, padre_id, etapa, estado_reproductivo, peso_entrada, precio_kg, usuario_id)
             VALUES (:nombre, :identificacion, :sexo, :fecha, :rebano, :madre, :padre, :etapa, :estado, :peso_entrada, :precio_kg, :uid)',
            [
                ':nombre'           => $datos['nombre'],
                ':identificacion'   => $datos['identificacion'] ?? null,
                ':sexo'             => $datos['sexo'],
                ':fecha'            => $datos['fecha_nacimiento'],
                ':rebano'           => $datos['rebano_id'],
                ':madre'            => !empty($datos['madre_id']) ? (int)$datos['madre_id'] : null,
                ':padre'            => !empty($datos['padre_id']) ? (int)$datos['padre_id'] : null,
                ':etapa'            => $etapaCalculada,
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
             WHERE a.id = :id AND a.usuario_id = :uid",
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

        // Etapa siempre se recalcula desde fecha_nacimiento, nunca se acepta del request
        if (isset($datos['fecha_nacimiento'])) {
            $edad = CalculadorEdad::calcular($datos['fecha_nacimiento']);
            $campos[] = 'etapa = :etapa';
            $params[':etapa'] = CalculadorEdad::determinarEtapa($edad['total_meses']);
        }

        foreach (['nombre', 'identificacion', 'sexo', 'fecha_nacimiento', 'rebano_id', 'madre_id', 'padre_id', 'estado_reproductivo', 'foto', 'peso_entrada', 'precio_kg'] as $campo) {
            if (isset($datos[$campo])) {
                $campos[] = "$campo = :$campo";
                $params[":$campo"] = $datos[$campo];
            }
        }

        if (empty($campos)) Response::error('No hay datos para actualizar', 422);

        // Detectar cambio de rebaño para loguear movimiento
        $rebanoNuevo = $datos['rebano_id'] ?? null;
        if ($rebanoNuevo && (int)$rebanoNuevo !== (int)$existente['rebano_id']) {
            $rebanoOrigen = (int)$existente['rebano_id'];
        } else {
            $rebanoOrigen = null;
        }

        Database::execute(
            'UPDATE animales SET ' . implode(', ', $campos) . ' WHERE id = :id',
            $params
        );

        // Loguear movimiento si cambió de rebaño
        if ($rebanoOrigen) {
            Database::execute(
                'INSERT INTO movimientos_rebano (animal_id, rebano_origen_id, rebano_destino_id, usuario_id)
                 VALUES (:animal, :origen, :destino, :uid)',
                [
                    ':animal' => (int)$id,
                    ':origen' => $rebanoOrigen,
                    ':destino' => (int)$rebanoNuevo,
                    ':uid' => $uid,
                ]
            );
        }

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
     * Da de baja un animal (Vendido/Muerto).
     * POST /api/animales/{id}/baja
     */
    public function baja(string $id): void
    {
        $uid = $this->usuarioId();
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];

        $existente = Database::queryOne(
            'SELECT id FROM animales WHERE id = :id AND usuario_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        );
        if (!$existente) Response::error('Animal no encontrado', 404);

        $estado = $datos['estado_general'] ?? null;
        if (!in_array($estado, ['Vendido', 'Muerto'])) {
            Response::error('Estado inválido. Use Vendido o Muerto', 422);
        }

        Database::execute(
            'UPDATE animales SET estado_general = :estado, activo = 0, fecha_salida = :fecha, motivo_salida = :motivo, peso_salida = :peso WHERE id = :id',
            [
                ':estado' => $estado,
                ':fecha' => $datos['fecha_salida'] ?? date('Y-m-d'),
                ':motivo' => $datos['motivo_salida'] ?? null,
                ':peso' => $datos['peso_salida'] ?? null,
                ':id' => (int)$id,
            ]
        );

        // Si es venta, registrar también en ventas si se envió precio
        if ($estado === 'Vendido' && !empty($datos['precio_venta'])) {
            Database::execute(
                'INSERT INTO ventas (animal_id, vendedor_id, comprador_nombre, precio, fecha, tipo)
                 VALUES (:animal, :vendedor, :comprador, :precio, :fecha, :tipo)',
                [
                    ':animal' => (int)$id,
                    ':vendedor' => $uid,
                    ':comprador' => $datos['comprador'] ?? 'Sin especificar',
                    ':precio' => $datos['precio_venta'],
                    ':fecha' => $datos['fecha_salida'] ?? date('Y-m-d'),
                    ':tipo' => 'Venta',
                ]
            );
        }

        Response::json(['mensaje' => "Animal marcado como $estado"]);
    }

    /**
     * Lista animales inactivos (vendidos/muertos) — Historial.
     * GET /api/animales/historial
     */
    public function historial(): void
    {
        $uid = $this->usuarioId();
        $pagina = max(1, (int)($_GET['pagina'] ?? 1));
        $porPagina = min(50, max(1, (int)($_GET['por_pagina'] ?? ITEMS_POR_PAGINA)));
        $offset = ($pagina - 1) * $porPagina;

        $where = ['a.usuario_id = :uid', "a.estado_general IN ('Vendido','Muerto')"];
        $params = [':uid' => $uid];

        $whereClause = implode(' AND ', $where);

        $total = Database::queryOne(
            "SELECT COUNT(*) as total FROM animales a WHERE $whereClause",
            $params
        )['total'];

        $animales = Database::query(
            "SELECT a.*, r.nombre as rebano_nombre,
                    rn.nombre as rebano_nacimiento_nombre
             FROM animales a
             LEFT JOIN rebanos r ON r.id = a.rebano_id
             LEFT JOIN rebanos rn ON rn.id = a.rebano_nacimiento_id
             WHERE $whereClause
             ORDER BY a.fecha_salida DESC
             LIMIT $porPagina OFFSET $offset",
            $params
        );

        Response::paginar($animales, (int)$total, $pagina, $porPagina);
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
     * Historial de movimientos de rebaño de un animal.
     * GET /api/animales/{id}/movimientos
     */
    public function movimientos(string $id): void
    {
        $uid = $this->usuarioId();
        $movimientos = Database::query(
            'SELECT m.id, r_o.nombre as rebano_origen, r_d.nombre as rebano_destino, m.created_at
             FROM movimientos_rebano m
             LEFT JOIN rebanos r_o ON r_o.id = m.rebano_origen_id
             JOIN rebanos r_d ON r_d.id = m.rebano_destino_id
             JOIN animales a ON a.id = m.animal_id
             WHERE m.animal_id = :id AND a.usuario_id = :uid
             ORDER BY m.created_at DESC',
            [':id' => (int)$id, ':uid' => $uid]
        );
        Response::json($movimientos);
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
