/* ==========================================================================
   NotApp CMS — Almacenamiento de imágenes
   • Con SUPABASE_URL y SUPABASE_SERVICE_KEY: sube a Supabase Storage (bucket público).
   • Sin ellas (uso local): guarda en la carpeta uploads/.
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
const MAX_BYTES = 3 * 1024 * 1024; // 3 MB por imagen (Vercel admite hasta 4,5 MB por solicitud)
const EXT = { "image/png": ".png", "image/jpeg": ".jpg", "image/jpg": ".jpg", "image/webp": ".webp", "image/gif": ".gif", "image/svg+xml": ".svg" };

function usaSupabase() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
}
function baseUrl() {
  // Solo se usa el dominio (https://xxxx.supabase.co): si pegaron la URL con /rest/v1 u otro tramo, se descarta.
  let u = String(process.env.SUPABASE_URL || "").trim();
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try { return new URL(u).origin; } catch (e) { return u.replace(/\/+$/, ""); }
}
function bucket() { return process.env.SUPABASE_BUCKET || "notapp"; }
function cabeceras(extra) {
  const key = process.env.SUPABASE_SERVICE_KEY;
  const h = Object.assign({ apikey: key }, extra || {});
  if (key.indexOf("eyJ") === 0) h.Authorization = "Bearer " + key; // llave en formato JWT
  return h;
}

let bucketListo = false;
async function asegurarBucket() {
  if (bucketListo) return;
  try {
    const r = await fetch(baseUrl() + "/storage/v1/bucket", {
      method: "POST",
      headers: cabeceras({ "Content-Type": "application/json" }),
      body: JSON.stringify({ id: bucket(), name: bucket(), public: true })
    });
    if (r.ok || r.status === 409 || r.status === 400) bucketListo = true; // 400/409: ya existe
  } catch (e) { /* si no se pudo crear, se intenta subir igual: el error real aparece al subir */ }
}

/** Guarda una imagen en base64 (dataURL) y devuelve su URL pública. */
async function guardarImagen(dataBase64, nombreSugerido) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataBase64 || "");
  if (!match) throw new Error("Formato de imagen inválido");
  const mime = match[1].toLowerCase();
  if (!EXT[mime]) throw new Error("Formato de imagen no admitido (usá JPG, PNG, WEBP o GIF).");
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > MAX_BYTES) throw new Error("La imagen supera los 3 MB. Probá con una más liviana.");

  const base = (nombreSugerido || "imagen").replace(/\.[a-zA-Z0-9]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase().slice(0, 40);
  const nombre = Date.now() + "-" + crypto.randomBytes(4).toString("hex") + "-" + base + EXT[mime];

  if (usaSupabase()) {
    await asegurarBucket();
    const r = await fetch(baseUrl() + "/storage/v1/object/" + bucket() + "/" + nombre, {
      method: "POST",
      headers: cabeceras({ "Content-Type": mime, "x-upsert": "false" }),
      body: buffer
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error("No se pudo subir la foto (" + r.status + "): " + t.slice(0, 160));
    }
    return baseUrl() + "/storage/v1/object/public/" + bucket() + "/" + nombre;
  }

  if (process.env.VERCEL) {
    throw new Error("Faltan SUPABASE_URL y SUPABASE_SERVICE_KEY: sin ellas no se pueden guardar fotos en Vercel.");
  }
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOADS_DIR, nombre), buffer);
  return "/uploads/" + nombre;
}

/** Borra imágenes que ya no se usan (si falla, no pasa nada). */
async function borrarImagenes(urls) {
  for (const u of urls || []) {
    try {
      if (usaSupabase()) {
        const prefijo = baseUrl() + "/storage/v1/object/public/" + bucket() + "/";
        if (typeof u === "string" && u.indexOf(prefijo) === 0) {
          await fetch(baseUrl() + "/storage/v1/object/" + bucket() + "/" + u.slice(prefijo.length), { method: "DELETE", headers: cabeceras() });
        }
      } else if (typeof u === "string" && u.indexOf("/uploads/") === 0) {
        const f = path.join(UPLOADS_DIR, path.basename(u));
        if (fs.existsSync(f)) fs.unlinkSync(f);
      }
    } catch (_) { /* best effort */ }
  }
}

module.exports = { guardarImagen: guardarImagen, borrarImagenes: borrarImagenes, UPLOADS_DIR: UPLOADS_DIR };
