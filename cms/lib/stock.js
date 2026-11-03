/* ==========================================================================
   NotApp CMS — Reglas de stock y utilidades de productos (sin base de datos)
   ========================================================================== */

const STOCK_BAJO_DEFECTO = 3;

function listaTalles(p) {
  return Array.isArray(p.talles) && p.talles.length ? p.talles : ["Único"];
}
function listaColores(p) {
  return Array.isArray(p.colores) && p.colores.length ? p.colores.map(function (c) { return c.nombre; }) : [""];
}

/** Deja en `stock` solo las combinaciones talle × color que existen hoy en el producto. */
function reconciliarStock(p) {
  if (!Array.isArray(p.stock)) return;
  const talles = listaTalles(p);
  const colores = listaColores(p);
  const resultado = [];
  talles.forEach(function (t) {
    colores.forEach(function (c) {
      const previo = p.stock.find(function (v) { return v.talle === t && v.color === c; });
      resultado.push({ talle: t, color: c, cantidad: previo ? previo.cantidad : 0 });
    });
  });
  p.stock = resultado;
}

function normalizarStock(entrada) {
  if (!Array.isArray(entrada) || entrada.length === 0) return undefined;
  return entrada.map(function (v) {
    const n = Math.floor(Number(v.cantidad));
    return {
      talle: String(v.talle == null ? "" : v.talle),
      color: String(v.color == null ? "" : v.color),
      cantidad: isFinite(n) && n > 0 ? n : 0
    };
  });
}

function normalizarMinimo(valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = Math.floor(Number(valor));
  return isFinite(n) && n >= 0 ? n : null;
}

function normalizarCasillero(valor) {
  return String(valor == null ? "" : valor).trim().toUpperCase().slice(0, 12);
}

/** Vista pública de un producto: sin casillero, sin cantidades. Marca sin stock y variantes agotadas. */
function publicarProducto(p) {
  const copia = {};
  Object.keys(p).forEach(function (k) {
    if (k !== "casillero" && k !== "stock" && k !== "stockMinimo") copia[k] = p[k];
  });
  if (Array.isArray(p.stock) && p.stock.length) {
    const total = p.stock.reduce(function (a, v) { return a + v.cantidad; }, 0);
    if (total === 0) copia.disponible = false;
    copia.variantesAgotadas = p.stock
      .filter(function (v) { return v.cantidad === 0; })
      .map(function (v) { return { talle: v.talle, color: v.color }; });
  } else {
    copia.variantesAgotadas = [];
  }
  return copia;
}

function slugify(texto) {
  return texto
    .toString()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

module.exports = {
  STOCK_BAJO_DEFECTO: STOCK_BAJO_DEFECTO,
  listaTalles: listaTalles,
  listaColores: listaColores,
  reconciliarStock: reconciliarStock,
  normalizarStock: normalizarStock,
  normalizarMinimo: normalizarMinimo,
  normalizarCasillero: normalizarCasillero,
  publicarProducto: publicarProducto,
  slugify: slugify
};
