-- MuniStoDomingo-Tramites — estructura de la base de datos
-- Propuesta inicial derivada del modelo de datos del frontend.
-- Probado con MySQL 8 / MariaDB 10.
-- Se puede ejecutar varias veces: reinicia los datos a la semilla (borra y recrea las tablas).

CREATE DATABASE IF NOT EXISTS muni_stodomingo
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE muni_stodomingo;

-- Permite volver a ejecutar el script: borra las tablas (hijas primero) y las recrea con la semilla.
DROP TABLE IF EXISTS documento, solicitud_historial, desafio_2fa, password_reset, notificacion, solicitud, requisito, tramite, usuario;

CREATE TABLE usuario (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(120)  NOT NULL,
  email           VARCHAR(160)  NOT NULL UNIQUE,
  password_hash   VARCHAR(255)  NOT NULL,
  rol             VARCHAR(20)   NOT NULL,
  telefono        VARCHAR(30)   NULL,
  direccion       VARCHAR(255)  NULL,
  -- Sube al cambiar la contraseña o el email: invalida los tokens JWT anteriores.
  token_version   INT           NOT NULL DEFAULT 0,
  -- Verificación en dos pasos por correo (opcional, la activa cada usuario).
  dos_factores    BOOLEAN       NOT NULL DEFAULT FALSE,
  creado_en       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_usuario_rol CHECK (rol IN ('vecino', 'funcionario'))
);

-- Tokens de recuperación de contraseña. Se guarda el hash, nunca el token en claro.
CREATE TABLE password_reset (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT           NOT NULL,
  token_hash  CHAR(64)      NOT NULL UNIQUE,
  expira_en   DATETIME      NOT NULL,
  creado_en   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_password_reset_usuario FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,
  INDEX idx_password_reset_usuario (usuario_id)
);

