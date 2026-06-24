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
        $filtroRebano = $rid ? 'AND a.rebano_id = ' . $rid : '';

        $total = Database::queryOne(
            "SELECT COUNT(*) AS total FROM animales a WHERE a.usuario_id = :uid AND a.activo = 1 $filtroRebano",
            [':uid' => $uid]
        )['total'];

        $machos = Database::queryOne(
            "SELECT COUNT(*) AS total FROM animales a WHERE a.usuario_id = :uid AND a.activo = 1 AND a.sexo = 'Macho' $filtroRebano",
            [':uid' => $uid]
        )['total'];

        $hembras = Database::queryOne(
            "SELECT COUNT(*) AS total FROM animales a WHERE a.usuario_id = :uid AND a.activo = 1 AND a.sexo = 'Hembra' $filtroRebano",
            [':uid' => $uid]
        )['total'];

        $prenadas = Database::queryOne(
            "SELECT COUNT(*) AS total FROM animales a WHERE a.usuario_id = :uid AND a.activo = 1 AND a.estado_reproductivo = 'Prenada' $filtroRebano",
            [':uid' => $uid]
        )['total'];

        $lactando = Database::queryOne(
            "SELECT COUNT(*) AS total FROM animales a WHERE a.usuario_id = :uid AND a.activo = 1 AND a.estado_reproductivo = 'Lactando' $filtroRebano",
            [':uid' => $uid]
        )['total'];

        // Nacimientos ultimo ano
        $nacimientos = Database::queryOne(
            "SELECT COUNT(*) AS total FROM animales a WHERE a.usuario_id = :uid AND a.activo = 1 AND a.fecha_nacimiento >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR) $filtroRebano",
            [':uid' => $uid]
        )['total'];

        $tasaNatalidad = $total > 0 ? round(($nacimientos / $total) * 100, 1) : 0;

        // Tasa de prenez global
        $hato = ScorecardHelper::benchmarksHato($uid);
        $tasaPrenez = round($hato['p_hato'] * 100, 1);

        // Ingresos, gastos, ROI
        $filtroFechaVentas = '';
        $desde = $this->fechaDesde();
        $hasta = $this->fechaHasta();

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

        $format = $granularidad === 'ano' ? '%Y' : ($granularidad === 'dia' ? '%Y-%m-%d' : '%Y-%m');

        // Natalidad por periodo
        $natalidad = Database::query(
            "SELECT DATE_FORMAT(fecha_nacimiento, :fmt) AS periodo, COUNT(*) AS total
             FROM animales a
             WHERE a.usuario_id = :uid AND a.activo = 1 $filtroRebano
             GROUP BY periodo ORDER BY periodo",
            [':uid' => $uid, ':fmt' => $format]
        );

        // Partos por periodo
        $partos = Database::query(
            "SELECT DATE_FORMAT(p.fecha, :fmt) AS periodo, COUNT(*) AS total
             FROM partos p
             JOIN animales a ON a.id = p.animal_id
             WHERE p.usuario_id = :uid $filtroRebano
             GROUP BY periodo ORDER BY periodo",
            [':uid' => $uid, ':fmt' => $format]
        );

        // Ventas (ingresos) por periodo
        $ventas = Database::query(
            "SELECT DATE_FORMAT(fecha, :fmt) AS periodo, COALESCE(SUM(precio), 0) AS total
             FROM ventas WHERE vendedor_id = :uid
             GROUP BY periodo ORDER BY periodo",
            [':uid' => $uid, ':fmt' => $format]
        );

        // Gastos por periodo
        $gastos = Database::query(
            "SELECT DATE_FORMAT(mes, :fmt) AS periodo, COALESCE(SUM(monto), 0) AS total
             FROM gastos WHERE usuario_id = :uid
             GROUP BY periodo ORDER BY periodo",
            [':uid' => $uid, ':fmt' => $format]
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
        $hato = ScorecardHelper::benchmarksHato($uid);

        if ($sexo === 'Macho') {
            $scorecard = ScorecardHelper::scorecardToro($animalId, $uid);
            $epd = EPDHelper::epdToro($scorecard, $hato);
        } else {
            $scorecard = ScorecardHelper::scorecardVaca($animalId, $uid);
            $epd = EPDHelper::epdVaca($scorecard, $hato);
        }

        // Historial reproductivo
        $historial = Database::query(
            "SELECT 'servicio' AS tipo, s.fecha, s.tipo AS detalle, NULL AS resultado
             FROM servicios s WHERE s.animal_id = :aid AND s.usuario_id = :uid
             UNION ALL
             SELECT 'diagnostico_celo' AS tipo, dc.fecha_inicio AS fecha, dc.comportamiento AS detalle, NULL AS resultado
             FROM diagnosticos_celo dc WHERE dc.animal_id = :aid AND dc.usuario_id = :uid
             UNION ALL
             SELECT 'diagnostico_gestacion' AS tipo, dg.fecha, dg.metodo AS detalle, dg.resultado
             FROM diagnosticos_gestacion dg
             JOIN servicios s ON s.id = dg.servicio_id
             WHERE dg.animal_id = :aid2 AND dg.usuario_id = :uid2
             UNION ALL
             SELECT 'parto' AS tipo, p.fecha, p.observaciones AS detalle, NULL AS resultado
             FROM partos p WHERE p.animal_id = :aid3 AND p.usuario_id = :uid3
             ORDER BY fecha DESC
             LIMIT 50",
            [
                ':aid' => $animalId, ':uid' => $uid,
                ':aid2' => $animalId, ':uid2' => $uid,
                ':aid3' => $animalId, ':uid3' => $uid,
            ]
        );

        Response::json([
            'animal'    => $animal,
            'scorecard' => $scorecard,
            'epd'       => $epd,
            'historial' => $historial,
        ]);
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

        $proy = ProyeccionHelper::proyectar($uid, $rid);
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
