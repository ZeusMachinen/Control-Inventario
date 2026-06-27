<?php
/**
 * ExportController — Exportación e importación de datos
 *
 * - exportarAnimales: JSON con todos los animales y sus datos anidados (vacunas,
 *   eventos reproductivos, movimientos). Compatible con importarAnimales.
 * - exportarTodo:     ZIP con todas las tablas del usuario como JSON individuales
 * - importarAnimales: Importa animales desde JSON (array "animales")
 */
require_once __DIR__ . '/../helpers/Database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/CalculadorEdad.php';
require_once __DIR__ . '/../helpers/CalculadorEdad.php';

class ExportController
{
    private function usuarioId(): int
    {
        return (int) AuthMiddleware::ejecutar()->sub;
    }

    // ─────────────────────────────────────────────────────────
    //  GET /api/exportar/animales
    //  Descarga JSON: todos los animales con vacunas, eventos
    //  reproductivos y movimientos anidados.
    // ─────────────────────────────────────────────────────────
    public function exportarAnimales(): void
    {
        $uid = $this->usuarioId();

        // 1. Todos los animales del usuario
        $animales = Database::query(
            "SELECT a.*, r.nombre as rebano_nombre,
                    madre.nombre as madre_nombre, madre.identificacion as madre_identificacion,
                    padre.nombre as padre_nombre, padre.identificacion as padre_identificacion
             FROM animales a
             LEFT JOIN rebanos r ON r.id = a.rebano_id
             LEFT JOIN animales madre ON madre.id = a.madre_id
             LEFT JOIN animales padre ON padre.id = a.padre_id
             WHERE a.usuario_id = :uid
             ORDER BY a.activo DESC, a.nombre",
            [':uid' => $uid]
        );

        if (empty($animales)) {
            Response::error('No hay animales para exportar', 404);
        }

        $animalIds = array_map(fn($a) => (int)$a['id'], $animales);

        // 2. Datos relacionados (agrupados por animal_id)
        $vacunasPorAnimal  = $this->agruparPorAnimal(
            $this->getVacunasPorAnimal($animalIds, $uid), 'animal_id'
        );
        $eventosPorAnimal  = $this->agruparPorAnimal(
            $this->getEventosReproduccion($animalIds, $uid), 'animal_id'
        );
        $movimientosPorAnimal = $this->agruparPorAnimal(
            $this->getMovimientos($animalIds), 'animal_id'
        );

        // 3. Armar JSON con todo anidado
        $resultado = [];
        foreach ($animales as $a) {
            $id = (int)$a['id'];
            // Recalcular etapa real
            $etapaCalculada = $a['etapa'];
            if (!empty($a['fecha_nacimiento'])) {
                $edad = CalculadorEdad::calcular($a['fecha_nacimiento']);
                $etapaCalculada = CalculadorEdad::determinarEtapa($edad['total_meses']);
            }
            $resultado[] = [
                // Datos del animal
                'nombre'                => $a['nombre'],
                'identificacion'        => $a['identificacion'],
                'sexo'                  => $a['sexo'],
                'fecha_nacimiento'      => $a['fecha_nacimiento'],
                'rebano_nombre'         => $a['rebano_nombre'],
                'madre_nombre'          => $a['madre_nombre'],
                'madre_identificacion'  => $a['madre_identificacion'],
                'padre_nombre'          => $a['padre_nombre'],
                'padre_identificacion'  => $a['padre_identificacion'],
                'etapa'                 => $etapaCalculada,
                'activo'                => (bool)$a['activo'],
                'estado_general'        => $a['estado_general'],
                'estado_reproductivo'   => $a['estado_reproductivo'],
                'peso_entrada'          => $a['peso_entrada'] ? (float)$a['peso_entrada'] : null,
                'precio_kg'             => $a['precio_kg'] ? (float)$a['precio_kg'] : null,
                'precio_final'          => $a['precio_final'] ? (float)$a['precio_final'] : null,
                'origen'                => $a['origen'],
                'fecha_ingreso'         => $a['fecha_ingreso'],
                'fecha_salida'          => $a['fecha_salida'],
                'motivo_salida'         => $a['motivo_salida'],
                'peso_salida'           => $a['peso_salida'] ? (float)$a['peso_salida'] : null,
                // Relacionados
                'vacunas'               => $vacunasPorAnimal[$id] ?? [],
                'eventos_reproduccion'  => $eventosPorAnimal[$id] ?? [],
                'movimientos'           => $movimientosPorAnimal[$id] ?? [],
            ];
        }

        $json = json_encode(
            ['animales' => $resultado],
            JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT
        );

        header('Content-Type: application/json; charset=utf-8');
        header('Content-Disposition: attachment; filename="animales_export.json"');
        header('Content-Length: ' . strlen($json));
        header('Pragma: no-cache');
        echo $json;
        exit;
    }

