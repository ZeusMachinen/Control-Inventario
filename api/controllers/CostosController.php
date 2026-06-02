<?php
/**
 * Controlador de Costos Mensuales por Cabeza
 *
 * Reglas:
 * 1. Terneros no pagan — solo Novillos y Adultos cuentan
 * 2. Movimiento a mitad de mes → cuenta en origen hasta fin de mes
 * 3. Animales nuevos → cuentan desde el mes siguiente
 */
require_once __DIR__ . '/../helpers/Database.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/CalculadorEdad.php';

class CostosController
{
    private function usuarioId(): int
    {
        return (int)AuthMiddleware::ejecutar()->sub;
    }

    /**
     * Costos de un rebaño, agrupados por mes.
     * GET /api/rebanos/{id}/costos
     */
    public function index(string $rebanoId): void
    {
        $uid = $this->usuarioId();
        $rebanoId = (int)$rebanoId;

        // Verificar que el rebaño existe
        $rebano = Database::queryOne(
            'SELECT id, nombre FROM rebanos WHERE id = :id AND usuario_id = :uid',
            [':id' => $rebanoId, ':uid' => $uid]
        );
        if (!$rebano) Response::error('Rebaño no encontrado', 404);

        $costos = Database::query(
            'SELECT cm.* FROM costos_mensuales cm
             WHERE cm.rebano_id = :rebano AND cm.usuario_id = :uid
             ORDER BY cm.mes DESC, cm.tipo, cm.created_at DESC',
            [':rebano' => $rebanoId, ':uid' => $uid]
        );

        // Agrupar por mes
        $porMes = [];
        foreach ($costos as $c) {
            $mes = $c['mes'];
            if (!isset($porMes[$mes])) {
                $porMes[$mes] = [
                    'mes' => $mes,
                    'cabezas' => (int)$c['cabezas'],
                    'gastos' => 0,
                    'inversiones' => 0,
                    'items' => [],
                ];
            }
            $porMes[$mes][$c['tipo'] . 's'] += (float)$c['monto'];
            $porMes[$mes]['items'][] = $c;
        }

        foreach ($porMes as &$m) {
            $m['total'] = $m['gastos'] + $m['inversiones'];
            $m['costo_cabeza'] = $m['cabezas'] > 0
                ? round($m['total'] / $m['cabezas'], 2)
                : 0;
        }
        unset($m);

        Response::json([
            'rebano' => $rebano,
            'por_mes' => array_values($porMes),
        ]);
    }

    /**
     * Headcount histórico de un rebaño.
     * GET /api/rebanos/{id}/costos/cabezas
     */
    public function cabezas(string $rebanoId): void
    {
        $uid = $this->usuarioId();
        $rebanoId = (int)$rebanoId;

        $conteos = Database::query(
            'SELECT * FROM conteo_mensual_rebano
             WHERE rebano_id = :rebano AND usuario_id = :uid
             ORDER BY mes ASC',
            [':rebano' => $rebanoId, ':uid' => $uid]
        );

        Response::json($conteos);
    }

    /**
     * Recalcula el headcount histórico + costos desde orígenes para un rebaño.
     * POST /api/rebanos/{id}/costos/recalcular
     */
    public function recalcular(string $rebanoId): void
    {
        $uid = $this->usuarioId();
        $rebanoId = (int)$rebanoId;

        $rebano = Database::queryOne(
            'SELECT id, nombre, fecha_inicio FROM rebanos WHERE id = :id AND usuario_id = :uid',
            [':id' => $rebanoId, ':uid' => $uid]
        );
        if (!$rebano) Response::error('Rebaño no encontrado', 404);

        // 1. Recalcular conteo mensual de cabezas
        $this->recalcularConteo($rebanoId, $uid);

        // 2. Reconstruir costos desde gastos manuales
        $this->sincronizarGastos($rebanoId, $uid);

        // 3. Reconstruir costos desde medicamentos
        $this->sincronizarMedicamentos($rebanoId, $uid);

        // 4. Reconstruir costos desde vacunaciones
        $this->sincronizarVacunaciones($rebanoId, $uid);

        Response::json(['mensaje' => 'Costos recalculados correctamente']);
    }

    // ─── Privados ─────────────────────────────────────

