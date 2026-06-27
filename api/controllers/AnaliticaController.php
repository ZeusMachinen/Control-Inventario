<?php
/**
 * AnaliticaController — Micrositio de Estadisticas y Analitica del Hato.
 *
 * 10 endpoints de analitica avanzada con KPIs, rankings, scorecards,
 * composicion detallada, proyecciones y lista de descarte.
 */
require_once __DIR__ . '/../helpers/Database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/CalculadorEdad.php';
require_once __DIR__ . '/../helpers/ComposicionHelper.php';
require_once __DIR__ . '/../helpers/ScorecardHelper.php';
require_once __DIR__ . '/../helpers/EPDHelper.php';
require_once __DIR__ . '/../helpers/ProyeccionHelper.php';
require_once __DIR__ . '/../helpers/DescarteHelper.php';

class AnaliticaController
{
    private function usuarioId(): int
    {
        return (int)AuthMiddleware::ejecutar()->sub;
    }

    private function rebanoId(): ?int
    {
        return isset($_GET['rebano_id']) ? (int)$_GET['rebano_id'] : null;
    }

    private function fechaDesde(): ?string
    {
        return $_GET['fecha_desde'] ?? null;
    }

    private function fechaHasta(): ?string
    {
        return $_GET['fecha_hasta'] ?? null;
    }

