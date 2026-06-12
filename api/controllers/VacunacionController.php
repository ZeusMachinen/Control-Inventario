<?php
/**
 * Controlador de Vacunaciones — Eventos de vacunación y cobertura
 */
require_once __DIR__ . '/../helpers/Database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Validator.php';
require_once __DIR__ . '/../helpers/CostosSyncHelper.php';

class VacunacionController
{
    private function usuarioId(): int
    {
        return (int)AuthMiddleware::ejecutar()->sub;
    }

    /**
     * Calcula los montos del gasto automático asociado a una vacunación,
     * separando el costo del medicamento del costo veterinario.
     *
     * @param array $datos Datos del request (medicamento, animales, etc.)
     * @param int   $vacunacionId ID de la vacunación ya insertada
     * @param int   $uid ID del usuario
     * @return array ['monto_medicamento' => float, 'monto_veterinario' => float, 'descripcion' => string, 'count' => int, 'precio_unitario' => float]
     */
    private function calcularMontoGasto(array $datos, int $vacunacionId, int $uid): array
    {
        $med = Database::queryOne(
            'SELECT precio, nombre FROM medicamentos WHERE id = :id AND usuario_id = :uid',
            [':id' => (int)$datos['medicamento_id'], ':uid' => $uid]
        );
        $precio = $med ? (float)($med['precio'] ?? 0) : 0;
        $medNombre = $med ? $med['nombre'] : 'Desconocido';

        if (!empty($datos['vacunar_rebano']) && !empty($datos['rebano_id'])) {
            $count = (int)(Database::queryOne(
                'SELECT COUNT(*) as total FROM vacunacion_animales va WHERE va.vacunacion_id = :vid',
                [':vid' => $vacunacionId]
            )['total'] ?? 0);
        } else {
            $count = !empty($datos['animales']) && is_array($datos['animales']) ? count($datos['animales']) : 0;
        }

        $costoVet = (float)($datos['costo_veterinario'] ?? 0);
        $montoMed = $precio * $count;
        $descripcion = "Vacunación - {$medNombre} ({$count} animales)";

        return [
            'monto_medicamento'  => $montoMed,
            'monto_veterinario' => $costoVet,
            'descripcion'        => $descripcion,
            'count'              => $count,
            'precio_unitario'    => $precio,
        ];
    }

    /**
     * Crea un gasto en la tabla gastos y devuelve su ID.
     */
    private function crearGasto(string $tipo, string $descripcion, float $monto, string $mes, ?int $rebanoId, int $uid): int
    {
        Database::execute(
            'INSERT INTO gastos (tipo, descripcion, monto, mes, rebano_id, usuario_id)
             VALUES (:tipo, :desc, :monto, :mes, :rebano, :uid)',
            [
                ':tipo'   => $tipo,
                ':desc'   => $descripcion,
                ':monto'  => $monto,
                ':mes'    => $mes,
                ':rebano' => $rebanoId,
                ':uid'    => $uid,
            ]
        );
        $gastoId = Database::lastInsertId();

        if ($rebanoId) {
            CostosSyncHelper::sincronizarGasto((int)$gastoId, $uid);
        }

        return (int)$gastoId;
    }

