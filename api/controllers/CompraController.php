<?php
/**
 * Controlador de Compras — Registro de animales comprados por lote
 */
require_once __DIR__ . '/../helpers/Database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Validator.php';
require_once __DIR__ . '/../helpers/CalculadorEdad.php';

class CompraController
{
    private function usuarioId(): int
    {
        return (int)AuthMiddleware::ejecutar()->sub;
    }

    /**
     * Lista compras (lotes) del usuario.
     * GET /api/compras
     */
    public function index(): void
    {
        $uid = $this->usuarioId();

        $compras = Database::query(
            'SELECT c.*,
                    COUNT(a.id) as total_animales,
                    COALESCE(SUM(a.precio_compra), 0) as total_costo
             FROM compras c
             LEFT JOIN animales a ON a.compra_id = c.id
             WHERE c.usuario_id = :uid
             GROUP BY c.id
             ORDER BY c.fecha_compra DESC, c.created_at DESC',
            [':uid' => $uid]
        );

        Response::json($compras);
    }

    /**
     * Muestra una compra con sus animales.
     * GET /api/compras/{id}
     */
    public function show(string $id): void
    {
        $uid = $this->usuarioId();

        $compra = Database::queryOne(
            'SELECT c.*,
                    COUNT(a.id) as total_animales,
                    COALESCE(SUM(a.precio_compra), 0) as total_costo
             FROM compras c
             LEFT JOIN animales a ON a.compra_id = c.id
             WHERE c.id = :id AND c.usuario_id = :uid
             GROUP BY c.id',
            [':id' => (int)$id, ':uid' => $uid]
        );

        if (!$compra) Response::error('Compra no encontrada', 404);

        $animales = Database::query(
            'SELECT a.id, a.nombre, a.identificacion, a.sexo,
                    a.fecha_nacimiento, a.fecha_ingreso, a.etapa, a.estado_reproductivo,
                    a.peso_entrada, a.precio_compra,
                    r.nombre as rebano_nombre, a.rebano_id
             FROM animales a
             LEFT JOIN rebanos r ON r.id = a.rebano_id
             WHERE a.compra_id = :id AND a.usuario_id = :uid
             ORDER BY a.nombre',
            [':id' => (int)$id, ':uid' => $uid]
        );

        $compra['animales'] = $animales;
        Response::json($compra);
    }

    /**
     * Registra una nueva compra por lote.
     * POST /api/compras
     *
     * Body: {
     *   proveedor: "Nombre del vendedor",
     *   fecha_compra: "2026-06-06",
     *   rebano_id: 1,
     *   notas: "opcional",
     *   animales: [
     *     { nombre, sexo, identificacion?, fecha_nacimiento, peso_entrada?, precio_compra? },
     *     ...
     *   ]
     * }
     */
    public function store(): void
    {
        $uid = $this->usuarioId();
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];

        // ── Validar cabecera ──
        $validador = new Validator();
        if (!$validador->validar($datos, [
            'proveedor'    => 'requerido|max:200',
            'fecha_compra' => 'requerido|fecha',
            'rebano_id'    => 'requerido|numerico',
        ])) {
            Response::error('Datos inválidos', 422, $validador->errores());
        }

        // Validar que el rebaño existe
        $rebano = Database::queryOne(
            'SELECT id, nombre FROM rebanos WHERE id = :id AND usuario_id = :uid AND activo = 1',
            [':id' => (int)$datos['rebano_id'], ':uid' => $uid]
        );
        if (!$rebano) Response::error('Rebaño no encontrado o inactivo', 404);

        // ── Validar animales ──
        $animales = $datos['animales'] ?? [];
        if (empty($animales)) {
            Response::error('Debe incluir al menos un animal en la compra', 422);
        }

        foreach ($animales as $i => $a) {
            if (empty($a['nombre']) || empty($a['sexo']) || empty($a['fecha_nacimiento'])) {
                Response::error("El animal #" . ($i + 1) . " debe tener nombre, sexo y fecha de nacimiento", 422);
            }
            if (!in_array($a['sexo'], ['Macho', 'Hembra'])) {
                Response::error("El animal #" . ($i + 1) . " tiene un sexo inválido", 422);
            }
        }

        // ── Insertar compra (con transacción manual vía PDO) ──
        $pdo = Database::conectar();
        $pdo->beginTransaction();

        try {
            Database::execute(
                'INSERT INTO compras (proveedor, fecha_compra, notas, usuario_id)
                 VALUES (:proveedor, :fecha, :notas, :uid)',
                [
                    ':proveedor' => $datos['proveedor'],
                    ':fecha'     => $datos['fecha_compra'],
                    ':notas'     => $datos['notas'] ?? null,
                    ':uid'       => $uid,
                ]
            );

            $compraId = (int)Database::lastInsertId();
            $totalCompra = 0;

            // ── Insertar animales ──
            foreach ($animales as $a) {
                $edad = CalculadorEdad::calcular($a['fecha_nacimiento']);
                $etapa = CalculadorEdad::determinarEtapa($edad['total_meses']);

                $estadoRepro = $a['estado_reproductivo'] ?? null;
                if ($a['sexo'] === 'Hembra' && empty($estadoRepro)) {
                    $estadoRepro = 'Vacia';
                }

                $precioCompra = isset($a['precio_compra']) ? (float)$a['precio_compra'] : null;

                Database::execute(
                    'INSERT INTO animales
                        (nombre, identificacion, sexo, fecha_nacimiento, rebano_id, etapa,
                         estado_reproductivo, peso_entrada, precio_compra, precio_kg,
                         origen, fecha_ingreso, compra_id, usuario_id)
                     VALUES
                        (:nombre, :identificacion, :sexo, :fecha, :rebano, :etapa,
                         :estado, :peso, :precio_compra, :precio_kg,
                         \'Compra\', :fecha_ingreso, :compra_id, :uid)',
                    [
                        ':nombre'          => $a['nombre'],
                        ':identificacion'   => $a['identificacion'] ?? null,
                        ':sexo'             => $a['sexo'],
                        ':fecha'            => $a['fecha_nacimiento'],
                        ':rebano'           => (int)$datos['rebano_id'],
                        ':etapa'            => $etapa,
                        ':estado'           => $estadoRepro,
                        ':peso'             => isset($a['peso_entrada']) ? (float)$a['peso_entrada'] : null,
                        ':precio_compra'    => $precioCompra,
                        ':precio_kg'        => isset($a['precio_kg']) ? (float)$a['precio_kg'] : null,
                        ':fecha_ingreso'    => $datos['fecha_compra'],
                        ':compra_id'        => $compraId,
                        ':uid'              => $uid,
                    ]
                );

                if ($precioCompra) {
                    $totalCompra += $precioCompra;
                }
            }

            // Actualizar total de la compra
            Database::execute(
                'UPDATE compras SET total = :total WHERE id = :id',
                [':total' => $totalCompra, ':id' => $compraId]
            );

            $pdo->commit();

            // Responder con la compra creada
            $this->show((string)$compraId);

        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            Response::error('Error al registrar la compra: ' . $e->getMessage(), 500);
        }
    }
}
