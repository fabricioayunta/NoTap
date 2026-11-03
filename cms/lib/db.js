/* ==========================================================================
   NotApp CMS — Capa de datos (PostgreSQL / Supabase)
   Arma los mismos objetos JSON que usan el sitio y el panel, a partir de las
   tablas relacionales: producto, categoria, casillero, talle, color, stock…
   ========================================================================== */

const pg = require("./pg");
const auth = require("./auth");
const S = require("./stock");
const storage = require("./storage");

let listo = null;
function iniciar() {
  if (!listo) {
    listo = pg.asegurarEsquema().catch(function (e) { listo = null; throw e; });
  }
  return listo;
}

/* ---------------- Lectura de productos ---------------- */

async function cargarProductos(cliente, slug) {
  const q = cliente ? function (t, p) { return cliente.query(t, p); } : pg.query;
  const filtro = slug ? "WHERE p.slug = $1" : "";
  const params = slug ? [slug] : [];
  const base = await q(
    "SELECT p.id_producto, p.slug, p.nombre, p.descripcion_corta, p.descripcion, p.precio, p.disponible, p.destacado, " +
    "k.slug AS categoria_slug, c.codigo AS casillero, p.stock_minimo " +
    "FROM producto p JOIN categoria k ON k.id_categoria = p.id_categoria " +
    "LEFT JOIN casillero c ON c.id_casillero = p.id_casillero " + filtro + " ORDER BY p.id_producto", params);
  if (base.rowCount === 0) return [];
  const ids = base.rows.map(function (r) { return r.id_producto; });

  const [tal, col, img, stk] = await Promise.all([
    q("SELECT pt.id_producto, t.nombre FROM producto_talle pt JOIN talle t ON t.id_talle = pt.id_talle WHERE pt.id_producto = ANY($1) ORDER BY pt.id_producto, pt.orden", [ids]),
    q("SELECT pc.id_producto, k.nombre, k.codigo_hex FROM producto_color pc JOIN color k ON k.id_color = pc.id_color WHERE pc.id_producto = ANY($1) ORDER BY pc.id_producto, pc.orden", [ids]),
    q("SELECT id_producto, ruta, es_principal FROM imagen WHERE id_producto = ANY($1) ORDER BY id_producto, orden, id_imagen", [ids]),
    q("SELECT s.id_producto, t.nombre AS talle, k.nombre AS color, s.cantidad FROM stock s " +
      "LEFT JOIN talle t ON t.id_talle = s.id_talle LEFT JOIN color k ON k.id_color = s.id_color WHERE s.id_producto = ANY($1)", [ids])
  ]);

  const porId = {};
  base.rows.forEach(function (r) {
    porId[r.id_producto] = {
      id: r.slug,
      nombre: r.nombre,
      categoriaId: r.categoria_slug,
      precio: Number(r.precio),
      disponible: r.disponible,
      destacado: r.destacado,
      descripcionCorta: r.descripcion_corta || "",
      descripcion: r.descripcion || "",
      talles: [],
      colores: [],
      imagenPrincipal: null,
      galeria: [],
      casillero: r.casillero || "",
      stockMinimo: r.stock_minimo === null ? null : Number(r.stock_minimo)
    };
  });
  tal.rows.forEach(function (r) { porId[r.id_producto].talles.push(r.nombre); });
  col.rows.forEach(function (r) { porId[r.id_producto].colores.push({ nombre: r.nombre, hex: r.codigo_hex }); });
  img.rows.forEach(function (r) {
    const p = porId[r.id_producto];
    if (r.es_principal && !p.imagenPrincipal) p.imagenPrincipal = r.ruta; else p.galeria.push(r.ruta);
  });
  stk.rows.forEach(function (r) {
    const p = porId[r.id_producto];
    if (!p.stock) p.stock = [];
    p.stock.push({ talle: r.talle === null ? "Único" : r.talle, color: r.color === null ? "" : r.color, cantidad: r.cantidad });
  });
  return base.rows.map(function (r) {
    const p = porId[r.id_producto];
    S.reconciliarStock(p); // ordena las combinaciones como talles × colores
    return p;
  });
}