    /**
     * Calcula cuántos animales (Novillo/Adulto) había en cada mes.
     */
    private function recalcularConteo(int $rebanoId, int $uid): void
    {
        // Obtener fecha_inicio del rebaño para saber desde cuándo calcular
        $rebano = Database::queryOne(
            'SELECT fecha_inicio FROM rebanos WHERE id = :id',
            [':id' => $rebanoId]
        );
        $fechaInicio = $rebano['fecha_inicio'] ?? date('Y-m-d', strtotime('-1 month'));

        // Primer mes completo: mes siguiente al inicio
        $inicio = new \DateTime($fechaInicio);
        $inicio->modify('first day of next month');
        $hoy = new \DateTime();

        // Limpiar conteos existentes
        Database::execute(
            'DELETE FROM conteo_mensual_rebano WHERE rebano_id = :rebano AND usuario_id = :uid',
            [':rebano' => $rebanoId, ':uid' => $uid]
        );

        // Generar mes a mes
        $current = clone $inicio;
        while ($current <= $hoy) {
            $mesStr = $current->format('Y-m-d');
            $siguiente = (clone $current)->modify('+1 month')->format('Y-m-d');

            $cabezas = $this->calcularCabezasMes($rebanoId, $uid, $mesStr, $siguiente);

            Database::execute(
                'INSERT INTO conteo_mensual_rebano (rebano_id, mes, cabezas, usuario_id)
                 VALUES (:rebano, :mes, :cabezas, :uid)',
                [
                    ':rebano' => $rebanoId,
                    ':mes' => $mesStr,
                    ':cabezas' => $cabezas,
                    ':uid' => $uid,
                ]
            );

            $current->modify('+1 month');
        }
    }

    /**
     * Calcula cabezas para un mes específico.
     * Reglas:
     * - Solo Novillos (>12 meses) y Adultos (>24 meses) cuentan
     * - Movimiento a mitad de mes → cuenta en origen
     * - Animal nuevo → cuenta desde el mes siguiente
     */
    private function calcularCabezasMes(int $rebanoId, int $uid, string $mes, string $siguienteMes): int
    {
        $animales = Database::query(
            'SELECT a.id, a.fecha_nacimiento, a.fecha_salida, a.rebano_id
             FROM animales a
             WHERE a.usuario_id = :uid
               AND a.activo = 1
               AND a.fecha_nacimiento < :siguiente
               AND (a.fecha_salida IS NULL OR a.fecha_salida >= :mes)',
            [':uid' => $uid, ':mes' => $mes, ':siguiente' => $siguienteMes]
        );

        $count = 0;
        foreach ($animales as $a) {
            // Calcular etapa en la fecha del headcount (no hoy)
            $edad = CalculadorEdad::calcularHasta($a['fecha_nacimiento'], $mes);
            $etapa = CalculadorEdad::determinarEtapa($edad['total_meses']);
            if ($etapa === 'Ternero') continue;

            // Determinar en qué rebaño estaba al inicio del mes
            $herdAtStart = $this->herdAlInicioMes($a['id'], $a['rebano_id'], $mes, $siguienteMes);
            if ($herdAtStart === $rebanoId) {
                $count++;
            }
        }

        return $count;
    }

    /**
     * Determina el rebaño donde estaba un animal al inicio del mes M.
     * - Si se movió DURANTE el mes M → cuenta en ORIGEN
     * - Si se movió ANTES del mes M → cuenta en DESTINO de ese movimiento
     * - Si nunca se movió → cuenta en rebano_id actual
     */
    private function herdAlInicioMes(int $animalId, int $currentRebanoId, string $mes, string $siguienteMes): int
    {
        $movimientos = Database::query(
            'SELECT rebano_origen_id, rebano_destino_id, created_at
             FROM movimientos_rebano
             WHERE animal_id = :animal
             ORDER BY created_at DESC',
            [':animal' => $animalId]
        );

        $lastBefore = null;
        $firstDuring = null;

        foreach ($movimientos as $m) {
            $movDate = substr($m['created_at'], 0, 10);
            if ($movDate < $mes) {
                $lastBefore = $m;
                break;
            }
            if ($movDate >= $mes && $movDate < $siguienteMes) {
                $firstDuring = $m;
            }
        }

        if ($lastBefore) {
            return (int)$lastBefore['rebano_destino_id'];
        }
        if ($firstDuring) {
            return (int)$firstDuring['rebano_origen_id'];
        }
        return $currentRebanoId;
    }

    /**
     * Sincroniza gastos manuales a costos_mensuales.
     */
    private function sincronizarGastos(int $rebanoId, int $uid): void
    {
        // Limpiar costos previos de origen gastos
        Database::execute(
            'DELETE FROM costos_mensuales WHERE rebano_id = :rebano AND usuario_id = :uid AND referencia_tabla = :tabla',
            [':rebano' => $rebanoId, ':uid' => $uid, ':tabla' => 'gastos']
        );

        $gastos = Database::query(
            'SELECT g.*, cm.cabezas
             FROM gastos g
             LEFT JOIN conteo_mensual_rebano cm ON cm.rebano_id = g.rebano_id
               AND cm.mes = DATE_FORMAT(g.mes, '%Y-%m-01')
             WHERE g.rebano_id = :rebano AND g.usuario_id = :uid',
            [':rebano' => $rebanoId, ':uid' => $uid]
        );

        foreach ($gastos as $g) {
            $tipo = ($g['tipo'] === 'mantenimiento') ? 'gasto' : 'inversion';
            $mes = date('Y-m-01', strtotime($g['mes']));

            Database::execute(
                'INSERT INTO costos_mensuales (rebano_id, mes, tipo, concepto, monto, cabezas, referencia_tabla, referencia_id, usuario_id)
                 VALUES (:rebano, :mes, :tipo, :concepto, :monto, :cabezas, :rtabla, :rid, :uid)',
                [
                    ':rebano' => $rebanoId,
                    ':mes' => $mes,
                    ':tipo' => $tipo,
                    ':concepto' => $g['descripcion'],
                    ':monto' => $g['monto'],
                    ':cabezas' => (int)($g['cabezas'] ?? 0),
                    ':rtabla' => 'gastos',
                    ':rid' => $g['id'],
                    ':uid' => $uid,
                ]
            );
        }
    }

