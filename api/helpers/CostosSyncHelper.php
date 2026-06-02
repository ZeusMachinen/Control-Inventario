<?php
/**
 * Helper para sincronizar eventos con la tabla costos_mensuales.
 */
require_once __DIR__ . '/Database.php';

class CostosSyncHelper
{
    /**
     * Sincroniza un gasto manual a costos_mensuales.
     */
    public static function sincronizarGasto(int $gastoId, int $uid): void
    {
        $gasto = Database::queryOne(
            'SELECT * FROM gastos WHERE id = :id AND usuario_id = :uid',
            [':id' => $gastoId, ':uid' => $uid]
        );
        if (!$gasto) return;

        $rebanoId = $gasto['rebano_id'];
        if (!$rebanoId) return;

        $mes = date('Y-m-01', strtotime($gasto['mes']));
        $tipo = ($gasto['tipo'] === 'mantenimiento') ? 'gasto' : 'inversion';

        // Obtener cabezas del mes
        $cabezas = self::cabezasDelMes((int)$rebanoId, $uid, $mes);

        // Upsert: si ya existe un costo con misma referencia, actualizar
        $existente = Database::queryOne(
            'SELECT id FROM costos_mensuales
             WHERE referencia_tabla = :rtabla AND referencia_id = :rid AND usuario_id = :uid',
            [':rtabla' => 'gastos', ':rid' => $gastoId, ':uid' => $uid]
        );

        if ($existente) {
            Database::execute(
                'UPDATE costos_mensuales SET mes = :mes, tipo = :tipo, concepto = :concepto,
                 monto = :monto, cabezas = :cabezas WHERE id = :id',
                [
                    ':mes' => $mes,
                    ':tipo' => $tipo,
                    ':concepto' => $gasto['descripcion'],
                    ':monto' => $gasto['monto'],
                    ':cabezas' => $cabezas,
                    ':id' => $existente['id'],
                ]
            );
        } else {
            Database::execute(
                'INSERT INTO costos_mensuales (rebano_id, mes, tipo, concepto, monto, cabezas, referencia_tabla, referencia_id, usuario_id)
                 VALUES (:rebano, :mes, :tipo, :concepto, :monto, :cabezas, :rtabla, :rid, :uid)',
                [
                    ':rebano' => $rebanoId,
                    ':mes' => $mes,
                    ':tipo' => $tipo,
                    ':concepto' => $gasto['descripcion'],
                    ':monto' => $gasto['monto'],
                    ':cabezas' => $cabezas,
                    ':rtabla' => 'gastos',
                    ':rid' => $gastoId,
                    ':uid' => $uid,
                ]
            );
        }
    }

    /**
     * Elimina la referencia a un gasto de costos_mensuales.
     */
    public static function eliminarGasto(int $gastoId, int $uid): void
    {
        Database::execute(
            'DELETE FROM costos_mensuales WHERE referencia_tabla = :rtabla AND referencia_id = :rid AND usuario_id = :uid',
            [':rtabla' => 'gastos', ':rid' => $gastoId, ':uid' => $uid]
        );
    }

    private static function cabezasDelMes(int $rebanoId, int $uid, string $mes): int
    {
        $row = Database::queryOne(
            'SELECT cabezas FROM conteo_mensual_rebano
             WHERE rebano_id = :rebano AND usuario_id = :uid AND mes = :mes',
            [':rebano' => $rebanoId, ':uid' => $uid, ':mes' => $mes]
        );
        return $row ? (int)$row['cabezas'] : 0;
    }
}
