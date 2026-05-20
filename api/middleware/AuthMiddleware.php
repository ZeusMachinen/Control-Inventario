<?php
/**
 * Middleware de autenticación JWT
 * Verifica el token Bearer en el header Authorization
 */
class AuthMiddleware
{
    /**
     * Obtiene el header Authorization desde múltiples fuentes posibles.
     */
    private static function obtenerHeader(): string
    {
        // 1. HTTP_AUTHORIZATION (estándar PHP)
        if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
            return $_SERVER['HTTP_AUTHORIZATION'];
        }

        // 2. REDIRECT_HTTP_AUTHORIZATION (Apache con rewrite)
        if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            return $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }

        // 3. Authorization directo (algunos servidores)
        if (!empty($_SERVER['Authorization'])) {
            return $_SERVER['Authorization'];
        }

        // 4. Apache getallheaders()
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
            if (!empty($auth)) {
                return $auth;
            }
        }

        return '';
    }

    /**
     * Ejecuta el middleware. Retorna el payload del JWT o null si no está autenticado.
     */
    public static function ejecutar(): ?object
    {
        $header = self::obtenerHeader();

        if (empty($header)) {
            Response::error('Token de autenticación requerido', 401);
            return null;
        }

        if (!preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
            Response::error('Formato de token inválido', 401);
            return null;
        }

        $token = $matches[1];
        $payload = JwtHelper::decode($token, JWT_SECRET);

        if ($payload === null) {
            Response::error('Token inválido o expirado', 401);
            return null;
        }

        return $payload;
    }
}
