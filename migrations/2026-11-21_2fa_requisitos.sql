-- Migración idempotente: verificación en dos pasos por correo y requisitos con
-- tipo (documento/dato) para adjuntar archivos antes de iniciar el trámite.
-- Se ejecuta después de 2026-11-20_seguridad.sql y puede repetirse sin error:
--   Get-Content -Raw back\migrations\2026-11-21_2fa_requisitos.sql |
--     & "C:\xampp\mysql\bin\mysql.exe" -u root --default-character-set=utf8mb4

USE muni_stodomingo;

DROP PROCEDURE IF EXISTS muni_agregar_columna;
DROP PROCEDURE IF EXISTS muni_agregar_fk;

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

CREATE PROCEDURE muni_agregar_fk(
  IN p_tabla VARCHAR(64), IN p_restriccion VARCHAR(64), IN p_definicion VARCHAR(255)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = DATABASE() AND table_name = p_tabla AND constraint_name = p_restriccion
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', p_tabla, '` ADD CONSTRAINT `', p_restriccion, '` ', p_definicion);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//

DELIMITER ;

-- 2FA
CALL muni_agregar_columna('usuario', 'dos_factores', 'BOOLEAN NOT NULL DEFAULT FALSE AFTER token_version');

CREATE TABLE IF NOT EXISTS desafio_2fa (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id    INT           NOT NULL,
  desafio_hash  CHAR(64)      NOT NULL UNIQUE,
  codigo_hash   CHAR(64)      NOT NULL,
  intentos      INT           NOT NULL DEFAULT 0,
  expira_en     DATETIME      NOT NULL,
  creado_en     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_desafio_2fa_usuario FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,
  INDEX idx_desafio_2fa_usuario (usuario_id)
);

-- Requisitos con tipo
CALL muni_agregar_columna('requisito', 'tipo', "VARCHAR(10) NOT NULL DEFAULT 'documento'");
CALL muni_agregar_columna('requisito', 'obligatorio', 'BOOLEAN NOT NULL DEFAULT TRUE');
CALL muni_agregar_fk('requisito', 'chk_requisito_tipo', "CHECK (tipo IN ('documento', 'dato'))");

UPDATE requisito SET tipo = 'dato', obligatorio = TRUE
WHERE (tramite_id = 'reclamo-alumbrado' AND descripcion = 'Dirección exacta del punto afectado')
   OR tramite_id = 'solicitud-retiro-escombros';
UPDATE requisito SET tipo = 'documento', obligatorio = FALSE
WHERE tramite_id = 'reclamo-alumbrado' AND descripcion LIKE 'Fotografía%';

-- Documento ↔ requisito
CALL muni_agregar_columna('documento', 'requisito_id', 'INT NULL AFTER tamano');
CALL muni_agregar_fk('documento', 'fk_documento_requisito',
  'FOREIGN KEY (requisito_id) REFERENCES requisito (id) ON DELETE SET NULL');

DROP PROCEDURE muni_agregar_columna;
DROP PROCEDURE muni_agregar_fk;
