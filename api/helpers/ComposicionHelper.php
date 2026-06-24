<?php
/**
 * Helper para composicion detallada del hato por edad, sexo y estado.
 */
require_once __DIR__ . '/Database.php';

class ComposicionHelper
{
    /**
     * Retorna la composicion del hato desglosada en 8+ categorias.
     *
     * Categorias:
     *   terneros_lactando_machos    0-8 meses, machos
     *   terneros_lactando_hembras   0-8 meses, hembras
     *   terneros_destetados_machos  9-17 meses, machos
     *   terneros_destetados_hembras 9-17 meses, hembras
     *   novillos                    18+ meses, machos (no reproductores)
     *   toretes                     18+ meses, machos (estado Padrote)
     *   vacas                       18+ meses, hembras con >=1 parto
     *   toros                       24+ meses, machos reproductores (estado Padrote, >=2 años)
     *   vacas_vacias                30+ meses, hembras sin prenez activa
     *
     * @return array{categorias: array, total: int}
     */
    public static function composicion(int $usuarioId, ?int $rebanoId = null): array
    {
        $rebanoFiltro = '';
        $params = [':uid' => $usuarioId];

        if ($rebanoId !== null) {
            $rebanoFiltro = 'AND a.rebano_id = :rid';
            $params[':rid'] = $rebanoId;
        }

        $sql = "SELECT
            a.id,
            a.sexo,
            TIMESTAMPDIFF(MONTH, a.fecha_nacimiento, CURDATE()) AS meses,
            a.estado_reproductivo,
            (SELECT COUNT(*) FROM partos p WHERE p.animal_id = a.id) AS partos_count,
            (SELECT COUNT(*) FROM animales h WHERE h.madre_id = a.id) AS crias_count,
            a.peso_entrada
        FROM animales a
        WHERE a.usuario_id = :uid AND a.activo = 1
        $rebanoFiltro
        ORDER BY a.fecha_nacimiento";

        $animales = Database::query($sql, $params);

        $categorias = [
            'terneros_lactando_machos'    => ['label' => 'Terneros lactando (machos)',    'min_meses' => 0,  'max_meses' => 8,  'count' => 0, 'peso_total' => 0],
            'terneros_lactando_hembras'   => ['label' => 'Terneras lactando (hembras)',   'min_meses' => 0,  'max_meses' => 8,  'count' => 0, 'peso_total' => 0],
            'terneros_destetados_machos'  => ['label' => 'Terneros destetados (machos)',  'min_meses' => 9,  'max_meses' => 17, 'count' => 0, 'peso_total' => 0],
            'terneros_destetados_hembras' => ['label' => 'Terneras destetadas (hembras)', 'min_meses' => 9,  'max_meses' => 17, 'count' => 0, 'peso_total' => 0],
            'novillos'                    => ['label' => 'Novillos',                       'count' => 0, 'peso_total' => 0],
            'toretes'                     => ['label' => 'Toretes',                        'count' => 0, 'peso_total' => 0],
            'vacas'                       => ['label' => 'Vacas',                          'count' => 0, 'peso_total' => 0],
            'toros'                       => ['label' => 'Toros adultos',                  'count' => 0, 'peso_total' => 0],
            'vacas_vacias'                => ['label' => 'Vacas vacías',                   'count' => 0, 'peso_total' => 0],
        ];

        $total = 0;

        foreach ($animales as $a) {
            $meses = (int)$a['meses'];
            $sexo  = $a['sexo'];
            $peso  = (float)($a['peso_entrada'] ?? 0);
            $partos = (int)($a['partos_count'] ?? 0);
            $estado = $a['estado_reproductivo'];

            // 0-8 meses → lactando
            if ($meses <= 8) {
                $key = $sexo === 'Macho' ? 'terneros_lactando_machos' : 'terneros_lactando_hembras';
                $categorias[$key]['count']++;
                if ($peso) $categorias[$key]['peso_total'] += $peso;
                $total++;
                continue;
            }

            // 9-17 meses → destetados
            if ($meses <= 17) {
                $key = $sexo === 'Macho' ? 'terneros_destetados_machos' : 'terneros_destetados_hembras';
                $categorias[$key]['count']++;
                if ($peso) $categorias[$key]['peso_total'] += $peso;
                $total++;
                continue;
            }

            // 18+ meses → adultos
            if ($sexo === 'Macho') {
                // Toretes: 18+ meses con estado Padrote
                if ($estado === 'Padrote') {
                    if ($meses >= 24) {
                        $categorias['toros']['count']++;
                        if ($peso) $categorias['toros']['peso_total'] += $peso;
                    } else {
                        $categorias['toretes']['count']++;
                        if ($peso) $categorias['toretes']['peso_total'] += $peso;
                    }
                } else {
                    $categorias['novillos']['count']++;
                    if ($peso) $categorias['novillos']['peso_total'] += $peso;
                }
            } else {
                // Hembras 18+
                if ($partos >= 1) {
                    $categorias['vacas']['count']++;
                    if ($peso) $categorias['vacas']['peso_total'] += $peso;
                }
                // Vacas vacías: 30+ meses, sin preñez activa
                if ($meses >= 30 && $estado !== 'Prenada') {
                    $categorias['vacas_vacias']['count']++;
                    if ($peso) $categorias['vacas_vacias']['peso_total'] += $peso;
                    // Nota: una vaca puede estar en ambas categorias (vacas y vacas_vacias no son mutuamente excluyentes)
                    // vacas_vacias es un subconjunto de vacas para propositos de alerta
                    // No incrementamos total dos veces — el total se cuenta una vez por animal
                    continue; // ya fue contada en vacas
                }
                // Hembra 18+ sin partos → no clasifica en vacas ni vacias (vaquillas en desarrollo)
                // Se cuentan en total pero sin categoria especifica por ahora
            }

            $total++;
        }

        // Calcular porcentajes y pesos promedio
        $resultado = [];
        foreach ($categorias as $key => $cat) {
            if ($cat['count'] > 0) {
                $resultado[$key] = [
                    'label'          => $cat['label'],
                    'cantidad'       => $cat['count'],
                    'porcentaje'     => $total > 0 ? round(($cat['count'] / $total) * 100, 1) : 0,
                    'peso_promedio'  => round($cat['peso_total'] / $cat['count'], 2),
                ];
            }
        }

        return [
            'categorias' => $resultado,
            'total'      => $total,
        ];
    }
}