    // ──────────────────────────────────────────────
    // 1. GET /api/analitica/dashboard-kpis
    // ──────────────────────────────────────────────
    public function dashboardKpis(): void
    {
        $uid = $this->usuarioId();
        $rid = $this->rebanoId();
        $desde = $this->fechaDesde();
        $hasta = $this->fechaHasta();
        $filtroRebano = $rid ? 'AND a.rebano_id = ' . $rid : '';

        // Period-aware WHERE para queries de stock: cuando hay filtro de periodo
        // contamos animales vivos al cierre del periodo, no el estado actual.
        $filtroFechaStock = 'AND a.activo = 1';
        $paramsStock = [':uid' => $uid];
        if ($hasta) {
            $filtroFechaStock = 'AND a.fecha_nacimiento <= :hasta_stock AND (a.fecha_salida IS NULL OR a.fecha_salida > :hasta_stock2)';
            $paramsStock[':hasta_stock'] = $hasta;
            $paramsStock[':hasta_stock2'] = $hasta;
        }

        $total = Database::queryOne(
            "SELECT COUNT(*) AS total FROM animales a WHERE a.usuario_id = :uid $filtroFechaStock $filtroRebano",
            $paramsStock
        )['total'];

        $machos = Database::queryOne(
            "SELECT COUNT(*) AS total FROM animales a WHERE a.usuario_id = :uid $filtroFechaStock AND a.sexo = 'Macho' $filtroRebano",
            $paramsStock
        )['total'];

        $hembras = Database::queryOne(
            "SELECT COUNT(*) AS total FROM animales a WHERE a.usuario_id = :uid $filtroFechaStock AND a.sexo = 'Hembra' $filtroRebano",
            $paramsStock
        )['total'];

        $prenadas = Database::queryOne(
            "SELECT COUNT(*) AS total FROM animales a WHERE a.usuario_id = :uid $filtroFechaStock AND a.estado_reproductivo = 'Prenada' $filtroRebano",
            $paramsStock
        )['total'];

        $lactando = Database::queryOne(
            "SELECT COUNT(*) AS total FROM animales a WHERE a.usuario_id = :uid $filtroFechaStock AND a.estado_reproductivo = 'Lactando' $filtroRebano",
            $paramsStock
        )['total'];

        // Nacidos en finca (madre registrada en el sistema)
        $nacidosFinca = Database::queryOne(
            "SELECT COUNT(*) AS total FROM animales a WHERE a.usuario_id = :uid $filtroFechaStock AND a.madre_id IS NOT NULL $filtroRebano",
            $paramsStock
        )['total'];

        // Comprados (sin madre registrada = origen externo)
        $comprados = Database::queryOne(
            "SELECT COUNT(*) AS total FROM animales a WHERE a.usuario_id = :uid $filtroFechaStock AND a.madre_id IS NULL $filtroRebano",
            $paramsStock
        )['total'];

        // Nacimientos en el periodo (solo nacidos en finca)
        $filtroNacFecha = '';
        $paramsNac = [':uid' => $uid];
        if ($desde) { $filtroNacFecha .= ' AND a.fecha_nacimiento >= :desde'; $paramsNac[':desde'] = $desde; }
        if ($hasta) { $filtroNacFecha .= ' AND a.fecha_nacimiento <= :hasta'; $paramsNac[':hasta'] = $hasta; }
        if (!$desde && !$hasta) {
            $filtroNacFecha = ' AND a.fecha_nacimiento >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)';
        }
        $nacimientos = Database::queryOne(
            "SELECT COUNT(*) AS total FROM animales a WHERE a.usuario_id = :uid AND a.activo = 1 AND a.madre_id IS NOT NULL $filtroRebano $filtroNacFecha",
            $paramsNac
        )['total'];

        $tasaNatalidad = $total > 0 ? round(($nacimientos / $total) * 100, 1) : 0;

        // Tasa de prenez global
        $hato = ScorecardHelper::benchmarksHato($uid);
        $tasaPrenez = round($hato['p_hato'] * 100, 1);

        // Ingresos, gastos, ROI

        $ingresos = Database::queryOne(
            "SELECT COALESCE(SUM(precio), 0) AS total FROM ventas WHERE vendedor_id = :uid " .
            ($desde ? "AND fecha >= :desde " : "") . ($hasta ? "AND fecha <= :hasta " : ""),
            array_filter([':uid' => $uid, ':desde' => $desde, ':hasta' => $hasta])
        )['total'];

        $gastosOperativos = Database::queryOne(
            "SELECT COALESCE(SUM(monto), 0) AS total FROM gastos WHERE usuario_id = :uid " .
            ($desde ? "AND mes >= :desde " : "") . ($hasta ? "AND mes <= :hasta " : ""),
            array_filter([':uid' => $uid, ':desde' => $desde, ':hasta' => $hasta])
        )['total'];

        $gananciaNeta = (float)$ingresos - (float)$gastosOperativos;

        // Costo por cabeza/mes
        $costoPorCabeza = $total > 0 ? round((float)$gastosOperativos / $total, 2) : 0;

        // Vacunacion
        $vacunados = Database::queryOne(
            "SELECT COUNT(DISTINCT va.animal_id) AS total
             FROM vacunacion_animales va
             JOIN vacunaciones v ON v.id = va.vacunacion_id
             JOIN animales a ON a.id = va.animal_id
             WHERE a.usuario_id = :uid AND a.activo = 1 AND v.fecha >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
             $filtroRebano",
            [':uid' => $uid]
        )['total'];

        $cobVacuna = $total > 0 ? round(($vacunados / $total) * 100, 1) : 0;

        Response::json([
            'total_animales'      => (int)$total,
            'machos'              => (int)$machos,
            'hembras'             => (int)$hembras,
            'nacidos_finca'       => (int)$nacidosFinca,
            'comprados'           => (int)$comprados,
            'prenadas'            => (int)$prenadas,
            'lactando'            => (int)$lactando,
            'tasa_natalidad'      => $tasaNatalidad,
            'tasa_prenez'         => $tasaPrenez,
            'ingresos'            => (float)$ingresos,
            'gastos_operativos'   => (float)$gastosOperativos,
            'ganancia_neta'       => $gananciaNeta,
            'costo_por_cabeza'    => $costoPorCabeza,
            'cobertura_vacunacion'=> $cobVacuna,
        ]);
    }

    // ──────────────────────────────────────────────
    // 2. GET /api/analitica/composicion
    // ──────────────────────────────────────────────
    public function composicion(): void
    {
        $uid = $this->usuarioId();
        $rid = $this->rebanoId();

        $result = ComposicionHelper::composicion($uid, $rid);
        Response::json($result);
    }

