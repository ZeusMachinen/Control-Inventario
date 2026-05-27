-- ============================================================
-- MIGRACIÓN: estado_general, bajas, y estadísticas por rebaño
-- ============================================================

-- 1. Nuevas columnas en animales
ALTER TABLE animales
  ADD COLUMN estado_general ENUM('Activo','Vendido','Muerto') NOT NULL DEFAULT 'Activo' AFTER activo,
  ADD COLUMN fecha_salida DATE NULL AFTER estado_general,
  ADD COLUMN motivo_salida VARCHAR(100) NULL AFTER fecha_salida,
  ADD COLUMN peso_salida DECIMAL(10,2) NULL AFTER motivo_salida,
  ADD COLUMN rebano_nacimiento_id INT UNSIGNED NULL AFTER rebano_id;

-- 2. FK para rebano_nacimiento
ALTER TABLE animales
  ADD CONSTRAINT fk_animal_rebano_nacimiento FOREIGN KEY (rebano_nacimiento_id) REFERENCES rebanos(id) ON DELETE SET NULL;
