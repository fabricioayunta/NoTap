/* ==========================================================================
   NotApp CMS — API (la usan server.js en local y api/index.js en Vercel)
   ========================================================================== */

const db = require("./db");
const auth = require("./auth");
const storage = require("./storage");

/* ---------------- Helpers de request/response ---------------- */

function enviarJSON(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function esHttps(req) {
  return (req.headers["x-forwarded-proto"] || "").split(",")[0].trim() === "https";
}

/** Lee el cuerpo JSON. En Vercel el cuerpo ya viene leído en req.body. */
function leerBodyJSON(req, limiteBytes) {
  limiteBytes = limiteBytes || 4 * 1024 * 1024; // 4 MB (Vercel admite hasta 4,5 MB por solicitud)
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "string") {
      try { return Promise.resolve(req.body ? JSON.parse(req.body) : {}); } catch (e) { return Promise.reject(new Error("JSON inválido")); }
    }
    if (Buffer.isBuffer(req.body)) {
      try { return Promise.resolve(req.body.length ? JSON.parse(req.body.toString("utf8")) : {}); } catch (e) { return Promise.reject(new Error("JSON inválido")); }
    }
    return Promise.resolve(req.body);
  }
  return new Promise(function (resolve, reject) {
    let total = 0;
    const partes = [];
    req.on("data", function (chunk) {
      total += chunk.length;
      if (total > limiteBytes) {
        reject(new Error("Cuerpo de la solicitud demasiado grande"));
        req.destroy();
        return;
      }
      partes.push(chunk);
    });
    req.on("end", function () {
      if (partes.length === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(partes).toString("utf8")));
      } catch (e) {
        reject(new Error("JSON inválido"));
      }
    });
    req.on("error", reject);
  });
}

/** Obtiene la sesión activa (o null) a partir de la cookie del request. */
function obtenerSesionRequest(req) {
  return auth.obtenerSesion(auth.leerCookie(req, auth.SESSION_COOKIE));
}

/* ---------------- Rutas de la API ---------------- */