    // ──────────────────────────────────────────────
    // 3. GET /api/analitica/series-temporales
    // ──────────────────────────────────────────────
    public function seriesTemporales(): void
    {
        $uid = $this->usuarioId();
        $rid = $this->rebanoId();
        $filtroRebano = $rid ? 'AND a.rebano_id = ' . $rid : '';
        $granularidad = $_GET['granularidad'] ?? 'mes';
        $desde = $this->fechaDesde();
        $hasta = $this->fechaHasta();

        $format = $granularidad === 'ano' ? '%Y' : ($granularidad === 'dia' ? '%Y-%m-%d' : '%Y-%m');

        $filtroFecha = '';
        $params = [':uid' => $uid, ':fmt' => $format];
        if ($desde) { $filtroFecha .= ' AND a.fecha_nacimiento >= :desde'; $params[':desde'] = $desde; }
        if ($hasta) { $filtroFecha .= ' AND a.fecha_nacimiento <= :hasta'; $params[':hasta'] = $hasta; }

        // Natalidad por periodo
        $natalidad = Database::query(
            "SELECT DATE_FORMAT(fecha_nacimiento, :fmt) AS periodo, COUNT(*) AS total
             FROM animales a
             WHERE a.usuario_id = :uid AND a.activo = 1 $filtroRebano $filtroFecha
             GROUP BY periodo ORDER BY periodo",
            $params
        );

        $filtroFechaPartos = '';
        $paramsP = [':uid' => $uid, ':fmt' => $format];
        if ($desde) { $filtroFechaPartos .= ' AND p.fecha >= :desde'; $paramsP[':desde'] = $desde; }
        if ($hasta) { $filtroFechaPartos .= ' AND p.fecha <= :hasta'; $paramsP[':hasta'] = $hasta; }

        // Partos por periodo
        $partos = Database::query(
            "SELECT DATE_FORMAT(p.fecha, :fmt) AS periodo, COUNT(*) AS total
             FROM partos p
             JOIN animales a ON a.id = p.animal_id
             WHERE p.usuario_id = :uid $filtroRebano $filtroFechaPartos
             GROUP BY periodo ORDER BY periodo",
            $paramsP
        );

        $filtroFechaV = '';
        $paramsV = [':uid' => $uid, ':fmt' => $format];
        if ($desde) { $filtroFechaV .= ' AND fecha >= :desde'; $paramsV[':desde'] = $desde; }
        if ($hasta) { $filtroFechaV .= ' AND fecha <= :hasta'; $paramsV[':hasta'] = $hasta; }

        $ventas = Database::query(
            "SELECT DATE_FORMAT(fecha, :fmt) AS periodo, COALESCE(SUM(precio), 0) AS total
             FROM ventas WHERE vendedor_id = :uid $filtroFechaV
             GROUP BY periodo ORDER BY periodo",
            $paramsV
        );

        $filtroFechaG = '';
        $paramsG = [':uid' => $uid, ':fmt' => $format];
        if ($desde) { $filtroFechaG .= ' AND mes >= :desde'; $paramsG[':desde'] = $desde; }
        if ($hasta) { $filtroFechaG .= ' AND mes <= :hasta'; $paramsG[':hasta'] = $hasta; }

        $gastos = Database::query(
            "SELECT DATE_FORMAT(mes, :fmt) AS periodo, COALESCE(SUM(monto), 0) AS total
             FROM gastos WHERE usuario_id = :uid $filtroFechaG
             GROUP BY periodo ORDER BY periodo",
            $paramsG
        );

        Response::json([
            'natalidad' => array_column($natalidad, 'total', 'periodo'),
            'partos'    => array_column($partos, 'total', 'periodo'),
            'ingresos'  => array_column($ventas, 'total', 'periodo'),
            'gastos'    => array_column($gastos, 'total', 'periodo'),
            'granularidad' => $granularidad,
        ]);
    }

