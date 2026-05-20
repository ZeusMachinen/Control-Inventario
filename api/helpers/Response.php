<?php
/**
 * Helpers de respuesta JSON estandarizada
 */
class Response
{
    /**
     * Retorna una respuesta JSON exitosa con datos.
     */
    public static function json(mixed $data, int $codigo = 200): void
    {
        http_response_code($codigo);
        echo json_encode([
            'ok'   => true,
            'data' => $data,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    /**
     * Retorna una respuesta JSON de error.
     */
    public static function error(string $mensaje, int $codigo = 400, mixed $detalles = null): void
    {
        http_response_code($codigo);
        $respuesta = [
            'ok'    => false,
            'error' => $mensaje,
        ];
        if ($detalles !== null) {
            $respuesta['detalles'] = $detalles;
        }
        echo json_encode($respuesta, JSON_UNESCAPED_UNICODE);
        exit;
    }

    /**
     * Retorna una lista paginada.
     */
    public static function paginar(array $datos, int $total, int $pagina, int $porPagina = 20): void
    {
        echo json_encode([
            'ok'         => true,
            'data'       => $datos,
            'total'      => $total,
            'pagina'     => $pagina,
            'por_pagina' => $porPagina,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}
