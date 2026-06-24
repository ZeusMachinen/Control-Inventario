<?php
/**
 * DescarteHelper — Lista de vacas candidatas a descarte.
 *
 * Score: dias_vacia (0.50) + edad (0.20) + partos (0.15) + tasa_prenez (0.15)
 * Semaforo: verde <365d o Prenada/Lactando, amarillo >=365d Vacia, rojo >=540d Vacia
 * Edad minima: 30 meses (2.5 anos).
 */
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/ScorecardHelper.php';

class DescarteHelper
{
    /**
     * Genera la lista de descarte de vacas.
     */
    public static function listaDescarte(int $usuarioId, ?int $rebanoId = null): array
    {
        $rebanoFiltro = $rebanoId !== null ? 'AND a.rebano_id = ' . (int)$rebanoId : '';

        // Obtener vacas de 30+ meses
        $vacas = Database::query(
            "SELECT a.id, a.nombre, a.fecha_nacimiento, a.estado_reproductivo,
                    TIMESTAMPDIFF(MONTH, a.fecha_nacimiento, CURDATE()) AS edad_meses,
                    (SELECT MAX(p.fecha) FROM partos p WHERE p.animal_id = a.id) AS ultimo_parto,
                    (SELECT COUNT(*) FROM partos p WHERE p.animal_id = a.id) AS partos_total
             FROM animales a
             WHERE a.usuario_id = :uid AND a.activo = 1 AND a.sexo = 'Hembra'
               AND TIMESTAMPDIFF(MONTH, a.fecha_nacimiento, CURDATE()) >= 30
               $rebanoFiltro
             ORDER BY a.nombre",
            [':uid' => $usuarioId]
        );

        $hato = ScorecardHelper::benchmarksHato($usuarioId);
        $resultado = [];

        foreach ($vacas as $v) {
            $diasVacia = null;
            if ($v['ultimo_parto']) {
                $diasVacia = (new \DateTime($v['ultimo_parto']))->diff(new \DateTime())->days;
            }

            $edad = (int)$v['edad_meses'];
            $partos = (int)($v['partos_total'] ?? 0);
            $estado = $v['estado_reproductivo'];

            // Tasa de prenez historica de esta vaca
            $prenadas = Database::queryOne(
                "SELECT COUNT(*) AS total FROM diagnosticos_gestacion dg
                 JOIN servicios s ON s.id = dg.servicio_id
                 WHERE s.animal_id = :aid AND dg.usuario_id = :uid AND dg.resultado = 'Positivo'",
                [':aid' => $v['id'], ':uid' => $usuarioId]
            );
            $diags = Database::queryOne(
                "SELECT COUNT(*) AS total FROM diagnosticos_gestacion dg
                 JOIN servicios s ON s.id = dg.servicio_id
                 WHERE s.animal_id = :aid AND dg.usuario_id = :uid",
                [':aid' => $v['id'], ':uid' => $usuarioId]
            );
            $tasaPrenez = $diags['total'] > 0 ? (int)$prenadas['total'] / (int)$diags['total'] : 0;

            // Score de riesgo (normalizado)
            $scoreDias = 0.0;
            if ($diasVacia !== null) {
                // Max score a los 730 dias (2 anos)
                $scoreDias = min(1.0, $diasVacia / 730);
            }

            $scoreEdad = min(1.0, ($edad - 30) / 90); // max score a los 120 meses (10 anos)
            $scorePartos = $partos >= 4 ? 0.0 : (4 - $partos) / 4; // menos partos = mas riesgo
            $scorePrenez = 1.0 - $tasaPrenez;

            $scoreRiesgo = ($scoreDias * 0.50) + ($scoreEdad * 0.20) + ($scorePartos * 0.15) + ($scorePrenez * 0.15);

            // Semaforo
            if ($diasVacia === null || $diasVacia < 365 || in_array($estado, ['Prenada', 'Lactando'])) {
                $semaforo = 'verde';
                $veredicto = 'Bajo riesgo';
            } elseif ($diasVacia >= 540 && $estado === 'Vacia') {
                $semaforo = 'rojo';
                $veredicto = 'Descarte recomendado';
            } else {
                $semaforo = 'amarillo';
                $veredicto = 'Atencion';
            }

            $resultado[] = [
                'id'                   => (int)$v['id'],
                'nombre'               => $v['nombre'],
                'edad_meses'           => $edad,
                'partos_total'         => $partos,
                'dias_ultimo_parto'    => $diasVacia,
                'estado_reproductivo'  => $estado,
                'tasa_prenez'          => round($tasaPrenez, 3),
                'score_riesgo'         => round($scoreRiesgo, 3),
                'semaforo'             => $semaforo,
                'veredicto'            => $veredicto,
            ];
        }

        // Ordenar por mayor tiempo vacia (mayor score_riesgo)
        usort($resultado, fn($a, $b) => $b['score_riesgo'] <=> $a['score_riesgo']);

        // Resumen por rebaño
        $resumen = [
            'total_evaluadas' => count($resultado),
            'bajo_riesgo'     => count(array_filter($resultado, fn($r) => $r['semaforo'] === 'verde')),
            'atencion'        => count(array_filter($resultado, fn($r) => $r['semaforo'] === 'amarillo')),
            'descarte'        => count(array_filter($resultado, fn($r) => $r['semaforo'] === 'rojo')),
        ];
        $resumen['pct_riesgo'] = $resumen['total_evaluadas'] > 0
            ? round((($resumen['atencion'] + $resumen['descarte']) / $resumen['total_evaluadas']) * 100, 1)
            : 0;

        return [
            'vacas'   => $resultado,
            'resumen' => $resumen,
        ];
    }
}