/* ---------------- Escritura de un producto completo ---------------- */

/** Guarda (crea o actualiza) un producto con sus talles, colores, fotos y stock. Usa la transacción `c`. */
async function escribirProducto(c, p, esNuevo) {
  const cat = await c.query("SELECT id_categoria FROM categoria WHERE slug = $1", [p.categoriaId]);
  if (cat.rowCount === 0) throw new Error("La categoría elegida no existe.");
  const idCategoria = cat.rows[0].id_categoria;

  let idCasillero = null;
  if (p.casillero) {
    const r = await c.query("INSERT INTO casillero (codigo) VALUES ($1) ON CONFLICT (codigo) DO UPDATE SET codigo = EXCLUDED.codigo RETURNING id_casillero", [p.casillero]);
    idCasillero = r.rows[0].id_casillero;
  }

  const valores = [p.id, p.nombre, p.descripcionCorta || "", p.descripcion || "", Number(p.precio) || 0, p.disponible !== false, !!p.destacado, idCategoria, idCasillero, p.stockMinimo];
  let idProducto;
  if (esNuevo) {
    const r = await c.query(
      "INSERT INTO producto (slug, nombre, descripcion_corta, descripcion, precio, disponible, destacado, id_categoria, id_casillero, stock_minimo) " +
      "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id_producto", valores);
    idProducto = r.rows[0].id_producto;
  } else {
    const r = await c.query(
      "UPDATE producto SET nombre=$2, descripcion_corta=$3, descripcion=$4, precio=$5, disponible=$6, destacado=$7, id_categoria=$8, id_casillero=$9, stock_minimo=$10 " +
      "WHERE slug=$1 RETURNING id_producto", valores);
    if (r.rowCount === 0) return null;
    idProducto = r.rows[0].id_producto;
  }

  // Talles
  await c.query("DELETE FROM producto_talle WHERE id_producto = $1", [idProducto]);
  const idTalle = {};
  const talles = Array.isArray(p.talles) ? p.talles : [];
  let orden = 0;
  for (const nombre of talles) {
    const n = String(nombre).trim();
    if (!n || idTalle[n] !== undefined) continue;
    const r = await c.query("INSERT INTO talle (nombre) VALUES ($1) ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id_talle", [n.slice(0, 20)]);
    idTalle[n] = r.rows[0].id_talle;
    await c.query("INSERT INTO producto_talle (id_producto, id_talle, orden) VALUES ($1,$2,$3)", [idProducto, idTalle[n], orden++]);
  }

  // Colores
  await c.query("DELETE FROM producto_color WHERE id_producto = $1", [idProducto]);
  const idColor = {};
  const colores = Array.isArray(p.colores) ? p.colores : [];
  orden = 0;
  for (const col of colores) {
    const n = String(col.nombre || "").trim();
    if (!n || idColor[n] !== undefined) continue;
    const hex = /^#[0-9a-fA-F]{6}$/.test(col.hex || "") ? col.hex.toLowerCase() : "#000000";
    const r = await c.query("INSERT INTO color (nombre, codigo_hex) VALUES ($1,$2) ON CONFLICT (nombre, codigo_hex) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id_color", [n.slice(0, 40), hex]);
    idColor[n] = r.rows[0].id_color;
    await c.query("INSERT INTO producto_color (id_producto, id_color, orden) VALUES ($1,$2,$3)", [idProducto, idColor[n], orden++]);
  }

  // Fotos
  await c.query("DELETE FROM imagen WHERE id_producto = $1", [idProducto]);
  if (p.imagenPrincipal) {
    await c.query("INSERT INTO imagen (id_producto, ruta, es_principal, orden) VALUES ($1,$2,TRUE,0)", [idProducto, p.imagenPrincipal]);
  }
  const galeria = Array.isArray(p.galeria) ? p.galeria.filter(Boolean) : [];
  for (let i = 0; i < galeria.length; i++) {
    await c.query("INSERT INTO imagen (id_producto, ruta, es_principal, orden) VALUES ($1,$2,FALSE,$3)", [idProducto, galeria[i], i + 1]);
  }

  // Stock (solo si el producto lo controla)
  await c.query("DELETE FROM stock WHERE id_producto = $1", [idProducto]);
  if (Array.isArray(p.stock)) {
    for (const v of p.stock) {
      const t = v.talle === "Único" && idTalle["Único"] === undefined ? null : idTalle[v.talle];
      const k = v.color === "" ? null : idColor[v.color];
      if (t === undefined || k === undefined) continue;
      await c.query("INSERT INTO stock (id_producto, id_talle, id_color, cantidad) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING", [idProducto, t, k, v.cantidad]);
    }
  }
  return idProducto;
}

