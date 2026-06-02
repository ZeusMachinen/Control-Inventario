-- Migración: Costos Mensuales por Cabeza + Inversiones

CREATE TABLE IF NOT EXISTS costos_mensuales (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rebano_id   INT UNSIGNED NOT NULL,
  mes         DATE NOT NULL,
  tipo        ENUM('gasto','inversion') NOT NULL,
  concepto    VARCHAR(255) NOT NULL,
  monto       DECIMAL(12,2) NOT NULL,
  cabezas     INT UNSIGNED NOT NULL DEFAULT 0,
  referencia_tabla VARCHAR(50) NULL,
  referencia_id    INT UNSIGNED NULL,
  usuario_id  INT UNSIGNED NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rebano_id) REFERENCES rebanos(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_costos_rebano_mes ON costos_mensuales(rebano_id, mes);

CREATE TABLE IF NOT EXISTS conteo_mensual_rebano (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rebano_id   INT UNSIGNED NOT NULL,
  mes         DATE NOT NULL,
  cabezas     INT UNSIGNED NOT NULL DEFAULT 0,
  usuario_id  INT UNSIGNED NOT NULL,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_rebano_mes (rebano_id, mes),
  FOREIGN KEY (rebano_id) REFERENCES rebanos(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
