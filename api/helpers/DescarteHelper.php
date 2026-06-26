<?php
/**
 * DescarteHelper — Lista de vacas candidatas a descarte.
 *
 * Reglas del IVM corregido:
 *   - Verde: sin alertas
 *   - Amarillo: 1 intervalo >700d o 1 cria muerta 0-30d
 *   - Rojo: Línea de descarte (2+ crias muertas 0-30d o 2+ intervalos >700d)
 *   - Para hembras sin partos: rojo solo si >=48 meses (antes es promesa)
 */
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/ScorecardHelper.php';

class DescarteHelper
{
    /**
     * Genera la lista de descarte usando IVM corregido.
     */
    public static function listaDescarte(int $usuarioId, ?int $rebanoId = null): array
    {
        $rebanoFiltro = $rebanoId !== null ? 'AND a.rebano_id = ' . (int)$rebanoId : '';

        $vacas = Database::query(
            "SELECT a.id, a.nombre, a.fecha_nacimiento, a.estado_reproductivo,
                    TIMESTAMPDIFF(MONTH, a.fecha_nacimiento, CURDATE()) AS edad_meses,
                    GREATEST(
                        COALESCE((SELECT MAX(p.fecha) FROM partos p WHERE p.animal_id = a.id), '1000-01-01'),
                        COALESCE((SELECT MAX(c.fecha_nacimiento) FROM animales c WHERE c.madre_id = a.id), '1000-01-01')
                    ) AS ultimo_parto,
                    (SELECT COUNT(*) FROM partos p WHERE p.animal_id = a.id)
                    + (SELECT COUNT(*) FROM animales c WHERE c.madre_id = a.id) AS partos_total
             FROM animales a
             WHERE a.usuario_id = :uid AND a.activo = 1 AND a.sexo = 'Hembra'
                AND TIMESTAMPDIFF(MONTH, a.fecha_nacimiento, CURDATE()) >= 24
               $rebanoFiltro
             ORDER BY a.nombre",
            [':uid' => $usuarioId]
        );

        $resultado = [];

        foreach ($vacas as $v) {
            $id = (int)$v['id'];
            $edad = (int)$v['edad_meses'];
            $partos = (int)$v['partos_total'];
            $estado = $v['estado_reproductivo'];

            $diasVacia = null;
            if ($v['ultimo_parto'] && $v['ultimo_parto'] > '2000-01-01') {
                $diasVacia = (new \DateTime($v['ultimo_parto']))->diff(new \DateTime())->days;
            }

            // Usar IVM para detectar alertas
            try {
                $ivm = ScorecardHelper::calcularIVM($id, $usuarioId);
            } catch (\Throwable $e) {
                $ivm = null;
            }

            $alerta = $ivm['alerta'] ?? null;
            $muertas30 = (int)($ivm['crias_muertas_antes_30'] ?? 0);
            $int700 = (int)($ivm['intervalos_mayores_700'] ?? 0);

            // Semaforo
            if ($alerta === 'Linea de descarte') {
                $semaforo = 'rojo';
                $veredicto = 'Linea de descarte';
            } elseif ($muertas30 >= 1 || $int700 >= 1) {
                $semaforo = 'amarillo';
                $veredicto = 'Atencion';
            } elseif ($ivm && $ivm['ivm_tipo'] === 'IVM-P' && $edad >= 48) {
                $semaforo = 'rojo';
                $veredicto = 'Linea de descarte por edad';
            } elseif ($diasVacia !== null && $diasVacia >= 365 && !in_array($estado, ['Prenada', 'Lactando'])) {
                $semaforo = 'amarillo';
                $veredicto = 'Atencion';
            } else {
                $semaforo = 'verde';
                $veredicto = 'Bajo riesgo';
            }

            // Score de riesgo basado en severidad
            $scoreRiesgo = 0.0;
            if ($semaforo === 'rojo') {
                $scoreRiesgo = 0.85 + min(0.15, ($muertas30 * 0.05) + ($int700 * 0.05));
            } elseif ($semaforo === 'amarillo') {
                $scoreRiesgo = 0.4 + min(0.4, ($muertas30 * 0.1) + ($int700 * 0.1));
            } else {
                $scoreRiesgo = 0.0;
            }

            $resultado[] = [
                'id'                   => $id,
                'nombre'               => $v['nombre'],
                'edad_meses'           => $edad,
                'partos_total'         => $partos,
                'dias_ultimo_parto'    => $diasVacia,
                'estado_reproductivo'  => $estado,
                'tasa_prenez'          => 0,
                'score_riesgo'         => round($scoreRiesgo, 3),
                'semaforo'             => $semaforo,
                'veredicto'            => $veredicto,
            ];
        }

        // Ordenar por mayor riesgo
        usort($resultado, fn($a, $b) => $b['score_riesgo'] <=> $a['score_riesgo']);

        // Resumen
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
