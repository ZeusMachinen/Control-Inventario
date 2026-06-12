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

        // Precio final y cálculo automático de precio/kg
        $precioFinal = isset($datos['precio_final']) ? (float)$datos['precio_final'] : null;
        $precioKg = isset($datos['precio_kg']) ? (float)$datos['precio_kg'] : null;

        // Si no mandaron precio_kg pero sí precio_final y peso_entrada, calcularlo
        if ($precioKg === null && $precioFinal !== null && !empty($datos['peso_entrada'])) {
            $peso = (float)$datos['peso_entrada'];
            if ($peso > 0) {
                $precioKg = round($precioFinal / $peso, 2);
            }
        }

        Database::execute(
            'INSERT INTO animales (nombre, identificacion, sexo, fecha_nacimiento, rebano_id, madre_id, padre_id, etapa, estado_reproductivo, peso_entrada, precio_kg, precio_final, usuario_id)
             VALUES (:nombre, :identificacion, :sexo, :fecha, :rebano, :madre, :padre, :etapa, :estado, :peso_entrada, :precio_kg, :precio_final, :uid)',
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
                ':precio_kg'        => $precioKg,
                ':precio_final'     => $precioFinal,
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

        // Auto-calcular precio_kg si mandaron precio_final + peso_entrada y no precio_kg explícito
        if (!isset($datos['precio_kg']) && isset($datos['precio_final']) && !empty($datos['peso_entrada'])) {
            $peso = (float)$datos['peso_entrada'];
            if ($peso > 0) {
                $datos['precio_kg'] = round((float)$datos['precio_final'] / $peso, 2);
            }
        }

        foreach (['nombre', 'identificacion', 'sexo', 'fecha_nacimiento', 'rebano_id', 'madre_id', 'padre_id', 'estado_reproductivo', 'foto', 'peso_entrada', 'precio_kg', 'precio_final'] as $campo) {
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
            'UPDATE animales SET activo = 0, estado_general = \'Muerto\' WHERE id = :id AND usuario_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        );

        Response::json(['mensaje' => 'Animal eliminado']);
    }

    /**
     * Elimina (soft delete) múltiples animales en bloque.
     * POST /api/animales/eliminar-multiples
     */
    public function destroyMultiple(): void
    {
        $uid = $this->usuarioId();
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];

        $ids = $datos['animal_ids'] ?? [];
        if (empty($ids) || !is_array($ids)) {
            Response::error('Debe enviar al menos un animal', 422);
        }

        // Sanitizar
        $ids = array_map('intval', $ids);
        $ids = array_unique($ids);

        // Build placeholders seguros
        $placeholders = [];
        $params = [':uid' => $uid];
        foreach ($ids as $i => $id) {
            $key = ":id{$i}";
            $placeholders[] = $key;
            $params[$key] = $id;
        }
        $placeholdersStr = implode(',', $placeholders);

        Database::execute(
            "UPDATE animales SET activo = 0, estado_general = 'Muerto'
             WHERE id IN ({$placeholdersStr}) AND usuario_id = :uid",
            $params
        );

        Response::json(['mensaje' => count($ids) . ' animales eliminados']);
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

        // Filtro por nombre (buscador)
        if (!empty($_GET['search'])) {
            $where[] = 'a.nombre LIKE :search';
            $params[':search'] = '%' . $_GET['search'] . '%';
        }

        // Filtro por estado (Todos / Vendido / Muerto)
        if (!empty($_GET['estado'])) {
            $where[] = 'a.estado_general = :estado';
            $params[':estado'] = $_GET['estado'];
        }

        // Filtro por período (fecha_salida)
        if (!empty($_GET['fecha_desde'])) {
            $where[] = 'a.fecha_salida >= :fecha_desde';
            $params[':fecha_desde'] = $_GET['fecha_desde'];
        }
        if (!empty($_GET['fecha_hasta'])) {
            $where[] = 'a.fecha_salida <= :fecha_hasta';
            $params[':fecha_hasta'] = $_GET['fecha_hasta'];
        }

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

        // Contadores para los stats (sin paginación)
        $counters = [];
        $counters['total'] = (int)Database::queryOne(
            "SELECT COUNT(*) as total FROM animales a WHERE a.usuario_id = :uid AND a.estado_general IN ('Vendido','Muerto')",
            [':uid' => $uid]
        )['total'];
        $counters['vendidos'] = (int)Database::queryOne(
            "SELECT COUNT(*) as total FROM animales a WHERE a.usuario_id = :uid AND a.estado_general = 'Vendido'",
            [':uid' => $uid]
        )['total'];
        $counters['muertos'] = (int)Database::queryOne(
            "SELECT COUNT(*) as total FROM animales a WHERE a.usuario_id = :uid AND a.estado_general = 'Muerto'",
            [':uid' => $uid]
        )['total'];

        echo json_encode([
            'ok'         => true,
            'data'       => $animales,
            'total'      => (int)$total,
            'pagina'     => $pagina,
            'por_pagina' => $porPagina,
            'counters'   => $counters,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    /**
     * Historial de eventos reproductivos de un animal.
     * Retorna datos de las 4 tablas nuevas (diagnosticos_celo, servicios,
     * diagnosticos_gestacion, partos) en un array unificado.
     * GET /api/animales/{id}/celos
     */
    public function celos(string $id): void
    {
        $uid = $this->usuarioId();
        $animalId = (int)$id;

        $eventos = [];

        // Diagnósticos de celo
        $celos = Database::query(
            'SELECT id, animal_id, fecha_inicio as fecha, \'diagnostico_celo\' as tipo,
                    sintomas, comportamiento, observaciones, created_at
             FROM diagnosticos_celo WHERE animal_id = :id AND usuario_id = :uid
             ORDER BY fecha_inicio DESC',
            [':id' => $animalId, ':uid' => $uid]
        );
        foreach ($celos as $c) $eventos[] = $c;

        // Servicios
        $servicios = Database::query(
            'SELECT id, animal_id, fecha, \'servicio\' as tipo,
                    tipo as subtipo, reproductor_nombre, observaciones, created_at
             FROM servicios WHERE animal_id = :id AND usuario_id = :uid
             ORDER BY fecha DESC',
            [':id' => $animalId, ':uid' => $uid]
        );
        foreach ($servicios as $s) $eventos[] = $s;

        // Diagnósticos de gestación
        $diagnosticos = Database::query(
            'SELECT id, animal_id, fecha, \'diagnostico_gestacion\' as tipo,
                    metodo as subtipo, resultado, observaciones, created_at
             FROM diagnosticos_gestacion WHERE animal_id = :id AND usuario_id = :uid
             ORDER BY fecha DESC',
            [':id' => $animalId, ':uid' => $uid]
        );
        foreach ($diagnosticos as $d) $eventos[] = $d;

        // Partos
        $partos = Database::query(
            'SELECT id, animal_id, fecha, \'parto\' as tipo,
                    crias, observaciones, created_at
             FROM partos WHERE animal_id = :id AND usuario_id = :uid
             ORDER BY fecha DESC',
            [':id' => $animalId, ':uid' => $uid]
        );
        foreach ($partos as $p) $eventos[] = $p;

        Response::json($eventos);
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

    /**
     * Hijos de un animal (crías donde madre_id = :id o padre_id = :id).
     * GET /api/animales/{id}/hijos
     */
    public function hijos(string $id): void
    {
        $uid = $this->usuarioId();
        $animalId = (int)$id;
        $hijos = Database::query(
            'SELECT a.id, a.nombre, a.sexo, a.fecha_nacimiento, a.etapa, a.estado_reproductivo,
                    a.estado_general, a.foto, a.peso_entrada,
                    r.nombre as rebano_nombre
             FROM animales a
             LEFT JOIN rebanos r ON r.id = a.rebano_id
             WHERE (a.madre_id = :id OR a.padre_id = :id2) AND a.usuario_id = :uid
             ORDER BY a.fecha_nacimiento DESC',
            [':id' => $animalId, ':id2' => $animalId, ':uid' => $uid]
        );
        Response::json($hijos);
    }

    /**
     * Árbol genealógico de un animal.
     * Devuelve padres, abuelos, hijos, hermanos y stats.
     * GET /api/animales/{id}/arbol-genealogico
     */
    public function arbolGenealogico(string $id): void
    {
        $uid = $this->usuarioId();
        $animalId = (int)$id;

        // 1. Animal actual
        $animal = Database::queryOne(
            'SELECT a.*, r.nombre as rebano_nombre
             FROM animales a
             LEFT JOIN rebanos r ON r.id = a.rebano_id
             WHERE a.id = :id AND a.usuario_id = :uid',
            [':id' => $animalId, ':uid' => $uid]
        );
        if (!$animal) Response::error('Animal no encontrado', 404);

        // Helper para obtener ancestro por ID (SIN filtro usuario porque
        // los padres/abuelos pueden pertenecer a otro usuario en sociedades)
        $obtenerAncestro = function (?int $id): ?array {
            if (!$id) return null;
            $a = Database::queryOne(
                'SELECT id, nombre, sexo, etapa, estado_general, activo, foto,
                        madre_id, padre_id, estado_reproductivo,
                        (SELECT nombre FROM rebanos WHERE id = a.rebano_id) as rebano_nombre
                 FROM animales a WHERE id = :id',
                [':id' => $id]
            );
            return $a ?: null;
        };

        // 2. Padres
        $madreId = $animal['madre_id'] ? (int)$animal['madre_id'] : null;
        $padreId = $animal['padre_id'] ? (int)$animal['padre_id'] : null;
        $madre = $obtenerAncestro($madreId);
        $padre = $obtenerAncestro($padreId);

        // 3. Abuelos
        $abuelos = [
            'maternos' => null,
            'paternos' => null,
        ];
        if ($madre) {
            $abuelos['maternos'] = [
                'madre' => $obtenerAncestro($madre['madre_id'] ? (int)$madre['madre_id'] : null),
                'padre' => $obtenerAncestro($madre['padre_id'] ? (int)$madre['padre_id'] : null),
            ];
        }
        if ($padre) {
            $abuelos['paternos'] = [
                'madre' => $obtenerAncestro($padre['madre_id'] ? (int)$padre['madre_id'] : null),
                'padre' => $obtenerAncestro($padre['padre_id'] ? (int)$padre['padre_id'] : null),
            ];
        }

        // 4. Hijos — dos queries separadas (PDO con EMULATE_PREPARES=false
        //    no soporta bien OR con mismo named parameter)
        $hijos = Database::query(
            'SELECT a.id, a.nombre, a.sexo, a.etapa, a.estado_general, a.activo,
                    a.fecha_nacimiento, a.foto, a.peso_entrada,
                    r.nombre as rebano_nombre
             FROM animales a
             LEFT JOIN rebanos r ON r.id = a.rebano_id
             WHERE a.madre_id = :mid AND a.usuario_id = :uid
             ORDER BY a.fecha_nacimiento DESC',
            [':mid' => $animalId, ':uid' => $uid]
        );
        $hijosPadre = Database::query(
            'SELECT a.id, a.nombre, a.sexo, a.etapa, a.estado_general, a.activo,
                    a.fecha_nacimiento, a.foto, a.peso_entrada,
                    r.nombre as rebano_nombre
             FROM animales a
             LEFT JOIN rebanos r ON r.id = a.rebano_id
             WHERE a.padre_id = :pid AND a.usuario_id = :uid2
             ORDER BY a.fecha_nacimiento DESC',
            [':pid' => $animalId, ':uid2' => $uid]
        );
        // Combinar, deduplicar y ordenar
        $todos = array_merge($hijos, $hijosPadre);
        $vistos = [];
        $hijos = [];
        foreach ($todos as $h) {
            $hid = (int)$h['id'];
            if (!isset($vistos[$hid])) {
                $vistos[$hid] = true;
                $hijos[] = $h;
            }
        }
        usort($hijos, fn($a, $b) => strcmp($b['fecha_nacimiento'] ?? '', $a['fecha_nacimiento'] ?? ''));

        // 5. Hermanos (misma madre o mismo padre, excluyéndose a sí mismo)
        $paramsHermanos = [':uid' => $uid, ':id' => $animalId];
        $whereHermanos = [];
        if ($madreId) {
            $whereHermanos[] = 'a.madre_id = :madre';
            $paramsHermanos[':madre'] = $madreId;
        }
        if ($padreId) {
            $whereHermanos[] = 'a.padre_id = :padre';
            $paramsHermanos[':padre'] = $padreId;
        }
        $hermanos = [];
        if (!empty($whereHermanos)) {
            $whereHermanosSql = '(' . implode(' OR ', $whereHermanos) . ')';
            $hermanos = Database::query(
                "SELECT a.id, a.nombre, a.sexo, a.etapa, a.estado_general, a.activo,
                        a.fecha_nacimiento, a.foto,
                        r.nombre as rebano_nombre
                 FROM animales a
                 LEFT JOIN rebanos r ON r.id = a.rebano_id
                 WHERE $whereHermanosSql
                   AND a.id != :id
                   AND a.usuario_id = :uid
                 ORDER BY a.fecha_nacimiento DESC",
                $paramsHermanos
            );
        }

        // 6. Sobrinos — hijos de los hermanos
        $sobrinos = []; // ['hermano_id' => [hijos...]]
        if (!empty($hermanos)) {
            $hermanosIds = array_map(fn($h) => (int)$h['id'], $hermanos);
            $hIds = [];
            $sobrinoParams = [':uid' => $uid];
            foreach ($hermanosIds as $i => $hid) {
                $hIds[] = ":hm$i";
                $sobrinoParams[":hm$i"] = $hid;
                $hIds[] = ":hp$i";
                $sobrinoParams[":hp$i"] = $hid;
            }
            $hPlaces = implode(',', $hIds);
            // Reemplazar mitad como madre_id y mitad como padre_id
            $madrePlaces = [];
            $padrePlaces = [];
            foreach ($hermanosIds as $i => $hid) {
                $madrePlaces[] = ":hm$i";
                $padrePlaces[] = ":hp$i";
            }
            $todosSobrinos = Database::query(
                "SELECT a.id, a.nombre, a.sexo, a.etapa, a.estado_general, a.activo,
                        a.fecha_nacimiento, a.madre_id, a.padre_id,
                        r.nombre as rebano_nombre
                 FROM animales a
                 LEFT JOIN rebanos r ON r.id = a.rebano_id
                 WHERE (a.madre_id IN (" . implode(',', $madrePlaces) . ")
                    OR a.padre_id IN (" . implode(',', $padrePlaces) . "))
                   AND a.usuario_id = :uid
                   AND a.id != :animal_id
                 ORDER BY a.fecha_nacimiento DESC",
                array_merge($sobrinoParams, [':animal_id' => $animalId])
            );
            // Agrupar por hermano_id
            $hermanosIdSet = array_flip($hermanosIds);
            $vistosSobrinos = [];
            foreach ($todosSobrinos as $s) {
                $sid = (int)$s['id'];
                if (isset($vistosSobrinos[$sid])) continue;
                $vistosSobrinos[$sid] = true;

                $mid = (int)$s['madre_id'];
                $pid = (int)$s['padre_id'];
                // Asignar al hermano que es padre/madre de este sobrino
                if (isset($hermanosIdSet[$mid])) {
                    $sobrinos[$mid][] = $s;
                } elseif (isset($hermanosIdSet[$pid])) {
                    $sobrinos[$pid][] = $s;
                }
            }
        }

        // 7. Stats
        $totalHijos = count($hijos);
        $totalHermanos = count($hermanos);
        $totalSobrinos = array_sum(array_map('count', $sobrinos));

        $resultado = [
            'animal' => $animal,
            'padres' => [
                'madre' => $madre,
                'padre' => $padre,
            ],
            'abuelos' => $abuelos,
            'hijos' => $hijos,
            'hermanos' => $hermanos,
            'sobrinos' => $sobrinos,
            'stats' => [
                'total_hijos' => $totalHijos,
                'total_hermanos' => $totalHermanos,
                'total_sobrinos' => $totalSobrinos,
                'tiene_padres' => $madreId !== null || $padreId !== null,
                'tiene_hijos' => $totalHijos > 0,
            ],
        ];

        Response::json($resultado);
    }
}
