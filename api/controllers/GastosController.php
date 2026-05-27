<?php
require_once __DIR__ . '/../helpers/Database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Validator.php';

class GastosController
{
    private function usuarioId(): int
    {
        return (int)AuthMiddleware::ejecutar()->sub;
    }

    public function index(): void
    {
        $uid = $this->usuarioId();
        $tipo = $_GET['tipo'] ?? null;
        $mes = $_GET['mes'] ?? null;
        $anio = $_GET['anio'] ?? null;
        $desde = $_GET['desde'] ?? null;
        $hasta = $_GET['hasta'] ?? null;

        $where = ['g.usuario_id = :uid'];
        $params = [':uid' => $uid];

        if ($tipo) {
            $where[] = 'g.tipo = :tipo';
            $params[':tipo'] = $tipo;
        }
        if ($mes) {
            $where[] = 'g.mes = :mes';
            $params[':mes'] = $mes . '-01';
        }
        if ($anio) {
            $where[] = 'YEAR(g.mes) = :anio';
            $params[':anio'] = (int)$anio;
        }
        if ($desde) {
            $where[] = 'g.mes >= :desde';
            $params[':desde'] = $desde;
        }
        if ($hasta) {
            $where[] = 'g.mes <= :hasta';
            $params[':hasta'] = $hasta;
        }

        $gastos = Database::query(
            'SELECT g.*, r.nombre as rebano_nombre
             FROM gastos g
             LEFT JOIN rebanos r ON r.id = g.rebano_id
             WHERE ' . implode(' AND ', $where) . '
             ORDER BY g.mes DESC, g.created_at DESC',
            $params
        );

        // Totales por tipo
        $totales = Database::query(
            'SELECT tipo, SUM(monto) as total FROM gastos WHERE usuario_id = :uid GROUP BY tipo',
            [':uid' => $uid]
        );

        Response::json([
            'gastos' => $gastos,
            'totales' => array_column($totales, 'total', 'tipo'),
        ]);
    }

    public function store(): void
    {
        $uid = $this->usuarioId();
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];

        $validador = new Validator();
        if (!$validador->validar($datos, [
            'tipo' => 'requerido|enum:mantenimiento,medicamentos,compras',
            'descripcion' => 'requerido|max:255',
            'monto' => 'requerido|numerico',
            'mes' => 'requerido',
        ])) {
            Response::error('Datos inválidos', 422, $validador->errores());
        }

        $mes = $datos['mes'];
        if (strlen($mes) === 7) $mes .= '-01';

        Database::execute(
            'INSERT INTO gastos (tipo, descripcion, monto, mes, rebano_id, usuario_id)
             VALUES (:tipo, :descripcion, :monto, :mes, :rebano, :uid)',
            [
                ':tipo' => $datos['tipo'],
                ':descripcion' => $datos['descripcion'],
                ':monto' => $datos['monto'],
                ':mes' => $mes,
                ':rebano' => $datos['rebano_id'] ?? null,
                ':uid' => $uid,
            ]
        );

        $id = Database::lastInsertId();
        $this->show($id);
    }

    public function show(string $id): void
    {
        $uid = $this->usuarioId();
        $gasto = Database::queryOne(
            'SELECT g.*, r.nombre as rebano_nombre
             FROM gastos g
             LEFT JOIN rebanos r ON r.id = g.rebano_id
             WHERE g.id = :id AND g.usuario_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        );
        if (!$gasto) Response::error('Gasto no encontrado', 404);
        Response::json($gasto);
    }

    public function update(string $id): void
    {
        $uid = $this->usuarioId();
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];

        $existente = Database::queryOne(
            'SELECT id FROM gastos WHERE id = :id AND usuario_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        );
        if (!$existente) Response::error('Gasto no encontrado', 404);

        $campos = [];
        $params = [':id' => (int)$id];

        foreach (['tipo', 'descripcion', 'monto', 'rebano_id'] as $campo) {
            if (isset($datos[$campo])) {
                $campos[] = "$campo = :$campo";
                $params[":$campo"] = $datos[$campo];
            }
        }
        if (isset($datos['mes'])) {
            $mes = $datos['mes'];
            if (strlen($mes) === 7) $mes .= '-01';
            $campos[] = 'mes = :mes';
            $params[':mes'] = $mes;
        }

        if (empty($campos)) Response::error('No hay datos para actualizar', 422);

        Database::execute(
            'UPDATE gastos SET ' . implode(', ', $campos) . ' WHERE id = :id',
            $params
        );

        $this->show($id);
    }

    public function destroy(string $id): void
    {
        $uid = $this->usuarioId();
        Database::execute(
            'DELETE FROM gastos WHERE id = :id AND usuario_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        );
        Response::json(['mensaje' => 'Gasto eliminado']);
    }
}
