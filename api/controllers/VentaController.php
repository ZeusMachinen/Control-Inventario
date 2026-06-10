<?php
/**
 * Controlador de Ventas y Transferencias
 */
require_once __DIR__ . '/../helpers/Database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Validator.php';

class VentaController
{
    private function usuarioId(): int
    {
        return (int)AuthMiddleware::ejecutar()->sub;
    }

    /**
     * Lista ventas del usuario (como vendedor).
     * GET /api/ventas?fecha_desde=YYYY-MM-DD&fecha_hasta=YYYY-MM-DD
     */
    public function index(): void
    {
        $uid = $this->usuarioId();

        $where = 'v.vendedor_id = :uid';
        $params = [':uid' => $uid];

        $fechaDesde = $_GET['fecha_desde'] ?? null;
        $fechaHasta = $_GET['fecha_hasta'] ?? null;
        if ($fechaDesde && $fechaHasta) {
            $where .= ' AND v.fecha BETWEEN :fdesde AND :fhasta';
            $params[':fdesde'] = $fechaDesde;
            $params[':fhasta'] = $fechaHasta;
        }

        $tipo = $_GET['tipo'] ?? null;
        if ($tipo) {
            $where .= ' AND v.tipo = :tipo';
            $params[':tipo'] = $tipo;
        }

        $ventas = Database::query(
            'SELECT v.*, a.nombre as animal_nombre,
                    u.nombre as vendedor_nombre
             FROM ventas v
             JOIN animales a ON a.id = v.animal_id
             JOIN usuarios u ON u.id = v.vendedor_id
             WHERE ' . $where . '
             ORDER BY v.fecha DESC',
            $params
        );

        // Totales por tipo con los mismos filtros
        $totales = Database::query(
            'SELECT v.tipo, COUNT(*) as cantidad, SUM(v.precio) as total
             FROM ventas v
             JOIN animales a ON a.id = v.animal_id
             WHERE ' . $where . '
             GROUP BY v.tipo',
            $params
        );

        Response::json([
            'data'    => $ventas,
            'totales' => $totales,
        ]);
    }

    /**
     * Registra una venta o transferencia.
     * POST /api/ventas
     */
    public function store(): void
    {
        $uid = $this->usuarioId();
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];

        $validador = new Validator();
        if (!$validador->validar($datos, [
            'animal_id' => 'requerido|numerico',
            'precio'    => 'requerido|numerico',
            'fecha'     => 'requerido|fecha',
        ])) {
            Response::error('Datos inválidos', 422, $validador->errores());
        }

        // Validar animal
        $animal = Database::queryOne(
            'SELECT id, nombre FROM animales WHERE id = :id AND usuario_id = :uid AND activo = 1',
            [':id' => (int)$datos['animal_id'], ':uid' => $uid]
        );
        if (!$animal) Response::error('Animal no encontrado', 404);

        Database::execute(
            'INSERT INTO ventas (animal_id, vendedor_id, comprador_nombre, comprador_id, precio, fecha, tipo, notas, peso_salida)
             VALUES (:animal, :vendedor, :comprador_nombre, :comprador_id, :precio, :fecha, :tipo, :notas, :peso_salida)',
            [
                ':animal'           => (int)$datos['animal_id'],
                ':vendedor'         => $uid,
                ':comprador_nombre' => $datos['comprador_nombre'] ?? null,
                ':comprador_id'     => !empty($datos['comprador_id']) ? (int)$datos['comprador_id'] : null,
                ':precio'           => (float)$datos['precio'],
                ':fecha'            => $datos['fecha'],
                ':tipo'             => $datos['tipo'] ?? 'Venta',
                ':notas'            => $datos['notas'] ?? null,
                ':peso_salida'      => isset($datos['peso_salida']) ? (float)$datos['peso_salida'] : null,
            ]
        );

