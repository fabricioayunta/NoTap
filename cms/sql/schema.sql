-- NotApp: esquema de la base de datos (PostgreSQL / Supabase)
-- Se puede pegar en Supabase > SQL Editor. El sitio también lo crea solo la primera vez.

CREATE TABLE IF NOT EXISTS administrador (
  id_admin    SERIAL PRIMARY KEY,
  email       VARCHAR(120) NOT NULL UNIQUE,
  clave_hash  VARCHAR(255) NOT NULL,
  clave_sal   VARCHAR(64)  NOT NULL,
  creado_en   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS configuracion (
  clave  VARCHAR(50) PRIMARY KEY,
  valor  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categoria (
  id_categoria  SERIAL PRIMARY KEY,
  slug          VARCHAR(80)  NOT NULL UNIQUE,
  nombre        VARCHAR(60)  NOT NULL UNIQUE,
  descripcion   VARCHAR(255),
  orden         INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS casillero (
  id_casillero  SERIAL PRIMARY KEY,
  codigo        VARCHAR(12) NOT NULL UNIQUE,
  ubicacion     VARCHAR(100),
  descripcion   VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS producto (
  id_producto        SERIAL PRIMARY KEY,
  slug               VARCHAR(140) NOT NULL UNIQUE,
  nombre             VARCHAR(120) NOT NULL,
  descripcion_corta  VARCHAR(140),
  descripcion        TEXT,
  precio             NUMERIC(10,2) NOT NULL DEFAULT 0,
  disponible         BOOLEAN NOT NULL DEFAULT TRUE,
  destacado          BOOLEAN NOT NULL DEFAULT FALSE,
  id_categoria       INT NOT NULL REFERENCES categoria(id_categoria) ON UPDATE CASCADE ON DELETE RESTRICT,
  id_casillero       INT NULL REFERENCES casillero(id_casillero) ON UPDATE CASCADE ON DELETE SET NULL,
  stock_minimo       INT NULL CHECK (stock_minimo >= 0),
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS imagen (
  id_imagen     SERIAL PRIMARY KEY,
  id_producto   INT NOT NULL REFERENCES producto(id_producto) ON DELETE CASCADE,
  ruta          VARCHAR(500) NOT NULL,
  es_principal  BOOLEAN NOT NULL DEFAULT FALSE,
  orden         INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS talle (
  id_talle  SERIAL PRIMARY KEY,
  nombre    VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS color (
  id_color    SERIAL PRIMARY KEY,
  nombre      VARCHAR(40) NOT NULL,
  codigo_hex  CHAR(7) NOT NULL,
  UNIQUE (nombre, codigo_hex)
);

CREATE TABLE IF NOT EXISTS producto_talle (
  id_producto  INT NOT NULL REFERENCES producto(id_producto) ON DELETE CASCADE,
  id_talle     INT NOT NULL REFERENCES talle(id_talle) ON DELETE CASCADE,
  orden        INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id_producto, id_talle)
);

CREATE TABLE IF NOT EXISTS producto_color (
  id_producto  INT NOT NULL REFERENCES producto(id_producto) ON DELETE CASCADE,
  id_color     INT NOT NULL REFERENCES color(id_color) ON DELETE CASCADE,
  orden        INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id_producto, id_color)
);

CREATE TABLE IF NOT EXISTS stock (
  id_stock     SERIAL PRIMARY KEY,
  id_producto  INT NOT NULL REFERENCES producto(id_producto) ON DELETE CASCADE,
  id_talle     INT NULL REFERENCES talle(id_talle) ON DELETE CASCADE,
  id_color     INT NULL REFERENCES color(id_color) ON DELETE CASCADE,
  cantidad     INT NOT NULL DEFAULT 0 CHECK (cantidad >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS stock_combinacion_unica
  ON stock (id_producto, COALESCE(id_talle, 0), COALESCE(id_color, 0));

CREATE INDEX IF NOT EXISTS producto_categoria_idx ON producto (id_categoria);
CREATE INDEX IF NOT EXISTS imagen_producto_idx ON imagen (id_producto);