    /**
     * Lista eventos de vacunación.
     * GET /api/vacunaciones?search=&fecha_desde=&fecha_hasta=
     */
    public function index(): void
    {
        $uid = $this->usuarioId();

        $where = 'v.usuario_id = :uid';
        $params = [':uid' => $uid];

        $search = $_GET['search'] ?? null;
        if ($search) {
            $where .= ' AND (m.nombre LIKE :search OR v.observaciones LIKE :search2)';
            $params[':search'] = "%{$search}%";
            $params[':search2'] = "%{$search}%";
        }

        $fechaDesde = $_GET['fecha_desde'] ?? null;
        $fechaHasta = $_GET['fecha_hasta'] ?? null;
        if ($fechaDesde && $fechaHasta) {
            $where .= ' AND v.fecha BETWEEN :fdesde AND :fhasta';
            $params[':fdesde'] = $fechaDesde;
            $params[':fhasta'] = $fechaHasta;
        }

        $vacunaciones = Database::query(
            'SELECT v.*, m.nombre as medicamento_nombre, r.nombre as rebano_nombre,
                    g.monto as gasto_monto,
                    (SELECT COUNT(*) FROM vacunacion_animales va WHERE va.vacunacion_id = v.id) as total_animales
             FROM vacunaciones v
             JOIN medicamentos m ON m.id = v.medicamento_id
             LEFT JOIN gastos g ON g.id = v.gasto_id
             LEFT JOIN rebanos r ON r.id = v.rebano_id
             WHERE ' . $where . '
             ORDER BY v.fecha DESC',
            $params
        );

        // Totales
        $totales = Database::queryOne(
            'SELECT COUNT(*) as cantidad,
                    COALESCE(SUM(v.costo_veterinario), 0) as total_veterinario,
                    COALESCE(SUM(g.monto), 0) as total_medicamento
             FROM vacunaciones v
             JOIN medicamentos m ON m.id = v.medicamento_id
             LEFT JOIN gastos g ON g.id = v.gasto_id
             WHERE ' . $where,
            $params
        );

        Response::json([
            'data'    => $vacunaciones,
            'totales' => $totales,
        ]);
    }

    /**
     * Registra una nueva vacunación.
     * POST /api/vacunaciones
     */
    public function store(): void
    {
        $uid = $this->usuarioId();
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];

        $validador = new Validator();
        if (!$validador->validar($datos, [
            'fecha'         => 'requerido|fecha',
            'medicamento_id' => 'requerido|numerico',
        ])) {
            Response::error('Datos inválidos', 422, $validador->errores());
        }

        // Validar medicamento
        $med = Database::queryOne(
            'SELECT id FROM medicamentos WHERE id = :id AND usuario_id = :uid AND activo = 1',
            [':id' => (int)$datos['medicamento_id'], ':uid' => $uid]
        );
        if (!$med) Response::error('Medicamento no encontrado', 404);

        // Insertar vacunación
        Database::execute(
            'INSERT INTO vacunaciones (fecha, medicamento_id, rebano_id, observaciones, costo_veterinario, usuario_id)
             VALUES (:fecha, :med, :rebano, :obs, :costo_vet, :uid)',
            [
                ':fecha'     => $datos['fecha'],
                ':med'       => (int)$datos['medicamento_id'],
                ':rebano'    => !empty($datos['rebano_id']) ? (int)$datos['rebano_id'] : null,
                ':obs'       => $datos['observaciones'] ?? null,
                ':costo_vet' => $datos['costo_veterinario'] ?? null,
                ':uid'       => $uid,
            ]
        );

        $vacunacionId = Database::lastInsertId();

        // Insertar animales vacunados
        if (!empty($datos['animales']) && is_array($datos['animales'])) {
            foreach ($datos['animales'] as $animalId) {
                Database::execute(
                    'INSERT INTO vacunacion_animales (vacunacion_id, animal_id) VALUES (:vac, :ani)',
                    [':vac' => $vacunacionId, ':ani' => (int)$animalId]
                );
            }
        }

        // Si se seleccionó un rebaño completo, vacunar todos los animales del rebaño
        if (!empty($datos['vacunar_rebano']) && !empty($datos['rebano_id'])) {
            $animales = Database::query(
                'SELECT id FROM animales WHERE rebano_id = :rid AND usuario_id = :uid AND activo = 1',
                [':rid' => (int)$datos['rebano_id'], ':uid' => $uid]
            );
            foreach ($animales as $animal) {
                Database::execute(
                    'INSERT IGNORE INTO vacunacion_animales (vacunacion_id, animal_id) VALUES (:vac, :ani)',
                    [':vac' => $vacunacionId, ':ani' => $animal['id']]
                );
            }
        }

        // === GASTO AUTOMÁTICO ===
        $gasto = $this->calcularMontoGasto($datos, $vacunacionId, $uid);
        $mes = date('Y-m-01', strtotime($datos['fecha']));
        $rebanoId = !empty($datos['rebano_id']) ? (int)$datos['rebano_id'] : null;

