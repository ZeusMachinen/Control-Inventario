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
            'INSERT INTO rebanos (nombre, costo_cabeza, fecha_inicio, usuario_id) VALUES (:nombre, :costo, :fecha, :uid)',
            [
                ':nombre' => $datos['nombre'],
                ':costo'  => $datos['costo_cabeza'] ?? null,
                ':fecha'  => $datos['fecha_inicio'] ?? null,
                ':uid'    => $uid,
            ]
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

        $campos = ['nombre = :nombre'];
        $params = [':nombre' => $datos['nombre'] ?? '', ':id' => (int)$id];
        if (array_key_exists('costo_cabeza', $datos)) {
            $campos[] = 'costo_cabeza = :costo';
            $params[':costo'] = $datos['costo_cabeza'];
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

        $idsActuales = array_keys($rebanoIds);
        if (empty($idsActuales)) Response::error('Animales no encontrados', 404);

        // Mover animales
        $idParams = [':destino' => (int)$rebanoDestino, ':uid' => $uid];
        $idPlaceholders = [];
        foreach ($idsActuales as $i => $aid) {
            $k = ":aid$i";
            $idPlaceholders[] = $k;
            $idParams[$k] = $aid;
        }

        Database::execute(
            'UPDATE animales SET rebano_id = :destino WHERE id IN (' . implode(',', $idPlaceholders) . ') AND usuario_id = :uid',
            $idParams
        );

        // Loguear movimientos
        foreach ($idsActuales as $aid) {
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

        Response::json(['mensaje' => count($idsActuales) . ' animales movidos exitosamente']);
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
            "SELECT COUNT(*) as total FROM animales WHERE usuario_id = :uid",
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

        // Nacidos: todos los animales que están o estuvieron en este rebaño (rebano_id porque
        // rebano_nacimiento_id nunca se popula en la creación de animales).
        $nacidos = Database::queryOne(
            'SELECT COUNT(*) as total FROM animales a WHERE a.rebano_id = :id AND a.usuario_id = :uid' . $filtroFecha,
            $params
        )['total'] ?? 0;

        // ── IMPORTANTE: usamos rebano_id (rebaño actual/de salida) para activos/muertes/vendidos ──

        $paramsRebano = [':id' => (int)$id, ':uid' => $uid];

        // Activos: animales que están AHORA en este rebaño
        $activos = Database::queryOne(
            "SELECT COUNT(*) as total FROM animales a WHERE a.rebano_id = :id AND a.usuario_id = :uid AND a.estado_general = 'Activo'",
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
            'kilos_producidos' => (float)$kilos,
            'ingresos_generados' => (float)$ingresos,
        ]);
    }
}
