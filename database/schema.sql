-- ============================================================
-- SCHEMA COMPLETO — Control de Inventario Ganadero
-- MySQL 8+, utf8mb4, InnoDB
-- ============================================================

CREATE DATABASE IF NOT EXISTS control_inventario
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE control_inventario;

-- -----------------------------------------------------------
-- 1. USUARIOS
-- -----------------------------------------------------------
CREATE TABLE usuarios (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(150)   NOT NULL,
  email       VARCHAR(255)   NOT NULL UNIQUE,
  password    VARCHAR(255)   NOT NULL,
  telefono    VARCHAR(20)    NULL,
  activo      TINYINT(1)     NOT NULL DEFAULT 1,
  created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 2. REBAÑOS
-- -----------------------------------------------------------
CREATE TABLE rebanos (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(100)   NOT NULL,
  costo_cabeza  DECIMAL(10,2) NULL,
  fecha_inicio  DATE           NULL,
  usuario_id    INT UNSIGNED   NOT NULL,
  activo        TINYINT(1)     NOT NULL DEFAULT 1,
  created_at    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_rebano_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_rebanos_usuario ON rebanos(usuario_id);

-- -----------------------------------------------------------
-- 3. ANIMALES
-- -----------------------------------------------------------
CREATE TABLE animales (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre                VARCHAR(100)   NOT NULL,
  identificacion        VARCHAR(50)    NULL,
  sexo                  ENUM('Macho','Hembra') NOT NULL,
  foto                  VARCHAR(255)   NULL,
  fecha_nacimiento      DATE           NOT NULL,
  rebano_id             INT UNSIGNED   NOT NULL,
  madre_id              INT UNSIGNED   NULL,
  padre_id              INT UNSIGNED   NULL,
  etapa                 ENUM('Ternero','Novillo','Adulto') NOT NULL DEFAULT 'Ternero',
  estado_reproductivo   ENUM('Vacia','Prenada','Lactando','Padrote','Ceba') NULL,
  peso_entrada          DECIMAL(10,2)  NULL,
  precio_kg             DECIMAL(12,2)  NULL,
  usuario_id            INT UNSIGNED   NOT NULL,
  activo                TINYINT(1)     NOT NULL DEFAULT 1,
  estado_general        ENUM('Activo','Vendido','Muerto') NOT NULL DEFAULT 'Activo',
  fecha_salida          DATE           NULL,
  motivo_salida         VARCHAR(100)   NULL,
  peso_salida           DECIMAL(10,2)  NULL,
  rebano_nacimiento_id  INT UNSIGNED   NULL,
  created_at            TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_animal_rebano  FOREIGN KEY (rebano_id)   REFERENCES rebanos(id) ON DELETE CASCADE,
  CONSTRAINT fk_animal_usuario FOREIGN KEY (usuario_id)  REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_animal_madre   FOREIGN KEY (madre_id)    REFERENCES animales(id) ON DELETE SET NULL,
  CONSTRAINT fk_animal_padre   FOREIGN KEY (padre_id)    REFERENCES animales(id) ON DELETE SET NULL,
  CONSTRAINT fk_animal_rebano_nacimiento FOREIGN KEY (rebano_nacimiento_id) REFERENCES rebanos(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_animales_usuario   ON animales(usuario_id);
CREATE INDEX idx_animales_rebano    ON animales(rebano_id);
CREATE INDEX idx_animales_sexo      ON animales(sexo);
CREATE INDEX idx_animales_etapa     ON animales(etapa);
CREATE INDEX idx_animales_estado    ON animales(estado_reproductivo);
CREATE INDEX idx_animales_nacimiento ON animales(fecha_nacimiento);
CREATE INDEX idx_animales_nombre    ON animales(nombre);

-- -----------------------------------------------------------
-- 4. FILTROS GUARDADOS
-- -----------------------------------------------------------
CREATE TABLE filtros_guardados (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(100)   NOT NULL,
  modulo      ENUM('animales','vacunacion','ventas') NOT NULL DEFAULT 'animales',
  usuario_id  INT UNSIGNED   NOT NULL,
  datos_filtro JSON          NOT NULL,
  created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_filtro_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_filtros_usuario ON filtros_guardados(usuario_id);

-- -----------------------------------------------------------
-- 5. MEDICAMENTOS
-- -----------------------------------------------------------
CREATE TABLE medicamentos (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre            VARCHAR(200)   NOT NULL,
  descripcion       TEXT           NULL,
  stock             INT UNSIGNED   NOT NULL DEFAULT 0,
  unidad            VARCHAR(50)    NOT NULL,
  fecha_vencimiento DATE           NULL,
  usuario_id        INT UNSIGNED   NOT NULL,
  activo            TINYINT(1)     NOT NULL DEFAULT 1,
  created_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_medicamento_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_medicamentos_usuario ON medicamentos(usuario_id);

-- -----------------------------------------------------------
-- 6. VACUNACIONES
-- -----------------------------------------------------------
CREATE TABLE vacunaciones (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fecha             DATE           NOT NULL,
  medicamento_id    INT UNSIGNED   NOT NULL,
  rebano_id         INT UNSIGNED   NULL,
  observaciones     TEXT           NULL,
  costo_veterinario DECIMAL(12,2)  NULL,
  gasto_id          INT UNSIGNED   NULL,
  usuario_id        INT UNSIGNED   NOT NULL,
  created_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_vacunacion_medicamento FOREIGN KEY (medicamento_id) REFERENCES medicamentos(id) ON DELETE CASCADE,
  CONSTRAINT fk_vacunacion_rebano      FOREIGN KEY (rebano_id)      REFERENCES rebanos(id) ON DELETE SET NULL,
  CONSTRAINT fk_vacunacion_gasto       FOREIGN KEY (gasto_id)       REFERENCES gastos(id) ON DELETE SET NULL,
  CONSTRAINT fk_vacunacion_usuario     FOREIGN KEY (usuario_id)     REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_vac_fecha       ON vacunaciones(fecha);
CREATE INDEX idx_vac_medicamento ON vacunaciones(medicamento_id);
CREATE INDEX idx_vac_gasto       ON vacunaciones(gasto_id);
CREATE INDEX idx_vac_usuario     ON vacunaciones(usuario_id);

-- -----------------------------------------------------------
-- 7. VACUNACION_ANIMALES (pivote)
-- -----------------------------------------------------------
CREATE TABLE vacunacion_animales (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vacunacion_id   INT UNSIGNED   NOT NULL,
  animal_id       INT UNSIGNED   NOT NULL,
  dosis_aplicada  DECIMAL(10,2)  NULL,
  created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_vac_animal_vacunacion FOREIGN KEY (vacunacion_id) REFERENCES vacunaciones(id) ON DELETE CASCADE,
  CONSTRAINT fk_vac_animal_animal     FOREIGN KEY (animal_id)     REFERENCES animales(id) ON DELETE CASCADE,
  UNIQUE KEY uq_vacunacion_animal (vacunacion_id, animal_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_vac_animal       ON vacunacion_animales(animal_id);
CREATE INDEX idx_vac_vacunacion   ON vacunacion_animales(vacunacion_id);

-- -----------------------------------------------------------
-- 8. DIAGNÓSTICOS DE CELO
-- -----------------------------------------------------------
CREATE TABLE diagnosticos_celo (
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

CREATE INDEX idx_diagcelo_animal ON diagnosticos_celo(animal_id);
CREATE INDEX idx_diagcelo_fecha  ON diagnosticos_celo(fecha_inicio);

-- -----------------------------------------------------------
-- 9. SERVICIOS (Monta Natural, Inseminación Artificial, TE)
-- -----------------------------------------------------------
CREATE TABLE servicios (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  diagnostico_celo_id INT UNSIGNED   NULL,
  animal_id           INT UNSIGNED   NOT NULL,
  tipo                ENUM('Monta Natural','Inseminación Artificial','Transferencia de Embriones') NOT NULL DEFAULT 'Monta Natural',
  reproductor_id      INT UNSIGNED   NULL,
  reproductor_nombre  VARCHAR(150)   NULL,
  fecha               DATE           NOT NULL,
  observaciones   TEXT           NULL,
  gasto_id        INT UNSIGNED   NULL,
  usuario_id      INT UNSIGNED   NOT NULL,
  created_at          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_serv_diagcelo      FOREIGN KEY (diagnostico_celo_id) REFERENCES diagnosticos_celo(id) ON DELETE SET NULL,
  CONSTRAINT fk_serv_animal        FOREIGN KEY (animal_id)           REFERENCES animales(id)          ON DELETE CASCADE,
  CONSTRAINT fk_serv_reproductor   FOREIGN KEY (reproductor_id)      REFERENCES animales(id)          ON DELETE SET NULL,
  CONSTRAINT fk_serv_usuario       FOREIGN KEY (usuario_id)          REFERENCES usuarios(id)           ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_serv_animal       ON servicios(animal_id);
CREATE INDEX idx_serv_diagcelo     ON servicios(diagnostico_celo_id);
CREATE INDEX idx_serv_fecha        ON servicios(fecha);

-- -----------------------------------------------------------
-- 10. DIAGNÓSTICOS DE GESTACIÓN
-- -----------------------------------------------------------
CREATE TABLE diagnosticos_gestacion (
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

CREATE INDEX idx_diaggest_animal   ON diagnosticos_gestacion(animal_id);
CREATE INDEX idx_diaggest_fecha    ON diagnosticos_gestacion(fecha);

-- -----------------------------------------------------------
-- 11. PARTOS
-- -----------------------------------------------------------
CREATE TABLE partos (
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

CREATE INDEX idx_parto_animal ON partos(animal_id);
CREATE INDEX idx_parto_fecha  ON partos(fecha);

-- -----------------------------------------------------------
-- 12. COMPAÑÍAS (sociedades entre usuarios)
-- -----------------------------------------------------------
CREATE TABLE companias (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  animal_id         INT UNSIGNED   NOT NULL,
  socio_id          INT UNSIGNED   NOT NULL,
  usuario_id        INT UNSIGNED   NOT NULL,
  peso_entrada      DECIMAL(10,2)  NOT NULL,
  fecha_entrada     DATE           NOT NULL,
  peso_salida       DECIMAL(10,2)  NULL,
  fecha_salida      DATE           NULL,
  precio_venta      DECIMAL(12,2)  NULL,
  gastos            DECIMAL(12,2)  NULL DEFAULT 0,
  porcentaje_socio  DECIMAL(5,2)   NOT NULL DEFAULT 50.00,
  estado            ENUM('Activa','Finalizada') NOT NULL DEFAULT 'Activa',
  created_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_comp_animal  FOREIGN KEY (animal_id)  REFERENCES animales(id) ON DELETE CASCADE,
  CONSTRAINT fk_comp_socio   FOREIGN KEY (socio_id)   REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_comp_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_comp_animal ON companias(animal_id);
CREATE INDEX idx_comp_socio  ON companias(socio_id);

-- -----------------------------------------------------------
-- 13. VENTAS / TRANSFERENCIAS
-- -----------------------------------------------------------
CREATE TABLE ventas (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  animal_id         INT UNSIGNED   NOT NULL,
  vendedor_id       INT UNSIGNED   NOT NULL,
  comprador_nombre  VARCHAR(200)   NULL,
  comprador_id      INT UNSIGNED   NULL,
  precio            DECIMAL(12,2)  NOT NULL,
  fecha             DATE           NOT NULL,
  tipo              ENUM('Venta','Transferencia') NOT NULL DEFAULT 'Venta',
  notas             TEXT           NULL,
  peso_salida       DECIMAL(10,2)  NULL,
  created_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_venta_animal    FOREIGN KEY (animal_id)    REFERENCES animales(id) ON DELETE CASCADE,
  CONSTRAINT fk_venta_vendedor  FOREIGN KEY (vendedor_id)  REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_venta_comprador FOREIGN KEY (comprador_id)  REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_ventas_vendedor  ON ventas(vendedor_id);
CREATE INDEX idx_ventas_comprador ON ventas(comprador_id);
CREATE INDEX idx_ventas_animal    ON ventas(animal_id);

-- -----------------------------------------------------------
-- 14. REFRESH TOKENS (JWT)
-- -----------------------------------------------------------
CREATE TABLE refresh_tokens (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT UNSIGNED   NOT NULL,
  token       VARCHAR(128)   NOT NULL UNIQUE,
  expira_en   DATETIME       NOT NULL,
  revocado    TINYINT(1)     NOT NULL DEFAULT 0,
  created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_refresh_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_refresh_usuario ON refresh_tokens(usuario_id);
CREATE INDEX idx_refresh_token   ON refresh_tokens(token);

-- -----------------------------------------------------------
-- 15. MOVIMIENTOS DE REBAÑOS
-- -----------------------------------------------------------
CREATE TABLE movimientos_rebano (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  animal_id         INT UNSIGNED   NOT NULL,
  rebano_origen_id  INT UNSIGNED   NULL,
  rebano_destino_id INT UNSIGNED   NOT NULL,
  usuario_id        INT UNSIGNED   NOT NULL,
  created_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mov_animal  FOREIGN KEY (animal_id) REFERENCES animales(id) ON DELETE CASCADE,
  CONSTRAINT fk_mov_destino FOREIGN KEY (rebano_destino_id) REFERENCES rebanos(id) ON DELETE CASCADE,
  CONSTRAINT fk_mov_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_mov_animal  ON movimientos_rebano(animal_id);
CREATE INDEX idx_mov_destino ON movimientos_rebano(rebano_destino_id);

-- -----------------------------------------------------------
-- 16. GASTOS
-- -----------------------------------------------------------
CREATE TABLE gastos (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tipo        ENUM('mantenimiento','medicamentos','compras') NOT NULL,
  descripcion VARCHAR(255)   NOT NULL,
  monto       DECIMAL(12,2)  NOT NULL,
  mes         DATE           NOT NULL,
  rebano_id   INT UNSIGNED   NULL,
  usuario_id  INT UNSIGNED   NOT NULL,
  created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_gasto_rebano  FOREIGN KEY (rebano_id)  REFERENCES rebanos(id) ON DELETE SET NULL,
  CONSTRAINT fk_gasto_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_gasto_mes      ON gastos(mes);
CREATE INDEX idx_gasto_tipo     ON gastos(tipo);
CREATE INDEX idx_gasto_rebano   ON gastos(rebano_id);
CREATE INDEX idx_gasto_usuario  ON gastos(usuario_id);
