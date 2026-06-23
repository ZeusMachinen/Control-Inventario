<?php
/**
 * Controlador de Reproducción — Flujo Completo
 *
 * 4 eventos: Diagnóstico de Celo → Servicio → Diagnóstico de Gestación → Parto
 * Máquina de estados: actualiza animales.estado_reproductivo en cada store
 *
 * Rutas:
 *   GET    /api/reproduccion/celos              → indexCelo()
 *   POST   /api/reproduccion/celos              → storeCelo()
 *   GET    /api/reproduccion/celos/{id}         → showCelo()
 *   PUT    /api/reproduccion/celos/{id}         → updateCelo()
 *   DELETE /api/reproduccion/celos/{id}         → destroyCelo()
 *   POST   /api/reproduccion/celos/{id}/servicio → storeServicio()
 *   GET    /api/reproduccion/servicios          → indexServicio()
 *   POST   /api/reproduccion/servicios          → storeServicio()
 *   GET    /api/reproduccion/servicios/{id}     → showServicio()
 *   PUT    /api/reproduccion/servicios/{id}     → updateServicio()
 *   DELETE /api/reproduccion/servicios/{id}     → destroyServicio()
 *   POST   /api/reproduccion/servicios/{id}/diagnostico → storeDiagnosticoGestacion()
 *   GET    /api/reproduccion/diagnosticos-gestacion    → indexDiagnosticoGestacion()
 *   POST   /api/reproduccion/diagnosticos-gestacion    → storeDiagnosticoGestacion()
 *   GET    /api/reproduccion/diagnosticos-gestacion/{id} → showDiagnosticoGestacion()
 *   PUT    /api/reproduccion/diagnosticos-gestacion/{id} → updateDiagnosticoGestacion()
 *   DELETE /api/reproduccion/diagnosticos-gestacion/{id} → destroyDiagnosticoGestacion()
 *   POST   /api/reproduccion/diagnosticos-gestacion/{id}/parto → storeParto()
 *   GET    /api/reproduccion/partos             → indexParto()
 *   POST   /api/reproduccion/partos             → storeParto()
 *   GET    /api/reproduccion/partos/{id}        → showParto()
 *   PUT    /api/reproduccion/partos/{id}        → updateParto()
 *   DELETE /api/reproduccion/partos/{id}        → destroyParto()
 *   GET    /api/reproduccion/timeline/{animal_id} → timeline()
 */
require_once __DIR__ . '/../helpers/Database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Validator.php';
require_once __DIR__ . '/../helpers/CalculadorEdad.php';

class ReproduccionController
{
    private function usuarioId(): int
    {
        return (int)AuthMiddleware::ejecutar()->sub;
    }

    // ═══════════════════════════════════════════════════════════
    // DIAGNÓSTICOS DE CELO
    // ═══════════════════════════════════════════════════════════

    /**
     * Lista diagnósticos de celo.
     * GET /api/reproduccion/celos
     */
    public function indexCelo(): void
    {
        $uid = $this->usuarioId();
        $incluirInactivos = !empty($_GET['inactivos']);
        $sql = 'SELECT dc.*, a.nombre as animal_nombre
                FROM diagnosticos_celo dc
                JOIN animales a ON a.id = dc.animal_id
                WHERE dc.usuario_id = :uid';
        if (!$incluirInactivos) $sql .= ' AND a.activo = 1';
        $sql .= ' ORDER BY dc.fecha_inicio DESC';
        $celos = Database::query($sql, [':uid' => $uid]);
        Response::json($celos);
    }

    /**
     * Registra un diagnóstico de celo.
     * POST /api/reproduccion/celos
     */
    public function storeCelo(): void
    {
        $uid = $this->usuarioId();
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];

        $validador = new Validator();
        if (!$validador->validar($datos, [
            'animal_id'    => 'requerido|numerico',
            'fecha_inicio' => 'requerido|fecha',
        ])) {
            Response::error('Datos inválidos', 422, $validador->errores());
        }

        // Validar que el animal existe, es Hembra, activo y del usuario
        $animal = Database::queryOne(
            'SELECT id, sexo, estado_reproductivo, fecha_nacimiento, nombre
             FROM animales WHERE id = :id AND usuario_id = :uid AND activo = 1 AND estado_general = \'Activo\'',
            [':id' => (int)$datos['animal_id'], ':uid' => $uid]
        );
        if (!$animal) Response::error('Animal no encontrado', 404);
        if ($animal['sexo'] !== 'Hembra') Response::error('Solo se puede registrar celo en hembras', 422);

