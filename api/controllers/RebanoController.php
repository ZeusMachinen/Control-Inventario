<?php
/**
 * Controlador de Rebaños — CRUD con conteo de animales
 */
require_once __DIR__ . '/../helpers/Database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Validator.php';
require_once __DIR__ . '/../helpers/CostosSyncHelper.php';
require_once __DIR__ . '/../helpers/CalculadorEdad.php';

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
            'SELECT r.*,
                    (SELECT COUNT(*) FROM animales a WHERE a.rebano_id = r.id AND a.activo = 1) as total_animales,
                    (SELECT COUNT(*) FROM animales a WHERE a.rebano_id = r.id AND a.activo = 1 AND ' . CalculadorEdad::sqlEtapa() . ' != \'Ternero\') as total_animales_pastaje
             FROM rebanos r
             WHERE r.usuario_id = :uid' . (!empty($_GET['inactivos']) ? '' : ' AND r.activo = 1') . '
             ORDER BY r.activo DESC, r.nombre',
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
        if (!$validador->validar($datos, ['nombre' => 'requerido|max:100', 'costo_cabeza' => 'numerico'])) {
            Response::error('Datos inválidos', 422, $validador->errores());
        }

        Database::execute(
            'INSERT INTO rebanos (nombre, costo_cabeza, dia_corte, fecha_inicio, usuario_id) VALUES (:nombre, :costo, :dia_corte, :fecha, :uid)',
            [
                ':nombre'    => $datos['nombre'],
                ':costo'     => $datos['costo_cabeza'] ?? null,
                ':dia_corte' => $datos['dia_corte'] ?? null,
                ':fecha'     => $datos['fecha_inicio'] ?? null,
                ':uid'       => $uid,
            ]
        );

        $id = Database::lastInsertId();
        $this->generarHistorialPastaje((int)$id, $uid);
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

        $campos = ['nombre = :nombre'];
        $params = [':nombre' => $datos['nombre'] ?? '', ':id' => (int)$id];
        if (array_key_exists('costo_cabeza', $datos)) {
            $campos[] = 'costo_cabeza = :costo';
            $params[':costo'] = $datos['costo_cabeza'];
        }
        // dia_corte solo si la columna existe
        if (array_key_exists('dia_corte', $datos)) {
            $campos[] = 'dia_corte = :dia_corte';
            $params[':dia_corte'] = $datos['dia_corte'] ?: null;
        }
        // fecha_inicio solo si la columna existe
        if (array_key_exists('fecha_inicio', $datos)) {
            $cols = Database::query("SHOW COLUMNS FROM rebanos LIKE 'fecha_inicio'");
            if (!empty($cols)) {
                $campos[] = 'fecha_inicio = :fecha';
                $params[':fecha'] = $datos['fecha_inicio'] ?: null;
            }
        }
        Database::execute(
            'UPDATE rebanos SET ' . implode(', ', $campos) . ' WHERE id = :id',
            $params
        );

        $this->generarHistorialPastaje((int)$id, $uid);
        $this->show($id);
    }

    /**
     * Elimina (soft delete) un rebaño.
     * DELETE /api/rebanos/{id}
     */
    public function destroy(string $id): void
    {
        $uid = $this->usuarioId();

        // No permitir inactivar un rebaño con animales activos
        $animales = Database::queryOne(
            'SELECT COUNT(*) as total FROM animales WHERE rebano_id = :id AND usuario_id = :uid AND activo = 1',
            [':id' => (int)$id, ':uid' => $uid]
        );
        if ($animales && (int)$animales['total'] > 0) {
            Response::error('No se puede inactivar un rebaño con animales activos', 400);
        }

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
        // Recalcular etapa real basada en fecha_nacimiento
        foreach ($animales as &$a) {
            if (!empty($a['fecha_nacimiento'])) {
                $edad = CalculadorEdad::calcular($a['fecha_nacimiento']);
                $a['etapa'] = CalculadorEdad::determinarEtapa($edad['total_meses']);
            }
        }
        unset($a);
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

    /**
     * Mueve múltiples animales a un rebaño.
     * POST /api/rebanos/mover-multiples
     */
    public function moverMultiples(): void
    {
        $uid = $this->usuarioId();
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];

        $animalIds = $datos['animal_ids'] ?? [];
        $rebanoDestino = $datos['rebano_destino_id'] ?? null;
        $fecha = !empty($datos['fecha']) ? $datos['fecha'] : date('Y-m-d');

        if (empty($animalIds) || !$rebanoDestino) {
            Response::error('Debe enviar animal_ids y rebano_destino_id', 422);
        }

        // Verificar que el rebaño destino pertenece al usuario
        $destino = Database::queryOne(
            'SELECT id FROM rebanos WHERE id = :id AND usuario_id = :uid AND activo = 1',
            [':id' => (int)$rebanoDestino, ':uid' => $uid]
        );
        if (!$destino) Response::error('Rebaño destino no encontrado', 404);

        $placeholders = [];
        $params = [':uid' => $uid];
        foreach ($animalIds as $i => $aid) {
            $key = ":id$i";
            $placeholders[] = $key;
            $params[$key] = (int)$aid;
        }

        // Obtener rebaños actuales de los animales antes de mover
        $animales = Database::query(
            'SELECT id, rebano_id FROM animales WHERE id IN (' . implode(',', $placeholders) . ') AND usuario_id = :uid AND activo = 1',
            $params
        );

        $rebanoIds = [];
        foreach ($animales as $a) {
            $rebanoIds[(int)$a['id']] = (int)$a['rebano_id'];
        }

        // Filtrar animales que YA están en el rebaño destino
        $idsAMover = [];
        $idsSinCambio = [];
        foreach ($rebanoIds as $aid => $rebanoActual) {
            if ($rebanoActual === (int)$rebanoDestino) {
                $idsSinCambio[] = $aid;
            } else {
                $idsAMover[] = $aid;
            }
        }

        if (empty($idsAMover)) {
            Response::error('Todos los animales seleccionados ya están en el rebaño destino', 422);
        }

        // Mover solo los animales que realmente cambian de rebaño
        $idParams = [':destino' => (int)$rebanoDestino, ':uid' => $uid];
        $idPlaceholders = [];
        foreach ($idsAMover as $i => $aid) {
            $k = ":aid$i";
            $idPlaceholders[] = $k;
            $idParams[$k] = $aid;
        }

        Database::execute(
            'UPDATE animales SET rebano_id = :destino WHERE id IN (' . implode(',', $idPlaceholders) . ') AND usuario_id = :uid',
            $idParams
        );

        // Loguear movimientos (con o sin columna fecha según disponibilidad)
        $tieneFecha = !empty(Database::query("SHOW COLUMNS FROM movimientos_rebano LIKE 'fecha'"));
        foreach ($idsAMover as $aid) {
            if ($tieneFecha) {
                Database::execute(
                    'INSERT INTO movimientos_rebano (animal_id, rebano_origen_id, rebano_destino_id, fecha, usuario_id)
                     VALUES (:animal, :origen, :destino, :fecha, :uid)',
                    [
                        ':animal' => $aid,
                        ':origen' => $rebanoIds[$aid],
                        ':destino' => (int)$rebanoDestino,
                        ':fecha' => $fecha,
                        ':uid' => $uid,
                    ]
                );
            } else {
                Database::execute(
                    'INSERT INTO movimientos_rebano (animal_id, rebano_origen_id, rebano_destino_id, usuario_id)
                     VALUES (:animal, :origen, :destino, :uid)',
                    [
                        ':animal' => $aid,
                        ':origen' => $rebanoIds[$aid],
                        ':destino' => (int)$rebanoDestino,
                        ':uid' => $uid,
                    ]
                );
            }
        }

        // Regenerar pastaje de todos los rebaños afectados (origen y destino)
        $origenesAfectados = array_map(fn($aid) => $rebanoIds[$aid], $idsAMover);
        $rebanosAfectados = array_unique(array_merge($origenesAfectados, [(int)$rebanoDestino]));
        foreach ($rebanosAfectados as $rid) {
            try { $this->generarHistorialPastaje($rid, $uid); } catch (\Throwable $e) {}
        }

        $msg = count($idsAMover) . ' animales movidos exitosamente';
        if (!empty($idsSinCambio)) {
            $msg .= '. ' . count($idsSinCambio) . ' ya estaban en el rebaño destino y no se movieron';
        }
        Response::json(['mensaje' => $msg]);
    }

    /**
     * KPIs globales del usuario (entre todos los rebaños).
     * GET /api/rebanos/kpis
     */
    public function kpisGlobales(): void
    {
        $uid = $this->usuarioId();

        $totalAnimales = Database::queryOne(
            "SELECT COUNT(*) as total FROM animales WHERE usuario_id = :uid AND activo = 1",
            [':uid' => $uid]
        )['total'] ?? 0;

        $totalNacidos = Database::queryOne(
            "SELECT COUNT(*) as total FROM animales WHERE usuario_id = :uid AND rebano_nacimiento_id IS NOT NULL",
            [':uid' => $uid]
        )['total'] ?? 0;

        $totalMuertes = Database::queryOne(
            "SELECT COUNT(*) as total FROM animales WHERE usuario_id = :uid AND estado_general = 'Muerto'",
            [':uid' => $uid]
        )['total'] ?? 0;

        $totalVendidos = Database::queryOne(
            "SELECT COUNT(*) as total FROM animales WHERE usuario_id = :uid AND estado_general = 'Vendido'",
            [':uid' => $uid]
        )['total'] ?? 0;

        $rebanosActivos = Database::queryOne(
            "SELECT COUNT(*) as total FROM rebanos WHERE usuario_id = :uid AND activo = 1",
            [':uid' => $uid]
        )['total'] ?? 0;

        Response::json([
            'total_animales'  => (int)$totalAnimales,
            'total_nacidos'   => (int)$totalNacidos,
            'total_muertes'   => (int)$totalMuertes,
            'total_vendidos'  => (int)$totalVendidos,
            'rebanos_activos' => (int)$rebanosActivos,
        ]);
    }

    /**
     * Historial de movimientos de un rebaño.
     * GET /api/rebanos/{id}/movimientos
     */
    public function movimientos(string $id): void
    {
        $uid = $this->usuarioId();
        $movimientos = Database::query(
            'SELECT m.id, m.animal_id, a.nombre as animal_nombre,
                    r_o.nombre as rebano_origen, r_d.nombre as rebano_destino,
                    m.created_at
             FROM movimientos_rebano m
             JOIN animales a ON a.id = m.animal_id
             JOIN rebanos r_d ON r_d.id = m.rebano_destino_id
             LEFT JOIN rebanos r_o ON r_o.id = m.rebano_origen_id
             WHERE (m.rebano_destino_id = :id OR m.rebano_origen_id = :id2)
               AND a.usuario_id = :uid
             ORDER BY m.created_at DESC
             LIMIT 200',
            [':id' => (int)$id, ':id2' => (int)$id, ':uid' => $uid]
        );
        Response::json($movimientos);
    }

    /**
     * Estadísticas de un rebaño: nacimientos, muertes, peso producido.
     * GET /api/rebanos/{id}/estadisticas?fecha_desde=YYYY-MM-DD&fecha_hasta=YYYY-MM-DD
     */
    public function estadisticas(string $id): void
    {
        $uid = $this->usuarioId();

        // Filtro opcional de período
        $fechaDesde = $_GET['fecha_desde'] ?? null;
        $fechaHasta = $_GET['fecha_hasta'] ?? null;
        $filtroFecha = '';
        $params = [':id' => (int)$id, ':uid' => $uid];
        if ($fechaDesde && $fechaHasta) {
            $filtroFecha = ' AND a.fecha_nacimiento BETWEEN :fdesde AND :fhasta';
            $params[':fdesde'] = $fechaDesde;
            $params[':fhasta'] = $fechaHasta;
        }

        // Nacidos: animales cuyo rebano_nacimiento_id coincide con este rebaño.
        // Solo cuenta animales nacidos aquí (vía partos en reproducción), no los
        // registrados manualmente ni comprados.
        $nacidos = Database::queryOne(
            'SELECT COUNT(*) as total FROM animales a WHERE a.rebano_nacimiento_id = :id AND a.usuario_id = :uid' . $filtroFecha,
            $params
        )['total'] ?? 0;

        // ── IMPORTANTE: usamos rebano_id (rebaño actual/de salida) para activos/muertes/vendidos ──

        $paramsRebano = [':id' => (int)$id, ':uid' => $uid];

        // Activos: animales que están AHORA en este rebaño
        $activos = Database::queryOne(
            "SELECT COUNT(*) as total FROM animales a WHERE a.rebano_id = :id AND a.usuario_id = :uid AND a.activo = 1",
            $paramsRebano
        )['total'] ?? 0;

        // Activos que pagan pastaje (excluye Terneros < 12 meses)
        $etapaSql = CalculadorEdad::sqlEtapa();
        $activosPastaje = Database::queryOne(
            "SELECT COUNT(*) as total FROM animales a WHERE a.rebano_id = :id AND a.usuario_id = :uid AND a.activo = 1 AND $etapaSql != 'Ternero'",
            $paramsRebano
        )['total'] ?? 0;

        // Muertes: animales que MURIERON estando en este rebaño (con filtro de fecha de salida)
        $filtroM = '';
        $paramsM = [':id' => (int)$id, ':uid' => $uid];
        if ($fechaDesde && $fechaHasta) {
            $filtroM = ' AND a.fecha_salida BETWEEN :fdesde AND :fhasta';
            $paramsM[':fdesde'] = $fechaDesde;
            $paramsM[':fhasta'] = $fechaHasta;
        }
        $muertes = Database::queryOne(
            "SELECT COUNT(*) as total FROM animales a WHERE a.rebano_id = :id AND a.usuario_id = :uid AND a.estado_general = 'Muerto'" . $filtroM,
            $paramsM
        )['total'] ?? 0;

        // Vendidos: animales que se VENDIERON estando en este rebaño (con filtro de fecha de salida)
        $filtroV = '';
        $paramsV = [':id' => (int)$id, ':uid' => $uid];
        if ($fechaDesde && $fechaHasta) {
            $filtroV = ' AND a.fecha_salida BETWEEN :fdesde AND :fhasta';
            $paramsV[':fdesde'] = $fechaDesde;
            $paramsV[':fhasta'] = $fechaHasta;
        }
        $vendidos = Database::queryOne(
            "SELECT COUNT(*) as total FROM animales a WHERE a.rebano_id = :id AND a.usuario_id = :uid AND a.estado_general = 'Vendido'" . $filtroV,
            $paramsV
        )['total'] ?? 0;

        // Kilos producidos (con filtro de fecha de salida)
        $paramsK = [':id' => (int)$id, ':uid' => $uid];
        $filtroK = '';
        if ($fechaDesde && $fechaHasta) {
            $filtroK = ' AND a.fecha_salida BETWEEN :fdesde AND :fhasta';
            $paramsK[':fdesde'] = $fechaDesde;
            $paramsK[':fhasta'] = $fechaHasta;
        }
        $kilos = Database::queryOne(
            "SELECT COALESCE(SUM(a.peso_salida - a.peso_entrada), 0) as total
             FROM animales a
             WHERE a.rebano_id = :id AND a.usuario_id = :uid AND a.estado_general != 'Activo'
               AND a.peso_salida IS NOT NULL AND a.peso_entrada IS NOT NULL" . $filtroK,
            $paramsK
        )['total'] ?? 0;

        // Dinero generado por ventas de animales de este rebaño (con filtro de fecha de venta)
        $paramsI = [':id' => (int)$id, ':uid' => $uid];
        $filtroI = '';
        if ($fechaDesde && $fechaHasta) {
            $filtroI = ' AND v.fecha BETWEEN :fdesde AND :fhasta';
            $paramsI[':fdesde'] = $fechaDesde;
            $paramsI[':fhasta'] = $fechaHasta;
        }
        $ingresos = Database::queryOne(
            'SELECT COALESCE(SUM(v.precio), 0) as total
             FROM ventas v
             JOIN animales a ON a.id = v.animal_id
             WHERE a.rebano_id = :id AND a.usuario_id = :uid' . $filtroI,
            $paramsI
        )['total'] ?? 0;

        Response::json([
            'nacidos' => (int)$nacidos,
            'muertes' => (int)$muertes,
            'vendidos' => (int)$vendidos,
            'activos' => (int)$activos,
            'activos_pastaje' => (int)$activosPastaje,
            'kilos_producidos' => (float)$kilos,
            'ingresos_generados' => (float)$ingresos,
        ]);
    }

    /**
     * Genera (o actualiza) el gasto de pastaje mensual para un rebaño.
     * POST /api/rebanos/{id}/generar-pastaje
     */
    public function generarPastaje(string $id): void
    {
        $uid = $this->usuarioId();

        try {
            $this->generarHistorialPastaje((int)$id, $uid);

            $mensaje = Database::queryOne(
                "SELECT COUNT(*) as total FROM gastos WHERE rebano_id = :rid AND tipo = 'mantenimiento' AND usuario_id = :uid AND descripcion LIKE 'Pastaje - %'",
                [':rid' => (int)$id, ':uid' => $uid]
            );

            Response::json([
                'mensaje' => 'Historial de pastaje regenerado correctamente',
                'total_meses' => (int)($mensaje['total'] ?? 0),
            ]);
        } catch (\Throwable $e) {
            Response::error('Error al generar pastaje: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Crea o actualiza el gasto de pastaje para un mes específico.
     */
    private function upsertGastoPastajeMes(int $rebanoId, int $uid, array $rebano, string $mes, int $cabezas): void
    {
        $monto = (float)$rebano['costo_cabeza'] * $cabezas;

        $existente = Database::queryOne(
            "SELECT id FROM gastos WHERE rebano_id = :rid AND tipo = 'mantenimiento' AND mes = :mes AND usuario_id = :uid AND descripcion LIKE 'Pastaje - %'",
            [':rid' => $rebanoId, ':mes' => $mes, ':uid' => $uid]
        );

        if ($existente) {
            Database::execute(
                'UPDATE gastos SET monto = :monto WHERE id = :id',
                [':monto' => $monto, ':id' => $existente['id']]
            );
            try { CostosSyncHelper::sincronizarGasto((int)$existente['id'], $uid); } catch (\Throwable $e) {}
        } else {
            Database::execute(
                'INSERT INTO gastos (tipo, descripcion, monto, mes, rebano_id, usuario_id)
                 VALUES (:tipo, :desc, :monto, :mes, :rid, :uid)',
                [
                    ':tipo'  => 'mantenimiento',
                    ':desc'  => "Pastaje - {$rebano['nombre']}",
                    ':monto' => $monto,
                    ':mes'   => $mes,
                    ':rid'   => $rebanoId,
                    ':uid'   => $uid,
                ]
            );
            try { CostosSyncHelper::sincronizarGasto((int)Database::lastInsertId(), $uid); } catch (\Throwable $e) {}
        }
    }

    /**
     * Obtiene las cabezas que pagan pastaje para un mes histórico.
     * Prioriza conteo_mensual_rebano si existe.
     * Si no hay datos históricos, calcula con conciencia de movimientos:
     * un animal movido a este rebaño en el mes M no cuenta para meses anteriores a M
     * (consistente con herdAlInicioMes de CostosController).
     */
    private function cabezasPastajeMes(int $rebanoId, int $uid, string $mes): int
    {
        // Intentar usar conteo_mensual_rebano (puede no existir si la migración no se aplicó)
        try {
            $hist = Database::queryOne(
                'SELECT cabezas FROM conteo_mensual_rebano
                 WHERE rebano_id = :rid AND usuario_id = :uid AND mes = :mes',
                [':rid' => $rebanoId, ':uid' => $uid, ':mes' => $mes]
            );
            if ($hist) return (int)$hist['cabezas'];
        } catch (\Throwable $e) {
            // Tabla no existe, usar fallback directo
        }

        // Fallback: contar animales activos, excluyendo los que llegaron por mudanza
        // después de este mes (si el animal llegó durante o después de M, no paga
        // pastaje en este rebaño para M — estaba en el origen al inicio del mes).
        // Usa COALESCE(fecha, created_at) para respetar fecha explícita de movimiento.
        $etapaSql = CalculadorEdad::sqlEtapa();
        $result = Database::queryOne(
            "SELECT COUNT(*) as total FROM animales a
             WHERE a.rebano_id = :rid
               AND a.usuario_id = :uid
               AND a.activo = 1
               AND $etapaSql != 'Ternero'
               AND a.fecha_nacimiento < :sig_mes
               AND (
                   NOT EXISTS (
                       SELECT 1 FROM movimientos_rebano m
                       WHERE m.animal_id = a.id
                         AND m.rebano_destino_id = :rid2
                   )
                   OR
                   (
                       SELECT MAX(m2.created_at)
                       FROM movimientos_rebano m2
                       WHERE m2.animal_id = a.id
                         AND m2.rebano_destino_id = :rid3
                   ) < :mes2
               )",
            [
                ':rid'     => $rebanoId,
                ':rid2'    => $rebanoId,
                ':rid3'    => $rebanoId,
                ':uid'     => $uid,
                ':mes2'    => $mes,
                ':sig_mes' => (new \DateTime($mes))->modify('+1 month')->format('Y-m-d'),
            ]
        );
        return (int)($result['total'] ?? 0);
    }

    /**
     * Genera el historial completo de gastos de pastaje desde fecha_inicio hasta hoy.
     */
    private function generarHistorialPastaje(int $rebanoId, int $uid): void
    {
        $rebano = Database::queryOne(
            'SELECT * FROM rebanos r WHERE r.id = :id AND r.usuario_id = :uid',
            [':id' => $rebanoId, ':uid' => $uid]
        );

        if (!$rebano || !$rebano['costo_cabeza']) return;
        if ((float)$rebano['costo_cabeza'] <= 0) return;

        $fechaInicio = $rebano['fecha_inicio'] ?? date('Y-m-d', strtotime('-1 month'));
        $inicio = new \DateTime($fechaInicio);
        $inicio->modify('first day of next month');
        $hoy = new \DateTime();

        $current = clone $inicio;
        while ($current <= $hoy) {
            $mesStr = $current->format('Y-m-d');
            $cabezas = $this->cabezasPastajeMes($rebanoId, $uid, $mesStr);
            if ($cabezas > 0) {
                $this->upsertGastoPastajeMes($rebanoId, $uid, $rebano, $mesStr, $cabezas);
            }
            $current->modify('+1 month');
        }
    }

    /**
     * Genera (o actualiza) el gasto de pastaje mensual para el mes actual.
     * Mantenido para compatibilidad con el endpoint público generar-pastaje.
     */
    private function generarGastoPastaje(int $rebanoId, int $uid): void
    {
        $rebano = Database::queryOne(
            'SELECT * FROM rebanos r WHERE r.id = :id AND r.usuario_id = :uid',
            [':id' => $rebanoId, ':uid' => $uid]
        );
        if (!$rebano || !$rebano['costo_cabeza']) return;
        if ((float)$rebano['costo_cabeza'] <= 0) return;

        $mes = date('Y-m-01');
        $cabezas = $this->cabezasPastajeMes($rebanoId, $uid, $mes);
        if ($cabezas > 0) {
            $this->upsertGastoPastajeMes($rebanoId, $uid, $rebano, $mes, $cabezas);
        }
    }
}
