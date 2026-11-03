/* ==========================================================================
   NotApp CMS — Servidor de archivos estáticos
   Sirve archivos de una carpeta base de forma segura (sin salir de ella).
   ========================================================================== */

const fs = require("fs");
const path = require("path");

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon"
};

/**
 * Intenta servir un archivo estático dentro de `baseDir` correspondiente a `urlPath`.
 * Devuelve true si respondió algo (200 o 404 propio), false si no aplica.
 */
function servirEstatico(req, res, urlPath, baseDir, opciones) {
  opciones = opciones || {};
  // Normalizamos y evitamos ".." para no poder salir de la carpeta base
  let rel = decodeURIComponent(urlPath);
  rel = rel.split("?")[0];
  rel = path.normalize(rel).replace(/^(\.\.[/\\])+/, "");
  if (rel === "/" || rel === "") rel = opciones.indexFile || "/index.html";

  let filePath = path.join(baseDir, rel);

  // Seguridad: el resultado final debe seguir dentro de baseDir
  if (!filePath.startsWith(path.resolve(baseDir))) {
    res.writeHead(403);
    res.end("Prohibido");
    return true;
  }

  if (!fs.existsSync(filePath)) return false;

  let stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    filePath = path.join(filePath, opciones.indexFile ? path.basename(opciones.indexFile) : "index.html");
    if (!fs.existsSync(filePath)) return false;
    stat = fs.statSync(filePath);
  }

  const ext = path.extname(filePath).toLowerCase();
  const tipo = TIPOS[ext] || "application/octet-stream";

  res.writeHead(200, {
    "Content-Type": tipo,
    "Content-Length": stat.size,
    "Cache-Control": opciones.cache || "no-cache"
  });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

module.exports = { servirEstatico: servirEstatico, TIPOS: TIPOS };
