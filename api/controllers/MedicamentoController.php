<?php
/**
 * Controlador de Medicamentos — Inventario
 */
require_once __DIR__ . '/../helpers/Database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Validator.php';

class MedicamentoController
{
    private function usuarioId(): int
    {
        return (int)AuthMiddleware::ejecutar()->sub;
    }

    /**
     * Lista medicamentos del usuario.
     * GET /api/medicamentos?search=
     */
    public function index(): void
    {
        $uid = $this->usuarioId();

        $where = 'usuario_id = :uid AND activo = 1';
        $params = [':uid' => $uid];

        $search = $_GET['search'] ?? null;
        if ($search) {
            $where .= ' AND nombre LIKE :search';
            $params[':search'] = "%{$search}%";
        }

        $medicamentos = Database::query(
            'SELECT * FROM medicamentos WHERE ' . $where . ' ORDER BY nombre',
            $params
        );

        // Totales
        $totales = Database::queryOne(
            'SELECT COUNT(*) as cantidad,
                    COALESCE(SUM(stock), 0) as total_stock,
                    COALESCE(SUM(stock * precio), 0) as total_valor
             FROM medicamentos WHERE ' . $where,
            $params
        );

        Response::json([
            'data'    => $medicamentos,
            'totales' => $totales,
        ]);
    }

    /**
     * Crea un medicamento.
     * POST /api/medicamentos
     */
    public function store(): void
    {
        $uid = $this->usuarioId();
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];

        $validador = new Validator();
        if (!$validador->validar($datos, [
            'nombre' => 'requerido|max:200',
            'unidad' => 'requerido|max:50',
            'stock'  => 'numerico',
        ])) {
            Response::error('Datos inválidos', 422, $validador->errores());
        }

        Database::execute(
            'INSERT INTO medicamentos (nombre, descripcion, stock, unidad, precio, fecha_vencimiento, usuario_id)
             VALUES (:nombre, :desc, :stock, :unidad, :precio, :venc, :uid)',
            [
                ':nombre' => $datos['nombre'],
                ':desc'   => $datos['descripcion'] ?? null,
                ':stock'  => isset($datos['stock']) ? (int)$datos['stock'] : 0,
                ':unidad' => $datos['unidad'],
                ':precio' => $datos['precio'] ?? null,
                ':venc'   => $datos['fecha_vencimiento'] ?? null,
                ':uid'    => $uid,
            ]
        );

        $id = Database::lastInsertId();
        $this->show($id);
    }

    /**
     * Muestra un medicamento.
     * GET /api/medicamentos/{id}
     */
    public function show(string $id): void
    {
        $uid = $this->usuarioId();
        $med = Database::queryOne(
            'SELECT * FROM medicamentos WHERE id = :id AND usuario_id = :uid AND activo = 1',
            [':id' => (int)$id, ':uid' => $uid]
        );
        if (!$med) Response::error('Medicamento no encontrado', 404);
        Response::json($med);
    }

    /**
     * Actualiza un medicamento.
     * PUT /api/medicamentos/{id}
     */
    public function update(string $id): void
    {
        $uid = $this->usuarioId();
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];

        $existente = Database::queryOne(
            'SELECT id FROM medicamentos WHERE id = :id AND usuario_id = :uid AND activo = 1',
            [':id' => (int)$id, ':uid' => $uid]
        );
        if (!$existente) Response::error('Medicamento no encontrado', 404);

        $campos = [];
        $params = [':id' => (int)$id];
        foreach (['nombre', 'descripcion', 'stock', 'unidad', 'precio', 'fecha_vencimiento'] as $c) {
            if (isset($datos[$c])) {
                $campos[] = "$c = :$c";
                $params[":$c"] = $datos[$c];
            }
        }
        if (empty($campos)) Response::error('No hay datos', 422);

        Database::execute(
            'UPDATE medicamentos SET ' . implode(', ', $campos) . ' WHERE id = :id',
            $params
        );
        $this->show($id);
    }

    /**
     * Marca un medicamento como agotado (inactivo + stock a cero).
     * PUT /api/medicamentos/{id}/agotar
     */
    public function agotar(string $id): void
    {
        $uid = $this->usuarioId();
        Database::execute(
            'UPDATE medicamentos SET activo = 0, stock = 0 WHERE id = :id AND usuario_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        );
        Response::json(['mensaje' => 'Medicamento marcado como agotado']);
    }

    /**
     * Medicamentos próximos a vencer (próximos 30 días).
     * GET /api/medicamentos/proximos-vencer
     */
    public function proximosVencer(): void
    {
        $uid = $this->usuarioId();
        $meds = Database::query(
            'SELECT * FROM medicamentos
             WHERE usuario_id = :uid AND activo = 1
               AND fecha_vencimiento IS NOT NULL
               AND fecha_vencimiento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
             ORDER BY fecha_vencimiento',
            [':uid' => $uid]
        );
        Response::json($meds);
    }
}
