-- Migración: stock de medicamentos a entero + labels claros
-- Ejecutar SOLO después de verificar que no hay datos con decimales

ALTER TABLE medicamentos
  MODIFY COLUMN stock INT UNSIGNED NOT NULL DEFAULT 0;
