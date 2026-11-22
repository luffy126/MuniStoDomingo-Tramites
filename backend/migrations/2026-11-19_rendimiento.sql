-- Migración idempotente de índices para los listados paginados y las vistas
-- de notificaciones. Se ejecuta después de 2026-11-18_mejoras.sql y puede
-- repetirse sin error:
--   Get-Content -Raw back\migrations\2026-11-19_rendimiento.sql |
--     & "C:\xampp\mysql\bin\mysql.exe" -u root --default-character-set=utf8mb4

USE muni_stodomingo;

DROP PROCEDURE IF EXISTS muni_agregar_indice;

DELIMITER //

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

DELIMITER ;

-- Listados del vecino y del funcionario: filtran por dueño/asignado y ordenan
-- por fecha descendente. La columna de fecha al final permite leer la página
-- sin ordenar toda la tabla.
CALL muni_agregar_indice('solicitud', 'idx_solicitud_vecino_fecha', 'vecino_id, creada_en');
CALL muni_agregar_indice('solicitud', 'idx_solicitud_funcionario_fecha', 'funcionario_id, creada_en');
CALL muni_agregar_indice('solicitud', 'idx_solicitud_estado_fecha', 'estado, creada_en');
-- Los reportes agrupan por trámite.
CALL muni_agregar_indice('solicitud', 'idx_solicitud_tramite', 'tramite_id');
-- Notificaciones: la página ordena por fecha, no por leída.
CALL muni_agregar_indice('notificacion', 'idx_notificacion_usuario_fecha', 'usuario_id, creada_en');

DROP PROCEDURE muni_agregar_indice;
