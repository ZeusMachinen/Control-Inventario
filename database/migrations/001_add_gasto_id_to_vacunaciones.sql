-- ============================================================
-- Migration 001: Agregar columna gasto_id a vacunaciones
-- ============================================================
-- Vincula cada vacunación con su gasto asociado de tipo 'medicamentos'.
-- ON DELETE SET NULL: si alguien elimina el gasto desde GastosPage,
-- la vacunación no se pierde, solo queda sin vínculo.
-- ============================================================

ALTER TABLE vacunaciones
  ADD COLUMN gasto_id INT UNSIGNED NULL AFTER costo_veterinario,
  ADD INDEX idx_vacunacion_gasto (gasto_id),
  ADD CONSTRAINT fk_vacunacion_gasto FOREIGN KEY (gasto_id) REFERENCES gastos(id) ON DELETE SET NULL;
