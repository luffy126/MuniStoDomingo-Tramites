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
