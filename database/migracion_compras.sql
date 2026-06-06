-- ============================================================
-- MIGRACIÓN: Compras de animales
-- Agrega tabla compras (lotes) y columnas a animales
-- ============================================================

-- 1. Tabla de compras (lotes)
CREATE TABLE IF NOT EXISTS compras (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  proveedor       VARCHAR(200)   NOT NULL,
  fecha_compra    DATE           NOT NULL,
  total           DECIMAL(14,2)  NULL,
  notas           TEXT           NULL,
  usuario_id      INT UNSIGNED   NOT NULL,
  created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_compra_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_compras_usuario ON compras(usuario_id);
CREATE INDEX idx_compras_fecha   ON compras(fecha_compra);

-- 2. Columnas nuevas en animales
ALTER TABLE animales
  ADD COLUMN origen        ENUM('Nacimiento','Compra') NOT NULL DEFAULT 'Nacimiento' AFTER usuario_id,
  ADD COLUMN fecha_ingreso DATE                        NULL                         AFTER origen,
  ADD COLUMN compra_id     INT UNSIGNED                NULL                         AFTER fecha_ingreso,
  ADD COLUMN precio_compra DECIMAL(12,2)              NULL                         AFTER compra_id;

ALTER TABLE animales
  ADD CONSTRAINT fk_animal_compra FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE SET NULL;

CREATE INDEX idx_animales_origen    ON animales(origen);
CREATE INDEX idx_animales_compra    ON animales(compra_id);