    // ─────────────────────────────────────────────────────────
    //  GET /api/exportar/todo
    //  Descarga ZIP con todas las tablas del usuario como JSON
    // ─────────────────────────────────────────────────────────
    public function exportarTodo(): void
    {
        $uid = $this->usuarioId();

        $zip = new ZipArchive();
        $tmp = tempnam(sys_get_temp_dir(), 'export_');
        if ($zip->open($tmp, ZipArchive::CREATE) !== true) {
            Response::error('No se pudo crear el archivo ZIP', 500);
        }

        foreach ($this->getTableList() as $tabla) {
            $this->addTableToZip($zip, $tabla, $uid);
        }

        // Manifest
        $zip->addFromString(
            'manifest.json',
            json_encode([
                'exported_at' => date('Y-m-d H:i:s'),
                'version'     => '1.0',
                'usuario_id'  => $uid,
                'tables'      => $this->getTableList(),
            ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)
        );

        $zip->close();

        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="exportacion_completa_' . date('Ymd') . '.zip"');
        header('Content-Length: ' . filesize($tmp));
        header('Pragma: no-cache');
        readfile($tmp);
        unlink($tmp);
        exit;
    }

    // ─────────────────────────────────────────────────────────
    //  POST /api/importar/animales
    //  Importa animales desde JSON con campo "animales"
    // ─────────────────────────────────────────────────────────
    public function importarAnimales(): void
    {
        $uid  = $this->usuarioId();
        $body = json_decode(file_get_contents('php://input'), true);

        if (!$body || !isset($body['animales']) || !is_array($body['animales'])) {
            Response::error('Formato inválido. Se espera JSON con campo "animales"', 422);
        }

        // Detectar columnas reales de la tabla — así funciona con o sin migraciones
        $columnasReales = $this->getColumnasTabla('animales');
        if (empty($columnasReales)) {
            Response::error('No se pudieron detectar las columnas de la tabla animales', 500);
        }

        $importados  = 0;
        $duplicados  = 0;
        $eventosReproduccionImportados = 0;
        $relacionesParentalesActualizadas = 0;
        $errores     = [];

        // Cache de nombres ya vistos en esta importación (para evitar duplicados intra-lote)
        $nombresVistos = [];
        $idPorNombre = [];
        $animalesImportados = [];

        foreach ($body['animales'] as $idx => $animal) {
            try {
                if (empty($animal['nombre']) || empty($animal['sexo']) || empty($animal['fecha_nacimiento'])) {
                    $errores[] = "Elemento $idx: nombre, sexo y fecha_nacimiento son requeridos";
                    continue;
                }

                // ── Deduplicación ─────────────────────────────────
                $nombre = trim($animal['nombre']);

                // Ya se importó en este mismo lote
                if (isset($nombresVistos[$nombre])) {
                    $duplicados++;
                    continue;
                }

                // Ya existe en la base (por nombre, mismo usuario)
                $existente = Database::queryOne(
                    'SELECT id FROM animales WHERE nombre = :n AND usuario_id = :u',
                    [':n' => $nombre, ':u' => $uid]
                );
                if ($existente) {
                    $idPorNombre[$this->claveNombre($nombre)] = (int)$existente['id'];
                    $duplicados++;
                    continue;
                }
                $nombresVistos[$nombre] = true;
                // ─────────────────────────────────────────────────

                $rebanoId = $this->resolverRebano($animal, $idx, $uid, $errores);
                if ($rebanoId === null) continue;

                $edad  = CalculadorEdad::calcular($animal['fecha_nacimiento']);
                $etapa = CalculadorEdad::determinarEtapa($edad['total_meses']);

                // Mapear columna DB → valor desde el JSON del animal
                $mapeo = [
                    'nombre'               => $nombre,
                    'identificacion'       => $animal['identificacion'] ?? null,
                    'sexo'                 => $animal['sexo'],
                    'fecha_nacimiento'     => $animal['fecha_nacimiento'],
                    'rebano_id'            => $rebanoId,
                    'etapa'                => $etapa,
                    'activo'               => isset($animal['activo']) ? (int)(bool)$animal['activo'] : 1,
                    'estado_general'       => $animal['estado_general'] ?? 'Activo',
                    'estado_reproductivo'  => $animal['estado_reproductivo']
                                             ?? ($animal['sexo'] === 'Hembra' ? 'Vacia' : null),
                    'peso_entrada'         => $animal['peso_entrada'] ?? null,
                    'precio_kg'            => $animal['precio_kg'] ?? null,
                    'precio_final'         => $animal['precio_final'] ?? null,
                    'origen'               => $animal['origen'] ?? 'Nacimiento',
                    'fecha_ingreso'        => $animal['fecha_ingreso'] ?? null,
                    'fecha_salida'         => $animal['fecha_salida'] ?? null,
                    'motivo_salida'        => $animal['motivo_salida'] ?? null,
                    'peso_salida'          => $animal['peso_salida'] ?? null,
                    'usuario_id'           => $uid,
                ];

                // Construir INSERT solo con las columnas que existen en la DB
                $cols = [];
                $vals = [];
                $params = [];
                foreach ($columnasReales as $col) {
                    if (array_key_exists($col, $mapeo)) {
                        $param = ":$col";
                        $cols[] = "`$col`";
                        $vals[] = $param;
                        $params[$param] = $mapeo[$col];
                    }
                }

                if (empty($cols)) {
                    $errores[] = "Elemento $idx: no hay columnas compatibles para insertar";
                    continue;
                }

                Database::execute(
                    'INSERT INTO animales (' . implode(', ', $cols) . ') VALUES (' . implode(', ', $vals) . ')',
                    $params
                );

                $nuevoAnimalId = (int) Database::lastInsertId();
                $idPorNombre[$this->claveNombre($nombre)] = $nuevoAnimalId;
                $animalesImportados[] = ['id' => $nuevoAnimalId, 'animal' => $animal];

                $eventosReproduccionImportados += $this->importarEventosReproduccion(
                    $animal['eventos_reproduccion'] ?? [],
                    $nuevoAnimalId,
                    $uid,
                    $idx,
                    $errores
                );

                $importados++;
            } catch (\Exception $e) {
                $errores[] = "Elemento $idx: error al importar '{$animal['nombre']}': " . $e->getMessage();
            }
        }

        $relacionesParentalesActualizadas = $this->actualizarRelacionesParentales(
            $animalesImportados,
            $idPorNombre,
            $columnasReales
        );

        $mensaje = "Se importaron $importados animales";
        if ($duplicados > 0) $mensaje .= ", $duplicados duplicados omitidos";
        if ($eventosReproduccionImportados > 0) $mensaje .= ", $eventosReproduccionImportados eventos reproductivos";
        if ($relacionesParentalesActualizadas > 0) $mensaje .= ", $relacionesParentalesActualizadas relaciones padre/madre";
        if (count($errores) > 0) $mensaje .= ', ' . count($errores) . ' errores';

        Response::json([
            'importados' => $importados,
            'duplicados' => $duplicados,
            'eventos_reproduccion_importados' => $eventosReproduccionImportados,
            'relaciones_parentales_actualizadas' => $relacionesParentalesActualizadas,
            'errores'    => $errores,
            'mensaje'    => $mensaje,
        ]);
    }

    // ─── Helpers privados ────────────────────────────────────

    private function claveNombre(string $nombre): string
    {
        return strtolower(trim($nombre));
    }

    private function actualizarRelacionesParentales(array $animalesImportados, array $idPorNombre, array $columnasAnimales): int
    {
        if (!in_array('madre_id', $columnasAnimales, true) && !in_array('padre_id', $columnasAnimales, true)) {
            return 0;
        }

        $actualizadas = 0;
        foreach ($animalesImportados as $item) {
            $animalId = (int)$item['id'];
            $animal = $item['animal'];
            $sets = [];
            $params = [':id' => $animalId];

            if (in_array('madre_id', $columnasAnimales, true) && !empty($animal['madre_nombre'])) {
                $madreId = $idPorNombre[$this->claveNombre($animal['madre_nombre'])] ?? null;
                if ($madreId && (int)$madreId !== $animalId) {
                    $sets[] = 'madre_id = :madre_id';
                    $params[':madre_id'] = (int)$madreId;
                }
            }

            if (in_array('padre_id', $columnasAnimales, true) && !empty($animal['padre_nombre'])) {
                $padreId = $idPorNombre[$this->claveNombre($animal['padre_nombre'])] ?? null;
                if ($padreId && (int)$padreId !== $animalId) {
                    $sets[] = 'padre_id = :padre_id';
                    $params[':padre_id'] = (int)$padreId;
                }
            }

            if (!empty($sets)) {
                Database::execute(
                    'UPDATE animales SET ' . implode(', ', $sets) . ' WHERE id = :id',
                    $params
                );
                $actualizadas++;
            }
        }

        return $actualizadas;
    }

    private function importarEventosReproduccion(array $eventos, int $animalId, int $uid, int $idx, array &$errores): int
    {
        if (empty($eventos)) return 0;

        usort($eventos, function ($a, $b) {
            $ordenA = $this->ordenEventoReproductivo((string)($a['tipo'] ?? ''));
            $ordenB = $this->ordenEventoReproductivo((string)($b['tipo'] ?? ''));
            if ($ordenA !== $ordenB) return $ordenA <=> $ordenB;
            return strcmp((string)($a['fecha'] ?? ''), (string)($b['fecha'] ?? ''));
        });

        $celosPorId = [];
        $serviciosPorId = [];
        $diagnosticosPorId = [];
        $importados = 0;

        foreach ($eventos as $evento) {
            try {
                $tipo = strtolower((string)($evento['tipo'] ?? ''));
                $oldId = isset($evento['id']) && $evento['id'] !== null ? (int)$evento['id'] : null;

                if (strpos($tipo, 'celo') !== false) {
                    $nuevoId = $this->insertarConColumnas('diagnosticos_celo', [
                        'animal_id' => $animalId,
                        'fecha_inicio' => $evento['fecha_inicio'] ?? $evento['fecha'] ?? null,
                        'fecha_fin' => $evento['fecha_fin'] ?? null,
                        'sintomas' => $evento['sintomas'] ?? null,
                        'comportamiento' => $evento['comportamiento'] ?? null,
                        'observaciones' => $evento['observaciones'] ?? null,
                        'usuario_id' => $uid,
                    ]);
                    if ($oldId && $nuevoId) $celosPorId[$oldId] = $nuevoId;
                    if ($nuevoId) $importados++;
                    continue;
                }

                if (strpos($tipo, 'servicio') !== false) {
                    $diagnosticoCeloId = null;
                    if (!empty($evento['diagnostico_celo_id'])) {
                        $diagnosticoCeloId = $celosPorId[(int)$evento['diagnostico_celo_id']] ?? null;
                    }

                    $nuevoId = $this->insertarConColumnas('servicios', [
                        'diagnostico_celo_id' => $diagnosticoCeloId,
                        'animal_id' => $animalId,
                        'tipo' => $this->normalizarTipoServicio($evento['subtipo'] ?? null),
                        'reproductor_id' => null,
                        'reproductor_nombre' => $evento['reproductor_nombre'] ?? null,
                        'fecha' => $evento['fecha'] ?? null,
                        'observaciones' => $evento['observaciones'] ?? null,
                        'usuario_id' => $uid,
                    ]);
                    if ($oldId && $nuevoId) $serviciosPorId[$oldId] = $nuevoId;
                    if ($nuevoId) $importados++;
                    continue;
                }

                if (strpos($tipo, 'diagn') !== false || strpos($tipo, 'gestaci') !== false) {
                    $servicioId = null;
                    if (!empty($evento['servicio_id'])) {
                        $servicioId = $serviciosPorId[(int)$evento['servicio_id']] ?? null;
                    }

                    $nuevoId = $this->insertarConColumnas('diagnosticos_gestacion', [
                        'servicio_id' => $servicioId,
                        'animal_id' => $animalId,
                        'fecha' => $evento['fecha'] ?? null,
                        'metodo' => $this->normalizarMetodoDiagnostico($evento['subtipo'] ?? null),
                        'resultado' => $this->normalizarResultadoDiagnostico($evento['resultado'] ?? null),
                        'meses_gestacion' => $evento['meses_gestacion'] ?? null,
                        'observaciones' => $evento['observaciones'] ?? null,
                        'usuario_id' => $uid,
                    ]);
                    if ($oldId && $nuevoId) $diagnosticosPorId[$oldId] = $nuevoId;
                    if ($nuevoId) $importados++;
                    continue;
                }

                if (strpos($tipo, 'parto') !== false) {
                    $diagnosticoGestacionId = null;
                    if (!empty($evento['diagnostico_gestacion_id'])) {
                        $diagnosticoGestacionId = $diagnosticosPorId[(int)$evento['diagnostico_gestacion_id']] ?? null;
                    }

                    $nuevoId = $this->insertarConColumnas('partos', [
                        'diagnostico_gestacion_id' => $diagnosticoGestacionId,
                        'animal_id' => $animalId,
                        'fecha' => $evento['fecha'] ?? null,
                        'crias' => $this->normalizarJsonNullable($evento['crias'] ?? null),
                        'observaciones' => $evento['observaciones'] ?? null,
                        'usuario_id' => $uid,
                    ]);
                    if ($nuevoId) $importados++;
                }
            } catch (\Exception $e) {
                $errores[] = "Elemento $idx: evento reproductivo no importado: " . $e->getMessage();
            }
        }

        return $importados;
    }

    private function ordenEventoReproductivo(string $tipo): int
    {
        $tipo = strtolower($tipo);
        if (strpos($tipo, 'celo') !== false) return 1;
        if (strpos($tipo, 'servicio') !== false) return 2;
        if (strpos($tipo, 'diagn') !== false || strpos($tipo, 'gestaci') !== false) return 3;
        if (strpos($tipo, 'parto') !== false) return 4;
        return 99;
    }

    private function insertarConColumnas(string $tabla, array $mapeo): ?int
    {
        $columnasReales = $this->getColumnasTabla($tabla);
        $cols = [];
        $vals = [];
        $params = [];

        foreach ($mapeo as $col => $valor) {
            if (!in_array($col, $columnasReales, true)) continue;
            $param = ':' . $col;
            $cols[] = "`$col`";
            $vals[] = $param;
            $params[$param] = $valor;
        }

        if (empty($cols)) return null;

        Database::execute(
            'INSERT INTO `' . $tabla . '` (' . implode(', ', $cols) . ') VALUES (' . implode(', ', $vals) . ')',
            $params
        );

        return (int) Database::lastInsertId();
    }

    private function normalizarTipoServicio(?string $tipo): string
    {
        $permitidos = ['Monta Natural', 'Inseminación Artificial', 'Transferencia de Embriones'];
        return in_array($tipo, $permitidos, true) ? $tipo : 'Monta Natural';
    }

    private function normalizarMetodoDiagnostico(?string $metodo): string
    {
        $permitidos = ['Palpación', 'Ecografía'];
        return in_array($metodo, $permitidos, true) ? $metodo : 'Palpación';
    }

    private function normalizarResultadoDiagnostico(?string $resultado): string
    {
        $permitidos = ['Positivo', 'Negativo'];
        return in_array($resultado, $permitidos, true) ? $resultado : 'Positivo';
    }

    private function normalizarJsonNullable($valor): ?string
    {
        if ($valor === null || $valor === '') return null;
        if (is_string($valor)) return $valor;
        return json_encode($valor, JSON_UNESCAPED_UNICODE);
    }

    /**
     * Agrupa un array de registros por el valor de una clave.
     * Retorna [ animal_id => [ registros... ] ]
     */
    private function agruparPorAnimal(array $registros, string $key): array
    {
        $grupos = [];
        foreach ($registros as $r) {
            $grupos[(int)$r[$key]][] = $r;
        }
        return $grupos;
    }

    private function getVacunasPorAnimal(array $animalIds, int $uid): array
    {
        if (empty($animalIds)) return [];
        $pl = implode(',', array_fill(0, count($animalIds), '?'));
        return Database::query(
            "SELECT va.animal_id, v.fecha, m.nombre as medicamento, va.dosis_aplicada
             FROM vacunacion_animales va
             JOIN vacunaciones v       ON v.id = va.vacunacion_id
             JOIN medicamentos m       ON m.id = v.medicamento_id
             JOIN animales a           ON a.id = va.animal_id
             WHERE va.animal_id IN ($pl) AND a.usuario_id = ?
             ORDER BY v.fecha",
            array_merge($animalIds, [$uid])
        );
    }

    private function getEventosReproduccion(array $animalIds, int $uid): array
    {
        if (empty($animalIds)) return [];
        $pl  = implode(',', array_fill(0, count($animalIds), '?'));
        $baseParams = array_merge($animalIds, [$uid]);

        $celos = Database::query(
            "SELECT id, animal_id, 'Celo' as tipo, fecha_inicio as fecha,
                    fecha_inicio, fecha_fin, sintomas, comportamiento, observaciones,
                    created_at, updated_at,
                    CONCAT('Síntomas: ', COALESCE(sintomas,''), ' | Comportamiento: ', COALESCE(comportamiento,'')) as detalle
             FROM diagnosticos_celo
             WHERE animal_id IN ($pl) AND usuario_id = ?
             ORDER BY fecha_inicio",
            $baseParams
        );

        $servicios = Database::query(
            "SELECT s.id, s.diagnostico_celo_id, s.animal_id, 'Servicio' as tipo, s.tipo as subtipo,
                    s.reproductor_id, s.reproductor_nombre, s.fecha, s.observaciones,
                    s.created_at, s.updated_at,
                    CONCAT('Tipo: ', s.tipo, ' | Reproductor: ', COALESCE(s.reproductor_nombre,'')) as detalle
              FROM servicios s
              WHERE s.animal_id IN ($pl) AND s.usuario_id = ?
              ORDER BY s.fecha",
            $baseParams
        );

        $diagnosticos = Database::query(
            "SELECT id, servicio_id, animal_id, 'Diagnóstico Gestación' as tipo,
                    metodo as subtipo, resultado, meses_gestacion, fecha, observaciones,
                    created_at, updated_at,
                    CONCAT('Método: ', metodo, ' | Resultado: ', resultado) as detalle
              FROM diagnosticos_gestacion
              WHERE animal_id IN ($pl) AND usuario_id = ?
              ORDER BY fecha",
            $baseParams
        );

        $partos = Database::query(
            "SELECT id, diagnostico_gestacion_id, animal_id, 'Parto' as tipo, fecha,
                    crias, observaciones, created_at, updated_at,
                    CONCAT('Crías: ', COALESCE(crias,'')) as detalle
              FROM partos
              WHERE animal_id IN ($pl) AND usuario_id = ?
              ORDER BY fecha",
            $baseParams
        );

        // Partos implícitos: hijos registrados con madre_id pero sin parto formal.
        // Esto debe coincidir con el historial reproductivo que ve el usuario en la ficha del animal.
        $partosImplicitos = Database::query(
            "SELECT NULL as id, hijo.madre_id as animal_id, 'Parto' as tipo,
                    hijo.fecha_nacimiento as fecha, NULL as crias,
                    CONCAT('Implícito — ', COUNT(*), ' cría(s) desde registro') as observaciones,
                    NULL as created_at, NULL as updated_at,
                    CONCAT('Implícito — ', COUNT(*), ' cría(s) desde registro') as detalle
             FROM animales hijo
             WHERE hijo.madre_id IN ($pl) AND hijo.usuario_id = ?
               AND hijo.fecha_nacimiento IS NOT NULL
               AND NOT EXISTS (
                 SELECT 1 FROM partos p
                 WHERE p.animal_id = hijo.madre_id
                   AND p.fecha = hijo.fecha_nacimiento
                   AND p.usuario_id = ?
               )
             GROUP BY hijo.madre_id, hijo.fecha_nacimiento
             ORDER BY hijo.fecha_nacimiento",
            array_merge($animalIds, [$uid, $uid])
        );

        $eventos = array_merge($celos, $servicios, $diagnosticos, $partos, $partosImplicitos);
        usort($eventos, function ($a, $b) {
            $animalCmp = ((int)$a['animal_id']) <=> ((int)$b['animal_id']);
            if ($animalCmp !== 0) return $animalCmp;
            return strcmp((string)($a['fecha'] ?? ''), (string)($b['fecha'] ?? ''));
        });

        return $eventos;
    }

    private function getMovimientos(array $animalIds): array
    {
        if (empty($animalIds)) return [];
        $pl = implode(',', array_fill(0, count($animalIds), '?'));
        return Database::query(
            "SELECT m.animal_id, m.created_at as fecha,
                    COALESCE(ro.nombre, 'Sin origen') as origen,
                    rd.nombre as destino
             FROM movimientos_rebano m
             LEFT JOIN rebanos ro ON ro.id = m.rebano_origen_id
             JOIN rebanos rd       ON rd.id = m.rebano_destino_id
             WHERE m.animal_id IN ($pl)
             ORDER BY m.created_at",
            $animalIds
        );
    }

    /**
     * Retorna los nombres de las columnas de una tabla.
     */
    private function getColumnasTabla(string $table): array
    {
        $cols = Database::query("SHOW COLUMNS FROM `$table`");
        return array_map(fn($c) => $c['Field'], $cols);
    }

    private function addTableToZip(ZipArchive $zip, string $table, int $uid): void
    {
        if ($table === 'vacunacion_animales') {
            $sql = "SELECT va.* FROM vacunacion_animales va
                    JOIN vacunaciones v ON v.id = va.vacunacion_id
                    WHERE v.usuario_id = :uid";
        } else {
            $sql = "SELECT * FROM `$table` WHERE usuario_id = :uid";
        }
        $sql .= " ORDER BY id";

        $rows = Database::query($sql, [':uid' => $uid]);

        $zip->addFromString(
            $table . '.json',
            json_encode($rows, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)
        );
    }

    private function getTableList(): array
    {
        return [
            'rebanos',
            'animales',
            'medicamentos',
            'vacunaciones',
            'vacunacion_animales',
            'diagnosticos_celo',
            'servicios',
            'diagnosticos_gestacion',
            'partos',
            'filtros_guardados',
            'movimientos_rebano',
            'gastos',
            'costos_mensuales',
            'conteo_mensual_rebano',
            'companias',
            'ventas',
            'compras',
        ];
    }

    private function resolverRebano(array $animal, int $idx, int $uid, array &$errores): ?int
    {
        if (!empty($animal['rebano_nombre'])) {
            $r = Database::queryOne(
                'SELECT id FROM rebanos WHERE nombre = :n AND usuario_id = :u',
                [':n' => $animal['rebano_nombre'], ':u' => $uid]
            );
            if ($r) return (int)$r['id'];

            // No existe → lo creamos automáticamente
            Database::execute(
                'INSERT INTO rebanos (nombre, usuario_id) VALUES (:nombre, :uid)',
                [':nombre' => $animal['rebano_nombre'], ':uid' => $uid]
            );
            return (int) Database::lastInsertId();
        }
        if (!empty($animal['rebano_id'])) {
            $r = Database::queryOne(
                'SELECT id FROM rebanos WHERE id = :id AND usuario_id = :u',
                [':id' => (int)$animal['rebano_id'], ':u' => $uid]
            );
            if ($r) return (int)$r['id'];
            $errores[] = "Elemento $idx: ID de rebaño {$animal['rebano_id']} no encontrado (usá rebano_nombre para que se cree automáticamente)";
            return null;
        }
        $errores[] = "Elemento $idx: Se requiere rebano_nombre o rebano_id";
        return null;
    }
}
