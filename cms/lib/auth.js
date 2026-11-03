/* ==========================================================================
   NotApp CMS — Autenticación
   Hash de contraseñas con scrypt (nativo de Node) + sesiones firmadas (cookie).
   Todo con el módulo "crypto" de Node.
   ========================================================================== */

const crypto = require("crypto");

const SESSION_COOKIE = "jiustore_sid";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 8; // 8 horas

function generarSalt() {
  return crypto.randomBytes(16).toString("hex");
}

function hashearPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

/** Crea el hash+salt para guardar en la base de datos al crear/cambiar el admin. */
function crearCredencial(password) {
  const salt = generarSalt();
  const hash = hashearPassword(password, salt);
  return { salt, hash };
}

/** Compara una contraseña ingresada contra el hash guardado, en tiempo constante. */
function verificarPassword(password, salt, hashGuardado) {
  const hashIntento = hashearPassword(password, salt);
  const bufA = Buffer.from(hashIntento, "hex");
  const bufB = Buffer.from(hashGuardado, "hex");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/* Sesiones sin estado: la cookie lleva el email y el vencimiento firmados con HMAC.
   Así funcionan en Vercel, donde no hay memoria compartida entre ejecuciones. */

function secreto() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  // Si no se configuró, se deriva de la conexión a la base (que ya es secreta).
  return crypto.createHash("sha256").update("notapp|" + (process.env.DATABASE_URL || "desarrollo-local")).digest("hex");
}

function firmar(texto) {
  return crypto.createHmac("sha256", secreto()).update(texto).digest("base64url");
}

function crearSesion(email) {
  const payload = Buffer.from(JSON.stringify({ e: email, x: Date.now() + SESSION_DURATION_MS })).toString("base64url");
  return payload + "." + firmar(payload);
}

function obtenerSesion(token) {
  if (!token || token.indexOf(".") === -1) return null;
  const partes = token.split(".");
  if (partes.length !== 2) return null;
  const esperado = Buffer.from(firmar(partes[0]));
  const recibido = Buffer.from(partes[1]);
  if (esperado.length !== recibido.length || !crypto.timingSafeEqual(esperado, recibido)) return null;
  let datos;
  try { datos = JSON.parse(Buffer.from(partes[0], "base64url").toString("utf8")); } catch (e) { return null; }
  if (!datos || !datos.e || Date.now() > datos.x) return null;
  return { email: datos.e, expiresAt: datos.x };
}

function destruirSesion() { /* sin estado: alcanza con borrar la cookie */ }

/** Extrae el valor de una cookie puntual del header Cookie. */
function leerCookie(req, nombre) {
  const header = req.headers.cookie;
  if (!header) return null;
  const partes = header.split(";").map(function (p) { return p.trim(); });
  for (const parte of partes) {
    const idx = parte.indexOf("=");
    if (idx === -1) continue;
    const key = parte.slice(0, idx);
    const value = parte.slice(idx + 1);
    if (key === nombre) return decodeURIComponent(value);
  }
  return null;
}

function armarSetCookie(sid, maxAgeSegundos, seguro) {
  const partes = [
    SESSION_COOKIE + "=" + sid,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=" + maxAgeSegundos
  ];
  if (seguro) partes.push("Secure");
  return partes.join("; ");
}

function armarCookieBorrado() {
  return SESSION_COOKIE + "=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
}

module.exports = {
  SESSION_COOKIE: SESSION_COOKIE,
  crearCredencial: crearCredencial,
  verificarPassword: verificarPassword,
  crearSesion: crearSesion,
  obtenerSesion: obtenerSesion,
  destruirSesion: destruirSesion,
  leerCookie: leerCookie,
  armarSetCookie: armarSetCookie,
  armarCookieBorrado: armarCookieBorrado,
  SESSION_DURATION_MS: SESSION_DURATION_MS
};
