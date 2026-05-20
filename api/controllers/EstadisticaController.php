<?php
/**
 * Controlador de Estadísticas y KPIs
 */
require_once __DIR__ . '/../helpers/Database.php';
require_once __DIR__ . '/../helpers/Response.php';

class EstadisticaController
{
    private function usuarioId(): int
    {
        return (int)AuthMiddleware::ejecutar()->sub;
    }

    /**
     * Resumen general de KPIs.
     * GET /api/estadisticas/resumen
     */
    public function resumen(): void
    {
        $uid = $this->usuarioId();

        $total = Database::queryOne(
            'SELECT COUNT(*) as total FROM animales WHERE usuario_id = :uid AND activo = 1',
            [':uid' => $uid]
        )['total'];

        $machos = Database::queryOne(
            'SELECT COUNT(*) as total FROM animales WHERE usuario_id = :uid AND activo = 1 AND sexo = \'Macho\'',
            [':uid' => $uid]
        )['total'];

        $hembras = Database::queryOne(
            'SELECT COUNT(*) as total FROM animales WHERE usuario_id = :uid AND activo = 1 AND sexo = \'Hembra\'',
            [':uid' => $uid]
        )['total'];

        $rebanos = Database::queryOne(
            'SELECT COUNT(*) as total FROM rebanos WHERE usuario_id = :uid AND activo = 1',
            [':uid' => $uid]
        )['total'];

        $prenadas = Database::queryOne(
            'SELECT COUNT(*) as total FROM animales WHERE usuario_id = :uid AND activo = 1 AND estado_reproductivo = \'Prenada\'',
            [':uid' => $uid]
        )['total'];

        // Tasa de natalidad (último año)
        $nacimientos = Database::queryOne(
            'SELECT COUNT(*) as total FROM animales WHERE usuario_id = :uid AND activo = 1
             AND fecha_nacimiento >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)',
            [':uid' => $uid]
        )['total'];

        $tasaNatalidad = $total > 0 ? round(($nacimientos / $total) * 100, 1) : 0;

