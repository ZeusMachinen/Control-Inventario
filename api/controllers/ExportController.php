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
            "SELECT a.*, r.nombre as rebano_nombre
             FROM animales a
             LEFT JOIN rebanos r ON r.id = a.rebano_id
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
        $errores     = [];

        // Cache de nombres ya vistos en esta importación (para evitar duplicados intra-lote)
        $nombresVistos = [];

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

                $importados++;
            } catch (\Exception $e) {
                $errores[] = "Elemento $idx: error al importar '{$animal['nombre']}': " . $e->getMessage();
            }
        }

        $mensaje = "Se importaron $importados animales";
        if ($duplicados > 0) $mensaje .= ", $duplicados duplicados omitidos";
        if (count($errores) > 0) $mensaje .= ', ' . count($errores) . ' errores';

        Response::json([
            'importados' => $importados,
            'duplicados' => $duplicados,
            'errores'    => $errores,
            'mensaje'    => $mensaje,
        ]);
    }

    // ─── Helpers privados ────────────────────────────────────

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
            "SELECT animal_id, 'Celo' as tipo, fecha_inicio as fecha,
                    CONCAT('Síntomas: ', COALESCE(sintomas,''), ' | Comportamiento: ', COALESCE(comportamiento,'')) as detalle
             FROM diagnosticos_celo
             WHERE animal_id IN ($pl) AND usuario_id = ?
             ORDER BY fecha_inicio",
            $baseParams
        );

        $servicios = Database::query(
            "SELECT s.animal_id, 'Servicio' as tipo, s.fecha,
                    CONCAT('Tipo: ', s.tipo, ' | Reproductor: ', COALESCE(s.reproductor_nombre,'')) as detalle
             FROM servicios s
             WHERE s.animal_id IN ($pl) AND s.usuario_id = ?
             ORDER BY s.fecha",
            $baseParams
        );

        $diagnosticos = Database::query(
            "SELECT animal_id, 'Diagnóstico Gestación' as tipo, fecha,
                    CONCAT('Método: ', metodo, ' | Resultado: ', resultado) as detalle
             FROM diagnosticos_gestacion
             WHERE animal_id IN ($pl) AND usuario_id = ?
             ORDER BY fecha",
            $baseParams
        );

        $partos = Database::query(
            "SELECT animal_id, 'Parto' as tipo, fecha,
                    CONCAT('Crías: ', COALESCE(crias,'')) as detalle
             FROM partos
             WHERE animal_id IN ($pl) AND usuario_id = ?
             ORDER BY fecha",
            $baseParams
        );

        return array_merge($celos, $servicios, $diagnosticos, $partos);
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