-- Desafíos de la verificación en dos pasos: hashes del desafío y del código.
CREATE TABLE desafio_2fa (
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

CREATE TABLE tramite (
  id            VARCHAR(60)   PRIMARY KEY,
  nombre        VARCHAR(160)  NOT NULL,
  categoria     VARCHAR(20)   NOT NULL,
  descripcion   TEXT          NOT NULL,
  icono         VARCHAR(60)   NOT NULL,
  activo        BOOLEAN       NOT NULL DEFAULT TRUE,
  CONSTRAINT chk_tramite_categoria
    CHECK (categoria IN ('certificados', 'permisos', 'reclamos', 'solicitudes'))
);

CREATE TABLE requisito (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  tramite_id    VARCHAR(60)   NOT NULL,
  descripcion   VARCHAR(255)  NOT NULL,
  orden         INT           NOT NULL DEFAULT 0,
  -- 'documento': se adjunta un archivo; 'dato': se informa en las observaciones.
  tipo          VARCHAR(10)   NOT NULL DEFAULT 'documento',
  obligatorio   BOOLEAN       NOT NULL DEFAULT TRUE,
  CONSTRAINT chk_requisito_tipo CHECK (tipo IN ('documento', 'dato')),
  CONSTRAINT fk_requisito_tramite FOREIGN KEY (tramite_id)
    REFERENCES tramite (id) ON DELETE CASCADE
);

CREATE TABLE solicitud (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  folio           VARCHAR(20)   NOT NULL UNIQUE,
  tramite_id      VARCHAR(60)   NOT NULL,
  vecino_id       INT           NOT NULL,
  funcionario_id  INT           NULL,
  estado          VARCHAR(20)   NOT NULL DEFAULT 'pendiente',
  prioridad       VARCHAR(10)   NOT NULL DEFAULT 'media',
  fecha_limite    DATE          NULL,
  observaciones   TEXT          NULL,
  creada_en       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resuelta_en     TIMESTAMP     NULL,
  CONSTRAINT chk_solicitud_estado
    CHECK (estado IN ('pendiente', 'en_revision', 'aprobado', 'rechazado')),
  CONSTRAINT chk_solicitud_prioridad
    CHECK (prioridad IN ('baja', 'media', 'alta', 'urgente')),
  CONSTRAINT fk_solicitud_tramite FOREIGN KEY (tramite_id) REFERENCES tramite (id),
  CONSTRAINT fk_solicitud_vecino FOREIGN KEY (vecino_id) REFERENCES usuario (id),
  CONSTRAINT fk_solicitud_funcionario FOREIGN KEY (funcionario_id) REFERENCES usuario (id)
);

CREATE TABLE notificacion (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id    INT           NOT NULL,
  solicitud_id  INT           NULL,
  titulo        VARCHAR(160)  NOT NULL,
  mensaje       TEXT          NOT NULL,
  leida         BOOLEAN       NOT NULL DEFAULT FALSE,
  creada_en     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notificacion_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuario (id) ON DELETE CASCADE,
  CONSTRAINT fk_notificacion_solicitud FOREIGN KEY (solicitud_id)
    REFERENCES solicitud (id) ON DELETE SET NULL
);

-- Línea de tiempo de cada solicitud. Guarda el nombre del actor para que el
-- historial siga siendo legible si el usuario se elimina.
CREATE TABLE solicitud_historial (
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

-- Documentos adjuntos. El archivo vive en disco (UPLOAD_DIR) y la base guarda
-- solo sus metadatos y el nombre aleatorio con que se almacenó.
CREATE TABLE documento (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  solicitud_id      INT           NOT NULL,
  subido_por        INT           NULL,
  nombre_original   VARCHAR(255)  NOT NULL,
  nombre_almacenado VARCHAR(255)  NOT NULL UNIQUE,
  tipo              VARCHAR(100)  NOT NULL,
  tamano            INT           NOT NULL,
  -- Requisito que cumple el archivo (NULL: adjunto adicional).
  requisito_id      INT           NULL,
  creado_en         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_documento_requisito FOREIGN KEY (requisito_id)
    REFERENCES requisito (id) ON DELETE SET NULL,
  CONSTRAINT fk_documento_solicitud FOREIGN KEY (solicitud_id)
    REFERENCES solicitud (id) ON DELETE CASCADE,
  CONSTRAINT fk_documento_usuario FOREIGN KEY (subido_por)
    REFERENCES usuario (id) ON DELETE SET NULL,
  INDEX idx_documento_solicitud (solicitud_id, creado_en)
);

CREATE INDEX idx_solicitud_estado ON solicitud (estado);
CREATE INDEX idx_solicitud_vecino ON solicitud (vecino_id);
CREATE INDEX idx_solicitud_fecha ON solicitud (creada_en);
CREATE INDEX idx_solicitud_prioridad ON solicitud (prioridad, fecha_limite);
CREATE INDEX idx_solicitud_vecino_fecha ON solicitud (vecino_id, creada_en);
CREATE INDEX idx_solicitud_funcionario_fecha ON solicitud (funcionario_id, creada_en);
CREATE INDEX idx_solicitud_estado_fecha ON solicitud (estado, creada_en);
CREATE INDEX idx_solicitud_tramite ON solicitud (tramite_id);
CREATE INDEX idx_notificacion_usuario ON notificacion (usuario_id, leida);
CREATE INDEX idx_notificacion_usuario_fecha ON notificacion (usuario_id, creada_en);

-- DATOS SEMILLA

-- Usuarios de prueba. Contraseña de ambos: Test1234
-- El valor almacenado es el hash bcrypt (10 rondas), nunca la contraseña en claro.
INSERT INTO usuario (nombre, email, password_hash, rol) VALUES
  ('Vecino Demo', 'vecino@test.com', '$2b$10$Ked7B.aZsxzX.8dzmIxKi.9nX9PArxFh7HXuBgfUKiQjtG5qr81b.', 'vecino'),
  ('Funcionario Demo', 'funcionario@test.com', '$2b$10$Ked7B.aZsxzX.8dzmIxKi.9nX9PArxFh7HXuBgfUKiQjtG5qr81b.', 'funcionario');

-- Catálogo de trámites
INSERT INTO tramite (id, nombre, categoria, descripcion, icono) VALUES
  ('cert-residencia', 'Certificado de residencia', 'certificados', 'Acredita tu domicilio dentro de la comuna de Santo Domingo.', 'documentTextOutline'),
  ('cert-numero-municipal', 'Certificado de número municipal', 'certificados', 'Certifica el número asignado a tu propiedad por la municipalidad.', 'homeOutline'),
  ('permiso-obra-menor', 'Permiso de obra menor', 'permisos', 'Autorización para ampliaciones y remodelaciones de baja escala.', 'constructOutline'),
  ('permiso-evento', 'Permiso para evento en vía pública', 'permisos', 'Solicita autorización para ferias, actividades deportivas o culturales.', 'megaphoneOutline'),
  ('reclamo-alumbrado', 'Reclamo por alumbrado público', 'reclamos', 'Informa luminarias apagadas o en mal estado en tu sector.', 'bulbOutline'),
  ('solicitud-retiro-escombros', 'Solicitud de retiro de escombros', 'solicitudes', 'Agenda el retiro de escombros y residuos voluminosos desde tu domicilio.', 'trashBinOutline');

-- Requisitos de cada trámite
INSERT INTO requisito (tramite_id, descripcion, orden, tipo, obligatorio) VALUES
  ('cert-residencia', 'Cédula de identidad vigente', 1, 'documento', TRUE),
  ('cert-residencia', 'Comprobante de domicilio de los últimos 3 meses', 2, 'documento', TRUE),
  ('cert-residencia', 'Declaración jurada simple', 3, 'documento', TRUE),
  ('cert-numero-municipal', 'Rol de avalúo de la propiedad', 1, 'documento', TRUE),
  ('cert-numero-municipal', 'Cédula de identidad del propietario', 2, 'documento', TRUE),
  ('permiso-obra-menor', 'Planos de la obra firmados', 1, 'documento', TRUE),
  ('permiso-obra-menor', 'Certificado de informaciones previas', 2, 'documento', TRUE),
  ('permiso-obra-menor', 'Cédula de identidad del propietario', 3, 'documento', TRUE),
  ('permiso-evento', 'Carta de solicitud dirigida al alcalde', 1, 'documento', TRUE),
  ('permiso-evento', 'Plano de ubicación del evento', 2, 'documento', TRUE),
  ('permiso-evento', 'Plan de seguridad y emergencias', 3, 'documento', TRUE),
  ('reclamo-alumbrado', 'Dirección exacta del punto afectado', 1, 'dato', TRUE),
  ('reclamo-alumbrado', 'Fotografía del problema (opcional)', 2, 'documento', FALSE),
  ('solicitud-retiro-escombros', 'Dirección del retiro', 1, 'dato', TRUE),
  ('solicitud-retiro-escombros', 'Descripción del volumen aproximado', 2, 'dato', TRUE);

-- Solicitudes de ejemplo (vecino_id = 1 es 'Vecino Demo', funcionario_id = 2 es 'Funcionario Demo')
-- resuelta_en solo se completa en las solicitudes en estado final (aprobado o rechazado).
INSERT INTO solicitud (folio, tramite_id, vecino_id, funcionario_id, estado, observaciones, creada_en, resuelta_en) VALUES
  ('SOL-1001', 'cert-residencia', 1, NULL, 'pendiente', NULL, '2026-09-12 10:00:00', NULL),
  ('SOL-1002', 'permiso-obra-menor', 1, 2, 'en_revision', 'Faltan planos firmados por el arquitecto.', '2026-09-14 14:30:00', NULL),
  ('SOL-1003', 'reclamo-alumbrado', 1, 2, 'aprobado', 'Cuadrilla asignada para el 20 de septiembre.', '2026-09-16 09:15:00', '2026-09-16 09:20:00'),
  ('SOL-1004', 'permiso-evento', 1, 2, 'rechazado', 'El plan de seguridad no cumple con el aforo declarado.', '2026-09-18 11:00:00', '2026-09-19 10:30:00'),
  ('SOL-1005', 'solicitud-retiro-escombros', 1, NULL, 'pendiente', NULL, '2026-09-20 16:45:00', NULL);

-- Notificaciones de ejemplo (usuario_id = 1 es 'Vecino Demo')
INSERT INTO notificacion (usuario_id, solicitud_id, titulo, mensaje, leida, creada_en) VALUES
  (1, 3, 'Solicitud aprobada', 'Tu reclamo por alumbrado público fue aprobado y asignado a una cuadrilla.', FALSE, '2026-09-16 09:20:00'),
  (1, 1, 'Documentos pendientes', 'Recuerda adjuntar el comprobante de domicilio a tu certificado de residencia.', FALSE, '2026-09-13 08:00:00'),
  (1, NULL, 'Horario de atención', 'La oficina de partes atenderá de 8:30 a 14:00 durante septiembre.', TRUE, '2026-09-05 10:00:00');
