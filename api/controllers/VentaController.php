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
     * GET /api/ventas
     */
    public function index(): void
    {
        $uid = $this->usuarioId();
        $ventas = Database::query(
            'SELECT v.*, a.nombre as animal_nombre,
                    u.nombre as vendedor_nombre
             FROM ventas v
             JOIN animales a ON a.id = v.animal_id
             JOIN usuarios u ON u.id = v.vendedor_id
             WHERE v.vendedor_id = :uid
             ORDER BY v.fecha DESC',
            [':uid' => $uid]
        );
        Response::json($ventas);
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
     * Muestra una venta.
     * GET /api/ventas/{id}
     */
    public function show(string $id): void
    {
        $uid = $this->usuarioId();
        $venta = Database::queryOne(
            'SELECT v.*, a.nombre as animal_nombre, u.nombre as vendedor_nombre
             FROM ventas v
             JOIN animales a ON a.id = v.animal_id
             JOIN usuarios u ON u.id = v.vendedor_id
             WHERE v.id = :id AND (v.vendedor_id = :uid OR v.comprador_id = :uid2)',
            [':id' => (int)$id, ':uid' => $uid, ':uid2' => $uid]
        );
        if (!$venta) Response::error('Venta no encontrada', 404);
        Response::json($venta);
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
