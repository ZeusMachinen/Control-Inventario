-- Migration: Analytics performance indexes
-- Purpose: Speed up analytics queries for micrositio-estadisticas
-- Date: 2026-06-24
-- Safe to run on production (additive only, no data changes)

USE control_inventario;

-- Composite index for filtered animal queries (most analytics queries filter by user + active)
ALTER TABLE animales ADD INDEX idx_animales_compuesto (usuario_id, activo, fecha_nacimiento);

-- Index for partos date-range queries (projections, timelines)
ALTER TABLE partos ADD INDEX idx_partos_fecha (fecha);

-- Index for servicios (bull performance queries by date)
ALTER TABLE servicios ADD INDEX idx_servicios_fecha_usuario (fecha, usuario_id);

-- Index for diagnosticos_gestacion (conception rate queries)
ALTER TABLE diagnosticos_gestacion ADD INDEX idx_diaggest_fecha_resultado (fecha, resultado);