async function procesar(req, res, url) {
  const partes = url.pathname.split("/").filter(Boolean); // ["api", ...]
  const metodo = req.method;

  /* ---- Rutas públicas (sin login) ---- */

  if (metodo === "GET" && url.pathname === "/api/productos") {
    return enviarJSON(res, 200, { productos: await db.getProductosPublicos() });
  }

  if (metodo === "GET" && partes[0] === "api" && partes[1] === "productos" && partes[2]) {
    const producto = await db.getProductoPorId(decodeURIComponent(partes[2]));
    if (!producto) return enviarJSON(res, 404, { error: "Producto no encontrado" });
    return enviarJSON(res, 200, { producto: producto });
  }

  if (metodo === "GET" && url.pathname === "/api/categorias") {
    return enviarJSON(res, 200, { categorias: await db.getCategorias() });
  }

  if (metodo === "GET" && url.pathname === "/api/config") {
    return enviarJSON(res, 200, { config: await db.getConfig() });
  }

  if (metodo === "POST" && url.pathname === "/api/admin/login") {
    let body;
    try { body = await leerBodyJSON(req); } catch (e) { return enviarJSON(res, 400, { error: e.message }); }
    const admin = await db.getAdmin();
    if (!admin) return enviarJSON(res, 500, { error: "No hay administrador configurado" });
    const emailOk = (body.email || "").trim().toLowerCase() === admin.email.toLowerCase();
    const passOk = emailOk && auth.verificarPassword(body.password || "", admin.salt, admin.hash);
    if (!emailOk || !passOk) {
      return enviarJSON(res, 401, { error: "Email o contraseña incorrectos" });
    }
    const sid = auth.crearSesion(admin.email);
    res.setHeader("Set-Cookie", auth.armarSetCookie(sid, auth.SESSION_DURATION_MS / 1000, esHttps(req)));
    return enviarJSON(res, 200, { ok: true, email: admin.email });
  }

  if (metodo === "POST" && url.pathname === "/api/admin/logout") {
    res.setHeader("Set-Cookie", auth.armarCookieBorrado());
    return enviarJSON(res, 200, { ok: true });
  }

  if (metodo === "GET" && url.pathname === "/api/admin/session") {
    const sesion = obtenerSesionRequest(req);
    return enviarJSON(res, 200, { authenticated: !!sesion, email: sesion ? sesion.email : null });
  }

  /* ---- A partir de acá, todo requiere sesión activa ---- */

  if (partes[0] === "api" && partes[1] === "admin") {
    const sesion = obtenerSesionRequest(req);
    if (!sesion) {
      return enviarJSON(res, 401, { error: "No autenticado" });
    }

    // Lecturas completas (con casillero y stock)
    if (metodo === "GET" && url.pathname === "/api/admin/productos") {
      return enviarJSON(res, 200, { productos: await db.getProductosAdmin() });
    }
    if (metodo === "GET" && url.pathname === "/api/admin/config") {
      return enviarJSON(res, 200, { config: await db.getConfigAdmin() });
    }

    // Stock de una combinación talle/color
    if (metodo === "PUT" && url.pathname === "/api/admin/stock") {
      let body;
      try { body = await leerBodyJSON(req); } catch (e) { return enviarJSON(res, 400, { error: e.message }); }
      try {
        const producto = await db.actualizarStockVariante(String(body.productoId || ""), String(body.talle || ""), String(body.color || ""), body.cantidad);
        if (!producto) return enviarJSON(res, 404, { error: "Producto no encontrado" });
        return enviarJSON(res, 200, { producto: producto });
      } catch (e) { return enviarJSON(res, 400, { error: e.message }); }
    }

    // Productos
    if (metodo === "POST" && url.pathname === "/api/admin/productos") {
      let body;
      try { body = await leerBodyJSON(req); } catch (e) { return enviarJSON(res, 400, { error: e.message }); }
      if (!body.nombre || !body.categoriaId) return enviarJSON(res, 400, { error: "Falta nombre o categoría" });
      try {
        const producto = await db.crearProducto(body);
        return enviarJSON(res, 201, { producto: producto });
      } catch (e) { return enviarJSON(res, 400, { error: e.message }); }
    }

    if (metodo === "PUT" && partes[2] === "productos" && partes[3]) {
      let body;
      try { body = await leerBodyJSON(req); } catch (e) { return enviarJSON(res, 400, { error: e.message }); }
      try {
        const producto = await db.actualizarProducto(decodeURIComponent(partes[3]), body);
        if (!producto) return enviarJSON(res, 404, { error: "Producto no encontrado" });
        return enviarJSON(res, 200, { producto: producto });
      } catch (e) { return enviarJSON(res, 400, { error: e.message }); }
    }

    if (metodo === "DELETE" && partes[2] === "productos" && partes[3]) {
      const ok = await db.eliminarProducto(decodeURIComponent(partes[3]));
      if (!ok) return enviarJSON(res, 404, { error: "Producto no encontrado" });
      return enviarJSON(res, 200, { ok: true });
    }

    // Categorías
    if (metodo === "POST" && url.pathname === "/api/admin/categorias") {
      let body;
      try { body = await leerBodyJSON(req); } catch (e) { return enviarJSON(res, 400, { error: e.message }); }
      if (!body.nombre) return enviarJSON(res, 400, { error: "Falta el nombre" });
      try {
        const categoria = await db.crearCategoria(body.nombre);
        return enviarJSON(res, 201, { categoria: categoria });
      } catch (e) {
        return enviarJSON(res, 409, { error: e.message });
      }
    }

    if (metodo === "PUT" && partes[2] === "categorias" && partes[3]) {
      let body;
      try { body = await leerBodyJSON(req); } catch (e) { return enviarJSON(res, 400, { error: e.message }); }
      try {
        const categoria = await db.actualizarCategoria(decodeURIComponent(partes[3]), body.nombre);
        if (!categoria) return enviarJSON(res, 404, { error: "Categoría no encontrada" });
        return enviarJSON(res, 200, { categoria: categoria });
      } catch (e) { return enviarJSON(res, 409, { error: e.message }); }
    }

    if (metodo === "DELETE" && partes[2] === "categorias" && partes[3]) {
      try {
        const ok = await db.eliminarCategoria(decodeURIComponent(partes[3]));
        if (!ok) return enviarJSON(res, 404, { error: "Categoría no encontrada" });
        return enviarJSON(res, 200, { ok: true });
      } catch (e) {
        return enviarJSON(res, 409, { error: e.message });
      }
    }

    // Configuración del sitio
    if (metodo === "PUT" && url.pathname === "/api/admin/config") {
      let body;
      try { body = await leerBodyJSON(req); } catch (e) { return enviarJSON(res, 400, { error: e.message }); }
      let config;
      try { config = await db.actualizarConfig(body); } catch (e) { return enviarJSON(res, 400, { error: e.message }); }
      return enviarJSON(res, 200, { config: config });
    }

    // Personalización del sitio (colores, fuentes, textos, imágenes, secciones)
    if (metodo === "PUT" && url.pathname === "/api/admin/personalizacion") {
      let body;
      try { body = await leerBodyJSON(req, 512 * 1024); } catch (e) { return enviarJSON(res, 400, { error: e.message }); }
      const personalizacion = await db.guardarPersonalizacion(body);
      return enviarJSON(res, 200, { personalizacion: personalizacion });
    }

    // Subida de imagen de producto (galería o principal)
    if (metodo === "POST" && url.pathname === "/api/admin/upload") {
      let body;
      try { body = await leerBodyJSON(req, 4 * 1024 * 1024); } catch (e) { return enviarJSON(res, 400, { error: e.message }); }
      try {
        const url2 = await storage.guardarImagen(body.dataBase64, body.nombre);
        return enviarJSON(res, 201, { url: url2 });
      } catch (e) {
        return enviarJSON(res, 400, { error: e.message });
      }
    }

    // Logo del sitio
    if (metodo === "POST" && url.pathname === "/api/admin/logo") {
      let body;
      try { body = await leerBodyJSON(req, 4 * 1024 * 1024); } catch (e) { return enviarJSON(res, 400, { error: e.message }); }
      try {
        const url2 = await storage.guardarImagen(body.dataBase64, "logo");
        const config = await db.actualizarConfig({ logoUrl: url2 });
        return enviarJSON(res, 200, { config: config });
      } catch (e) {
        return enviarJSON(res, 400, { error: e.message });
      }
    }

    if (metodo === "DELETE" && url.pathname === "/api/admin/logo") {
      let config;
      try { config = await db.actualizarConfig({ logoUrl: null }); } catch (e) { return enviarJSON(res, 400, { error: e.message }); }
      return enviarJSON(res, 200, { config: config });
    }

    // Cambio de contraseña
    if (metodo === "POST" && url.pathname === "/api/admin/password") {
      let body;
      try { body = await leerBodyJSON(req); } catch (e) { return enviarJSON(res, 400, { error: e.message }); }
      try {
        await db.cambiarPassword(body.actual || "", body.nueva || "");
        return enviarJSON(res, 200, { ok: true });
      } catch (e) {
        return enviarJSON(res, 400, { error: e.message });
      }
    }

    return enviarJSON(res, 404, { error: "Ruta de administración no encontrada" });
  }

  return enviarJSON(res, 404, { error: "Ruta no encontrada" });
}


/** Punto de entrada: atrapa errores para no dejar la solicitud colgada. */
async function manejarAPI(req, res, url) {
  try {
    return await procesar(req, res, url);
  } catch (err) {
    console.error(err);
    const msg = err && err.message && /^Falta /.test(err.message)
      ? err.message
      : "No se pudo completar la operación. Revisá la conexión con la base de datos.";
    if (!res.headersSent) {
      const cuerpo = { error: msg };
      // Solo si se activa NOTAPP_DEBUG=1 en Vercel: muestra el motivo real (para diagnosticar la conexión).
      if (process.env.NOTAPP_DEBUG === "1") cuerpo.detalle = (err && err.code ? err.code + ": " : "") + (err && err.message ? err.message : String(err));
      return enviarJSON(res, 500, cuerpo);
    }
    res.end();
  }
}

module.exports = { manejarAPI: manejarAPI };
