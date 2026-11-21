-- Migración idempotente: versión de sesión para revocar tokens JWT.
-- Se ejecuta después de 2026-11-19_rendimiento.sql y puede repetirse sin error:
--   Get-Content -Raw back\migrations\2026-11-20_seguridad.sql |
--     & "C:\xampp\mysql\bin\mysql.exe" -u root --default-character-set=utf8mb4

USE muni_stodomingo;

DROP PROCEDURE IF EXISTS muni_agregar_columna;

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

DELIMITER ;

-- Sube al cambiar la contraseña o el email; el token JWT lleva la versión (claim `tv`)
-- y authMiddleware rechaza los que no coinciden.
CALL muni_agregar_columna('usuario', 'token_version', 'INT NOT NULL DEFAULT 0 AFTER direccion');

-- El login compara el email directo (usa el índice UNIQUE); se normalizan los antiguos.
UPDATE usuario SET email = LOWER(email) WHERE email <> LOWER(email);

DROP PROCEDURE muni_agregar_columna;
