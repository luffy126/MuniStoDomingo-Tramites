-- Migración idempotente desde la base original hasta el esquema de las 6 olas.
-- Se puede ejecutar varias veces sobre una instalación ya existente:
--   Get-Content -Raw back\migrations\2026-11-18_mejoras.sql | mysql -u root muni_stodomingo
-- Para bases nuevas basta con ejecutar back/schema.sql.

USE muni_stodomingo;

DROP PROCEDURE IF EXISTS muni_agregar_columna;
DROP PROCEDURE IF EXISTS muni_agregar_indice;
DROP PROCEDURE IF EXISTS muni_agregar_check;

DELIMITER //

CREATE PROCEDURE muni_agregar_columna(
  IN p_tabla VARCHAR(64), IN p_columna VARCHAR(64), IN p_definicion VARCHAR(255)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = p_tabla AND column_name = p_columna
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', p_tabla, '` ADD COLUMN `', p_columna, '` ', p_definicion);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//

CREATE PROCEDURE muni_agregar_indice(
  IN p_tabla VARCHAR(64), IN p_indice VARCHAR(64), IN p_columnas VARCHAR(255)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = p_tabla AND index_name = p_indice
  ) THEN
    SET @sql = CONCAT('CREATE INDEX `', p_indice, '` ON `', p_tabla, '` (', p_columnas, ')');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//

CREATE PROCEDURE muni_agregar_check(
  IN p_tabla VARCHAR(64), IN p_restriccion VARCHAR(64), IN p_expresion VARCHAR(255)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = DATABASE() AND table_name = p_tabla AND constraint_name = p_restriccion
  ) THEN
    SET @sql = CONCAT(
      'ALTER TABLE `', p_tabla, '` ADD CONSTRAINT `', p_restriccion, '` CHECK (', p_expresion, ')'
    );
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//

DELIMITER ;

CALL muni_agregar_columna('usuario', 'telefono', 'VARCHAR(30) NULL');
CALL muni_agregar_columna('usuario', 'direccion', 'VARCHAR(255) NULL');
CALL muni_agregar_columna('solicitud', 'prioridad', "VARCHAR(10) NOT NULL DEFAULT 'media'");
CALL muni_agregar_columna('solicitud', 'fecha_limite', 'DATE NULL');
CALL muni_agregar_check(
  'solicitud',
  'chk_solicitud_prioridad',
  "prioridad IN ('baja', 'media', 'alta', 'urgente')"
);

CREATE TABLE IF NOT EXISTS password_reset (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT           NOT NULL,
  token_hash  CHAR(64)      NOT NULL UNIQUE,
  expira_en   DATETIME      NOT NULL,
  creado_en   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_password_reset_usuario FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,
  INDEX idx_password_reset_usuario (usuario_id)
);

CREATE TABLE IF NOT EXISTS solicitud_historial (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  solicitud_id     INT           NOT NULL,
  estado_anterior  VARCHAR(20)   NULL,
  estado_nuevo     VARCHAR(20)   NOT NULL,
  actor_id         INT           NULL,
  actor_nombre     VARCHAR(120)  NOT NULL,
  observaciones    TEXT          NULL,
  creado_en        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_historial_solicitud FOREIGN KEY (solicitud_id)
    REFERENCES solicitud (id) ON DELETE CASCADE,
  CONSTRAINT fk_historial_actor FOREIGN KEY (actor_id)
    REFERENCES usuario (id) ON DELETE SET NULL,
  INDEX idx_historial_solicitud (solicitud_id, creado_en)
);

CREATE TABLE IF NOT EXISTS documento (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  solicitud_id      INT           NOT NULL,
  subido_por        INT           NULL,
  nombre_original   VARCHAR(255)  NOT NULL,
  nombre_almacenado VARCHAR(255)  NOT NULL UNIQUE,
  tipo              VARCHAR(100)  NOT NULL,
  tamano            INT           NOT NULL,
  creado_en         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_documento_solicitud FOREIGN KEY (solicitud_id)
    REFERENCES solicitud (id) ON DELETE CASCADE,
  CONSTRAINT fk_documento_usuario FOREIGN KEY (subido_por)
    REFERENCES usuario (id) ON DELETE SET NULL,
  INDEX idx_documento_solicitud (solicitud_id, creado_en)
);

CALL muni_agregar_indice('solicitud', 'idx_solicitud_prioridad', 'prioridad, fecha_limite');

-- Las solicitudes anteriores no tenían evento de creación; se registra uno para
-- que la línea de tiempo no aparezca vacía. Si ya se migró, no se duplica.
INSERT INTO solicitud_historial (solicitud_id, estado_anterior, estado_nuevo, actor_id, actor_nombre, observaciones, creado_en)
SELECT s.id, NULL, s.estado, s.vecino_id, u.nombre,
       CONCAT('Solicitud migrada desde el esquema anterior. Estado actual: ', s.estado),
       s.creada_en
FROM solicitud s
JOIN usuario u ON u.id = s.vecino_id
WHERE NOT EXISTS (
  SELECT 1 FROM solicitud_historial h WHERE h.solicitud_id = s.id
);

DROP PROCEDURE muni_agregar_columna;
DROP PROCEDURE muni_agregar_indice;
DROP PROCEDURE muni_agregar_check;
