/* ==========================================================================
   NotApp CMS — Conexión a PostgreSQL (Supabase)
   Usa la variable de entorno DATABASE_URL. Crea las tablas y carga los datos
   de ejemplo la primera vez que se conecta a una base vacía.
   ========================================================================== */

const { Pool } = require("pg");
const auth = require("./auth");
const SCHEMA = require("./schema");
const seed = require("./seed");
const S = require("./stock");

let pool = null;

function getPool() {
  if (pool) return pool;
  let url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Falta la variable DATABASE_URL (la conexión a la base de datos de Supabase).");
  }
  // Supabase exige SSL; quitamos sslmode de la URL para controlarlo desde acá.
  url = url.replace(/([?&])sslmode=[^&]*&?/, "$1").replace(/[?&]$/, "");
  const local = /@(localhost|127\.0\.0\.1)(:|\/)/.test(url);
  pool = new Pool({
    connectionString: url,
    max: process.env.VERCEL ? 1 : 5,
    idleTimeoutMillis: 10000,
    ssl: local ? false : { rejectUnauthorized: false }
  });
  pool.on("error", function (e) { console.error("Error en la conexión a la base:", e.message); });
  return pool;
}

function query(texto, params) {
  return getPool().query(texto, params);
}

async function tx(fn) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const r = await fn(client);
    await client.query("COMMIT");
    return r;
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    throw e;
  } finally {
    client.release();
  }
}

const ADMIN_EMAIL_DEFAULT = "admin@jiustore.com";
const ADMIN_PASSWORD_DEFAULT = "JiuStore2026!";

/** Crea tablas y datos iniciales si hace falta. Seguro si dos instancias arrancan a la vez. */
async function asegurarEsquema() {
  await tx(async function (c) {
    await c.query("SELECT pg_advisory_xact_lock(7272001)");
    await c.query(SCHEMA);

    // Administrador inicial
    const admins = await c.query("SELECT 1 FROM administrador LIMIT 1");
    if (admins.rowCount === 0) {
      const email = (process.env.ADMIN_EMAIL || ADMIN_EMAIL_DEFAULT).trim().toLowerCase();
      const clave = process.env.ADMIN_PASSWORD || ADMIN_PASSWORD_DEFAULT;
      const cred = auth.crearCredencial(clave);
      await c.query("INSERT INTO administrador (email, clave_hash, clave_sal) VALUES ($1,$2,$3)", [email, cred.hash, cred.salt]);
    }

    // Configuración por defecto
    const defaults = [
      ["nombre_sitio", "NotApp"],
      ["whatsapp_numero", "1151760505"],
      ["stock_bajo_general", String(S.STOCK_BAJO_DEFECTO)]
    ];
    for (const d of defaults) {
      await c.query("INSERT INTO configuracion (clave, valor) VALUES ($1,$2) ON CONFLICT (clave) DO NOTHING", d);
    }

    // Catálogo de ejemplo (solo si no hay nada cargado)
    const cats = await c.query("SELECT 1 FROM categoria LIMIT 1");
    const prods = await c.query("SELECT 1 FROM producto LIMIT 1");
    if (cats.rowCount === 0 && prods.rowCount === 0) {
      const datos = seed.datosIniciales();
      seed.sembrarStock(datos);
      let orden = 0;
      for (const cat of datos.categorias) {
        await c.query("INSERT INTO categoria (slug, nombre, orden) VALUES ($1,$2,$3)", [cat.id, cat.nombre, orden++]);
      }
      const escribir = require("./db")._escribirProducto;
      for (const p of datos.productos) {
        await escribir(c, p, true);
      }
    }
  });
}

module.exports = {
  query: query,
  tx: tx,
  asegurarEsquema: asegurarEsquema,
  ADMIN_EMAIL_DEFAULT: ADMIN_EMAIL_DEFAULT,
  ADMIN_PASSWORD_DEFAULT: ADMIN_PASSWORD_DEFAULT
};
