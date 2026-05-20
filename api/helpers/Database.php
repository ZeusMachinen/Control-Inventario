<?php
/**
 * Clase Database — Singleton de conexión PDO
 */
class Database
{
    private static ?PDO $instancia = null;

    public static function conectar(): PDO
    {
        if (self::$instancia === null) {
            $dsn = sprintf(
                'mysql:host=%s;port=%s;dbname=%s;charset=%s',
                DB_HOST,
                DB_PORT,
                DB_NAME,
                DB_CHARSET
            );

            self::$instancia = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        }

        return self::$instancia;
    }

    /**
     * Ejecuta una consulta SELECT con parámetros y retorna todos los registros.
     */
    public static function query(string $sql, array $params = []): array
    {
        $stmt = self::conectar()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Ejecuta una consulta y retorna un solo registro.
     */
    public static function queryOne(string $sql, array $params = []): ?array
    {
        $stmt = self::conectar()->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Ejecuta una consulta INSERT/UPDATE/DELETE y retorna el número de filas afectadas.
     */
    public static function execute(string $sql, array $params = []): int
    {
        $stmt = self::conectar()->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    /**
     * Retorna el último ID insertado.
     */
    public static function lastInsertId(): string
    {
        return self::conectar()->lastInsertId();
    }
}
