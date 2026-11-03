/* ==========================================================================
   NotApp — Cliente de la API pública
   Todo el sitio público lee los datos desde el servidor (/api/...), así que
   cualquier cambio hecho desde /paneladmin aparece acá sin tocar código.
   ========================================================================== */

let _cacheConfig = null;
let _cacheCategorias = null;
let _cacheProductos = null;

async function obtenerConfig() {
  if (_cacheConfig) return _cacheConfig;
  const res = await fetch("/api/config");
  const data = await res.json();
  _cacheConfig = data.config;
  return _cacheConfig;
}

async function obtenerCategorias() {
  if (_cacheCategorias) return _cacheCategorias;
  const res = await fetch("/api/categorias");
  const data = await res.json();
  _cacheCategorias = data.categorias;
  return _cacheCategorias;
}

async function obtenerProductos() {
  if (_cacheProductos) return _cacheProductos;
  const res = await fetch("/api/productos");
  const data = await res.json();
  _cacheProductos = data.productos;
  return _cacheProductos;
}

async function obtenerProductoPorId(id) {
  const res = await fetch("/api/productos/" + encodeURIComponent(id));
  if (!res.ok) return null;
  const data = await res.json();
  return data.producto;
}

/* ---------------- Helpers de presentación ---------------- */

function formatearPrecio(numero) {
  return "$" + Number(numero).toLocaleString("es-AR");
}

function obtenerNombreCategoria(categorias, catId) {
  const cat = categorias.find(function (c) { return c.id === catId; });
  return cat ? cat.nombre : catId;
}

function obtenerProductosPorCategoria(productos, catId) {
  if (!catId || catId === "todos") return productos.slice();
  return productos.filter(function (p) { return p.categoriaId === catId; });
}

/* ---------------- WhatsApp ---------------- */

async function construirLinkWhatsApp(mensaje) {
  const config = await obtenerConfig();
  const intl = "549" + config.whatsappNumero;
  return "https://wa.me/" + intl + "?text=" + encodeURIComponent(mensaje);
}

function mensajeConsultaProducto(producto, talle, colorNombre, cantidad) {
  const lineas = [
    "Hola! Quería consultar por este producto:",
    "",
    "Producto: " + producto.nombre,
    "Precio: " + formatearPrecio(producto.precio)
  ];
  if (talle) lineas.push("Talle: " + talle);
  if (colorNombre) lineas.push("Color: " + colorNombre);
  lineas.push("Cantidad: " + cantidad);
  lineas.push("");
  lineas.push("¿Está disponible?");
  return lineas.join("\n");
}

function mensajeContactoGeneral() {
  return "Hola! Te escribo desde la página de NotApp, quería hacer una consulta.";
}

/* Ícono SVG (línea) según categoría — se usa como imagen del producto
   cuando todavía no se cargó ninguna foto desde el panel. */
const ICONOS_CATEGORIA = {
  kimonos:
    '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M35 18 L50 28 L65 18 L78 30 L68 42 L68 85 L32 85 L32 42 L22 30 Z"/><path d="M50 28 L50 50"/><path d="M38 40 L32 85 M62 40 L68 85"/></svg>',
  rashguards:
    '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M38 15 L28 26 L18 22 L14 38 L26 44 L26 88 L74 88 L74 44 L86 38 L82 22 L72 26 L62 15 Z"/><path d="M38 15 Q50 26 62 15"/></svg>',
  cinturones:
    '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 50 H36"/><path d="M64 50 H96"/><rect x="36" y="36" width="28" height="28" rx="3"/><path d="M46 36 V64 M54 36 V64"/></svg>',
  shorts:
    '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20 H80 L84 55 L64 55 L58 88 L46 88 L44 55 L40 88 L28 88 L22 55 L16 55 Z"/><path d="M20 20 L16 55 M80 20 L84 55"/></svg>',
  accesorios:
    '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="50" cy="50" r="34"/><path d="M50 32 V50 L62 62"/></svg>',
  _default:
    '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="20" y="20" width="60" height="60" rx="6"/></svg>'
};

const FONDO_CATEGORIA = {
  kimonos: "#1c2a2e",
  rashguards: "#2a1c1f",
  cinturones: "#2a2416",
  shorts: "#1a2333",
  accesorios: "#22201c",
  _default: "#1c2226"
};

function iconoDeCategoria(catId) {
  return ICONOS_CATEGORIA[catId] || ICONOS_CATEGORIA._default;
}
function fondoDeCategoria(catId) {
  return FONDO_CATEGORIA[catId] || FONDO_CATEGORIA._default;
}

/** Visual del producto: la foto principal si existe, o el ícono de categoría como respaldo. */
function visualProducto(producto) {
  if (producto.imagenPrincipal) {
    return '<img src="' + producto.imagenPrincipal + '" alt="' + producto.nombre + '" loading="lazy">';
  }
  return iconoDeCategoria(producto.categoriaId);
}

/* Genera el HTML de una card de producto (usado en home, catálogo y relacionados) */
function renderProductCard(producto, categorias) {
  const sinStock = producto.disponible === false;
  return (
    '<article class="product-card' + (sinStock ? " product-card-sin-stock" : "") + '">' +
      '<a href="producto.html?producto=' + producto.id + '" class="product-card-visual" style="background:' + fondoDeCategoria(producto.categoriaId) + '">' +
        visualProducto(producto) +
        (sinStock ? '<span class="badge-sin-stock">Sin stock</span>' : "") +
      "</a>" +
      '<div class="product-card-body">' +
        '<span class="product-category">' + obtenerNombreCategoria(categorias, producto.categoriaId) + "</span>" +
        "<h3><a href=\"producto.html?producto=" + producto.id + "\">" + producto.nombre + "</a></h3>" +
        '<p class="product-price">' + formatearPrecio(producto.precio) + "</p>" +
        '<a href="producto.html?producto=' + producto.id + '" class="btn btn-outline btn-block">Ver producto</a>' +
      "</div>" +
    "</article>"
  );
}

/* ---------------- Logo / marca (compartido por todas las páginas) ---------------- */

async function aplicarMarcaSitio() {
  try {
    const config = await obtenerConfig();
    const brands = document.querySelectorAll(".brand");
    brands.forEach(function (el) {
      if (config.logoUrl) {
        el.innerHTML = '<img src="' + config.logoUrl + '" alt="' + (config.nombreSitio || "NotApp") + '">';
      }
      // Si no hay logo subido, se deja el texto que ya trae el HTML.
    });
    document.querySelectorAll("[data-whatsapp-numero-visible]").forEach(function (el) {
      const n = config.whatsappNumero || "";
      el.textContent = n.length === 10 ? n.slice(0, 2) + " " + n.slice(2, 6) + "-" + n.slice(6) : n;
    });
  } catch (e) {
    // Si la API no responde, el sitio sigue funcionando con el texto por defecto.
    console.error("No se pudo cargar la configuración del sitio", e);
  }

  try {
    const navDropdown = document.getElementById("navDropdown");
    if (navDropdown) {
      const categorias = await obtenerCategorias();
      navDropdown.insertAdjacentHTML(
        "beforeend",
        categorias.map(function (cat) {
          return '<li><a href="catalogo.html?categoria=' + cat.id + '">' + cat.nombre + "</a></li>";
        }).join("")
      );
    }
  } catch (e) {
    console.error("No se pudieron cargar las categorías del menú", e);
  }
}

document.addEventListener("DOMContentLoaded", aplicarMarcaSitio);
