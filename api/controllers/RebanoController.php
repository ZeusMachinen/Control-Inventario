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
     * GET /api/rebanos/{id}/estadisticas
     */
    public function estadisticas(string $id): void
    {
        $uid = $this->usuarioId();

        // Nacidos en este rebaño
        $nacidos = Database::queryOne(
            'SELECT COUNT(*) as total FROM animales WHERE rebano_nacimiento_id = :id AND usuario_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        )['total'] ?? 0;

        // Muertes (nacidos en este rebaño que murieron)
        $muertes = Database::queryOne(
            "SELECT COUNT(*) as total FROM animales WHERE rebano_nacimiento_id = :id AND usuario_id = :uid AND estado_general = 'Muerto'",
            [':id' => (int)$id, ':uid' => $uid]
        )['total'] ?? 0;

        // Vendidos (nacidos en este rebaño que se vendieron)
        $vendidos = Database::queryOne(
            "SELECT COUNT(*) as total FROM animales WHERE rebano_nacimiento_id = :id AND usuario_id = :uid AND estado_general = 'Vendido'",
            [':id' => (int)$id, ':uid' => $uid]
        )['total'] ?? 0;

        // Activos actuales nacidos aquí
        $activos = Database::queryOne(
            "SELECT COUNT(*) as total FROM animales WHERE rebano_nacimiento_id = :id AND usuario_id = :uid AND estado_general = 'Activo'",
            [':id' => (int)$id, ':uid' => $uid]
        )['total'] ?? 0;

        // Kilos producidos (suma de peso_salida - peso_entrada de los que salieron)
        $kilos = Database::queryOne(
            "SELECT COALESCE(SUM(peso_salida - peso_entrada), 0) as total
             FROM animales
             WHERE rebano_id = :id AND usuario_id = :uid AND estado_general != 'Activo'
               AND peso_salida IS NOT NULL AND peso_entrada IS NOT NULL",
            [':id' => (int)$id, ':uid' => $uid]
        )['total'] ?? 0;

        // Dinero generado por ventas de animales de este rebaño
        $ingresos = Database::queryOne(
            'SELECT COALESCE(SUM(v.precio), 0) as total
             FROM ventas v
             JOIN animales a ON a.id = v.animal_id
             WHERE a.rebano_id = :id AND a.usuario_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
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
