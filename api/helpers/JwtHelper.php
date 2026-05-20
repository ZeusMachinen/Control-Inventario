<?php
/**
 * Helper JWT — implementación manual HMAC-SHA256
 * Sin dependencias externas. Algoritmo HS256.
 */
class JwtHelper
{
    /**
     * Codifica un payload en JWT.
     */
    public static function encode(array $payload, string $secret): string
    {
        $header = self::base64urlEncode(json_encode([
            'alg' => 'HS256',
            'typ' => 'JWT',
        ]));

        $payload['iat'] = $payload['iat'] ?? time();
        $payload['exp'] = $payload['exp'] ?? time() + JWT_EXPIRACION;

        $payloadEncoded = self::base64urlEncode(json_encode($payload, JSON_UNESCAPED_UNICODE));
        $signature = self::base64urlEncode(
            hash_hmac('sha256', "$header.$payloadEncoded", $secret, true)
        );

        return "$header.$payloadEncoded.$signature";
    }

    /**
     * Decodifica y verifica un JWT. Retorna el payload o null si es inválido/expirado.
     */
    public static function decode(string $token, string $secret): ?object
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;

        [$header, $payload, $signature] = $parts;

        // Verificar firma
        $expectedSignature = self::base64urlEncode(
            hash_hmac('sha256', "$header.$payload", $secret, true)
        );

        if (!hash_equals($expectedSignature, $signature)) {
            return null;
        }

        $data = json_decode(self::base64urlDecode($payload));
        if (!$data || !isset($data->exp)) return null;

        // Verificar expiración
        if ($data->exp < time()) return null;

        return $data;
    }

    /**
     * Genera un token opaco aleatorio para refresh token.
     */
    public static function generarTokenAleatorio(int $longitud = 64): string
    {
        return bin2hex(random_bytes($longitud));
    }

    private static function base64urlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64urlDecode(string $data): string
    {
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
