-- MuniStoDomingo-Tramites — estructura de la base de datos
-- Propuesta inicial derivada del modelo de datos del frontend.
-- Probado con MySQL 8 / MariaDB 10.

CREATE TABLE usuario (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(120)  NOT NULL,
  email           VARCHAR(160)  NOT NULL UNIQUE,
  password_hash   VARCHAR(255)  NOT NULL,
  rol             VARCHAR(20)   NOT NULL,
  creado_en       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_usuario_rol CHECK (rol IN ('vecino', 'funcionario'))
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
  observaciones   TEXT          NULL,
  creada_en       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resuelta_en     TIMESTAMP     NULL,
  CONSTRAINT chk_solicitud_estado
    CHECK (estado IN ('pendiente', 'en_revision', 'aprobado', 'rechazado')),
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

CREATE INDEX idx_solicitud_estado ON solicitud (estado);
CREATE INDEX idx_solicitud_vecino ON solicitud (vecino_id);
CREATE INDEX idx_notificacion_usuario ON notificacion (usuario_id, leida);

-- ============================================================
-- DATOS SEMILLA
-- ============================================================

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
INSERT INTO requisito (tramite_id, descripcion, orden) VALUES
  ('cert-residencia', 'Cédula de identidad vigente', 1),
  ('cert-residencia', 'Comprobante de domicilio de los últimos 3 meses', 2),
  ('cert-residencia', 'Declaración jurada simple', 3),
  ('cert-numero-municipal', 'Rol de avalúo de la propiedad', 1),
  ('cert-numero-municipal', 'Cédula de identidad del propietario', 2),
  ('permiso-obra-menor', 'Planos de la obra firmados', 1),
  ('permiso-obra-menor', 'Certificado de informaciones previas', 2),
  ('permiso-obra-menor', 'Cédula de identidad del propietario', 3),
  ('permiso-evento', 'Carta de solicitud dirigida al alcalde', 1),
  ('permiso-evento', 'Plano de ubicación del evento', 2),
  ('permiso-evento', 'Plan de seguridad y emergencias', 3),
  ('reclamo-alumbrado', 'Dirección exacta del punto afectado', 1),
  ('reclamo-alumbrado', 'Fotografía del problema (opcional)', 2),
  ('solicitud-retiro-escombros', 'Dirección del retiro', 1),
  ('solicitud-retiro-escombros', 'Descripción del volumen aproximado', 2);

-- Solicitudes de ejemplo (vecino_id = 1 es 'Vecino Demo', funcionario_id = 2 es 'Funcionario Demo')
INSERT INTO solicitud (folio, tramite_id, vecino_id, funcionario_id, estado, observaciones, creada_en) VALUES
  ('SOL-1001', 'cert-residencia', 1, NULL, 'pendiente', NULL, '2026-09-12 10:00:00'),
  ('SOL-1002', 'permiso-obra-menor', 1, NULL, 'en_revision', 'Faltan planos firmados por el arquitecto.', '2026-09-14 14:30:00'),
  ('SOL-1003', 'reclamo-alumbrado', 1, 2, 'aprobado', 'Cuadrilla asignada para el 20 de septiembre.', '2026-09-16 09:15:00'),
  ('SOL-1004', 'permiso-evento', 1, 2, 'rechazado', 'El plan de seguridad no cumple con el aforo declarado.', '2026-09-18 11:00:00'),
  ('SOL-1005', 'solicitud-retiro-escombros', 1, NULL, 'pendiente', NULL, '2026-09-20 16:45:00');

-- Notificaciones de ejemplo (usuario_id = 1 es 'Vecino Demo')
INSERT INTO notificacion (usuario_id, solicitud_id, titulo, mensaje, leida, creada_en) VALUES
  (1, 3, 'Solicitud aprobada', 'Tu reclamo por alumbrado público fue aprobado y asignado a una cuadrilla.', FALSE, '2026-09-16 09:20:00'),
  (1, 1, 'Documentos pendientes', 'Recuerda adjuntar el comprobante de domicilio a tu certificado de residencia.', FALSE, '2026-09-13 08:00:00'),
  (1, NULL, 'Horario de atención', 'La oficina de partes atenderá de 8:30 a 14:00 durante septiembre.', TRUE, '2026-09-05 10:00:00');
