-- ============================================================
-- MIGRACIÓN: Costos veterinarios + tipo en gastos
-- 1. Agrega 'veterinarios' al ENUM de gastos.tipo
-- 2. Agrega columna gasto_veterinario_id a vacunaciones para
--    separar el costo del veterinario del de medicamentos
-- ============================================================

ALTER TABLE gastos
  MODIFY COLUMN tipo ENUM('mantenimiento','medicamentos','compras','veterinarios') NOT NULL;

ALTER TABLE vacunaciones
  ADD COLUMN gasto_veterinario_id INT UNSIGNED NULL AFTER gasto_id,
  ADD INDEX idx_vacunacion_gasto_vet (gasto_veterinario_id),
  ADD CONSTRAINT fk_vacunacion_gasto_vet FOREIGN KEY (gasto_veterinario_id) REFERENCES gastos(id) ON DELETE SET NULL;
