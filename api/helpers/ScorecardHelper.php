<?php
/**
 * ScorecardHelper — Bayesian shrinkage, recency weighting, bull/cow scorecards.
 *
 * Fórmulas de Engram #92 (analytics/micrositio-hato).
 */
require_once __DIR__ . '/Database.php';

class ScorecardHelper
{
    // Constantes del modelo
    const K          = 3;      // shrinkage factor
    const HALF_LIFE  = 12;     // meses para decaimiento exponencial
    const N_MIN      = 3;      // umbral de confianza
    const REZAGO_DIAS = 90;    // servicios sin diagnostico = pendientes

    // Cache por request
    private static ?array $hatoCache = null;

    /**
     * Benchmarks del hato (calculados una vez por request).
     */
    public static function benchmarksHato(int $usuarioId): array
    {
        if (self::$hatoCache !== null) {
            return self::$hatoCache;
        }

        // p_hato = diagnosticos Positivos / total diagnosticos con resultado
        $stats = Database::queryOne(
            "SELECT
                COUNT(CASE WHEN dg.resultado = 'Positivo' THEN 1 END) AS positivos,
                COUNT(*) AS total_diag
             FROM diagnosticos_gestacion dg
             JOIN servicios s ON s.id = dg.servicio_id
             WHERE dg.usuario_id = :uid",
            [':uid' => $usuarioId]
        );
        $p_hato = $stats['total_diag'] > 0
            ? (float)$stats['positivos'] / (float)$stats['total_diag']
            : 0.0;

        // Peso promedio al nacer (solo animales nacidos en el sistema)
        $pesoNacer = Database::queryOne(
            "SELECT AVG(peso_entrada) AS avg_peso
             FROM animales
             WHERE usuario_id = :uid AND activo = 1
               AND peso_entrada IS NOT NULL
               AND fecha_nacimiento IS NOT NULL
               AND madre_id IS NOT NULL",
            [':uid' => $usuarioId]
        );
        $peso_nacer_hato = $pesoNacer['avg_peso'] ? round((float)$pesoNacer['avg_peso'], 2) : null;

        // IEP promedio del hato (intervalo entre partos)
        $iep = Database::queryOne(
            "SELECT AVG(dias) AS avg_iep FROM (
                SELECT DATEDIFF(p2.fecha, p1.fecha) AS dias
                FROM partos p1
                JOIN partos p2 ON p2.animal_id = p1.animal_id
                  AND p2.fecha > p1.fecha
                WHERE p1.usuario_id = :uid AND p2.usuario_id = :uid2
                  AND DATEDIFF(p2.fecha, p1.fecha) BETWEEN 280 AND 730
            ) AS intervalos",
            [':uid' => $usuarioId, ':uid2' => $usuarioId]
        );
        $iep_hato = $iep['avg_iep'] ? round((float)$iep['avg_iep'], 0) : null;

        // Mortalidad de crias (% de animales nacidos con estado_general='Muerto')
        $mort = Database::queryOne(
            "SELECT
                COUNT(CASE WHEN estado_general = 'Muerto' THEN 1 END) AS muertos,
                COUNT(*) AS total
             FROM animales
             WHERE usuario_id = :uid AND madre_id IS NOT NULL",
            [':uid' => $usuarioId]
        );
        $mortalidad_crias = $mort['total'] > 0
            ? round(((float)$mort['muertos'] / (float)$mort['total']) * 100, 1)
            : 0.0;

        self::$hatoCache = [
            'p_hato'           => $p_hato,
            'peso_nacer_hato'  => $peso_nacer_hato,
            'iep_hato'         => $iep_hato,
            'mortalidad_crias' => $mortalidad_crias,
        ];