    // ──────────────────────────────────────────────
    // 3b. GET /api/analitica/historico-kpis
    // KPIs historicos: como estaban en una fecha pasada (no estado actual).
    // ──────────────────────────────────────────────
    public function historicoKpis(): void
    {
        $uid = $this->usuarioId();
        $rid = $this->rebanoId();
        $filtroRebano = $rid ? 'AND a.rebano_id = :rid' : '';
        $desde = $this->fechaDesde();
        $hasta = $this->fechaHasta();
        $fechaRef = $hasta ?: date('Y-m-d');
        $animalParams = [':uid' => $uid, ':hasta' => $fechaRef, ':hasta2' => $fechaRef];
        if ($rid) {
            $animalParams[':rid'] = $rid;
        }

        // Total animales VIVOS en la fecha de referencia
        // Nacieron antes o en la fecha, y no habian sido dados de baja aun
        $total = Database::queryOne(
            "SELECT COUNT(*) AS total FROM animales a
             WHERE a.usuario_id = :uid
               AND a.fecha_nacimiento <= :hasta
                AND (a.fecha_salida IS NULL OR a.fecha_salida > :hasta2)
                $filtroRebano",
            $animalParams
        )['total'];

        $machos = Database::queryOne(
            "SELECT COUNT(*) AS total FROM animales a
             WHERE a.usuario_id = :uid AND a.sexo = 'Macho'
               AND a.fecha_nacimiento <= :hasta
               AND (a.fecha_salida IS NULL OR a.fecha_salida > :hasta2)
               $filtroRebano",
            $animalParams
        )['total'];

        $hembras = Database::queryOne(
            "SELECT COUNT(*) AS total FROM animales a
             WHERE a.usuario_id = :uid AND a.sexo = 'Hembra'
               AND a.fecha_nacimiento <= :hasta
               AND (a.fecha_salida IS NULL OR a.fecha_salida > :hasta2)
               $filtroRebano",
            $animalParams
        )['total'];

        // Nacidos en finca en el periodo (entre desde y hasta)
        $nacidosParams = [':uid' => $uid, ':desde' => $desde ?: '2000-01-01', ':hasta' => $fechaRef];
        if ($rid) {
            $nacidosParams[':rid'] = $rid;
        }
        $nacidosFinca = Database::queryOne(
            "SELECT COUNT(*) AS total FROM animales a
             WHERE a.usuario_id = :uid AND a.madre_id IS NOT NULL
               AND a.fecha_nacimiento >= :desde AND a.fecha_nacimiento <= :hasta
               $filtroRebano",
            $nacidosParams
        )['total'];

        // Comprados en el periodo
        $comprados = Database::queryOne(
            "SELECT COUNT(*) AS total FROM animales a
             WHERE a.usuario_id = :uid AND a.madre_id IS NULL
               AND a.fecha_nacimiento >= :desde AND a.fecha_nacimiento <= :hasta
               $filtroRebano",
            $nacidosParams
        )['total'];

        // Partos en el periodo
        $paramsPartos = [':uid' => $uid, ':desde' => $desde ?: '2000-01-01', ':hasta' => $fechaRef];
        if ($rid) {
            $paramsPartos[':rid'] = $rid;
        }
        $partos = Database::queryOne(
            "SELECT COUNT(*) AS total FROM partos p
             JOIN animales a ON a.id = p.animal_id
             WHERE p.usuario_id = :uid AND p.fecha >= :desde AND p.fecha <= :hasta $filtroRebano",
            $paramsPartos
        )['total'];

        // Altas (nacidos + comprados en el periodo)
        $altas = (int)$nacidosFinca + (int)$comprados;

        // Bajas en el periodo (vendidos o muertos)
        $bajas = Database::queryOne(
            "SELECT COUNT(*) AS total FROM animales a
             WHERE a.usuario_id = :uid
               AND a.fecha_salida >= :desde AND a.fecha_salida <= :hasta
               $filtroRebano",
            $paramsPartos
        )['total'];

        // Ingresos y gastos en el periodo
        $ingresos = Database::queryOne(
            "SELECT COALESCE(SUM(precio), 0) AS total FROM ventas
             WHERE vendedor_id = :uid AND fecha >= :desde AND fecha <= :hasta",
            [':uid' => $uid, ':desde' => $desde ?: '2000-01-01', ':hasta' => $fechaRef]
        )['total'];

        $gastos = Database::queryOne(
            "SELECT COALESCE(SUM(monto), 0) AS total FROM gastos
             WHERE usuario_id = :uid AND mes >= :desde AND mes <= :hasta",
            [':uid' => $uid, ':desde' => $desde ?: '2000-01-01', ':hasta' => $fechaRef]
        )['total'];

        $tasaNatalidad = $total > 0 ? round(((int)$nacidosFinca / (int)$total) * 100, 1) : 0;

        Response::json([
            'total_animales'   => (int)$total,
            'machos'           => (int)$machos,
            'hembras'          => (int)$hembras,
            'nacidos_finca'    => (int)$nacidosFinca,
            'comprados'        => (int)$comprados,
            'altas'            => $altas,
            'bajas'            => (int)$bajas,
            'partos'           => (int)$partos,
            'tasa_natalidad'   => $tasaNatalidad,
            'ingresos'         => (float)$ingresos,
            'gastos'           => (float)$gastos,
            'ganancia_neta'    => (float)$ingresos - (float)$gastos,
            'fecha_referencia' => $fechaRef,
        ]);
    }

