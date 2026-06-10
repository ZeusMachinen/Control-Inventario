<?php
/**
 * Controlador de Vacunaciones — Eventos de vacunación y cobertura
 */
require_once __DIR__ . '/../helpers/Database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Validator.php';

class VacunacionController
{
    private function usuarioId(): int
    {
        return (int)AuthMiddleware::ejecutar()->sub;
    }

    /**
     * Calcula el monto del gasto automático asociado a una vacunación.
     *
     * @param array $datos Datos del request (medicamento, animales, etc.)
     * @param int   $vacunacionId ID de la vacunación ya insertada
     * @param int   $uid ID del usuario
     * @return array ['monto' => float, 'descripcion' => string, 'count' => int, 'precio_unitario' => float]
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
        $monto = ($precio * $count) + $costoVet;
        $descripcion = "Vacunación - {$medNombre} ({$count} animales)";

        return [
            'monto' => $monto,
            'descripcion' => $descripcion,
            'count' => $count,
            'precio_unitario' => $precio,
        ];
    }

    /**
     * Lista eventos de vacunación.
     * GET /api/vacunaciones
     */
    public function index(): void
    {
        $uid = $this->usuarioId();
        $vacunaciones = Database::query(
            'SELECT v.*, m.nombre as medicamento_nombre, r.nombre as rebano_nombre,
                    (SELECT COUNT(*) FROM vacunacion_animales va WHERE va.vacunacion_id = v.id) as total_animales
             FROM vacunaciones v
             JOIN medicamentos m ON m.id = v.medicamento_id
             LEFT JOIN rebanos r ON r.id = v.rebano_id
             WHERE v.usuario_id = :uid
             ORDER BY v.fecha DESC',
            [':uid' => $uid]
        );
        Response::json($vacunaciones);
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
            'SELECT id FROM vacunaciones WHERE id = :id AND usuario_id = :uid',
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

        $this->show($id);
    }

    /**
     * Elimina una vacunación.
     * DELETE /api/vacunaciones/{id}
     */
    public function destroy(string $id): void
    {
        $uid = $this->usuarioId();
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