        $id = Database::lastInsertId();
        $this->show($id);
    }

    /**
     * Muestra una venta con datos completos del animal.
     * GET /api/ventas/{id}
     */
    public function show(string $id): void
    {
        $uid = $this->usuarioId();
        $venta = Database::queryOne(
            'SELECT v.*,
                    a.nombre as animal_nombre,
                    a.sexo as animal_sexo,
                    a.identificacion as animal_identificacion,
                    a.fecha_nacimiento as animal_fecha_nacimiento,
                    a.etapa as animal_etapa,
                    a.estado_reproductivo as animal_estado_reproductivo,
                    a.peso_entrada as animal_peso_entrada,
                    a.peso_salida as animal_peso_salida,
                    a.foto as animal_foto,
                    r.nombre as animal_rebano_nombre,
                    u.nombre as vendedor_nombre
             FROM ventas v
             JOIN animales a ON a.id = v.animal_id
             LEFT JOIN rebanos r ON r.id = a.rebano_id
             JOIN usuarios u ON u.id = v.vendedor_id
             WHERE v.id = :id AND (v.vendedor_id = :uid OR v.comprador_id = :uid2)',
            [':id' => (int)$id, ':uid' => $uid, ':uid2' => $uid]
        );
        if (!$venta) Response::error('Venta no encontrada', 404);
        Response::json($venta);
    }

    /**
     * Actualiza una venta.
     * PUT /api/ventas/{id}
     */
    public function update(string $id): void
    {
        $uid = $this->usuarioId();
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];

        $existente = Database::queryOne(
            'SELECT id FROM ventas WHERE id = :id AND vendedor_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        );
        if (!$existente) Response::error('Venta no encontrada', 404);

        $campos = [];
        $params = [':id' => (int)$id];

        foreach (['precio', 'fecha', 'tipo', 'comprador_nombre', 'notas', 'peso_salida'] as $campo) {
            if (array_key_exists($campo, $datos)) {
                $campos[] = "$campo = :$campo";
                $params[":$campo"] = $datos[$campo];
            }
        }

        if (empty($campos)) Response::error('No hay datos para actualizar', 422);

        Database::execute(
            'UPDATE ventas SET ' . implode(', ', $campos) . ' WHERE id = :id',
            $params
        );

        $this->show($id);
    }

    /**
     * Elimina una venta.
     * DELETE /api/ventas/{id}
     */
    public function destroy(string $id): void
    {
        $uid = $this->usuarioId();
        Database::execute(
            'DELETE FROM ventas WHERE id = :id AND vendedor_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        );
        Response::json(['mensaje' => 'Venta eliminada']);
    }

    /**
     * Venta múltiple por lote.
     * Crea ventas para varios animales y los marca como Vendidos.
     * Si se envía peso_total_del_lote, distribuye el peso estimado
     * según el peso de entrada de cada animal.
     * POST /api/ventas/multiple
     */
    public function ventaMultiple(): void
    {
        $uid = $this->usuarioId();
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];

        $animalIds = $datos['animal_ids'] ?? [];
        if (count($animalIds) < 1) {
            Response::error('Debe incluir al menos un animal', 422);
        }

        if (empty($datos['precio'])) {
            Response::error('Debe especificar un precio unitario', 422);
        }
        if (empty($datos['fecha'])) {
            Response::error('Debe especificar la fecha de venta', 422);
        }

        $precio = (float)$datos['precio'];
        $fecha = $datos['fecha'];
        $tipo = $datos['tipo'] ?? 'Venta';
        $comprador = $datos['comprador_nombre'] ?? null;
        $notas = $datos['notas'] ?? null;
        $pesoTotalLote = isset($datos['peso_salida']) ? (float)$datos['peso_salida'] : null;

        // Validar que todos los animales existen y pertenecen al usuario
        $placeholders = [];
        $params = [':uid' => $uid];
        foreach ($animalIds as $i => $aid) {
            $key = ":id$i";
            $placeholders[] = $key;
            $params[$key] = (int)$aid;
        }

        $animales = Database::query(
            'SELECT id, nombre, activo, estado_general, peso_entrada FROM animales
             WHERE id IN (' . implode(',', $placeholders) . ') AND usuario_id = :uid',
            $params
        );

        if (count($animales) !== count($animalIds)) {
            Response::error('Algunos animales no existen o no te pertenecen', 404);
        }

        // Verificar que estén activos
        foreach ($animales as $a) {
            if (!$a['activo'] || $a['estado_general'] !== 'Activo') {
                Response::error("El animal '{$a['nombre']}' no está activo", 400);
            }
        }

        // ── Calcular peso estimado por animal ──
        // Si se pasó peso total del lote, distribuir según peso_entrada
        $pesosEstimados = [];
        if ($pesoTotalLote !== null && $pesoTotalLote > 0) {
            $sumaPesoEntrada = 0;
            $animalesConPeso = 0;
            foreach ($animales as $a) {
                if ($a['peso_entrada'] !== null) {
                    $sumaPesoEntrada += (float)$a['peso_entrada'];
                    $animalesConPeso++;
                }
            }

            if ($animalesConPeso > 0) {
                $totalGanancia = $pesoTotalLote - $sumaPesoEntrada;
                $gananciaPromedio = $totalGanancia / $animalesConPeso;

                foreach ($animales as $a) {
                    if ($a['peso_entrada'] !== null) {
                        $pesosEstimados[(int)$a['id']] = (float)$a['peso_entrada'] + $gananciaPromedio;
                    }
                }
            }
        }

        $pdo = Database::conectar();
        $pdo->beginTransaction();

        try {
            $creadas = 0;
            foreach ($animales as $a) {
                $aid = (int)$a['id'];
                $pesoIndividual = $pesosEstimados[$aid] ?? null;

                Database::execute(
                    'INSERT INTO ventas (animal_id, vendedor_id, comprador_nombre, precio, fecha, tipo, notas, peso_salida)
                     VALUES (:animal, :vendedor, :comprador, :precio, :fecha, :tipo, :notas, :peso)',
                    [
                        ':animal'    => $aid,
                        ':vendedor'  => $uid,
                        ':comprador' => $comprador,
                        ':precio'    => $precio,
                        ':fecha'     => $fecha,
                        ':tipo'      => $tipo,
                        ':notas'     => $notas,
                        ':peso'      => $pesoIndividual, // peso estimado o null
                    ]
                );

                Database::execute(
                    'UPDATE animales SET estado_general = \'Vendido\', activo = 0,
                            fecha_salida = :fecha, motivo_salida = \'Venta\',
                            peso_salida = :peso
                     WHERE id = :id',
                    [
                        ':fecha' => $fecha,
                        ':peso'  => $pesoIndividual,
                        ':id'    => $aid,
                    ]
                );

                $creadas++;
            }

            $pdo->commit();
            Response::json([
                'mensaje' => "$creadas venta(s) registradas exitosamente",
                'total'   => $creadas,
            ]);

        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            Response::error('Error al registrar ventas: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Compras del usuario (donde es comprador).
     * GET /api/ventas/compras
     */
    public function compras(): void
    {
        $uid = $this->usuarioId();
        $compras = Database::query(
            'SELECT v.*, a.nombre as animal_nombre, u.nombre as vendedor_nombre
             FROM ventas v
             JOIN animales a ON a.id = v.animal_id
             JOIN usuarios u ON u.id = v.vendedor_id
             WHERE v.comprador_id = :uid
             ORDER BY v.fecha DESC',
            [':uid' => $uid]
        );
        Response::json($compras);
    }
}
