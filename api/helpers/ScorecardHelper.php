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

        // Partos: tabla partos + crías con madre_id, deduplicados por fecha
        $partosFormales = Database::query(
            "SELECT fecha FROM partos WHERE animal_id = :aid AND usuario_id = :uid ORDER BY fecha",
            [':aid' => $vacaId, ':uid' => $usuarioId]
        );
        $fechasFormales = array_column($partosFormales, 'fecha');

        // Partos implícitos: crías que tienen a esta vaca como madre
        $crias = Database::query(
            "SELECT fecha_nacimiento FROM animales WHERE madre_id = :aid AND usuario_id = :uid AND fecha_nacimiento IS NOT NULL",
            [':aid' => $vacaId, ':uid' => $usuarioId]
        );
        $fechasImplicitos = array_column($crias, 'fecha_nacimiento');

        // Unir y deduplicar (misma fecha = mismo parto)
        $todasLasFechas = array_unique(array_merge($fechasFormales, $fechasImplicitos));
        sort($todasLasFechas);
        $partosTotal = count($todasLasFechas);

        // IEP promedio (todos los intervalos >= 280 días, igual que en IVM)
        $iepPromedio = null;
        if (count($todasLasFechas) >= 2) {
            $intervalos = [];
            for ($i = 1; $i < count($todasLasFechas); $i++) {
                $d = (new \DateTime($todasLasFechas[$i]))->diff(new \DateTime($todasLasFechas[$i - 1]))->days;
                if ($d >= 280) {
                    $intervalos[] = $d;
                }
            }
            $iepPromedio = count($intervalos) > 0 ? round(array_sum($intervalos) / count($intervalos), 0) : null;
        }

        // Dias desde ultimo parto
        $diasUltimoParto = null;
        if (!empty($todasLasFechas)) {
            $ultimo = end($todasLasFechas);
            $diasUltimoParto = (new \DateTime($ultimo))->diff(new \DateTime())->days;
        }

        // Crias totales (por relacion madre, sin contar como partos)
        $crias = Database::query(
            "SELECT id FROM animales WHERE madre_id = :aid AND usuario_id = :uid",
            [':aid' => $vacaId, ':uid' => $usuarioId]
        );
        $criasTotal = count($crias);

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
        if (!empty($todasLasFechas)) {
            $nacimiento = new \DateTime($animal['fecha_nacimiento']);
            $primerParto = new \DateTime($todasLasFechas[0]);
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

    // ═══════════════════════════════════════════════════════════════
    // IVM — Índice de Valor Maternal (corregido)
    // ═══════════════════════════════════════════════════════════════

    /**
     * IVM vacío para animales sin datos.
     */
    private static function ivmVacio(): array
    {
        return [
            'ivm_tipo'                     => 'IVM',
            'ivm_p'                        => null,
            'cantidad_partos'              => 0,
            'edad_primer_parto_meses'      => null,
            'promedio_iep_dias'            => null,
            'intervalos_mayores_700'       => 0,
            'intervalos_mayores_600'       => 0,
            'cantidad_crias'               => 0,
            'crias_vendidas'               => 0,
            'crias_vivas'                  => 0,
            'crias_muertas_antes_7'        => 0,
            'crias_muertas_antes_30'       => 0,
            'puntaje_edad_primer_parto'    => 0.0,
            'puntaje_intervalo'            => 0.0,
            'puntaje_crias'                => 0.0,
            'puntaje_consistencia'         => 0.0,
            'bono_precocidad'              => 0.0,
            'ivm_bruto'                    => 0.0,
            'factor_confianza'             => 0.60,
            'ivm_final'                    => 0.0,
            'categoria'                    => 'Sin datos',
            'alerta'                       => 'Datos insuficientes',
            'detalle_crias'                => [],
        ];
    }

    /**
     * Clasifica el estado reproductivo en 3 categorías para IVM-P.
     */
    private static function clasificarEstado(string $estado): string
    {
        $e = mb_strtolower(trim($estado));
        if (strpos($e, 'prenada') !== false || strpos($e, 'preñada') !== false) return 'prenada';
        if ($e === 'lactando') return 'prenada'; // lactando = ya parió, pero IVM-P es para 0 partos
        if ($e === 'vacia' || $e === 'vacía') return 'vacia';
        return 'servicio';
    }

    /**
     * IVM-P — Provisional para hembras con 0 partos.
     */
    public static function calcularIVMP(int $vacaId, int $usuarioId): array
    {
        $animal = Database::queryOne(
            "SELECT fecha_nacimiento, estado_reproductivo,
                    TIMESTAMPDIFF(MONTH, fecha_nacimiento, CURDATE()) AS meses
             FROM animales WHERE id = :id",
            [':id' => $vacaId]
        );
        if (!$animal || empty($animal['fecha_nacimiento'])) {
            return self::ivmVacio();
        }

        $edadMeses = (int)($animal['meses'] ?? 0);
        $estado = self::clasificarEstado($animal['estado_reproductivo'] ?? 'Vacia');

        $base = self::ivmVacio();
        $base['ivm_tipo'] = 'IVM-P';
        $base['cantidad_partos'] = 0;
        $base['subcategoria'] = 'Preparto';

        if ($edadMeses < 18) {
            $base['categoria'] = 'No evaluar';
            $base['alerta'] = null;
            return $base;
        }

        // Tabla IVM-P
        $tabla = [
            '18-23' => ['prenada' => 72, 'servicio' => 58, 'vacia' => 48],
            '24-30' => ['prenada' => 78, 'servicio' => 55, 'vacia' => 42],
            '31-34' => ['prenada' => 65, 'servicio' => 45, 'vacia' => 35],
            '35+'   => ['prenada' => 55, 'servicio' => 35, 'vacia' => 25],
        ];

        $rango = $edadMeses <= 23 ? '18-23'
            : ($edadMeses <= 30 ? '24-30'
            : ($edadMeses <= 34 ? '31-34' : '35+'));

        $ivmP = $tabla[$rango][$estado] ?? 25;
        $base['ivm_p'] = $ivmP;
        $base['ivm_final'] = $ivmP;

        // Categoría
        if ($ivmP >= 75) {
            $base['categoria'] = 'Promesa preñada sobresaliente';
        } elseif ($ivmP >= 65) {
            $base['categoria'] = 'Promesa preñada buena';
        } elseif ($ivmP >= 50) {
            $base['categoria'] = 'En observacion';
        } else {
            $base['categoria'] = 'Novilla vacia / revisar';
        }

        if ($edadMeses >= 35 && $estado === 'vacia') {
            $base['categoria'] = 'Alerta reproductiva';
        }

        // Descarte: solo después de 48 meses
        if ($edadMeses >= 48) {
            $base['alerta'] = 'Linea de descarte por edad';
        } else {
            $base['alerta'] = null;
        }

        return $base;
    }

    /**
     * Calcula el Índice de Valor Maternal (IVM) — corregido.
     *
 * 5 criterios (0–100 pts máx):
 *   1. Edad al primer parto       — 15 pts
 *   2. Intervalo entre partos      — 25 pts
 *   3. Resultado de crías          — 30 pts
 *   4. Consistencia                —  8 pts
 *   5. Bono precocidad sostenida   — máx +5
     */
    public static function calcularIVM(int $vacaId, int $usuarioId): array
    {
        // ── Datos básicos ──
        $animal = Database::queryOne(
            "SELECT fecha_nacimiento, estado_reproductivo,
                    TIMESTAMPDIFF(MONTH, fecha_nacimiento, CURDATE()) AS meses
             FROM animales WHERE id = :id",
            [':id' => $vacaId]
        );
        if (!$animal || empty($animal['fecha_nacimiento'])) {
            return self::ivmVacio();
        }

        $edadMeses = (int)($animal['meses'] ?? 0);
        $fechaNacimiento = $animal['fecha_nacimiento'];
        $estadoReproductivo = $animal['estado_reproductivo'] ?? 'Vacia';

        // ── Partos (formales + implícitos por crías) ──
        $partosFormales = Database::query(
            "SELECT fecha FROM partos WHERE animal_id = :aid AND usuario_id = :uid ORDER BY fecha",
            [':aid' => $vacaId, ':uid' => $usuarioId]
        );
        $fechasFormales = array_column($partosFormales, 'fecha');

        $criasData = Database::query(
            "SELECT id, fecha_nacimiento, estado_general, activo, fecha_salida,
                    TIMESTAMPDIFF(DAY, fecha_nacimiento, COALESCE(fecha_salida, CURDATE())) AS dias_vida,
                    TIMESTAMPDIFF(MONTH, fecha_nacimiento, CURDATE()) AS meses_actuales
             FROM animales
             WHERE madre_id = :aid AND usuario_id = :uid",
            [':aid' => $vacaId, ':uid' => $usuarioId]
        );

        $fechasImplicitos = [];
        foreach ($criasData as $c) {
            if (!empty($c['fecha_nacimiento'])) {
                $fechasImplicitos[] = $c['fecha_nacimiento'];
            }
        }

        $todasLasFechas = array_unique(array_merge($fechasFormales, $fechasImplicitos));
        sort($todasLasFechas);
        $cantidadPartos = count($todasLasFechas);

        // ── Si 0 partos → delegar a IVM-P ──
        if ($cantidadPartos === 0) {
            return self::calcularIVMP($vacaId, $usuarioId);
        }

        // ═══════════════════════════════════════════
        // CRITERIO 1: Edad al primer parto (15 pts)
        // ═══════════════════════════════════════════
        $nacimiento = new \DateTime($fechaNacimiento);
        $primerParto = new \DateTime($todasLasFechas[0]);
        $edadPrimerPartoMeses = $nacimiento->diff($primerParto)->m
            + ($nacimiento->diff($primerParto)->y * 12);

        if ($edadPrimerPartoMeses >= 24 && $edadPrimerPartoMeses <= 34) {
            $puntajeEdadPrimerParto = 15.0;
        } elseif ($edadPrimerPartoMeses <= 40) {
            $puntajeEdadPrimerParto = 12.0;
        } elseif ($edadPrimerPartoMeses <= 44) {
            $puntajeEdadPrimerParto = 8.0;
        } elseif ($edadPrimerPartoMeses <= 48) {
            $puntajeEdadPrimerParto = 5.0;
        } elseif ($edadPrimerPartoMeses > 48) {
            $puntajeEdadPrimerParto = 2.0;
        } else {
            $puntajeEdadPrimerParto = 12.0; // < 24m, revisar dato
        }

        // ═══════════════════════════════════════════
        // CRITERIO 2: Intervalo entre partos (25 pts)
        // ═══════════════════════════════════════════
        $puntajesIntervalos = [];
        $intervalosMayores700 = 0;
        $intervalosMayores600 = 0;
        $promedioIEP = null;
        $totalDiasIEP = 0;
        $cantidadIntervalosValidos = 0;
        $diasUltimoParto = null;

        if (!empty($todasLasFechas)) {
            $ultimo = end($todasLasFechas);
            $diasUltimoParto = (new \DateTime($ultimo))->diff(new \DateTime())->days;
        }

        if ($cantidadPartos >= 2) {
            for ($i = 1; $i < $cantidadPartos; $i++) {
                $dias = (new \DateTime($todasLasFechas[$i]))
                    ->diff(new \DateTime($todasLasFechas[$i - 1]))->days;
                if ($dias < 280) continue;

                $totalDiasIEP += $dias;
                $cantidadIntervalosValidos++;

                if ($dias <= 365)       $pBase = 25.0;
                elseif ($dias <= 420)   $pBase = 22.5;
                elseif ($dias <= 450)   $pBase = 20.0;
                elseif ($dias <= 480)   $pBase = 17.5;
                elseif ($dias <= 540)   $pBase = 12.5;
                elseif ($dias <= 600)   $pBase = 10.0;
                elseif ($dias <= 700)   $pBase = 5.0;
                else                    $pBase = 0.0;

                $puntajesIntervalos[] = $pBase;
                if ($dias > 700) $intervalosMayores700++;
                if ($dias > 600) $intervalosMayores600++;
            }
        }

        if ($cantidadIntervalosValidos > 0) {
            $promedioIEP = round($totalDiasIEP / $cantidadIntervalosValidos, 0);
            $promedioPuntajesInt = array_sum($puntajesIntervalos) / count($puntajesIntervalos);
            $puntajeIntervalo = min(25.0, $promedioPuntajesInt);
        } elseif ($cantidadPartos == 1) {
            // Un solo parto: sin historial de intervalos, no se puede medir
            $puntajeIntervalo = 0.0;
        } else {
            // Sin intervalos válidos
            $puntajeIntervalo = 0.0;
        }

        // ═══════════════════════════════════════════
        // CRITERIO 3: Resultado de crías (30 pts)
        // ═══════════════════════════════════════════
        $puntajesCrias = [];
        $criasVendidas = 0;
        $criasVivasDesarrollo = 0;
        $criasVivasJoven = 0;
        $criasMuertasAntes7 = 0;
        $criasMuertasAntes30 = 0;
        $detalleCrias = [];

        foreach ($criasData as $cria) {
            $estadoG = $cria['estado_general'];
            $diasVida = (int)$cria['dias_vida'];
            $mesesAct = (int)$cria['meses_actuales'];
            $activo = (int)$cria['activo'];

            if ($estadoG === 'Vendido') {
                $pCria = 30;
                $criasVendidas++;
                $estadoCria = 'Vendido';
            } elseif ($activo == 1) {
                if ($mesesAct >= 18) {
                    $pCria = 25.5;
                    $estadoCria = 'Viva (desarrollo)';
                    $criasVivasDesarrollo++;
                } else {
                    $pCria = 21;
                    $estadoCria = 'Viva (joven)';
                    $criasVivasJoven++;
                }
            } elseif ($estadoG === 'Muerto') {
                if ($diasVida <= 7) {
                    $pCria = -10;
                    $estadoCria = 'Muerta 0-7d';
                    $criasMuertasAntes7++;
                    $criasMuertasAntes30++;
                } else {
                    $pCria = 0;
                    $estadoCria = $diasVida <= 30 ? 'Muerta 8-30d' : 'Muerta 31+d';
                    if ($diasVida <= 30) $criasMuertasAntes30++;
                }
            } else {
                $pCria = 21;
                $estadoCria = 'Indeterminado';
                $criasVivasJoven++;
            }

            $puntajesCrias[] = $pCria;
            $detalleCrias[] = [
                'id'       => (int)$cria['id'],
                'dias_vida'=> $diasVida,
                'estado'   => $estadoCria,
                'puntaje'  => $pCria,
            ];
        }

        // Penalización 2+ muertas 0-7d → -20 cada una
        if ($criasMuertasAntes7 >= 2) {
            foreach ($puntajesCrias as $i => $score) {
                if ($score === -10) {
                    $puntajesCrias[$i] = -20;
                }
            }
            foreach ($detalleCrias as &$dc) {
                if ($dc['estado'] === 'Muerta 0-7d') {
                    $dc['puntaje'] = -20;
                }
            }
            unset($dc);
        }

        // ── Puntaje de crías: suma con tope 30 ──
        $totalCrias = count($puntajesCrias);
        $puntajeCrias = min(30.0, max(0.0, array_sum($puntajesCrias)));

        // ═══════════════════════════════════════════
        // CRITERIO 4: Consistencia (8 pts)
        // ═══════════════════════════════════════════
        $esPrenada = in_array($estadoReproductivo, ['Prenada', 'Lactando']);
        $baseConsistencia = match(true) {
            $cantidadPartos >= 4 => 8,
            $cantidadPartos == 3 => 7,
            $cantidadPartos == 2 => 5,
            $cantidadPartos == 1 && $esPrenada => 4,
            $cantidadPartos == 1 => 2,
            default => 0,
        };

        $penalizaciones = 0;
        // Std dev de intervalos > 200
        if (count($puntajesIntervalos) >= 2) {
            $diasIntervalos = [];
            for ($i = 1; $i < $cantidadPartos; $i++) {
                $d = (new \DateTime($todasLasFechas[$i]))
                    ->diff(new \DateTime($todasLasFechas[$i - 1]))->days;
                if ($d >= 280) $diasIntervalos[] = $d;
            }
            if (count($diasIntervalos) >= 2) {
                $avg = array_sum($diasIntervalos) / count($diasIntervalos);
                $sumSq = 0;
                foreach ($diasIntervalos as $di) {
                    $sumSq += pow($di - $avg, 2);
                }
                $stdDev = sqrt($sumSq / count($diasIntervalos));
                if ($stdDev > 200) $penalizaciones += 2;
            }
        }

        if ($intervalosMayores600 >= 1) $penalizaciones += 2;
        if (empty($fechaNacimiento)) $penalizaciones += 1;

        $puntajeConsistencia = max(0, $baseConsistencia - $penalizaciones);

        // Penalización por inactividad: días sin parir
        $penalizacionInactividad = 0.0;
        if ($diasUltimoParto !== null) {
            if ($diasUltimoParto > 1095) {
                $penalizacionInactividad = 40.0;
            } elseif ($diasUltimoParto > 900) {
                $penalizacionInactividad = 10.0;
            } elseif ($diasUltimoParto > 720) {
                $penalizacionInactividad = 5.0;
            } elseif ($diasUltimoParto > 500) {
                $penalizacionInactividad = 3.0;
            } elseif ($diasUltimoParto > 365) {
                $penalizacionInactividad = 1.0;
            }
        }

        // ═══════════════════════════════════════════
        // CRITERIO 5: Bono precocidad sostenida (máx +5)
        // ═══════════════════════════════════════════
        $bonoPrecocidad = 0.0;

        // Bono por primer parto joven (incluso 1 solo parto)
        if ($edadPrimerPartoMeses !== null && $edadPrimerPartoMeses <= 34) {
            $bonoPrecocidad = $edadPrimerPartoMeses <= 30 ? 3.0 : 2.0;
        }

        // Bono extra si mantuvo ritmo (2+ partos con buenos intervalos)
        if ($cantidadIntervalosValidos > 0) {
            $intervalosBuenos = 0;
            $diasIntervalosBono = [];
            for ($i = 1; $i < $cantidadPartos; $i++) {
                $d = (new \DateTime($todasLasFechas[$i]))
                    ->diff(new \DateTime($todasLasFechas[$i - 1]))->days;
                if ($d >= 280) $diasIntervalosBono[] = $d;
            }
            foreach ($diasIntervalosBono as $d) {
                if ($d <= 420) $intervalosBuenos++;
            }
            $totalIntBono = count($diasIntervalosBono);
            $pctBuenos = $totalIntBono > 0 ? $intervalosBuenos / $totalIntBono : 0;

            if ($edadPrimerPartoMeses >= 24 && $edadPrimerPartoMeses <= 34 && $pctBuenos >= 0.80) {
                $bonoPrecocidad = max($bonoPrecocidad, 5.0);
            } elseif ($edadPrimerPartoMeses >= 24 && $edadPrimerPartoMeses <= 34 && $intervalosBuenos >= 1) {
                $bonoPrecocidad = max($bonoPrecocidad, 3.0);
            }

            // Bono por recuperación: empezó tarde (>34m) pero mantuvo ritmo
            if ($edadPrimerPartoMeses > 34 && $pctBuenos >= 0.80 && $cantidadIntervalosValidos >= 2) {
                $bonoPrecocidad = max($bonoPrecocidad, 3.0);
            }
        }

        // Bono por vaca vieja que mejoró ritmo (últimos 3 años con intervalos ≤420d)
        if ($edadMeses > 84 && $cantidadIntervalosValidos >= 2) {
            $recientesBuenos = 0;
            $recientesTotal = 0;
            for ($i = max(1, $cantidadPartos - 3); $i < $cantidadPartos; $i++) {
                $d = (new \DateTime($todasLasFechas[$i]))
                    ->diff(new \DateTime($todasLasFechas[$i - 1]))->days;
                if ($d >= 280) {
                    $recientesTotal++;
                    if ($d <= 420) $recientesBuenos++;
                }
            }
            if ($recientesTotal >= 2 && $recientesBuenos == $recientesTotal) {
                $bonoPrecocidad = max($bonoPrecocidad, 3.0);
            }
        }

        // ═══════════════════════════════════════════
        // IVM Bruto
        // ═══════════════════════════════════════════
        $ivmBruto = $puntajeEdadPrimerParto
                  + $puntajeIntervalo
                  + $puntajeCrias
                  + $puntajeConsistencia
                  + $bonoPrecocidad
                  - $penalizacionInactividad;

        $ivmBrutoCorregido = max(0, min(100, $ivmBruto));

        // ═══════════════════════════════════════════
        // Factor de confianza
        // ═══════════════════════════════════════════
        $factorConfianza = match(true) {
            $cantidadPartos >= 4 => 1.00,
            $cantidadPartos == 3 => 0.90,
            $cantidadPartos == 2 => 0.75,
            default => 0.55,
        };

        // ═══════════════════════════════════════════
        // IVM Final
        // ═══════════════════════════════════════════
        $ivmFinal = 50 + $factorConfianza * ($ivmBrutoCorregido - 50);
        $ivmFinal = max(0, min(100, $ivmFinal));

        // ═══════════════════════════════════════════
        // Categoría y subcategoría
        // ═══════════════════════════════════════════
        $alerta = null;

        // Reglas de descarte
        $categoriaForzada = null;
        if ($criasMuertasAntes30 >= 2) {
            $alerta = 'Linea de descarte';
        } elseif ($intervalosMayores700 >= 2) {
            $alerta = 'Linea de descarte';
        }

        if ($ivmFinal >= 78) {
            $cat = 'Elite';
        } elseif ($ivmFinal >= 68) {
            $cat = 'Muy buena';
        } elseif ($ivmFinal >= 58) {
            $cat = 'Buena';
        } elseif ($ivmFinal >= 50) {
            $cat = 'Regular';
        } elseif ($ivmFinal >= 40) {
            $cat = 'Aceptable';
        } else {
            $cat = 'Mala';
        }

        $categoria = $cat;

        return [
            'ivm_tipo'                     => 'IVM',
            'ivm_p'                        => null,
            'cantidad_partos'              => $cantidadPartos,
            'edad_primer_parto_meses'      => $edadPrimerPartoMeses,
            'promedio_iep_dias'            => $promedioIEP,
            'intervalos_mayores_700'       => $intervalosMayores700,
            'intervalos_mayores_600'       => $intervalosMayores600,
            'cantidad_crias'               => $totalCrias,
            'crias_vendidas'               => $criasVendidas,
            'crias_vivas'                  => $criasVivasDesarrollo + $criasVivasJoven,
            'crias_muertas_antes_7'        => $criasMuertasAntes7,
            'crias_muertas_antes_30'       => $criasMuertasAntes30,
            'puntaje_edad_primer_parto'    => round($puntajeEdadPrimerParto, 2),
            'puntaje_intervalo'            => round($puntajeIntervalo, 2),
            'puntaje_crias'                => round($puntajeCrias, 2),
            'puntaje_consistencia'         => round($puntajeConsistencia, 2),
            'bono_precocidad'              => round($bonoPrecocidad, 2),
            'ivm_bruto'                    => round($ivmBruto, 2),
            'factor_confianza'             => $factorConfianza,
            'ivm_final'                    => round($ivmFinal, 2),
            'categoria'                    => $categoria,
            'alerta'                       => $alerta,
            'detalle_crias'                => $detalleCrias,
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
            "SELECT a.id, a.nombre, a.foto
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
            $ranking[] = array_merge(['id' => (int)$t['id'], 'nombre' => $t['nombre'], 'foto' => $t['foto']], $sc);
        }

        // Ordenar por tasa_vigente descendente
        usort($ranking, fn($a, $b) => $b['tasa_vigente'] <=> $a['tasa_vigente']);

        return $ranking;
    }

    /**
     * Ranking de vacas — 2 grupos.
     *
     * Grupo A: Vacas con partos (1+ partos)
     * Grupo B: Hembras preparto (0 partos, >= 18 meses)
     */
    public static function rankingVacas(int $usuarioId, ?int $rebanoId = null): array
    {
        $rebanoFiltro = $rebanoId !== null ? 'AND a.rebano_id = ' . (int)$rebanoId : '';

        $vacas = Database::query(
            "SELECT a.id, a.nombre, a.foto
             FROM animales a
             WHERE a.usuario_id = :uid AND a.activo = 1 AND a.sexo = 'Hembra'
               AND TIMESTAMPDIFF(MONTH, a.fecha_nacimiento, CURDATE()) >= 18
               $rebanoFiltro
             ORDER BY a.nombre",
            [':uid' => $usuarioId]
        );

        $grupoA = []; // 1+ partos
        $grupoB = []; // 0 partos (preparto)

        foreach ($vacas as $v) {
            try {
                $ivm = self::calcularIVM((int)$v['id'], $usuarioId);
            } catch (\Throwable $e) {
                $ivm = self::ivmVacio();
            }

            $entry = array_merge(
                ['id' => (int)$v['id'], 'nombre' => $v['nombre'], 'foto' => $v['foto']],
                $ivm
            );

            $partos = (int)($ivm['cantidad_partos'] ?? 0);
            if ($partos >= 1) {
                $grupoA[] = $entry;
            } else {
                $grupoB[] = $entry;
            }
        }

        // Ordenar A por IVM final descendente (forzar float)
        usort($grupoA, function ($a, $b) {
            $aScore = (float)($a['ivm_final'] ?? 0);
            $bScore = (float)($b['ivm_final'] ?? 0);
            return $bScore <=> $aScore;
        });

        // Numerar posiciones
        $pos = 1;
        foreach ($grupoA as &$item) {
            $item['posicion'] = $pos++;
        }
        unset($item);

        // Ordenar B: preñadas → servicio → vacías
        usort($grupoB, function ($a, $b) {
            $order = ['prenada' => 0, 'servicio' => 1, 'vacia' => 2];
            $catA = $a['categoria'] ?? '';
            $catB = $b['categoria'] ?? '';

            $tipoA = stripos($catA, 'prenada') !== false ? 'prenada'
                : (stripos($catA, 'servicio') !== false || stripos($catA, 'observacion') !== false ? 'servicio' : 'vacia');
            $tipoB = stripos($catB, 'prenada') !== false ? 'prenada'
                : (stripos($catB, 'servicio') !== false || stripos($catB, 'observacion') !== false ? 'servicio' : 'vacia');

            $oa = $order[$tipoA] ?? 3;
            $ob = $order[$tipoB] ?? 3;
            return $oa <=> $ob;
        });

        // Numerar posiciones grupo B
        $posB = 1;
        foreach ($grupoB as &$item) {
            $item['posicion'] = $posB++;
        }
        unset($item);

        return [
            'grupo_a' => $grupoA,
            'grupo_b' => $grupoB,
        ];
    }
}
