-- Migración: Agrega fecha real de movimiento a movimientos_rebano
-- Permite registrar cuándo ocurrió realmente el movimiento,
-- no solo cuándo se registró en el sistema.

ALTER TABLE movimientos_rebano
  ADD COLUMN fecha DATE NULL COMMENT 'Fecha real del movimiento (default: hoy)' AFTER rebano_destino_id;