    // ──────────────────────────────────────────────
    // 3c. GET /api/analitica/evolucion
    // Evolucion del total de animales mes a mes.
    // ──────────────────────────────────────────────
    public function evolucion(): void
    {
        $uid = $this->usuarioId();
        $rid = $this->rebanoId();
        $desde = $this->fechaDesde();
        $hasta = $this->fechaHasta();
        $filtroRebano = $rid ? 'AND a.rebano_id = :rid' : '';

        // Limitar meses al periodo seleccionado; sin filtro = ultimos 36 meses
        $filtroPeriodo = '';
        $params = [':uid' => $uid];
        if ($rid) {
            $params[':rid'] = $rid;
        }
        if ($desde) {
            $filtroPeriodo .= ' AND fin_mes >= :desde';
            $params[':desde'] = $desde;
        }
        if ($hasta) {
            $filtroPeriodo .= ' AND fin_mes <= :hasta';
            $params[':hasta'] = $hasta;
        }

        // Calcular total vivo al final de cada mes (ultimos 36 meses)
        $meses = Database::query(
            "SELECT
                DATE_FORMAT(fin_mes, '%Y-%m') AS periodo,
                COUNT(a.id) AS total
             FROM (
                 SELECT LAST_DAY(DATE_SUB(CURDATE(), INTERVAL n MONTH)) AS fin_mes
                 FROM (SELECT 0 AS n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
                       UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11
                       UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION SELECT 16 UNION SELECT 17
                       UNION SELECT 18 UNION SELECT 19 UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23
                       UNION SELECT 24 UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29
                       UNION SELECT 30 UNION SELECT 31 UNION SELECT 32 UNION SELECT 33 UNION SELECT 34 UNION SELECT 35) AS nums
             ) AS meses
             LEFT JOIN animales a ON a.usuario_id = :uid
               AND a.fecha_nacimiento <= fin_mes
               AND (a.fecha_salida IS NULL OR a.fecha_salida > fin_mes)
               $filtroRebano
             WHERE 1=1 $filtroPeriodo
             GROUP BY periodo
             ORDER BY periodo",
            $params
        );

        $data = [];
        foreach ($meses as $m) {
            $data[$m['periodo']] = (int)$m['total'];
        }

        Response::json(['evolucion' => $data]);
    }

    // ──────────────────────────────────────────────
    // 4. GET /api/analitica/rankings?tipo=vacas|toros
    // ──────────────────────────────────────────────
    public function rankings(): void
    {
        $uid = $this->usuarioId();
        $rid = $this->rebanoId();
        $tipo = $_GET['tipo'] ?? 'vacas';

        if ($tipo === 'toros') {
            $ranking = ScorecardHelper::rankingToros($uid, $rid);
        } else {
            $ranking = ScorecardHelper::rankingVacas($uid, $rid);
        }

        Response::json([
            'tipo'    => $tipo,
            'ranking' => $ranking,
        ]);
    }