        // 1. Gasto de medicamentos — siempre se crea si hay animales vacunados
        $gastoMedId = null;
        if ($gasto['count'] > 0) {
            $gastoMedId = $this->crearGasto(
                'medicamentos',
                $gasto['descripcion'],
                $gasto['monto_medicamento'],
                $mes,
                $rebanoId,
                $uid
            );
        }

        // 2. Gasto veterinario separado (solo costo_veterinario)
        $gastoVetId = null;
        if ($gasto['monto_veterinario'] > 0) {
            $gastoVetId = $this->crearGasto(
                'veterinarios',
                "Honorarios veterinarios - {$gasto['descripcion']}",
                $gasto['monto_veterinario'],
                $mes,
                $rebanoId,
                $uid
            );
        }

        // Vincular gastos a vacunación
        if ($gastoMedId || $gastoVetId) {
            $updateParts = [];
            $updateParams = [':id' => $vacunacionId];
            if ($gastoMedId) {
                $updateParts[] = 'gasto_id = :gasto';
                $updateParams[':gasto'] = $gastoMedId;
            }
            if ($gastoVetId) {
                $updateParts[] = 'gasto_veterinario_id = :gasto_vet';
                $updateParams[':gasto_vet'] = $gastoVetId;
            }
            Database::execute(
                'UPDATE vacunaciones SET ' . implode(', ', $updateParts) . ' WHERE id = :id',
                $updateParams
            );
        }
        // === FIN GASTO AUTOMÁTICO ===

