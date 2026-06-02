<?php
/**
 * Helper para cálculo de edad y etapa del animal
 */
class CalculadorEdad
{
    /**
     * Calcula la edad en años y meses a partir de la fecha de nacimiento.
     * @return array{anios: int, meses: int, total_meses: int}
     */
    public static function calcular(string $fechaNacimiento): array
    {
        return self::calcularHasta($fechaNacimiento, date('Y-m-d'));
    }

    /**
     * Calcula la edad hasta una fecha de referencia específica.
     * @return array{anios: int, meses: int, total_meses: int}
     */
    public static function calcularHasta(string $fechaNacimiento, string $fechaReferencia): array
    {
        $nacimiento = new \DateTime($fechaNacimiento);
        $referencia = new \DateTime($fechaReferencia);
        $diferencia = $nacimiento->diff($referencia);

        return [
            'anios'       => $diferencia->y,
            'meses'       => $diferencia->m,
            'total_meses' => ($diferencia->y * 12) + $diferencia->m,
        ];
    }

    /**
     * Determina la etapa del animal según su edad en meses.
     * Ternero: 0-12 meses
     * Novillo: 13-24 meses
     * Adulto: 24+ meses
     */
    public static function determinarEtapa(int $totalMeses): string
    {
        if ($totalMeses <= 12) return 'Ternero';
        if ($totalMeses <= 24) return 'Novillo';
        return 'Adulto';
    }

    /**
     * Calcula la próxima fecha de servicio (celo) basado en el ciclo bovino.
     * Ciclo de celo ≈ 21 días.
     */
    public static function proximoCelo(string $fechaInicio): string
    {
        $fecha = new \DateTime($fechaInicio);
        $fecha->modify('+' . CELO_CICLO_DIAS . ' days');
        return $fecha->format('Y-m-d');
    }

    /**
     * Calcula la fecha probable de parto (283 días desde la concepción).
     */
    public static function fechaParto(string $fechaServicio): string
    {
        $fecha = new \DateTime($fechaServicio);
        $fecha->modify('+' . GESTACION_DIAS . ' days');
        return $fecha->format('Y-m-d');
    }
}
