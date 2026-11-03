/* ==========================================================================
   NotApp CMS — Servidor local
   Sirve el sitio y la API en tu computadora: npm install && npm start
   (En Vercel no se usa este archivo: ahí corre api/[...path].js)
   ========================================================================== */

const http = require("http");
const fs = require("fs");
const path = require("path");

// Lee el archivo .env (si existe) sin necesitar ninguna librería.
(function cargarEnv() {
  const archivo = path.join(__dirname, ".env");
  if (!fs.existsSync(archivo)) return;
  fs.readFileSync(archivo, "utf8").split(/\r?\n/).forEach(function (linea) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(linea);
    if (!m || /^\s*#/.test(linea)) return;
    let v = m[2];
    if ((v[0] === '"' && v[v.length - 1] === '"') || (v[0] === "'" && v[v.length - 1] === "'")) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  });
})();

const { manejarAPI } = require("./lib/api");
const estatico = require("./lib/static");
const storage = require("./lib/storage");

const PUERTO = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

const server = http.createServer(async function (req, res) {
  try {
    const url = new URL(req.url, "http://localhost");

    if (url.pathname.startsWith("/api/")) {
      return await manejarAPI(req, res, url);
    }

    // Fotos guardadas en local (cuando no se usa Supabase Storage)
    if (url.pathname.startsWith("/uploads/")) {
      const relativo = url.pathname.replace("/uploads", "");
      if (estatico.servirEstatico(req, res, relativo, storage.UPLOADS_DIR, { cache: "public, max-age=31536000" })) return;
      res.writeHead(404); res.end("No encontrado");
      return;
    }

    if (url.pathname === "/paneladmin") {
      res.writeHead(301, { Location: "/paneladmin/" + url.search });
      res.end();
      return;
    }

    if (estatico.servirEstatico(req, res, url.pathname, PUBLIC_DIR, { indexFile: "/index.html" })) return;

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Página no encontrada");
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Error interno del servidor" }));
  }
});

server.listen(PUERTO, function () {
  console.log("NotApp corriendo en http://localhost:" + PUERTO);
  console.log("Panel de administración en http://localhost:" + PUERTO + "/paneladmin");
  if (!process.env.DATABASE_URL) {
    console.log("");
    console.log("AVISO: falta DATABASE_URL. Copiá .env.example a .env y completalo (ver GUIA_SUPABASE_VERCEL.md).");
  }
});
