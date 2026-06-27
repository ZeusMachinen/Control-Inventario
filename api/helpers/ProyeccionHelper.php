<?php
/**
 * ProyeccionHelper — Proyecciones a 12 meses basadas en promedios móviles ponderados.
 */
require_once __DIR__ . '/Database.php';

class ProyeccionHelper
{
    /**
     * Genera proyecciones de crecimiento, pariciones y costos para un rebaño.
     *
     * @return array con proyecciones mensuales a 12 meses
     */
    public static function proyectar(int $usuarioId, ?int $rebanoId = null): array
    {
        $rebanoFiltro = $rebanoId !== null ? 'AND a.rebano_id = ' . (int)$rebanoId : '';

        // Animales activos actuales
        $actual = Database::queryOne(
            "SELECT COUNT(*) AS total FROM animales a WHERE a.usuario_id = :uid AND a.activo = 1 $rebanoFiltro",
            [':uid' => $usuarioId]
        );
        $totalActual = (int)($actual['total'] ?? 0);

        // Tasas historicas mensuales (ultimos 24 meses)
        $historial = Database::query(
            "SELECT
                DATE_FORMAT(a.fecha_nacimiento, '%Y-%m') AS mes,
                COUNT(*) AS cantidad
             FROM animales a
             WHERE a.usuario_id = :uid AND a.activo = 1
               AND a.fecha_nacimiento >= DATE_SUB(CURDATE(), INTERVAL 24 MONTH)
               $rebanoFiltro
             GROUP BY DATE_FORMAT(a.fecha_nacimiento, '%Y-%m')
             ORDER BY mes",
            [':uid' => $usuarioId]
        );

        // Tasa de natalidad mensual promedio
        $natalidadMensual = [];
        foreach ($historial as $h) {
            $natalidadMensual[] = (int)$h['cantidad'];
        }

        $promNatalidad = count($natalidadMensual) > 0
            ? array_sum($natalidadMensual) / count($natalidadMensual)
            : 0;

        // Mortalidad historica (ultimos 24 meses)
        $muertes = Database::query(
            "SELECT COUNT(*) AS total FROM animales a
             WHERE a.usuario_id = :uid AND a.activo = 0
               AND a.estado_general = 'Muerto'
               AND a.updated_at >= DATE_SUB(CURDATE(), INTERVAL 24 MONTH)
               $rebanoFiltro",
            [':uid' => $usuarioId]
        );
        $muertesTotal = (int)($muertes['total'] ?? 0);
        $tasaMortalidadMensual = $muertesTotal / 24;

        // Preñeces activas (pariciones confirmadas en los proximos 9 meses)
        $prenadas = Database::query(
            "SELECT a.id, a.nombre, dg.fecha AS fecha_diagnostico
             FROM animales a
             JOIN diagnosticos_gestacion dg ON dg.animal_id = a.id
             JOIN servicios s ON s.id = dg.servicio_id AND s.animal_id = a.id
             WHERE a.usuario_id = :uid AND a.activo = 1
               AND dg.resultado = 'Positivo'
               AND a.estado_reproductivo = 'Prenada'
               $rebanoFiltro
             GROUP BY a.id",
            [':uid' => $usuarioId]
        );

        $paricionesConfirmadas = [];
        $hoy = new \DateTime();
        foreach ($prenadas as $p) {
            $diag = new \DateTime($p['fecha_diagnostico']);
            // Estimacion: parto ~283 dias post-servicio, ~200 dias post-diagnostico positivo
            $fechaParto = (clone $diag)->modify('+200 days');
            $mesesDesdeAhora = $hoy->diff($fechaParto)->m + ($hoy->diff($fechaParto)->y * 12);
            if ($hoy < $fechaParto && $mesesDesdeAhora <= 12) {
                $mesKey = $fechaParto->format('Y-m');
                $paricionesConfirmadas[$mesKey] = ($paricionesConfirmadas[$mesKey] ?? 0) + 1;
            }
        }

        // Generar proyeccion mes a mes
        $proyecciones = [];
        $poblacion = $totalActual;
        $lambda = log(2) / 6; // half-life 6 meses para proyecciones

        for ($i = 1; $i <= 12; $i++) {
            $fecha = (clone $hoy)->modify("+{$i} months");
            $mesKey = $fecha->format('Y-m');
            $pesoRecencia = exp(-$lambda * ($i - 1));

            // Natalidad proyectada (weighted moving average)
            $natalidadMes = $promNatalidad * $pesoRecencia;

            // Pariciones confirmadas este mes
            $partosConfirmados = $paricionesConfirmadas[$mesKey] ?? 0;
            $partosEstimados = max(0, $natalidadMes - $partosConfirmados);

            // Mortalidad
            $mortalidadMes = $tasaMortalidadMensual * $pesoRecencia;

            // Actualizar poblacion
            $poblacion += $natalidadMes;
            $poblacion -= $mortalidadMes;
            $poblacion = max(0, round($poblacion, 0));

            // Banda de confianza basada en varianza historica
            $varianza = $promNatalidad > 0 ? sqrt($promNatalidad) : 1;
            $optimista = $poblacion + $varianza * 2;
            $pesimista = max(0, $poblacion - $varianza * 2);

            $proyecciones[] = [
                'mes'              => $mesKey,
                'poblacion'        => (int)$poblacion,
                'natalidad'        => round($natalidadMes, 1),
                'mortalidad'       => round($mortalidadMes, 1),
                'partos_confirmados' => $partosConfirmados,
                'partos_estimados' => round($partosEstimados, 1),
                'optimista'        => (int)$optimista,
                'pesimista'        => (int)$pesimista,
            ];
        }

        // Costos proyectados (simple: costo/cabeza actual * proyeccion)
        $costoActual = Database::queryOne(
            "SELECT AVG(cm.monto / cm.cabezas) AS avg_costo
             FROM costos_mensuales cm
             JOIN conteo_mensual_rebano cmr ON cmr.rebano_id = cm.rebano_id
               AND cmr.mes = cm.mes
             WHERE cm.usuario_id = :uid
               AND cm.cabezas > 0
             ORDER BY cm.mes DESC
             LIMIT 3",
            [':uid' => $usuarioId]
        );
        $costoBase = $costoActual['avg_costo'] ? round((float)$costoActual['avg_costo'], 2) : 0;

        $costosProyectados = [];
        foreach ($proyecciones as $i => $p) {
            $costosProyectados[] = [
                'mes'   => $p['mes'],
                'costo_total' => round($costoBase * $p['poblacion'], 2),
                'costo_por_cabeza' => $costoBase,
            ];
        }

        return [
            'poblacion_actual'    => $totalActual,
            'proyecciones'        => $proyecciones,
            'costos_proyectados'  => $costosProyectados,
            'metodo'              => 'Promedio movil ponderado por recencia (half-life 6 meses)',
        ];
    }
}
