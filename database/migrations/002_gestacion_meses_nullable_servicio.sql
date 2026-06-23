-- ============================================================
-- Migration 002: Campo meses_gestacion + servicio_id nullable
-- ============================================================
-- 1. Agrega columna meses_gestacion (meses aproximados de gestación)
-- 2. Hace servicio_id nullable para permitir diagnósticos de gestación
--    sin necesidad de asociar un servicio (registro standalone)
-- ============================================================

ALTER TABLE diagnosticos_gestacion
  MODIFY COLUMN servicio_id INT UNSIGNED NULL,
  ADD COLUMN meses_gestacion DECIMAL(4,1) NULL AFTER resultado;