        return self::$hatoCache;
    }

    /**
     * Shrinkage bayesiano: tasa_ajustada = (positivos + K * p_hato) / (n + K)
     */
    public static function bayesianShrinkage(int $positivos, int $n, float $p_hato): float
    {
        $denom = $n + self::K;
        if ($denom <= 0) return $p_hato;
        return ($positivos + self::K * $p_hato) / $denom;
    }

    /**
     * Recency weight: peso = exp(-λ * meses_antiguedad), λ = ln(2)/HALF_LIFE
     */
    public static function recencyWeight(int $mesesAntiguedad): float
    {
        $lambda = log(2) / self::HALF_LIFE;
        return exp(-$lambda * $mesesAntiguedad);
    }

    /**
     * Tasa vigente ponderada por recencia.
     * @param array $eventos [['meses_antiguedad' => int, 'positivo' => bool], ...]
     */
    public static function tasaVigente(array $eventos): float
    {
        $sumaPesos = 0.0;
        $sumaPonderada = 0.0;

        foreach ($eventos as $e) {
            $w = self::recencyWeight($e['meses_antiguedad']);
            $sumaPesos += $w;
            if ($e['positivo']) {
                $sumaPonderada += $w;
            }
        }

        return $sumaPesos > 0 ? $sumaPonderada / $sumaPesos : 0.0;
    }

    /**
     * Scorecard de toro.
     */
    public static function scorecardToro(int $toroId, int $usuarioId): array
    {
        $hato = self::benchmarksHato($usuarioId);

        // Servicios totales y diagnosticos
        $servStats = Database::queryOne(
            "SELECT
                COUNT(*) AS servicios_total,
                COUNT(dg.id) AS n_diagnosticados,
                COUNT(CASE WHEN dg.resultado = 'Positivo' THEN 1 END) AS positivos,
                COUNT(CASE WHEN dg.resultado = 'Negativo' THEN 1 END) AS negativos
             FROM servicios s
             LEFT JOIN diagnosticos_gestacion dg ON dg.servicio_id = s.id
             WHERE s.reproductor_id = :tid AND s.usuario_id = :uid",
            [':tid' => $toroId, ':uid' => $usuarioId]
        );

        $n = (int)($servStats['n_diagnosticados'] ?? 0);
        $positivos = (int)($servStats['positivos'] ?? 0);
        $negativos = (int)($servStats['negativos'] ?? 0);
        $serviciosTotal = (int)($servStats['servicios_total'] ?? 0);
        $pendientes = $serviciosTotal - $n;

        // Tasa historica
        $tasaHistorica = $n > 0 ? $positivos / $n : 0.0;
        $tasaAjustada = self::bayesianShrinkage($positivos, $n, $hato['p_hato']);

        // Eventos para recency
        $eventos = Database::query(
            "SELECT
                CASE WHEN dg.resultado = 'Positivo' THEN 1 ELSE 0 END AS positivo,
                TIMESTAMPDIFF(MONTH, dg.fecha, CURDATE()) AS meses_antiguedad
             FROM diagnosticos_gestacion dg
             JOIN servicios s ON s.id = dg.servicio_id
             WHERE s.reproductor_id = :tid AND dg.usuario_id = :uid
             ORDER BY dg.fecha DESC",
            [':tid' => $toroId, ':uid' => $usuarioId]
        );
        $eventosArr = array_map(fn($e) => [
            'positivo'          => (bool)$e['positivo'],
            'meses_antiguedad'  => (int)$e['meses_antiguedad'],
        ], $eventos);
        $tasaVigente = self::tasaVigente($eventosArr);

        // Tendencia: comparar ultimos 12 meses vs 12-24 meses atras
        $recientes = array_filter($eventosArr, fn($e) => $e['meses_antiguedad'] <= 12);
        $anteriores = array_filter($eventosArr, fn($e) => $e['meses_antiguedad'] > 12 && $e['meses_antiguedad'] <= 24);
        $tasaReciente = count($recientes) > 0
            ? count(array_filter($recientes, fn($e) => $e['positivo'])) / count($recientes)
            : null;
        $tasaAnterior = count($anteriores) > 0
            ? count(array_filter($anteriores, fn($e) => $e['positivo'])) / count($anteriores)
            : null;

        $tendencia = 'Estable';
        if ($tasaReciente !== null && $tasaAnterior !== null) {
            $diff = $tasaReciente - $tasaAnterior;
            if ($diff > 0.05) $tendencia = 'En mejora';
            elseif ($diff < -0.05) $tendencia = 'En declive';
        }

        // Hijos
        $hijos = Database::queryOne(
            "SELECT
                COUNT(*) AS total,
                COUNT(CASE WHEN sexo = 'Macho' THEN 1 END) AS machos,
                COUNT(CASE WHEN sexo = 'Hembra' THEN 1 END) AS hembras,
                AVG(peso_entrada) AS peso_prom
             FROM animales
             WHERE padre_id = :tid AND usuario_id = :uid AND peso_entrada IS NOT NULL",
            [':tid' => $toroId, ':uid' => $usuarioId]
        );
        $hijosTotal = (int)($hijos['total'] ?? 0);
        $pesoPromCrias = $hijos['peso_prom'] ? round((float)$hijos['peso_prom'], 2) : null;

        // Edad
        $edad = Database::queryOne(
            "SELECT TIMESTAMPDIFF(MONTH, fecha_nacimiento, CURDATE()) AS meses FROM animales WHERE id = :id",
            [':id' => $toroId]
        );
        $edadMeses = (int)($edad['meses'] ?? 0);

        // Alerta de racha negativa (ultimos 5 diagnosticos)
        $ultimos5 = array_slice($eventosArr, 0, 5);
        $rachaNegativa = count($ultimos5) >= 3 && count(array_filter($ultimos5, fn($e) => $e['positivo'])) <= 1;

        // Veredicto
        $confianza = $n >= self::N_MIN ? 'Alta' : 'Baja';
        $veredicto = self::veredictoToro($confianza, $tendencia, $rachaNegativa, $tasaVigente, $hato['p_hato'], $edadMeses);

        return [
            'servicios_total'    => $serviciosTotal,
            'n_diagnosticados'   => $n,
            'pendientes'         => $pendientes,
            'positivos'          => $positivos,
            'negativos'          => $negativos,
            'tasa_vigente'       => round($tasaVigente, 3),
            'tasa_historica'     => round($tasaHistorica, 3),
            'tasa_ajustada'      => round($tasaAjustada, 3),
            'tendencia'          => $tendencia,
            'p_hato'             => round($hato['p_hato'], 3),
            'edad_meses'         => $edadMeses,
            'hijos_total'        => $hijosTotal,
            'hijos_machos'       => (int)($hijos['machos'] ?? 0),
            'hijos_hembras'      => (int)($hijos['hembras'] ?? 0),
            'peso_nacer_prom'    => $pesoPromCrias,
            'delta_peso_hato'    => $pesoPromCrias && $hato['peso_nacer_hato']
                ? round($pesoPromCrias - $hato['peso_nacer_hato'], 2)
                : null,
            'confianza'          => $confianza,
            'alerta_racha'       => $rachaNegativa,
            'veredicto'          => $veredicto,
        ];
    }

    /**
     * Scorecard de vaca.
     */
    public static function scorecardVaca(int $vacaId, int $usuarioId): array
    {
        $hato = self::benchmarksHato($usuarioId);

        // Partos
        $partosData = Database::query(
            "SELECT fecha FROM partos WHERE animal_id = :aid AND usuario_id = :uid ORDER BY fecha",
            [':aid' => $vacaId, ':uid' => $usuarioId]
        );
        $partosTotal = count($partosData);
        $fechasPartos = array_column($partosData, 'fecha');

        // IEP promedio
        $iepPromedio = null;
        if (count($fechasPartos) >= 2) {
            $intervalos = [];
            for ($i = 1; $i < count($fechasPartos); $i++) {
                $d = (new \DateTime($fechasPartos[$i]))->diff(new \DateTime($fechasPartos[$i - 1]))->days;
                if ($d >= 280 && $d <= 730) {
                    $intervalos[] = $d;
                }
            }
            $iepPromedio = count($intervalos) > 0 ? round(array_sum($intervalos) / count($intervalos), 0) : null;
        }

        // Dias desde ultimo parto
        $diasUltimoParto = null;
        if (!empty($fechasPartos)) {
            $ultimo = end($fechasPartos);
            $diasUltimoParto = (new \DateTime($ultimo))->diff(new \DateTime())->days;
        }

        // Crias totales
        $crias = Database::queryOne(
            "SELECT COUNT(*) AS total FROM animales WHERE madre_id = :aid AND usuario_id = :uid",
            [':aid' => $vacaId, ':uid' => $usuarioId]
        );
        $criasTotal = (int)($crias['total'] ?? 0);

        // Servicios y concepcion
        $servStats = Database::queryOne(
            "SELECT COUNT(*) AS servicios_total FROM servicios WHERE animal_id = :aid AND usuario_id = :uid",
            [':aid' => $vacaId, ':uid' => $usuarioId]
        );
        $serviciosTotal = (int)($servStats['servicios_total'] ?? 0);

        $prenadas = Database::queryOne(
            "SELECT COUNT(*) AS total FROM diagnosticos_gestacion dg
             JOIN servicios s ON s.id = dg.servicio_id
             WHERE s.animal_id = :aid AND dg.usuario_id = :uid AND dg.resultado = 'Positivo'",
            [':aid' => $vacaId, ':uid' => $usuarioId]
        );
        $prenadasTotal = (int)($prenadas['total'] ?? 0);

        $serviciosPorConcepcion = $prenadasTotal > 0
            ? round($serviciosTotal / $prenadasTotal, 1)
            : null;

        // Peso promedio crias
        $pesoCrias = Database::queryOne(
            "SELECT AVG(peso_entrada) AS avg_peso FROM animales
             WHERE madre_id = :aid AND usuario_id = :uid AND peso_entrada IS NOT NULL",
            [':aid' => $vacaId, ':uid' => $usuarioId]
        );
        $pesoPromCrias = $pesoCrias['avg_peso'] ? round((float)$pesoCrias['avg_peso'], 2) : null;

        // Edad, etapa, estado
        $animal = Database::queryOne(
            "SELECT fecha_nacimiento, estado_reproductivo,
                    TIMESTAMPDIFF(MONTH, fecha_nacimiento, CURDATE()) AS meses
             FROM animales WHERE id = :id",
            [':id' => $vacaId]
        );
        $edadMeses = (int)($animal['meses'] ?? 0);
        $estado = $animal['estado_reproductivo'] ?? 'Vacia';

        // Edad al primer parto
        $edadPrimerParto = null;
        if (!empty($fechasPartos)) {
            $nacimiento = new \DateTime($animal['fecha_nacimiento']);
            $primerParto = new \DateTime($fechasPartos[0]);
            $edadPrimerParto = $nacimiento->diff($primerParto)->m + ($nacimiento->diff($primerParto)->y * 12);
        }

        return [
            'partos_total'              => $partosTotal,
            'crias_total'               => $criasTotal,
            'servicios_total'           => $serviciosTotal,
            'prenadas_total'            => $prenadasTotal,
            'servicios_por_concepcion'  => $serviciosPorConcepcion,
            'iep_promedio_dias'         => $iepPromedio,
            'dias_ultimo_parto'         => $diasUltimoParto,
            'edad_meses'                => $edadMeses,
            'edad_primer_parto_meses'   => $edadPrimerParto,
            'estado_reproductivo'       => $estado,
            'peso_nacer_prom_crias'     => $pesoPromCrias,
            'delta_peso_hato'          => $pesoPromCrias && $hato['peso_nacer_hato']
                ? round($pesoPromCrias - $hato['peso_nacer_hato'], 2)
                : null,
        ];
    }

    /**
     * Veredicto para toro (orden de prioridad).
     */
    private static function veredictoToro(
        string $confianza,
        string $tendencia,
        bool $rachaNegativa,
        float $tasaVigente,
        float $p_hato,
        int $edadMeses
    ): string {
        if ($confianza === 'Baja') return 'Datos insuficientes';
        if ($tendencia === 'En declive' && $edadMeses > 96) return 'Considerar reemplazo';
        if ($rachaNegativa) return 'Alerta - racha negativa';
        if ($tasaVigente >= $p_hato + 0.05) return 'Buen reproductor';
        if ($tasaVigente <= $p_hato - 0.10) return 'Revisar rendimiento';
        return 'En el promedio';
    }

    /**
     * Ranking de toros para un usuario/rebaño.
     */
    public static function rankingToros(int $usuarioId, ?int $rebanoId = null): array
    {
        $rebanoFiltro = $rebanoId !== null ? 'AND a.rebano_id = ' . (int)$rebanoId : '';

        $toros = Database::query(
            "SELECT a.id, a.nombre
             FROM animales a
             WHERE a.usuario_id = :uid AND a.activo = 1 AND a.sexo = 'Macho'
               AND a.estado_reproductivo = 'Padrote'
               $rebanoFiltro
             ORDER BY a.nombre",
            [':uid' => $usuarioId]
        );

        $ranking = [];
        foreach ($toros as $t) {
            $sc = self::scorecardToro((int)$t['id'], $usuarioId);
            $ranking[] = array_merge(['id' => (int)$t['id'], 'nombre' => $t['nombre']], $sc);
        }

        // Ordenar por tasa_vigente descendente
        usort($ranking, fn($a, $b) => $b['tasa_vigente'] <=> $a['tasa_vigente']);

        return $ranking;
    }

    /**
     * Ranking de vacas para un usuario/rebaño.
     */
    public static function rankingVacas(int $usuarioId, ?int $rebanoId = null): array
    {
        $rebanoFiltro = $rebanoId !== null ? 'AND a.rebano_id = ' . (int)$rebanoId : '';

        $vacas = Database::query(
            "SELECT a.id, a.nombre
             FROM animales a
             WHERE a.usuario_id = :uid AND a.activo = 1 AND a.sexo = 'Hembra'
               AND TIMESTAMPDIFF(MONTH, a.fecha_nacimiento, CURDATE()) >= 30
               $rebanoFiltro
             ORDER BY a.nombre",
            [':uid' => $usuarioId]
        );

        $hato = self::benchmarksHato($usuarioId);

        $ranking = [];
        foreach ($vacas as $v) {
            $sc = self::scorecardVaca((int)$v['id'], $usuarioId);

            // Score compuesto simple: partos_total * 10 + crias_total * 5 - (dias_ultimo_parto / 30 si >365)
            $score = ($sc['partos_total'] * 10) + ($sc['crias_total'] * 5);
            if ($sc['dias_ultimo_parto'] && $sc['dias_ultimo_parto'] > 365) {
                $score -= floor(($sc['dias_ultimo_parto'] - 365) / 30) * 2;
            }
            if ($sc['iep_promedio_dias'] && $sc['iep_promedio_dias'] > 400) {
                $score -= 5;
            }

            $ranking[] = array_merge(
                ['id' => (int)$v['id'], 'nombre' => $v['nombre'], 'score' => max(0, $score)],
                $sc
            );
        }

        usort($ranking, fn($a, $b) => $b['score'] <=> $a['score']);

        return $ranking;
    }
}
