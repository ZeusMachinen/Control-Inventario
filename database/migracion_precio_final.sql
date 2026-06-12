-- ============================================================
-- MIGRACIÓN: Precio final del animal
-- Agrega columna precio_final a animales para registrar el
-- valor total del animal (opcional). Si se tiene peso_entrada
-- y precio_final, se calcula precio_kg automáticamente.
-- ============================================================

ALTER TABLE animales
  ADD COLUMN precio_final DECIMAL(14,2) NULL AFTER precio_kg;
