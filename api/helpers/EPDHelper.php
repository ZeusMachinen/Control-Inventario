<?php
/**
 * EPDHelper — Índice EPD (Expected Progeny Difference) simplificado.
 *
 * Z-score normalizado contra el hato, reescalado a índice = 50 + 10*z, acotado [0, 100].
 * Fórmulas de Engram #92.
 */
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/ScorecardHelper.php';

class EPDHelper
{
    const N_MIN = 3; // umbral de confianza para provisional

    /**
     * Calcula el EPD de un toro.
     *
     * Pesos:
     *   tasa_vigente    0.40
     *   peso_nacer_prom 0.20
     *   supervivencia  0.25
     *   hijos_total     0.15
     */
    public static function epdToro(array $scorecard, array $hato): array
    {
        $componentes = [];
        $ponderado = 0.0;
        $pesosUsados = 0.0;
        $provisional = $scorecard['n_diagnosticados'] < self::N_MIN;

        // 1. Tasa vigente (0.40)
        if ($hato['p_hato'] > 0) {
            $z = self::zScore($scorecard['tasa_vigente'], $hato['p_hato'], 0.15); // std estimado 0.15
            $componentes['tasa_vigente'] = ['z' => round($z, 2), 'peso' => 0.40];
            $ponderado += $z * 0.40;
            $pesosUsados += 0.40;
        }

        // 2. Peso promedio crias (0.20)
        if ($scorecard['peso_nacer_prom'] && $hato['peso_nacer_hato']) {
            $z = self::zScore($scorecard['peso_nacer_prom'], $hato['peso_nacer_hato'], $hato['peso_nacer_hato'] * 0.15);
            $componentes['peso_nacer_prom'] = ['z' => round($z, 2), 'peso' => 0.20];
            $ponderado += $z * 0.20;
            $pesosUsados += 0.20;
        }

        // 3. Supervivencia de crias (0.25)
        $componentes['supervivencia'] = ['z' => 0, 'peso' => 0.25, 'nota' => 'No calculable sin mortalidad por toro'];
        // No hay datos por toro para mortalidad → omitimos, redistribuir peso no usado

        // 4. Hijos totales (0.15)
        if ($scorecard['hijos_total'] > 0) {
            // Normalizar contra un maximo esperado (~20 hijos para toro adulto)
            $z = min(2.0, $scorecard['hijos_total'] / 10.0);
            $componentes['hijos_total'] = ['z' => round($z, 2), 'peso' => 0.15];
            $ponderado += $z * 0.15;
            $pesosUsados += 0.15;
        }

        // Ajustar por pesos efectivos
        $zFinal = $pesosUsados > 0 ? $ponderado / $pesosUsados : 0;
        $indice = self::zToIndice($zFinal);

        return [
            'indice'       => $indice,
            'provisional'  => $provisional,
            'componentes'  => $componentes,
            'z_final'      => round($zFinal, 2),
        ];
    }

    /**
     * Calcula el EPD de una vaca.
     *
     * Pesos:
     *   fertilidad       0.30
     *   iep_invertido    0.25
     *   supervivencia    0.20
     *   peso_nacer_prom  0.10
     *   partos_total     0.15
     */
    public static function epdVaca(array $scorecard, array $hato): array
    {
        $componentes = [];
        $ponderado = 0.0;
        $provisional = $scorecard['partos_total'] < 2;

        // 1. Fertilidad — servicios por concepcion, invertido (0.30)
        if ($scorecard['servicios_por_concepcion'] !== null && $scorecard['servicios_por_concepcion'] > 0) {
            // Mejor = mas bajo. Invertir para que z positivo = mejor
            $ratio = 1.5 / $scorecard['servicios_por_concepcion']; // 1.5 = referencia buena
            $z = ($ratio - 1.0) / 0.3;
            $componentes['fertilidad'] = ['z' => round($z, 2), 'peso' => 0.30];
            $ponderado += $z * 0.30;
        } else {
            $componentes['fertilidad'] = ['z' => 0, 'peso' => 0.30];
            $ponderado += 0;
        }

        // 2. IEP invertido (0.25)
        if ($scorecard['iep_promedio_dias'] && $hato['iep_hato']) {
            // Menor IEP = mejor. Invertir.
            $z = self::zScore($hato['iep_hato'], $scorecard['iep_promedio_dias'], 60); // menor que hato = positivo
            $componentes['iep_invertido'] = ['z' => round($z, 2), 'peso' => 0.25];
            $ponderado += $z * 0.25;
        } else {
            $componentes['iep_invertido'] = ['z' => 0, 'peso' => 0.25];
        }

        // 3. Peso nacer crias (0.10)
        if ($scorecard['peso_nacer_prom_crias'] && $hato['peso_nacer_hato']) {
            $z = self::zScore($scorecard['peso_nacer_prom_crias'], $hato['peso_nacer_hato'], $hato['peso_nacer_hato'] * 0.15);
            $componentes['peso_nacer_prom'] = ['z' => round($z, 2), 'peso' => 0.10];
            $ponderado += $z * 0.10;
        } else {
            $componentes['peso_nacer_prom'] = ['z' => 0, 'peso' => 0.10];
        }

        // 4. Partos totales (0.15)
        if ($scorecard['partos_total'] > 0) {
            $z = min(2.0, ($scorecard['partos_total'] - 2) / 3.0);
            $componentes['partos_total'] = ['z' => round($z, 2), 'peso' => 0.15];
            $ponderado += $z * 0.15;
        } else {
            $componentes['partos_total'] = ['z' => -1.0, 'peso' => 0.15];
            $ponderado += -1.0 * 0.15;
            $provisional = true;
        }

        $zFinal = $ponderado; // todos los pesos suman 1.0 si estan disponibles
        $indice = self::zToIndice($zFinal);

        return [
            'indice'       => $indice,
            'provisional'  => $provisional,
            'componentes'  => $componentes,
            'z_final'      => round($zFinal, 2),
        ];
    }

    /**
     * Z-score: (valor - media) / std
     */
    private static function zScore(float $valor, float $media, float $std): float
    {
        if ($std <= 0) return 0;
        return ($valor - $media) / $std;
    }

    /**
     * Reescala z-score a índice 0-100: índice = 50 + 10*z, acotado [0, 100]
     */
    private static function zToIndice(float $z): int
    {
        $indice = (int)round(50 + 10 * $z);
        return max(0, min(100, $indice));
    }
}