/* ---------------- API de datos ---------------- */

async function getProductosPublicos() {
  await iniciar();
  return (await cargarProductos()).map(S.publicarProducto);
}

async function getProductosAdmin() {
  await iniciar();
  return cargarProductos();
}

async function getProductoPorId(id) {
  await iniciar();
  const r = await cargarProductos(null, id);
  return r.length ? S.publicarProducto(r[0]) : null;
}

async function getCategorias() {
  await iniciar();
  const r = await pg.query("SELECT slug, nombre FROM categoria ORDER BY orden, id_categoria");
  return r.rows.map(function (x) { return { id: x.slug, nombre: x.nombre }; });
}

async function leerConfigCruda() {
  const r = await pg.query("SELECT clave, valor FROM configuracion");
  const m = {};
  r.rows.forEach(function (x) { m[x.clave] = x.valor; });
  const n = Number(m.stock_bajo_general);
  return {
    nombreSitio: m.nombre_sitio || "NotApp",
    logoUrl: m.logo_ruta || null,
    whatsappNumero: m.whatsapp_numero || "1151760505",
    stockBajoGeneral: isFinite(n) ? n : S.STOCK_BAJO_DEFECTO
  };
}

async function getConfigAdmin() {
  await iniciar();
  return leerConfigCruda();
}

async function getConfig() {
  const c = await getConfigAdmin();
  return { nombreSitio: c.nombreSitio, logoUrl: c.logoUrl, whatsappNumero: c.whatsappNumero };
}

async function getAdmin() {
  await iniciar();
  const r = await pg.query("SELECT email, clave_hash, clave_sal FROM administrador ORDER BY id_admin LIMIT 1");
  if (r.rowCount === 0) return null;
  return { email: r.rows[0].email, hash: r.rows[0].clave_hash, salt: r.rows[0].clave_sal };
}

async function generarSlugUnico(nombre) {
  const base = S.slugify(nombre) || "producto";
  let slug = base;
  let i = 2;
  for (;;) {
    const r = await pg.query("SELECT 1 FROM producto WHERE slug = $1", [slug]);
    if (r.rowCount === 0) return slug;
    slug = base + "-" + i++;
  }
}

async function crearProducto(datos) {
  await iniciar();
  const slug = await generarSlugUnico(datos.nombre);
  const p = {
    id: slug,
    nombre: String(datos.nombre).trim().slice(0, 120),
    categoriaId: datos.categoriaId,
    precio: Number(datos.precio) || 0,
    disponible: datos.disponible !== false,
    destacado: !!datos.destacado,
    descripcionCorta: datos.descripcionCorta || "",
    descripcion: datos.descripcion || "",
    talles: Array.isArray(datos.talles) ? datos.talles : [],
    colores: Array.isArray(datos.colores) ? datos.colores : [],
    imagenPrincipal: datos.imagenPrincipal || null,
    galeria: Array.isArray(datos.galeria) ? datos.galeria : [],
    casillero: S.normalizarCasillero(datos.casillero),
    stockMinimo: S.normalizarMinimo(datos.stockMinimo)
  };
  const stock = S.normalizarStock(datos.stock);
  if (stock) { p.stock = stock; S.reconciliarStock(p); }
  await pg.tx(function (c) { return escribirProducto(c, p, true); });
  return (await cargarProductos(null, slug))[0];
}

