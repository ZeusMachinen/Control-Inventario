-- ============================================================
-- Migration 003: Backfill rebano_nacimiento_id for existing animals
-- ============================================================
-- Popula rebano_nacimiento_id para animales nacidos vía parto
-- (tienen madre_id). El resto se deja NULL (registros manuales,
-- compras, importaciones).
--
-- Solo afecta registros donde rebano_nacimiento_id es NULL
-- y madre_id NO es NULL (crías de parto).
-- ============================================================

UPDATE animales
SET rebano_nacimiento_id = rebano_id
WHERE rebano_nacimiento_id IS NULL
  AND madre_id IS NOT NULL;