    // ──────────────────────────────────────────────
    // 5. GET /api/analitica/scorecard/{id}
    // ──────────────────────────────────────────────
    public function scorecard(string $id): void
    {
        try {
            $uid = $this->usuarioId();
            $animalId = (int)$id;

            $animal = Database::queryOne(
                "SELECT id, nombre, sexo, fecha_nacimiento, estado_reproductivo, rebano_id
                 FROM animales WHERE id = :id AND usuario_id = :uid",
                [':id' => $animalId, ':uid' => $uid]
            );

        if (!$animal) {
            Response::error('Animal no encontrado', 404);
            return;
        }

        $sexo = $animal['sexo'];

        try {
            $hato = ScorecardHelper::benchmarksHato($uid);
            if ($sexo === 'Macho') {
                $scorecard = ScorecardHelper::scorecardToro($animalId, $uid);
                $epd = EPDHelper::epdToro($scorecard, $hato);
                $ivm = null;
            } else {
                $scorecard = ScorecardHelper::scorecardVaca($animalId, $uid);
                $epd = EPDHelper::epdVaca($scorecard, $hato);
                $ivm = ScorecardHelper::calcularIVM($animalId, $uid);
            }
        } catch (\Throwable $e) {
            Response::error('Error al calcular scorecard: ' . $e->getMessage(), 500);
            return;
        }

        // Historial reproductivo
        $historial = Database::query(
            "SELECT 'servicio' AS tipo, s.fecha, s.tipo AS detalle, NULL AS resultado
             FROM servicios s WHERE s.animal_id = :aid1 AND s.usuario_id = :uid1
             UNION ALL
             SELECT 'diagnostico_celo' AS tipo, dc.fecha_inicio AS fecha, dc.comportamiento AS detalle, NULL AS resultado
             FROM diagnosticos_celo dc WHERE dc.animal_id = :aid2 AND dc.usuario_id = :uid2
             UNION ALL
             SELECT 'diagnostico_gestacion' AS tipo, dg.fecha, dg.metodo AS detalle, dg.resultado
             FROM diagnosticos_gestacion dg
             JOIN servicios s ON s.id = dg.servicio_id
             WHERE dg.animal_id = :aid3 AND dg.usuario_id = :uid3
             UNION ALL
             SELECT 'parto' AS tipo, p.fecha, p.observaciones AS detalle, NULL AS resultado
             FROM partos p WHERE p.animal_id = :aid4 AND p.usuario_id = :uid4
             ORDER BY fecha DESC
             LIMIT 50",
            [
                ':aid1' => $animalId, ':uid1' => $uid,
                ':aid2' => $animalId, ':uid2' => $uid,
                ':aid3' => $animalId, ':uid3' => $uid,
                ':aid4' => $animalId, ':uid4' => $uid,
            ]
        );

        Response::json([
            'animal'    => $animal,
            'scorecard' => $scorecard,
            'epd'       => $epd,
            'ivm'       => $ivm ?? null,
            'historial' => $historial,
        ]);
        } catch (\Throwable $e) {
            Response::error('Error interno: ' . $e->getMessage(), 500);
        }
    }

    // ──────────────────────────────────────────────
    // 6. GET /api/analitica/descarte
    // ──────────────────────────────────────────────
    public function descarte(): void
    {
        $uid = $this->usuarioId();
        $rid = $this->rebanoId();

        $result = DescarteHelper::listaDescarte($uid, $rid);
        Response::json($result);
    }

    // ──────────────────────────────────────────────
    // 7. GET /api/analitica/rebanos/comparativa
    // ──────────────────────────────────────────────
    public function comparativaRebanos(): void
    {
        $uid = $this->usuarioId();

        $rebanos = Database::query(
            "SELECT id, nombre FROM rebanos WHERE usuario_id = :uid AND activo = 1 ORDER BY nombre",
            [':uid' => $uid]
        );

        $comparativa = [];
        foreach ($rebanos as $r) {
            $rid = (int)$r['id'];
            $comp = ComposicionHelper::composicion($uid, $rid);
            $desc = DescarteHelper::listaDescarte($uid, $rid);

            $total = $comp['total'];

            $comparativa[] = [
                'id'            => $rid,
                'nombre'        => $r['nombre'],
                'total_animales'=> $total,
                'composicion'   => $comp['categorias'],
                'riesgo_descarte'=> $desc['resumen'],
            ];
        }

        Response::json(['rebanos' => $comparativa]);
    }