        // Tasa de mortalidad (animales inactivos en el último año - aproximación)
        $muertes = Database::queryOne(
            'SELECT COUNT(*) as total FROM animales WHERE usuario_id = :uid AND activo = 0
             AND updated_at >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)',
            [':uid' => $uid]
        )['total'];

        $totalConMuertos = (int)$total + (int)$muertes;
        $tasaMortalidad = $totalConMuertos > 0 ? round(($muertes / $totalConMuertos) * 100, 1) : 0;

        Response::json([
            'total_animales'  => (int)$total,
            'total_machos'    => (int)$machos,
            'total_hembras'   => (int)$hembras,
            'total_rebanos'   => (int)$rebanos,
            'prenadas'        => (int)$prenadas,
            'nacimientos_anuales' => (int)$nacimientos,
            'tasa_natalidad'  => $tasaNatalidad,
            'tasa_mortalidad' => $tasaMortalidad,
        ]);
    }

    /**
     * Distribución poblacional por sexo, etapa y edad.
     * GET /api/estadisticas/poblacion
     */
    public function piramide(): void
    {
        $uid = $this->usuarioId();

        // Por sexo
        $sexo = Database::query(
            'SELECT sexo, COUNT(*) as total FROM animales WHERE usuario_id = :uid AND activo = 1 GROUP BY sexo',
            [':uid' => $uid]
        );

        // Por etapa
        $etapas = Database::query(
            'SELECT etapa, COUNT(*) as total FROM animales WHERE usuario_id = :uid AND activo = 1 GROUP BY etapa',
            [':uid' => $uid]
        );

        // Por estado reproductivo (solo hembras)
        $estados = Database::query(
            'SELECT estado_reproductivo as estado, COUNT(*) as total
             FROM animales WHERE usuario_id = :uid AND activo = 1 AND sexo = \'Hembra\'
             GROUP BY estado_reproductivo',
            [':uid' => $uid]
        );

        // Rangos de edad para pirámide poblacional
        $edades = [
            '0-12 meses'  => 0,
            '13-24 meses' => 0,
            '25-60 meses' => 0,
            '60+ meses'   => 0,
        ];

        $animales = Database::query(
            'SELECT TIMESTAMPDIFF(MONTH, fecha_nacimiento, CURDATE()) as meses FROM animales WHERE usuario_id = :uid AND activo = 1',
            [':uid' => $uid]
        );

        foreach ($animales as $a) {
            $m = (int)$a['meses'];
            if ($m <= 12) $edades['0-12 meses']++;
            elseif ($m <= 24) $edades['13-24 meses']++;
            elseif ($m <= 60) $edades['25-60 meses']++;
            else $edades['60+ meses']++;
        }

        Response::json([
            'sexo'   => array_column($sexo, 'total', 'sexo'),
            'etapas' => array_column($etapas, 'total', 'etapa'),
            'estados_reproductivos' => array_column($estados, 'total', 'estado'),
            'piramide_edades' => $edades,
        ]);
    }

    /**
     * Estadísticas reproductivas.
     * GET /api/estadisticas/reproduccion
     */
    public function reproduccion(): void
    {
        $uid = $this->usuarioId();

        $celosRegistrados = Database::queryOne(
            'SELECT COUNT(*) as total FROM ciclos_celo WHERE usuario_id = :uid AND YEAR(fecha_inicio) = YEAR(CURDATE())',
            [':uid' => $uid]
        )['total'];

        $serviciosRealizados = Database::queryOne(
            'SELECT COUNT(*) as total FROM ciclos_celo WHERE usuario_id = :uid AND servicio_realizado = 1',
            [':uid' => $uid]
        )['total'];

        $prenadas = Database::queryOne(
            'SELECT COUNT(*) as total FROM animales WHERE usuario_id = :uid AND activo = 1 AND estado_reproductivo = \'Prenada\'',
            [':uid' => $uid]
        )['total'];

        $lactando = Database::queryOne(
            'SELECT COUNT(*) as total FROM animales WHERE usuario_id = :uid AND activo = 1 AND estado_reproductivo = \'Lactando\'',
            [':uid' => $uid]
        )['total'];

        Response::json([
            'celos_anuales'       => (int)$celosRegistrados,
            'servicios_realizados' => (int)$serviciosRealizados,
            'prenadas_actuales'    => (int)$prenadas,
            'lactando_actuales'    => (int)$lactando,
        ]);
    }

    /**
     * Cobertura de vacunación.
     * GET /api/estadisticas/vacunacion
     */
    public function coberturaVacuna(): void
    {
        $uid = $this->usuarioId();

        $total = Database::queryOne(
            'SELECT COUNT(*) as total FROM animales WHERE usuario_id = :uid AND activo = 1',
            [':uid' => $uid]
        )['total'];

        $vacunados = Database::queryOne(
            'SELECT COUNT(DISTINCT va.animal_id) as total
             FROM vacunacion_animales va
             JOIN vacunaciones v ON v.id = va.vacunacion_id
             JOIN animales a ON a.id = va.animal_id
             WHERE a.usuario_id = :uid AND a.activo = 1
               AND v.fecha >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)',
            [':uid' => $uid]
        )['total'];

        Response::json([
            'total_animales' => (int)$total,
            'vacunados'      => (int)$vacunados,
            'porcentaje'     => $total > 0 ? round(($vacunados / $total) * 100, 1) : 0,
        ]);
    }

    /**
     * KPIs comerciales.
     * GET /api/estadisticas/comerciales
     */
    public function comerciales(): void
    {
        $uid = $this->usuarioId();

        // Ingresos por ventas
        $ingresos = Database::queryOne(
            'SELECT COALESCE(SUM(precio), 0) as total FROM ventas WHERE vendedor_id = :uid AND YEAR(fecha) = YEAR(CURDATE())',
            [':uid' => $uid]
        )['total'];

        // Gastos en compras
        $gastos = Database::queryOne(
            'SELECT COALESCE(SUM(precio), 0) as total FROM ventas WHERE comprador_id = :uid AND YEAR(fecha) = YEAR(CURDATE())',
            [':uid' => $uid]
        )['total'];

        $gananciaNeta = (float)$ingresos - (float)$gastos;

        // Total ventas del año
        $totalVentas = Database::queryOne(
            'SELECT COUNT(*) as total FROM ventas WHERE vendedor_id = :uid AND YEAR(fecha) = YEAR(CURDATE())',
            [':uid' => $uid]
        )['total'];

        // Compañías activas
        $companias = Database::queryOne(
            'SELECT COUNT(*) as total FROM companias WHERE (usuario_id = :uid OR socio_id = :uid2) AND estado = \'Activa\'',
            [':uid' => $uid, ':uid2' => $uid]
        )['total'];

        Response::json([
            'ingresos_anuales'  => (float)$ingresos,
            'gastos_anuales'    => (float)$gastos,
            'ganancia_neta'     => $gananciaNeta,
            'total_ventas'      => (int)$totalVentas,
            'companias_activas' => (int)$companias,
        ]);
    }
}