        // Validar edad mínima: 15 meses
        $edadMeses = CalculadorEdad::calcular($animal['fecha_nacimiento'])['total_meses'];
        if ($edadMeses < 15) {
            Response::error('La hembra debe tener al menos 15 meses para registrar celo', 422);
        }

        $fechaPosibleServicio = CalculadorEdad::proximoCelo($datos['fecha_inicio']);

        Database::execute(
            'INSERT INTO diagnosticos_celo (animal_id, fecha_inicio, fecha_fin, sintomas, comportamiento, observaciones, usuario_id)
             VALUES (:animal, :fecha, :fecha_fin, :sintomas, :comportamiento, :obs, :uid)',
            [
                ':animal'         => (int)$datos['animal_id'],
                ':fecha'          => $datos['fecha_inicio'],
                ':fecha_fin'      => $datos['fecha_fin'] ?? null,
                ':sintomas'       => $datos['sintomas'] ?? null,
                ':comportamiento' => $datos['comportamiento'] ?? null,
                ':obs'            => $datos['observaciones'] ?? null,
                ':uid'            => $uid,
            ]
        );

        $id = Database::lastInsertId();
        Response::json(['id' => (int)$id, 'mensaje' => 'Diagnóstico de celo registrado correctamente']);
    }

    /**
     * Muestra un diagnóstico de celo.
     * GET /api/reproduccion/celos/{id}
     */
    public function showCelo(string $id): void
    {
        $uid = $this->usuarioId();
        $celo = Database::queryOne(
            'SELECT dc.*, a.nombre as animal_nombre
             FROM diagnosticos_celo dc
             JOIN animales a ON a.id = dc.animal_id
             WHERE dc.id = :id AND dc.usuario_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        );
        if (!$celo) Response::error('Registro no encontrado', 404);
        Response::json($celo);
    }

    /**
     * Actualiza un diagnóstico de celo.
     * PUT /api/reproduccion/celos/{id}
     */
    public function updateCelo(string $id): void
    {
        $uid = $this->usuarioId();
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];

        $existente = Database::queryOne(
            'SELECT id FROM diagnosticos_celo WHERE id = :id AND usuario_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        );
        if (!$existente) Response::error('Registro no encontrado', 404);

        $campos = [];
        $params = [':id' => (int)$id];

        foreach (['fecha_inicio', 'fecha_fin', 'sintomas', 'comportamiento', 'observaciones'] as $c) {
            if (isset($datos[$c])) {
                $campos[] = "$c = :$c";
                $params[":$c"] = $datos[$c];
            }
        }

        if (!empty($campos)) {
            Database::execute(
                'UPDATE diagnosticos_celo SET ' . implode(', ', $campos) . ' WHERE id = :id',
                $params
            );
        }

        $this->showCelo($id);
    }

    /**
     * Elimina un diagnóstico de celo.
     * DELETE /api/reproduccion/celos/{id}
     */
    public function destroyCelo(string $id): void
    {
        $uid = $this->usuarioId();
        $existente = Database::queryOne(
            'SELECT id FROM diagnosticos_celo WHERE id = :id AND usuario_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        );
        if (!$existente) Response::error('Registro no encontrado', 404);

        Database::execute(
            'DELETE FROM diagnosticos_celo WHERE id = :id',
            [':id' => (int)$id]
        );
        Response::json(['mensaje' => 'Diagnóstico de celo eliminado']);
    }

    // ═══════════════════════════════════════════════════════════
    // SERVICIOS
    // ═══════════════════════════════════════════════════════════

    /**
     * Lista servicios.
     * GET /api/reproduccion/servicios
     */
    public function indexServicio(): void
    {
        $uid = $this->usuarioId();
        $incluirInactivos = !empty($_GET['inactivos']);
        $sql = 'SELECT s.*, a.nombre as animal_nombre,
                       dc.fecha_inicio as celo_fecha_inicio,
                       r.nombre as reproductor_nombre_animal
                FROM servicios s
                JOIN animales a ON a.id = s.animal_id
                LEFT JOIN diagnosticos_celo dc ON dc.id = s.diagnostico_celo_id
                LEFT JOIN animales r ON r.id = s.reproductor_id
                WHERE s.usuario_id = :uid';
        if (!$incluirInactivos) $sql .= ' AND a.activo = 1';
        $sql .= ' ORDER BY s.fecha DESC';
        $servicios = Database::query($sql, [':uid' => $uid]);
        Response::json($servicios);
    }

    /**
     * Registra un servicio.
     *
     * Puede llamarse desde:
     *   POST /api/reproduccion/servicios                    → standalone
     *   POST /api/reproduccion/celos/{id}/servicio          → vinculado a diagnóstico de celo
     *
     * @param string|null $id ID del diagnóstico de celo (desde ruta anidada)
     */
    public function storeServicio(?string $id = null): void
    {
        $uid = $this->usuarioId();
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];

        // Si viene de ruta anidada, el {id} es el diagnostico_celo_id
        $diagnosticoCeloId = $id ?? $datos['diagnostico_celo_id'] ?? null;

        $validador = new Validator();
        if (!$validador->validar($datos, [
            'animal_id' => 'requerido|numerico',
            'tipo'      => 'enum:Monta Natural,Inseminación Artificial,Transferencia de Embriones',
            'fecha'     => 'requerido|fecha',
        ])) {
            Response::error('Datos inválidos', 422, $validador->errores());
        }

        // Validar animal: Hembra, Activo
        $animal = Database::queryOne(
            'SELECT id, sexo, nombre FROM animales
             WHERE id = :id AND usuario_id = :uid AND activo = 1 AND estado_general = \'Activo\'',
            [':id' => (int)$datos['animal_id'], ':uid' => $uid]
        );
        if (!$animal) Response::error('Animal no encontrado', 404);
        if ($animal['sexo'] !== 'Hembra') Response::error('Solo se puede registrar servicio en hembras', 422);

        // Si se vincula a diagnóstico de celo, validar que existe y pertenece al mismo animal
        if ($diagnosticoCeloId) {
            $celo = Database::queryOne(
                'SELECT id FROM diagnosticos_celo WHERE id = :id AND animal_id = :animal AND usuario_id = :uid',
                [':id' => (int)$diagnosticoCeloId, ':animal' => (int)$datos['animal_id'], ':uid' => $uid]
            );
            if (!$celo) Response::error('Diagnóstico de celo no válido para este animal', 422);
        }

        Database::execute(
            'INSERT INTO servicios (diagnostico_celo_id, animal_id, tipo, reproductor_id, reproductor_nombre, fecha, observaciones, usuario_id)
             VALUES (:dc_id, :animal, :tipo, :rep_id, :rep_nombre, :fecha, :obs, :uid)',
            [
                ':dc_id'     => $diagnosticoCeloId ? (int)$diagnosticoCeloId : null,
                ':animal'    => (int)$datos['animal_id'],
                ':tipo'      => $datos['tipo'] ?? 'Monta Natural',
                ':rep_id'    => !empty($datos['reproductor_id']) ? (int)$datos['reproductor_id'] : null,
                ':rep_nombre' => $datos['reproductor_nombre'] ?? null,
                ':fecha'     => $datos['fecha'],
                ':obs'       => $datos['observaciones'] ?? null,
                ':uid'       => $uid,
            ]
        );

        // Máquina de estados: Servicio → Prenada
        Database::execute(
            'UPDATE animales SET estado_reproductivo = \'Prenada\' WHERE id = :id',
            [':id' => (int)$datos['animal_id']]
        );

        $nuevoId = Database::lastInsertId();
        Response::json(['id' => (int)$nuevoId, 'mensaje' => 'Servicio registrado correctamente']);
    }

    /**
     * Muestra un servicio.
     * GET /api/reproduccion/servicios/{id}
     */
    public function showServicio(string $id): void
    {
        $uid = $this->usuarioId();
        $servicio = Database::queryOne(
            'SELECT s.*, a.nombre as animal_nombre,
                    dc.fecha_inicio as celo_fecha_inicio,
                    r.nombre as reproductor_nombre_animal
             FROM servicios s
             JOIN animales a ON a.id = s.animal_id
             LEFT JOIN diagnosticos_celo dc ON dc.id = s.diagnostico_celo_id
             LEFT JOIN animales r ON r.id = s.reproductor_id
             WHERE s.id = :id AND s.usuario_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        );
        if (!$servicio) Response::error('Servicio no encontrado', 404);
        Response::json($servicio);
    }

    /**
     * Actualiza un servicio.
     * PUT /api/reproduccion/servicios/{id}
     */
    public function updateServicio(string $id): void
    {
        $uid = $this->usuarioId();
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];

        $existente = Database::queryOne(
            'SELECT id FROM servicios WHERE id = :id AND usuario_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        );
        if (!$existente) Response::error('Servicio no encontrado', 404);

        $campos = [];
        $params = [':id' => (int)$id];

        foreach (['tipo', 'reproductor_id', 'reproductor_nombre', 'fecha', 'observaciones'] as $c) {
            if (isset($datos[$c])) {
                $campos[] = "$c = :$c";
                $params[":$c"] = $datos[$c];
            }
        }

        if (empty($campos)) Response::error('No hay datos para actualizar', 422);

        Database::execute(
            'UPDATE servicios SET ' . implode(', ', $campos) . ' WHERE id = :id',
            $params
        );

        $this->showServicio($id);
    }

    /**
     * Elimina un servicio.
     * DELETE /api/reproduccion/servicios/{id}
     */
    public function destroyServicio(string $id): void
    {
        $uid = $this->usuarioId();
        $existente = Database::queryOne(
            'SELECT id FROM servicios WHERE id = :id AND usuario_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        );
        if (!$existente) Response::error('Servicio no encontrado', 404);

        Database::execute(
            'DELETE FROM servicios WHERE id = :id',
            [':id' => (int)$id]
        );
        Response::json(['mensaje' => 'Servicio eliminado']);
    }

    // ═══════════════════════════════════════════════════════════
    // DIAGNÓSTICOS DE GESTACIÓN
    // ═══════════════════════════════════════════════════════════

    /**
     * Lista diagnósticos de gestación.
     * GET /api/reproduccion/diagnosticos-gestacion
     */
    public function indexDiagnosticoGestacion(): void
    {
        $uid = $this->usuarioId();
        $incluirInactivos = !empty($_GET['inactivos']);
        $sql = 'SELECT dg.*, a.nombre as animal_nombre, s.fecha as servicio_fecha, s.tipo as servicio_tipo
                FROM diagnosticos_gestacion dg
                JOIN animales a ON a.id = dg.animal_id
                LEFT JOIN servicios s ON s.id = dg.servicio_id
                WHERE dg.usuario_id = :uid';
        if (!$incluirInactivos) $sql .= ' AND a.activo = 1';
        $sql .= ' ORDER BY dg.fecha DESC';
        $diagnosticos = Database::query($sql, [':uid' => $uid]);
        Response::json($diagnosticos);
    }

    /**
     * Registra un diagnóstico de gestación.
     *
     * Puede llamarse desde:
     *   POST /api/reproduccion/diagnosticos-gestacion              → standalone
     *   POST /api/reproduccion/servicios/{id}/diagnostico          → vinculado a servicio
     *
     * @param string|null $id ID del servicio (desde ruta anidada)
     */
    public function storeDiagnosticoGestacion(?string $id = null): void
    {
        $uid = $this->usuarioId();
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];

        // Si viene de ruta anidada, el {id} es el servicio_id
        $servicioId = $id ?? $datos['servicio_id'] ?? null;

        $validador = new Validator();
        if (!$validador->validar($datos, [
            'fecha'     => 'requerido|fecha',
            'metodo'    => 'enum:Palpación,Ecografía',
            'resultado' => 'requerido|enum:Positivo,Negativo',
        ])) {
            Response::error('Datos inválidos', 422, $validador->errores());
        }

        if ($servicioId) {
            // Validar que el servicio existe y pertenece al usuario
            $servicio = Database::queryOne(
                'SELECT s.id, s.animal_id FROM servicios s
                 WHERE s.id = :id AND s.usuario_id = :uid',
                [':id' => (int)$servicioId, ':uid' => $uid]
            );
            if (!$servicio) Response::error('Servicio no encontrado', 404);
            $animalId = (int)$servicio['animal_id'];
        } else {
            // Sin servicio asociado — obtener animal_id del payload
            $animalId = (int)($datos['animal_id'] ?? 0);
            if (!$animalId) Response::error('Debe especificar un animal_id si no asocia un servicio', 422);
            // Validar que el animal existe y es del usuario
            $animal = Database::queryOne(
                'SELECT id FROM animales WHERE id = :id AND usuario_id = :uid AND activo = 1',
                [':id' => $animalId, ':uid' => $uid]
            );
            if (!$animal) Response::error('Animal no encontrado', 404);
        }

        Database::execute(
            'INSERT INTO diagnosticos_gestacion (servicio_id, animal_id, fecha, metodo, resultado, meses_gestacion, observaciones, usuario_id)
             VALUES (:servicio, :animal, :fecha, :metodo, :resultado, :meses, :obs, :uid)',
            [
                ':servicio'  => $servicioId ? (int)$servicioId : null,
                ':animal'    => $animalId,
                ':fecha'     => $datos['fecha'],
                ':metodo'    => $datos['metodo'] ?? 'Palpación',
                ':resultado' => $datos['resultado'],
                ':meses'     => isset($datos['meses_gestacion']) ? (float)$datos['meses_gestacion'] : null,
                ':obs'       => $datos['observaciones'] ?? null,
                ':uid'       => $uid,
            ]
        );

        // Máquina de estados: resultado Negativo → Vacia
        if ($datos['resultado'] === 'Negativo') {
            Database::execute(
                'UPDATE animales SET estado_reproductivo = \'Vacia\' WHERE id = :id',
                [':id' => $animalId]
            );
        }
        // Si es Positivo, el estado se mantiene como Prenada (sin cambios)

        $nuevoId = Database::lastInsertId();
        Response::json(['id' => (int)$nuevoId, 'mensaje' => 'Diagnóstico de gestación registrado correctamente']);
    }

    /**
     * Muestra un diagnóstico de gestación.
     * GET /api/reproduccion/diagnosticos-gestacion/{id}
     */
    public function showDiagnosticoGestacion(string $id): void
    {
        $uid = $this->usuarioId();
        $dg = Database::queryOne(
            'SELECT dg.*, a.nombre as animal_nombre, s.fecha as servicio_fecha, s.tipo as servicio_tipo
             FROM diagnosticos_gestacion dg
             JOIN animales a ON a.id = dg.animal_id
             LEFT JOIN servicios s ON s.id = dg.servicio_id
             WHERE dg.id = :id AND dg.usuario_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        );
        if (!$dg) Response::error('Diagnóstico no encontrado', 404);
        Response::json($dg);
    }

    /**
     * Actualiza un diagnóstico de gestación.
     * PUT /api/reproduccion/diagnosticos-gestacion/{id}
     */
    public function updateDiagnosticoGestacion(string $id): void
    {
        $uid = $this->usuarioId();
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];

        $existente = Database::queryOne(
            'SELECT id, animal_id FROM diagnosticos_gestacion WHERE id = :id AND usuario_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        );
        if (!$existente) Response::error('Diagnóstico no encontrado', 404);

        $campos = [];
        $params = [':id' => (int)$id];

        foreach (['fecha', 'metodo', 'resultado', 'meses_gestacion', 'observaciones'] as $c) {
            if (isset($datos[$c])) {
                $campos[] = "$c = :$c";
                $params[":$c"] = $datos[$c];
            }
        }

        if (empty($campos)) Response::error('No hay datos para actualizar', 422);

        Database::execute(
            'UPDATE diagnosticos_gestacion SET ' . implode(', ', $campos) . ' WHERE id = :id',
            $params
        );

        $this->showDiagnosticoGestacion($id);
    }

    /**
     * Elimina un diagnóstico de gestación.
     * DELETE /api/reproduccion/diagnosticos-gestacion/{id}
     */
    public function destroyDiagnosticoGestacion(string $id): void
    {
        $uid = $this->usuarioId();
        $existente = Database::queryOne(
            'SELECT id FROM diagnosticos_gestacion WHERE id = :id AND usuario_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        );
        if (!$existente) Response::error('Diagnóstico no encontrado', 404);

        Database::execute(
            'DELETE FROM diagnosticos_gestacion WHERE id = :id',
            [':id' => (int)$id]
        );
        Response::json(['mensaje' => 'Diagnóstico de gestación eliminado']);
    }

    // ═══════════════════════════════════════════════════════════
    // PARTOS
    // ═══════════════════════════════════════════════════════════

    /**
     * Obtiene partos implícitos: animales que figuran como hijos (madre_id)
     * pero cuyo parto no está registrado formalmente en la tabla partos.
     *
     * Agrupa por madre + fecha_nacimiento para evitar duplicar mellizos
     * y excluye combinaciones que ya tienen un parto formal registrado.
     *
     * @return array Partos implícitos con misma estructura que uno formal + campo 'implicito'
     */
    private function obtenerPartosImplicitos(int $uid, ?int $animalId = null): array
    {
        $sql = "SELECT
                    madre.id as animal_id,
                    madre.nombre as animal_nombre,
                    hijo.id as cria_id,
                    hijo.nombre as cria_nombre,
                    hijo.sexo as cria_sexo,
                    hijo.fecha_nacimiento as fecha,
                    hijo.peso_entrada as cria_peso
                FROM animales hijo
                JOIN animales madre ON madre.id = hijo.madre_id
                WHERE madre.usuario_id = :uid
                  AND madre.activo = 1
                  AND NOT EXISTS (
                    SELECT 1 FROM partos p
                    WHERE p.animal_id = madre.id
                      AND p.fecha = hijo.fecha_nacimiento
                      AND p.usuario_id = :uid2
                  )";

        $params = [':uid' => $uid, ':uid2' => $uid];

        if ($animalId) {
            $sql .= ' AND madre.id = :aid';
            $params[':aid'] = $animalId;
        }

        $sql .= ' ORDER BY hijo.fecha_nacimiento DESC, madre.id';

        $filas = Database::query($sql, $params);

        // Agrupar por (madre, fecha) — un parto puede tener múltiples crías
        $grupos = [];
        foreach ($filas as $f) {
            $key = $f['animal_id'] . '_' . $f['fecha'];
            if (!isset($grupos[$key])) {
                $grupos[$key] = [
                    'id'                       => null,
                    'diagnostico_gestacion_id' => null,
                    'animal_id'                => (int)$f['animal_id'],
                    'animal_nombre'            => $f['animal_nombre'],
                    'fecha'                    => $f['fecha'],
                    'crias'                    => [],
                    'observaciones'            => null,
                    'created_at'               => null,
                    'implicito'                => true,
                ];
            }
            $grupos[$key]['crias'][] = [
                'nombre'   => $f['cria_nombre'],
                'sexo'     => $f['cria_sexo'],
                'cantidad' => 1,
                'peso'     => $f['cria_peso'] ? (float)$f['cria_peso'] : null,
            ];
        }

        // Convertir a array final con crias como JSON
        $resultado = [];
        foreach ($grupos as $g) {
            $total = count($g['crias']);
            $g['crias'] = json_encode($g['crias'], JSON_UNESCAPED_UNICODE);
            $g['observaciones'] = "Implícito — $total cría(s) desde registro de animales";
            $resultado[] = $g;
        }

        return $resultado;
    }

    /**
     * Lista partos.
     * GET /api/reproduccion/partos
     */
    public function indexParto(): void
    {
        $uid = $this->usuarioId();
        $incluirInactivos = !empty($_GET['inactivos']);
        $sql = 'SELECT p.*, a.nombre as animal_nombre
                FROM partos p
                JOIN animales a ON a.id = p.animal_id
                WHERE p.usuario_id = :uid';
        if (!$incluirInactivos) $sql .= ' AND a.activo = 1';
        $sql .= ' ORDER BY p.fecha DESC';
        $partosFormales = Database::query($sql, [':uid' => $uid]);

        // Partos implícitos (hijos con madre_id sin parto formal)
        $partosImplicitos = $this->obtenerPartosImplicitos($uid);

        $todos = array_merge($partosFormales, $partosImplicitos);
        usort($todos, fn($a, $b) => strcmp($b['fecha'], $a['fecha']));

        Response::json($todos);
    }

    /**
     * Registra un parto.
     *
     * Puede llamarse desde:
     *   POST /api/reproduccion/partos                               → standalone
     *   POST /api/reproduccion/diagnosticos-gestacion/{id}/parto    → vinculado a diagnóstico de gestación
     *
     * @param string|null $id ID del diagnóstico de gestación (desde ruta anidada)
     */
    public function storeParto(?string $id = null): void
    {
        $uid = $this->usuarioId();
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];

        // Si viene de ruta anidada, el {id} es el diagnostico_gestacion_id
        $diagnosticoGestacionId = $id ?? $datos['diagnostico_gestacion_id'] ?? null;

        $validador = new Validator();
        if (!$validador->validar($datos, [
            'animal_id' => 'requerido|numerico',
            'fecha'     => 'requerido|fecha',
        ])) {
            Response::error('Datos inválidos', 422, $validador->errores());
        }

        $animalId = (int)$datos['animal_id'];

        // Validar madre
        $madre = Database::queryOne(
            'SELECT id, nombre, sexo, estado_reproductivo, rebano_id, usuario_id
             FROM animales WHERE id = :id AND usuario_id = :uid AND activo = 1',
            [':id' => $animalId, ':uid' => $uid]
        );
        if (!$madre) Response::error('Animal no encontrado', 404);
        if ($madre['sexo'] !== 'Hembra') Response::error('Solo hembras pueden tener partos', 422);

        // Si se vincula a diagnóstico de gestación, validar
        if ($diagnosticoGestacionId) {
            $dg = Database::queryOne(
                'SELECT id FROM diagnosticos_gestacion WHERE id = :id AND animal_id = :animal AND usuario_id = :uid',
                [':id' => (int)$diagnosticoGestacionId, ':animal' => $animalId, ':uid' => $uid]
            );
            if (!$dg) Response::error('Diagnóstico de gestación no válido para este animal', 422);
        }

        // Procesar crias
        $crias = [];
        if (!empty($datos['crias'])) {
            $crias = is_string($datos['crias'])
                ? json_decode($datos['crias'], true)
                : $datos['crias'];
            if (!is_array($crias)) $crias = [];
        }

        // INSERT parto
        Database::execute(
            'INSERT INTO partos (diagnostico_gestacion_id, animal_id, fecha, crias, observaciones, usuario_id)
             VALUES (:dg_id, :animal, :fecha, :crias_json, :obs, :uid)',
            [
                ':dg_id'     => $diagnosticoGestacionId ? (int)$diagnosticoGestacionId : null,
                ':animal'    => $animalId,
                ':fecha'     => $datos['fecha'],
                ':crias_json' => !empty($crias) ? json_encode($crias, JSON_UNESCAPED_UNICODE) : null,
                ':obs'       => $datos['observaciones'] ?? null,
                ':uid'       => $uid,
            ]
        );

        $partoId = Database::lastInsertId();

        // Crear registros de crías en animales
        foreach ($crias as $cria) {
            $cnt = max(1, (int)($cria['cantidad'] ?? 1));
            $sexo = $cria['sexo'] ?? 'Macho';
            $peso = $cria['peso'] ?? $cria['peso_promedio'] ?? null;

            for ($i = 0; $i < $cnt; $i++) {
                // Generar nombre para cada cría
                if ($cnt > 1) {
                    $nombre = ($cria['nombre'] ?? "Cría de {$madre['nombre']}") . ' #' . ($i + 1);
                } else {
                    $nombre = $cria['nombre'] ?? "Cría de {$madre['nombre']}";
                }

                $estadoRepro = ($sexo === 'Hembra') ? 'Vacia' : null;

                Database::execute(
                    'INSERT INTO animales (nombre, sexo, fecha_nacimiento, rebano_id, rebano_nacimiento_id, madre_id, etapa, estado_reproductivo, peso_entrada, usuario_id, activo, estado_general)
                     VALUES (:nombre, :sexo, :fecha, :rebano, :rebano_nac, :madre, :etapa, :estado, :peso, :uid, 1, \'Activo\')',
                    [
                        ':nombre'     => $nombre,
                        ':sexo'       => $sexo,
                        ':fecha'      => $datos['fecha'],
                        ':rebano'     => $madre['rebano_id'],
                        ':rebano_nac' => $madre['rebano_id'],
                        ':madre'      => $animalId,
                        ':etapa'      => 'Ternero',
                        ':estado'     => $estadoRepro,
                        ':peso'       => $peso,
                        ':uid'        => $uid,
                    ]
                );
            }
        }

        // Máquina de estados: Parto → Lactando (solo si ≤ 8 meses)
        $mesesDesdeParto = CalculadorEdad::calcularHasta($datos['fecha'], date('Y-m-d'))['total_meses'];
        if ($mesesDesdeParto <= 8) {
            Database::execute(
                'UPDATE animales SET estado_reproductivo = \'Lactando\' WHERE id = :id',
                [':id' => $animalId]
            );
        }

        Response::json(['id' => (int)$partoId, 'mensaje' => 'Parto registrado correctamente']);
    }

    /**
     * Muestra un parto.
     * GET /api/reproduccion/partos/{id}
     */
    public function showParto(string $id): void
    {
        $uid = $this->usuarioId();
        $parto = Database::queryOne(
            'SELECT p.*, a.nombre as animal_nombre
             FROM partos p
             JOIN animales a ON a.id = p.animal_id
             WHERE p.id = :id AND p.usuario_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        );
        if (!$parto) Response::error('Parto no encontrado', 404);

        // Decodificar crias JSON para la respuesta
        if (!empty($parto['crias']) && is_string($parto['crias'])) {
            $parto['crias'] = json_decode($parto['crias'], true);
        }

        Response::json($parto);
    }

    /**
     * Actualiza un parto.
     * PUT /api/reproduccion/partos/{id}
     */
    public function updateParto(string $id): void
    {
        $uid = $this->usuarioId();
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];

        $existente = Database::queryOne(
            'SELECT id FROM partos WHERE id = :id AND usuario_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        );
        if (!$existente) Response::error('Parto no encontrado', 404);

        $campos = [];
        $params = [':id' => (int)$id];

        foreach (['fecha', 'observaciones'] as $c) {
            if (isset($datos[$c])) {
                $campos[] = "$c = :$c";
                $params[":$c"] = $datos[$c];
            }
        }
        if (isset($datos['crias'])) {
            $crias = is_string($datos['crias'])
                ? $datos['crias']
                : json_encode($datos['crias'], JSON_UNESCAPED_UNICODE);
            $campos[] = 'crias = :crias';
            $params[':crias'] = $crias;
        }

        if (empty($campos)) Response::error('No hay datos para actualizar', 422);

        Database::execute(
            'UPDATE partos SET ' . implode(', ', $campos) . ' WHERE id = :id',
            $params
        );

        $this->showParto($id);
    }

    /**
     * Elimina un parto.
     * DELETE /api/reproduccion/partos/{id}
     */
    public function destroyParto(string $id): void
    {
        $uid = $this->usuarioId();
        $existente = Database::queryOne(
            'SELECT id FROM partos WHERE id = :id AND usuario_id = :uid',
            [':id' => (int)$id, ':uid' => $uid]
        );
        if (!$existente) Response::error('Parto no encontrado', 404);

        Database::execute(
            'DELETE FROM partos WHERE id = :id',
            [':id' => (int)$id]
        );
        Response::json(['mensaje' => 'Parto eliminado']);
    }

    // ═══════════════════════════════════════════════════════════
    // TIMELINE
    // ═══════════════════════════════════════════════════════════

    /**
     * Timeline de eventos reproductivos de un animal.
     * Retorna los 4 tipos de eventos ordenados por fecha.
     * GET /api/reproduccion/timeline/{animal_id}
     */
    public function timeline(string $animalId): void
    {
        $uid = $this->usuarioId();
        $animalId = (int)$animalId;

        // Verificar que el animal pertenece al usuario
        $animal = Database::queryOne(
            'SELECT id, nombre FROM animales WHERE id = :id AND usuario_id = :uid',
            [':id' => $animalId, ':uid' => $uid]
        );
        if (!$animal) Response::error('Animal no encontrado', 404);

        $eventos = [];

        // 1. Diagnósticos de celo
        $celos = Database::query(
            'SELECT id, animal_id, fecha_inicio as fecha, \'diagnostico_celo\' as evento_tipo,
                    \'Diagnóstico de Celo\' as evento_nombre, sintomas, comportamiento, observaciones,
                    created_at
             FROM diagnosticos_celo WHERE animal_id = :id AND usuario_id = :uid',
            [':id' => $animalId, ':uid' => $uid]
        );
        foreach ($celos as $c) $eventos[] = $c;

        // 2. Servicios
        $servicios = Database::query(
            'SELECT s.id, s.animal_id, s.fecha, \'servicio\' as evento_tipo,
                    \'Servicio\' as evento_nombre, s.tipo as subtipo, s.reproductor_nombre, s.observaciones,
                    s.created_at
             FROM servicios s WHERE s.animal_id = :id AND s.usuario_id = :uid',
            [':id' => $animalId, ':uid' => $uid]
        );
        foreach ($servicios as $s) $eventos[] = $s;

        // 3. Diagnósticos de gestación
        $diagnosticos = Database::query(
            'SELECT dg.id, dg.animal_id, dg.fecha, \'diagnostico_gestacion\' as evento_tipo,
                    \'Diagnóstico de Gestación\' as evento_nombre, dg.metodo as subtipo, dg.resultado, dg.observaciones,
                    dg.created_at
             FROM diagnosticos_gestacion dg WHERE dg.animal_id = :id AND dg.usuario_id = :uid',
            [':id' => $animalId, ':uid' => $uid]
        );
        foreach ($diagnosticos as $d) $eventos[] = $d;

        // 4. Partos formales
        $partos = Database::query(
            'SELECT p.id, p.animal_id, p.fecha, \'parto\' as evento_tipo,
                    \'Parto\' as evento_nombre, p.crias, p.observaciones, p.created_at
             FROM partos p WHERE p.animal_id = :id AND p.usuario_id = :uid',
            [':id' => $animalId, ':uid' => $uid]
        );
        foreach ($partos as $p) $eventos[] = $p;

        // 4b. Partos implícitos (hijos sin parto formal)
        $partosImplicitos = $this->obtenerPartosImplicitos($uid, $animalId);
        foreach ($partosImplicitos as $p) {
            $p['evento_tipo'] = 'parto';
            $p['evento_nombre'] = 'Parto (implícito)';
            $eventos[] = $p;
        }

        // Ordenar por fecha ascendente
        usort($eventos, function ($a, $b) {
            return strcmp($a['fecha'], $b['fecha']);
        });

        Response::json([
            'animal_id' => $animalId,
            'animal_nombre' => $animal['nombre'],
            'eventos' => $eventos,
        ]);
    }
}