    // ──────────────────────────────────────────────
    // 8. GET /api/analitica/rebanos/{id}/proyecciones
    // ──────────────────────────────────────────────
    public function proyeccionesRebano(string $id): void
    {
        $uid = $this->usuarioId();
        $rid = (int)$id;
        // 0 = todos los rebanos
        $rebanoId = $rid === 0 ? null : $rid;

        $proy = ProyeccionHelper::proyectar($uid, $rebanoId);
        Response::json($proy);
    }

    // ──────────────────────────────────────────────
    // 9. GET /api/analitica/comparativa-temporal
    // ──────────────────────────────────────────────
    public function comparativaTemporal(): void
    {
        $uid = $this->usuarioId();
        $rid = $this->rebanoId();
        $filtroRebano = $rid ? 'AND a.rebano_id = ' . $rid : '';

        // MoM: ultimos 12 meses
        $mom = Database::query(
            "SELECT DATE_FORMAT(fecha_nacimiento, '%Y-%m') AS periodo, COUNT(*) AS total
             FROM animales a
             WHERE a.usuario_id = :uid AND a.activo = 1
               AND a.fecha_nacimiento >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
               $filtroRebano
             GROUP BY periodo ORDER BY periodo",
            [':uid' => $uid]
        );

        // YoY: mismo mes, anos diferentes
        $yoy = Database::query(
            "SELECT DATE_FORMAT(fecha_nacimiento, '%Y-%m') AS periodo, COUNT(*) AS total
             FROM animales a
             WHERE a.usuario_id = :uid AND a.activo = 1
               AND a.fecha_nacimiento >= DATE_SUB(CURDATE(), INTERVAL 24 MONTH)
               $filtroRebano
             GROUP BY periodo ORDER BY periodo",
            [':uid' => $uid]
        );

        // Calcular variaciones
        $momData = [];
        $prevTotal = null;
        foreach ($mom as $m) {
            $currTotal = (int)$m['total'];
            $variacion = $prevTotal !== null ? round((($currTotal - $prevTotal) / max($prevTotal, 1)) * 100, 1) : null;
            $momData[] = [
                'periodo'   => $m['periodo'],
                'valor'     => $currTotal,
                'variacion' => $variacion,
            ];
            $prevTotal = $currTotal;
        }

        // YoY: agrupar por mes y comparar con mismo mes ano anterior
        $yoyAgrupado = [];
        foreach ($yoy as $y) {
            $partes = explode('-', $y['periodo']);
            $mes = $partes[1];
            $ano = $partes[0];
            if (!isset($yoyAgrupado[$mes])) {
                $yoyAgrupado[$mes] = [];
            }
            $yoyAgrupado[$mes][$ano] = (int)$y['total'];
        }

        $yoyData = [];
        foreach ($yoyAgrupado as $mes => $anos) {
            ksort($anos);
            $valores = array_values($anos);
            $actual = end($valores);
            $prev = count($valores) >= 2 ? prev($valores) : null;
            $yoyData[] = [
                'mes'       => $mes,
                'actual'    => $actual,
                'anterior'  => $prev,
                'variacion' => $prev ? round((($actual - $prev) / max($prev, 1)) * 100, 1) : null,
            ];
        }

        Response::json([
            'mom' => $momData,
            'yoy' => $yoyData,
        ]);
    }

    // ──────────────────────────────────────────────
    // 10. GET /api/analitica/exportar?formato=json&tipo=dashboard
    // ──────────────────────────────────────────────
    public function exportar(): void
    {
        $uid = $this->usuarioId();
        $tipo = $_GET['tipo'] ?? 'dashboard';

        // Devolvemos los datos en JSON; el frontend se encarga de PDF/Excel
        switch ($tipo) {
            case 'dashboard':
                $this->dashboardKpis();
                break;
            case 'composicion':
                $this->composicion();
                break;
            case 'rankings':
                $this->rankings();
                break;
            case 'descarte':
                $this->descarte();
                break;
            default:
                Response::error('Tipo de exportacion no soportado', 400);
        }
    }
}
