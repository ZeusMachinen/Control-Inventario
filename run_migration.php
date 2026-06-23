<?php
// Cargar configuración
require_once __DIR__ . '/api/config/database.php';
require_once __DIR__ . '/api/helpers/Database.php';

try {
    $sql = "ALTER TABLE animales ADD COLUMN precio_final DECIMAL(14,2) NULL AFTER precio_kg;";
    Database::execute($sql);
    echo "Migración ejecutada con éxito: columna 'precio_final' agregada a la tabla 'animales'.\n";
} catch (PDOException $e) {
    echo "Error al ejecutar la migración: " . $e->getMessage() . "\n";
}