        $this->show($vacunacionId);
    }

    /**
     * Muestra una vacunación.
     * GET /api/vacunaciones/{id}
     */
    public function show(string $id): void
    {
        $uid = $this->usuarioId();
        $vac = Database::queryOne(
            'SELECT v.*, m.nombre as medicamento_nombre
             FROM vacunaciones v
             JOIN medicamentos m ON m.id = v.medicamento_id
             WHERE v.id = :id AND v.usuario_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        );
        if (!$vac) Response::error('Vacunación no encontrada', 404);

        $vac['animales'] = Database::query(
            'SELECT va.*, a.nombre as animal_nombre, a.sexo
             FROM vacunacion_animales va
             JOIN animales a ON a.id = va.animal_id
             WHERE va.vacunacion_id = :id',
            [':id' => (int)$id]
        );

        Response::json($vac);
    }

    /**
     * Actualiza una vacunación.
     * PUT /api/vacunaciones/{id}
     */
    public function update(string $id): void
    {
        $uid = $this->usuarioId();
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];

        $existente = Database::queryOne(
            'SELECT id, gasto_id, gasto_veterinario_id, fecha, medicamento_id, costo_veterinario, rebano_id
             FROM vacunaciones WHERE id = :id AND usuario_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        );
        if (!$existente) Response::error('Vacunación no encontrada', 404);

        $campos = [];
        $params = [':id' => (int)$id];
        foreach (['fecha', 'medicamento_id', 'observaciones', 'costo_veterinario'] as $c) {
            if (isset($datos[$c])) {
                $campos[] = "$c = :$c";
                $params[":$c"] = $datos[$c];
            }
        }
        if (!empty($campos)) {
            Database::execute('UPDATE vacunaciones SET ' . implode(', ', $campos) . ' WHERE id = :id', $params);
        }

        // Reemplazar lista de animales si se envió
        if (isset($datos['animales']) && is_array($datos['animales'])) {
            Database::execute('DELETE FROM vacunacion_animales WHERE vacunacion_id = :id', [':id' => (int)$id]);
            foreach ($datos['animales'] as $animalId) {
                Database::execute(
                    'INSERT INTO vacunacion_animales (vacunacion_id, animal_id) VALUES (:vac, :ani)',
                    [':vac' => (int)$id, ':ani' => (int)$animalId]
                );
            }
        }

        // Si se seleccionó un rebaño completo, reemplazar con animales del rebaño
        if (!empty($datos['vacunar_rebano']) && !empty($datos['rebano_id'])) {
            Database::execute('DELETE FROM vacunacion_animales WHERE vacunacion_id = :id', [':id' => (int)$id]);
            $animalesRebano = Database::query(
                'SELECT id FROM animales WHERE rebano_id = :rid AND usuario_id = :uid AND activo = 1',
                [':rid' => (int)$datos['rebano_id'], ':uid' => $uid]
            );
            foreach ($animalesRebano as $animal) {
                Database::execute(
                    'INSERT INTO vacunacion_animales (vacunacion_id, animal_id) VALUES (:vac, :ani)',
                    [':vac' => (int)$id, ':ani' => $animal['id']]
                );
            }
        }

        // === GASTO AUTOMÁTICO (UPDATE) ===
        // Solo recalcular si cambiaron campos relevantes (medicamento, animales, costo_veterinario, rebano)
        $medCambio  = isset($datos['medicamento_id']);
        $vetCambio  = isset($datos['costo_veterinario']);
        $rebCambio  = isset($datos['rebano_id']);
        $animCambio = isset($datos['animales']) || isset($datos['vacunar_rebano']);

        if ($medCambio || $vetCambio || $rebCambio || $animCambio) {
            $gasto = $this->calcularMontoGasto($datos, (int)$id, $uid);
            $mes = date('Y-m-01', strtotime($datos['fecha'] ?? $existente['fecha']));
            $rebanoId = !empty($datos['rebano_id']) ? (int)$datos['rebano_id'] : null;

            // 1. Gasto de medicamentos
            if ($existente['gasto_id']) {
                if ($gasto['monto_medicamento'] > 0) {
                    Database::execute(
                        'UPDATE gastos SET monto = :monto, descripcion = :desc, mes = :mes, rebano_id = :rebano WHERE id = :id',
                        [
                            ':monto' => $gasto['monto_medicamento'],
                            ':desc' => $gasto['descripcion'],
                            ':mes' => $mes,
                            ':rebano' => $rebanoId,
                            ':id' => $existente['gasto_id'],
                        ]
                    );
                    if ($rebanoId) {
                        CostosSyncHelper::sincronizarGasto((int)$existente['gasto_id'], $uid);
                    }
                } else {
                    // Si ya no hay monto de medicamento, eliminar gasto y desvincular
                    CostosSyncHelper::eliminarGasto((int)$existente['gasto_id'], $uid);
                    Database::execute('DELETE FROM gastos WHERE id = :id', [':id' => $existente['gasto_id']]);
                    Database::execute('UPDATE vacunaciones SET gasto_id = NULL WHERE id = :id', [':id' => (int)$id]);
                }
            } elseif ($gasto['monto_medicamento'] > 0) {
                $gastoMedId = $this->crearGasto('medicamentos', $gasto['descripcion'], $gasto['monto_medicamento'], $mes, $rebanoId, $uid);
                Database::execute(
                    'UPDATE vacunaciones SET gasto_id = :gasto WHERE id = :id',
                    [':gasto' => $gastoMedId, ':id' => (int)$id]
                );
            }

            // 2. Gasto veterinario separado
            if ($gasto['monto_veterinario'] > 0) {
                if ($existente['gasto_veterinario_id']) {
                    Database::execute(
                        'UPDATE gastos SET monto = :monto, descripcion = :desc, mes = :mes, rebano_id = :rebano WHERE id = :id',
                        [
                            ':monto' => $gasto['monto_veterinario'],
                            ':desc' => "Honorarios veterinarios - {$gasto['descripcion']}",
                            ':mes' => $mes,
                            ':rebano' => $rebanoId,
                            ':id' => $existente['gasto_veterinario_id'],
                        ]
                    );
                    if ($rebanoId) {
                        CostosSyncHelper::sincronizarGasto((int)$existente['gasto_veterinario_id'], $uid);
                    }
                } else {
                    $gastoVetId = $this->crearGasto(
                        'veterinarios',
                        "Honorarios veterinarios - {$gasto['descripcion']}",
                        $gasto['monto_veterinario'],
                        $mes,
                        $rebanoId,
                        $uid
                    );
                    Database::execute(
                        'UPDATE vacunaciones SET gasto_veterinario_id = :gasto_vet WHERE id = :id',
                        [':gasto_vet' => $gastoVetId, ':id' => (int)$id]
                    );
                }
            } elseif ($existente['gasto_veterinario_id']) {
                // Ya no hay costo veterinario, eliminar gasto
                CostosSyncHelper::eliminarGasto((int)$existente['gasto_veterinario_id'], $uid);
                Database::execute('DELETE FROM gastos WHERE id = :id', [':id' => $existente['gasto_veterinario_id']]);
                Database::execute('UPDATE vacunaciones SET gasto_veterinario_id = NULL WHERE id = :id', [':id' => (int)$id]);
            }
        }
        // === FIN GASTO AUTOMÁTICO ===

        $this->show($id);
    }

    /**
     * Elimina una vacunación y su gasto asociado.
     * DELETE /api/vacunaciones/{id}
     */
    public function destroy(string $id): void
    {
        $uid = $this->usuarioId();

        // Obtener vacunación con sus gastos ANTES de eliminar
        $vac = Database::queryOne(
            'SELECT id, gasto_id, gasto_veterinario_id FROM vacunaciones WHERE id = :id AND usuario_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        );
        if (!$vac) Response::error('Vacunación no encontrada', 404);

        // Eliminar gasto veterinario si existe
        if ($vac['gasto_veterinario_id']) {
            $gastoVetId = (int)$vac['gasto_veterinario_id'];
            CostosSyncHelper::eliminarGasto($gastoVetId, $uid);
            Database::execute('DELETE FROM gastos WHERE id = :id', [':id' => $gastoVetId]);
        }

        // Eliminar gasto de medicamentos si existe
        if ($vac['gasto_id']) {
            $gastoId = (int)$vac['gasto_id'];
            CostosSyncHelper::eliminarGasto($gastoId, $uid);
            Database::execute('DELETE FROM gastos WHERE id = :id', [':id' => $gastoId]);
        }

        // Eliminar vacunación (cascade a vacunacion_animales)
        Database::execute(
            'DELETE FROM vacunaciones WHERE id = :id AND usuario_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        );

        Response::json(['mensaje' => 'Vacunación eliminada']);
    }

    /**
     * Cobertura de vacunación.
     * GET /api/vacunaciones/cobertura
     */
    public function cobertura(): void
    {
        $uid = $this->usuarioId();

        $total = Database::queryOne(
            'SELECT COUNT(*) as total FROM animales WHERE usuario_id = :uid AND activo = 1',
            [':uid' => $uid]
        )['total'];

        $vacunados = Database::queryOne(
            'SELECT COUNT(DISTINCT va.animal_id) as total
             FROM vacunacion_animales va
             JOIN vacunaciones v ON v.id = va.vacunacion_id
             JOIN animales a ON a.id = va.animal_id
             WHERE a.usuario_id = :uid AND a.activo = 1
               AND v.fecha >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)',
            [':uid' => $uid]
        )['total'];

        $noVacunados = $total - $vacunados;

        Response::json([
            'total_animales' => (int)$total,
            'vacunados'      => (int)$vacunados,
            'no_vacunados'   => max(0, (int)$noVacunados),
            'porcentaje'     => $total > 0 ? round(($vacunados / $total) * 100, 1) : 0,
        ]);
    }

    /**
     * Alertas de renovación de vacunación.
     * GET /api/vacunaciones/alertas
     */
    public function alertas(): void
    {
        $uid = $this->usuarioId();

        $animales = Database::query(
            'SELECT a.id, a.nombre,
                    (SELECT MAX(v.fecha) FROM vacunacion_animales va
                     JOIN vacunaciones v ON v.id = va.vacunacion_id
                     WHERE va.animal_id = a.id AND v.usuario_id = :uid
                    ) as ultima_vacuna
             FROM animales a
             WHERE a.usuario_id = :uid2 AND a.activo = 1
             HAVING ultima_vacuna IS NULL
                OR ultima_vacuna < DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
             ORDER BY ultima_vacuna ASC',
            [':uid' => $uid, ':uid2' => $uid]
        );

        Response::json($animales);
    }
}