    /**
     * Sincroniza compras de medicamentos a costos_mensuales.
     */
    private function sincronizarMedicamentos(int $rebanoId, int $uid): void
    {
        Database::execute(
            'DELETE FROM costos_mensuales WHERE rebano_id = :rebano AND usuario_id = :uid AND referencia_tabla = :tabla',
            [':rebano' => $rebanoId, ':uid' => $uid, ':tabla' => 'medicamentos']
        );

        // Buscar medicamentos del usuario con precio
        $medicamentos = Database::query(
            'SELECT m.* FROM medicamentos m
             WHERE m.usuario_id = :uid AND m.precio IS NOT NULL AND m.precio > 0',
            [':uid' => $uid]
        );

        // Asignar al mes de creación como compra
        foreach ($medicamentos as $m) {
            $mes = date('Y-m-01', strtotime($m['created_at']));
            $monto = (float)$m['precio'] * max(1, (int)$m['stock']);

            $cabezas = $this->cabezasDelMes($rebanoId, $uid, $mes);

            Database::execute(
                'INSERT INTO costos_mensuales (rebano_id, mes, tipo, concepto, monto, cabezas, referencia_tabla, referencia_id, usuario_id)
                 VALUES (:rebano, :mes, :tipo, :concepto, :monto, :cabezas, :rtabla, :rid, :uid)',
                [
                    ':rebano' => $rebanoId,
                    ':mes' => $mes,
                    ':tipo' => 'inversion',
                    ':concepto' => 'Compra de ' . $m['nombre'] . ' (x' . (int)$m['stock'] . ' ' . $m['unidad'] . ')',
                    ':monto' => $monto,
                    ':cabezas' => $cabezas,
                    ':rtabla' => 'medicamentos',
                    ':rid' => $m['id'],
                    ':uid' => $uid,
                ]
            );
        }
    }

    /**
     * Sincroniza vacunaciones a costos_mensuales.
     */
    private function sincronizarVacunaciones(int $rebanoId, int $uid): void
    {
        Database::execute(
            'DELETE FROM costos_mensuales WHERE rebano_id = :rebano AND usuario_id = :uid AND referencia_tabla = :tabla',
            [':rebano' => $rebanoId, ':uid' => $uid, ':tabla' => 'vacunaciones']
        );

        $vacunaciones = Database::query(
            'SELECT v.*, m.nombre as med_nombre
             FROM vacunaciones v
             LEFT JOIN medicamentos m ON m.id = v.medicamento_id
             WHERE v.rebano_id = :rebano AND v.usuario_id = :uid
               AND (v.costo_veterinario IS NOT NULL AND v.costo_veterinario > 0)',
            [':rebano' => $rebanoId, ':uid' => $uid]
        );

        foreach ($vacunaciones as $v) {
            $mes = date('Y-m-01', strtotime($v['fecha']));
            $cabezas = $this->cabezasDelMes($rebanoId, $uid, $mes);

            Database::execute(
                'INSERT INTO costos_mensuales (rebano_id, mes, tipo, concepto, monto, cabezas, referencia_tabla, referencia_id, usuario_id)
                 VALUES (:rebano, :mes, :tipo, :concepto, :monto, :cabezas, :rtabla, :rid, :uid)',
                [
                    ':rebano' => $rebanoId,
                    ':mes' => $mes,
                    ':tipo' => 'inversion',
                    ':concepto' => 'Vacunación: ' . ($v['med_nombre'] ?? 'Sin especificar') . ' (' . $v['fecha'] . ')',
                    ':monto' => (float)$v['costo_veterinario'],
                    ':cabezas' => $cabezas,
                    ':rtabla' => 'vacunaciones',
                    ':rid' => $v['id'],
                    ':uid' => $uid,
                ]
            );
        }
    }

    /**
     * Obtiene las cabezas registradas para un rebaño en un mes.
     */
    private function cabezasDelMes(int $rebanoId, int $uid, string $mes): int
    {
        $row = Database::queryOne(
            'SELECT cabezas FROM conteo_mensual_rebano
             WHERE rebano_id = :rebano AND usuario_id = :uid AND mes = :mes',
            [':rebano' => $rebanoId, ':uid' => $uid, ':mes' => $mes]
        );
        return $row ? (int)$row['cabezas'] : 0;
    }
}
