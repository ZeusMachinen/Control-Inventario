-- ============================================================
-- MIGRACIÓN: Renovación del Sistema de Reproducción
-- Control de Inventario Ganadero
--
-- Este script:
--   1. Crea las 4 tablas nuevas (diagnosticos_celo, servicios,
--      diagnosticos_gestacion, partos)
--   2. Migra datos existentes desde ciclos_celo
--   3. NO dropea ciclos_celo (fase de respaldo)
--
-- Orden de ejecución: mysql -u root control_inventario < migracion_reproduccion.sql
-- ============================================================

USE control_inventario;

-- ============================================================
-- 1. DIAGNÓSTICOS DE CELO
-- ============================================================
CREATE TABLE IF NOT EXISTS diagnosticos_celo (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  animal_id       INT UNSIGNED   NOT NULL,
  fecha_inicio    DATE           NOT NULL,
  fecha_fin       DATE           NULL,
  sintomas        TEXT           NULL,
  comportamiento  VARCHAR(100)   NULL,
  observaciones   TEXT           NULL,
  usuario_id      INT UNSIGNED   NOT NULL,
  created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_diagcelo_animal  FOREIGN KEY (animal_id)  REFERENCES animales(id) ON DELETE CASCADE,
  CONSTRAINT fk_diagcelo_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS idx_diagcelo_animal ON diagnosticos_celo(animal_id);
CREATE INDEX IF NOT EXISTS idx_diagcelo_fecha  ON diagnosticos_celo(fecha_inicio);

-- ============================================================
-- 2. SERVICIOS (Monta Natural, Inseminación Artificial, TE)
-- ============================================================
CREATE TABLE IF NOT EXISTS servicios (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  diagnostico_celo_id INT UNSIGNED   NULL,
  animal_id           INT UNSIGNED   NOT NULL,
  tipo                ENUM('Monta Natural','Inseminación Artificial','Transferencia de Embriones') NOT NULL DEFAULT 'Monta Natural',
  reproductor_id      INT UNSIGNED   NULL,
  reproductor_nombre  VARCHAR(150)   NULL,
  fecha               DATE           NOT NULL,
  observaciones       TEXT           NULL,
  usuario_id          INT UNSIGNED   NOT NULL,
  created_at          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_serv_diagcelo      FOREIGN KEY (diagnostico_celo_id) REFERENCES diagnosticos_celo(id) ON DELETE SET NULL,
  CONSTRAINT fk_serv_animal        FOREIGN KEY (animal_id)           REFERENCES animales(id)      ON DELETE CASCADE,
  CONSTRAINT fk_serv_reproductor   FOREIGN KEY (reproductor_id)      REFERENCES animales(id)      ON DELETE SET NULL,
  CONSTRAINT fk_serv_usuario       FOREIGN KEY (usuario_id)          REFERENCES usuarios(id)       ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS idx_serv_animal       ON servicios(animal_id);
CREATE INDEX IF NOT EXISTS idx_serv_diagcelo     ON servicios(diagnostico_celo_id);
CREATE INDEX IF NOT EXISTS idx_serv_fecha        ON servicios(fecha);

-- ============================================================
-- 3. DIAGNÓSTICOS DE GESTACIÓN
-- ============================================================
CREATE TABLE IF NOT EXISTS diagnosticos_gestacion (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  servicio_id    INT UNSIGNED   NOT NULL,
  animal_id      INT UNSIGNED   NOT NULL,
  fecha          DATE           NOT NULL,
  metodo         ENUM('Palpación','Ecografía') NOT NULL DEFAULT 'Palpación',
  resultado      ENUM('Positivo','Negativo')   NOT NULL,
  observaciones  TEXT           NULL,
  usuario_id     INT UNSIGNED   NOT NULL,
  created_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_diaggest_servicio FOREIGN KEY (servicio_id) REFERENCES servicios(id)             ON DELETE CASCADE,
  CONSTRAINT fk_diaggest_animal   FOREIGN KEY (animal_id)   REFERENCES animales(id)              ON DELETE CASCADE,
  CONSTRAINT fk_diaggest_usuario  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)              ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS idx_diaggest_animal   ON diagnosticos_gestacion(animal_id);
CREATE INDEX IF NOT EXISTS idx_diaggest_fecha    ON diagnosticos_gestacion(fecha);

-- ============================================================
-- 4. PARTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS partos (
  id                        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  diagnostico_gestacion_id  INT UNSIGNED   NULL,
  animal_id                 INT UNSIGNED   NOT NULL,
  fecha                     DATE           NOT NULL,
  crias                     JSON           NULL COMMENT '[{cantidad, sexo, peso_promedio, observaciones}]',
  observaciones             TEXT           NULL,
  usuario_id                INT UNSIGNED   NOT NULL,
  created_at                TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_parto_diaggest FOREIGN KEY (diagnostico_gestacion_id) REFERENCES diagnosticos_gestacion(id) ON DELETE SET NULL,
  CONSTRAINT fk_parto_animal   FOREIGN KEY (animal_id)                REFERENCES animales(id)               ON DELETE CASCADE,
  CONSTRAINT fk_parto_usuario  FOREIGN KEY (usuario_id)               REFERENCES usuarios(id)               ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS idx_parto_animal ON partos(animal_id);
CREATE INDEX IF NOT EXISTS idx_parto_fecha  ON partos(fecha);

-- ============================================================
-- MIGRACIÓN DE DATOS: ciclos_celo → nuevas tablas
-- ============================================================

-- Solo migrar si hay datos en ciclos_celo y diagnosticos_celo está vacía
SET @existen_celos = (SELECT COUNT(*) FROM ciclos_celo);
SET @migrados      = (SELECT COUNT(*) FROM diagnosticos_celo);

-- 1. Migrar todos los registros de ciclos_celo a diagnosticos_celo
--    Mapeo: fecha_inicio → fecha_inicio, fecha_fin → fecha_fin,
--    observaciones → observaciones (sintomas/comportamiento son nuevos → NULL)
INSERT INTO diagnosticos_celo (animal_id, fecha_inicio, fecha_fin, sintomas, comportamiento, observaciones, usuario_id, created_at, updated_at)
SELECT cc.animal_id,
       cc.fecha_inicio,
       cc.fecha_fin,
       NULL,
       NULL,
       cc.observaciones,
       cc.usuario_id,
       cc.created_at,
       cc.updated_at
FROM ciclos_celo cc
WHERE cc.animal_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM diagnosticos_celo dc WHERE dc.animal_id = cc.animal_id AND dc.fecha_inicio = cc.fecha_inicio AND dc.usuario_id = cc.usuario_id);

-- 2. Crear servicios para registros con servicio_realizado=1
--    Usamos la fecha_fin como fecha del servicio (fallback a fecha_inicio si es NULL)
INSERT INTO servicios (diagnostico_celo_id, animal_id, tipo, reproductor_id, reproductor_nombre, fecha, observaciones, usuario_id, created_at, updated_at)
SELECT dc.id,
       cc.animal_id,
       'Monta Natural' AS tipo,
       NULL AS reproductor_id,
       NULL AS reproductor_nombre,
       COALESCE(cc.fecha_fin, cc.fecha_posible_servicio, cc.fecha_inicio) AS fecha,
       cc.observaciones,
       cc.usuario_id,
       cc.created_at,
       cc.updated_at
FROM ciclos_celo cc
INNER JOIN diagnosticos_celo dc
  ON dc.animal_id   = cc.animal_id
 AND dc.fecha_inicio = cc.fecha_inicio
 AND dc.usuario_id   = cc.usuario_id
WHERE cc.servicio_realizado = 1
  AND NOT EXISTS (SELECT 1 FROM servicios s WHERE s.diagnostico_celo_id = dc.id);

-- 3. Crear diagnóstico de gestación para animales cuyo estado actual es 'Prenada'
--    y que tienen un servicio migrado
INSERT INTO diagnosticos_gestacion (servicio_id, animal_id, fecha, metodo, resultado, observaciones, usuario_id, created_at, updated_at)
SELECT s.id,
       s.animal_id,
       s.fecha AS fecha,
       'Palpación' AS metodo,
       'Positivo'  AS resultado,
       'Migrado desde ciclos_celo — diagnóstico automático por estado Prenada' AS observaciones,
       s.usuario_id,
       NOW(),
       NOW()
FROM servicios s
INNER JOIN animales a ON a.id = s.animal_id
WHERE a.estado_reproductivo = 'Prenada'
  AND NOT EXISTS (SELECT 1 FROM diagnosticos_gestacion dg WHERE dg.servicio_id = s.id);

-- ============================================================
-- FIN DE MIGRACIÓN
-- Reporte de resultados
-- ============================================================
SELECT 'MIGRACIÓN COMPLETADA' AS resultado;
SELECT CONCAT('diagnosticos_celo: ', COUNT(*), ' registros') AS resumen FROM diagnosticos_celo;
SELECT CONCAT('servicios: ', COUNT(*), ' registros')         AS resumen FROM servicios;
SELECT CONCAT('diagnosticos_gestacion: ', COUNT(*), ' registros') AS resumen FROM diagnosticos_gestacion;
SELECT CONCAT('partos: ', COUNT(*), ' registros')            AS resumen FROM partos;
