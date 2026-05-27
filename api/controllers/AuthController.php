<?php
/**
 * Controlador de autenticación
 * Maneja registro, login, logout, verificación de token y refresh.
 */
require_once __DIR__ . '/../helpers/JwtHelper.php';
require_once __DIR__ . '/../helpers/Validator.php';
require_once __DIR__ . '/../helpers/Database.php';
require_once __DIR__ . '/../helpers/Response.php';

class AuthController
{
    /**
     * Registra un nuevo usuario.
     * POST /api/auth/registro
     */
    public function registro(): void
    {
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];

        $validador = new Validator();
        if (!$validador->validar($datos, [
            'nombre'  => 'requerido|min:3|max:150',
            'email'   => 'requerido|email|max:255',
            'password' => 'requerido|min:6|max:255|alfanumerico',
        ])) {
            Response::error('Datos inválidos', 422, $validador->errores());
        }

        // Verificar email único
        $existente = Database::queryOne(
            'SELECT id FROM usuarios WHERE email = :email',
            [':email' => $datos['email']]
        );

        if ($existente) {
            Response::error('El email ya está registrado', 409);
        }

        $hash = password_hash($datos['password'], PASSWORD_BCRYPT);

        Database::execute(
            'INSERT INTO usuarios (nombre, email, password, telefono) VALUES (:nombre, :email, :password, :telefono)',
            [
                ':nombre'   => $datos['nombre'],
                ':email'    => $datos['email'],
                ':password' => $hash,
                ':telefono' => $datos['telefono'] ?? null,
            ]
        );

        $usuarioId = Database::lastInsertId();
        $tokens = $this->generarTokens((int)$usuarioId);

        Response::json([
            'usuario' => [
                'id'    => (int)$usuarioId,
                'nombre' => $datos['nombre'],
                'email'  => $datos['email'],
            ],
            'access_token'  => $tokens['access_token'],
            'refresh_token' => $tokens['refresh_token'],
        ], 201);
    }

    /**
     * Inicia sesión y retorna tokens JWT.
     * POST /api/auth/login
     */
    public function login(): void
    {
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];

        if (empty($datos['email']) || empty($datos['password'])) {
            Response::error('Email y contraseña son obligatorios', 422);
        }

        $usuario = Database::queryOne(
            'SELECT id, nombre, email, password FROM usuarios WHERE email = :email AND activo = 1',
            [':email' => $datos['email']]
        );

        if (!$usuario || !password_verify($datos['password'], $usuario['password'])) {
            Response::error('Credenciales inválidas', 401);
        }

        $tokens = $this->generarTokens((int)$usuario['id']);

        Response::json([
            'usuario' => [
                'id'     => (int)$usuario['id'],
                'nombre' => $usuario['nombre'],
                'email'  => $usuario['email'],
            ],
            'access_token'  => $tokens['access_token'],
            'refresh_token' => $tokens['refresh_token'],
        ]);
    }

    /**
     * Cierra sesión revocando el refresh token.
     * POST /api/auth/logout
     */
    public function logout(): void
    {
        $payload = AuthMiddleware::ejecutar();
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];

        if (!empty($datos['refresh_token'])) {
            Database::execute(
                'UPDATE refresh_tokens SET revocado = 1 WHERE token = :token AND usuario_id = :uid',
                [
                    ':token' => $datos['refresh_token'],
                    ':uid'   => $payload->sub,
                ]
            );
        }

        Response::json(['mensaje' => 'Sesión cerrada exitosamente']);
    }

    /**
     * Verifica que el token JWT sea válido.
     * GET /api/auth/verificar
     */
    public function verificar(): void
    {
        $payload = AuthMiddleware::ejecutar();

        $usuario = Database::queryOne(
            'SELECT id, nombre, email FROM usuarios WHERE id = :id AND activo = 1',
            [':id' => $payload->sub]
        );

        if (!$usuario) {
            Response::error('Usuario no encontrado', 404);
        }

        Response::json([
            'usuario' => $usuario,
        ]);
    }

    /**
     * Renueva el access token usando un refresh token.
     * POST /api/auth/refresh
     */
    public function refreshToken(): void
    {
        $datos = json_decode(file_get_contents('php://input'), true) ?? [];
        $refreshToken = $datos['refresh_token'] ?? '';

        if (empty($refreshToken)) {
            Response::error('Refresh token requerido', 422);
        }

        $registro = Database::queryOne(
            'SELECT id, usuario_id, expira_en, revocado
             FROM refresh_tokens
             WHERE token = :token',
            [':token' => $refreshToken]
        );

        if (!$registro || $registro['revocado']) {
            Response::error('Refresh token inválido', 401);
        }

        if (strtotime($registro['expira_en']) < time()) {
            Response::error('Refresh token expirado', 401);
        }

        // Rotar: revocar este y generar uno nuevo
        Database::execute(
            'UPDATE refresh_tokens SET revocado = 1 WHERE id = :id',
            [':id' => $registro['id']]
        );

        $tokens = $this->generarTokens((int)$registro['usuario_id']);

        Response::json([
            'access_token'  => $tokens['access_token'],
            'refresh_token' => $tokens['refresh_token'],
        ]);
    }

    /**
     * Genera un par access_token + refresh_token.
     */
    private function generarTokens(int $usuarioId): array
    {
        // Access token JWT
        $accessToken = JwtHelper::encode([
            'sub'   => $usuarioId,
            'email' => '',
            'iat'   => time(),
            'exp'   => time() + JWT_EXPIRACION,
        ], JWT_SECRET);

        // Refresh token opaco
        $refreshToken = JwtHelper::generarTokenAleatorio(64);
        $expiraEn = date('Y-m-d H:i:s', time() + REFRESH_EXPIRACION);

        Database::execute(
            'INSERT INTO refresh_tokens (usuario_id, token, expira_en) VALUES (:uid, :token, :expira)',
            [
                ':uid'    => $usuarioId,
                ':token'  => $refreshToken,
                ':expira' => $expiraEn,
            ]
        );

        return [
            'access_token'  => $accessToken,
            'refresh_token' => $refreshToken,
        ];
    }
}