async function actualizarProducto(id, datos) {
  await iniciar();
  const actual = (await cargarProductos(null, id))[0];
  if (!actual) return null;
  const fotosAntes = [actual.imagenPrincipal].concat(actual.galeria).filter(Boolean);
  const campos = ["nombre", "categoriaId", "precio", "disponible", "destacado", "descripcionCorta", "descripcion", "talles", "colores", "imagenPrincipal", "galeria"];
  campos.forEach(function (campo) {
    if (Object.prototype.hasOwnProperty.call(datos, campo)) {
      actual[campo] = campo === "precio" ? (Number(datos[campo]) || 0) : datos[campo];
    }
  });
  if (Object.prototype.hasOwnProperty.call(datos, "casillero")) actual.casillero = S.normalizarCasillero(datos.casillero);
  if (Object.prototype.hasOwnProperty.call(datos, "stockMinimo")) actual.stockMinimo = S.normalizarMinimo(datos.stockMinimo);
  if (Object.prototype.hasOwnProperty.call(datos, "stock")) {
    const stock = S.normalizarStock(datos.stock);
    if (stock) actual.stock = stock; else delete actual.stock;
  }
  S.reconciliarStock(actual);
  await pg.tx(function (c) { return escribirProducto(c, actual, false); });
  const fotosDespues = [actual.imagenPrincipal].concat(actual.galeria || []).filter(Boolean);
  storage.borrarImagenes(fotosAntes.filter(function (u) { return fotosDespues.indexOf(u) === -1; }));
  return (await cargarProductos(null, id))[0];
}

/** Cambia la cantidad de UNA combinación talle/color (vista Stock). */
async function actualizarStockVariante(id, talle, color, cantidad) {
  await iniciar();
  const n = Math.floor(Number(cantidad));
  if (!isFinite(n) || n < 0) throw new Error("La cantidad tiene que ser un número igual o mayor a 0.");
  const producto = (await cargarProductos(null, id))[0];
  if (!producto) return null;
  if (!Array.isArray(producto.stock)) {
    producto.stock = [];
    S.reconciliarStock(producto);
    await pg.tx(function (c) { return escribirProducto(c, producto, false); });
  }
  const v = producto.stock.find(function (x) { return x.talle === talle && x.color === (color || ""); });
  if (!v) throw new Error("Esa combinación de talle y color no existe en el producto.");
  await pg.query(
    "UPDATE stock SET cantidad = $3 WHERE id_producto = (SELECT id_producto FROM producto WHERE slug = $1) " +
    "AND id_talle IS NOT DISTINCT FROM (SELECT id_talle FROM talle WHERE nombre = $2::text) " +
    "AND id_color IS NOT DISTINCT FROM (SELECT k.id_color FROM color k JOIN producto_color pc ON pc.id_color = k.id_color " +
    "  WHERE pc.id_producto = (SELECT id_producto FROM producto WHERE slug = $1) AND k.nombre = $4::text LIMIT 1)",
    [id, talle === "Único" && producto.talles.length === 0 ? null : talle, n, color === "" ? null : color]);
  return (await cargarProductos(null, id))[0];
}

async function eliminarProducto(id) {
  await iniciar();
  const actual = (await cargarProductos(null, id))[0];
  if (!actual) return false;
  await pg.query("DELETE FROM producto WHERE slug = $1", [id]);
  storage.borrarImagenes([actual.imagenPrincipal].concat(actual.galeria).filter(Boolean));
  return true;
}

async function crearCategoria(nombre) {
  await iniciar();
  const nom = String(nombre).trim();
  const slug = S.slugify(nom);
  if (!slug) throw new Error("El nombre de la categoría no es válido.");
  const existe = await pg.query("SELECT 1 FROM categoria WHERE slug = $1 OR lower(nombre) = lower($2)", [slug, nom]);
  if (existe.rowCount > 0) throw new Error("Ya existe una categoría con ese nombre.");
  const r = await pg.query("INSERT INTO categoria (slug, nombre, orden) VALUES ($1,$2,(SELECT COALESCE(MAX(orden),0)+1 FROM categoria)) RETURNING slug, nombre", [slug, nom.slice(0, 60)]);
  return { id: r.rows[0].slug, nombre: r.rows[0].nombre };
}

async function actualizarCategoria(id, nombre) {
  await iniciar();
  const nom = String(nombre || "").trim();
  if (!nom) throw new Error("El nombre de la categoría no puede estar vacío.");
  const dup = await pg.query("SELECT 1 FROM categoria WHERE lower(nombre) = lower($1) AND slug <> $2", [nom, id]);
  if (dup.rowCount > 0) throw new Error("Ya existe una categoría con ese nombre.");
  const r = await pg.query("UPDATE categoria SET nombre = $2 WHERE slug = $1 RETURNING slug, nombre", [id, nom.slice(0, 60)]);
  return r.rowCount ? { id: r.rows[0].slug, nombre: r.rows[0].nombre } : null;
}

async function eliminarCategoria(id) {
  await iniciar();
  const enUso = await pg.query("SELECT 1 FROM producto p JOIN categoria k ON k.id_categoria = p.id_categoria WHERE k.slug = $1 LIMIT 1", [id]);
  if (enUso.rowCount > 0) throw new Error("No se puede eliminar: hay productos que usan esta categoría.");
  const r = await pg.query("DELETE FROM categoria WHERE slug = $1", [id]);
  return r.rowCount > 0;
}

async function guardarClave(c, clave, valor) {
  await c.query("INSERT INTO configuracion (clave, valor) VALUES ($1,$2) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor", [clave, valor]);
}

async function actualizarConfig(datos) {
  await iniciar();
  let umbral = null;
  if (datos.stockBajoGeneral !== undefined) {
    umbral = Math.floor(Number(datos.stockBajoGeneral));
    if (!isFinite(umbral) || umbral < 0) throw new Error("El stock bajo tiene que ser un número igual o mayor a 0.");
  }
  const logoAnterior = (datos.logoUrl !== undefined) ? (await leerConfigCruda()).logoUrl : null;
  await pg.tx(async function (c) {
    if (typeof datos.nombreSitio === "string") await guardarClave(c, "nombre_sitio", datos.nombreSitio.trim().slice(0, 80) || "NotApp");
    if (typeof datos.whatsappNumero === "string") await guardarClave(c, "whatsapp_numero", datos.whatsappNumero.trim().slice(0, 20));
    if (typeof datos.logoUrl === "string") await guardarClave(c, "logo_ruta", datos.logoUrl);
    if (datos.logoUrl === null) await c.query("DELETE FROM configuracion WHERE clave = 'logo_ruta'");
    if (umbral !== null) await guardarClave(c, "stock_bajo_general", String(umbral));
  });
  if (datos.logoUrl !== undefined && logoAnterior && logoAnterior !== datos.logoUrl) storage.borrarImagenes([logoAnterior]);
  return leerConfigCruda();
}

async function cambiarPassword(passwordActual, passwordNueva) {
  await iniciar();
  const admin = await getAdmin();
  if (!auth.verificarPassword(passwordActual, admin.salt, admin.hash)) {
    throw new Error("La contraseña actual no es correcta.");
  }
  if (String(passwordNueva || "").length < 8) throw new Error("La contraseña nueva tiene que tener al menos 8 caracteres.");
  const cred = auth.crearCredencial(passwordNueva);
  await pg.query("UPDATE administrador SET clave_hash = $1, clave_sal = $2 WHERE email = $3", [cred.hash, cred.salt, admin.email]);
  return true;
}

module.exports = {
  getProductosPublicos: getProductosPublicos,
  getProductosAdmin: getProductosAdmin,
  getProductoPorId: getProductoPorId,
  getCategorias: getCategorias,
  getConfig: getConfig,
  getConfigAdmin: getConfigAdmin,
  getAdmin: getAdmin,
  crearProducto: crearProducto,
  actualizarProducto: actualizarProducto,
  actualizarStockVariante: actualizarStockVariante,
  eliminarProducto: eliminarProducto,
  crearCategoria: crearCategoria,
  actualizarCategoria: actualizarCategoria,
  eliminarCategoria: eliminarCategoria,
  actualizarConfig: actualizarConfig,
  cambiarPassword: cambiarPassword,
  _escribirProducto: escribirProducto
};
