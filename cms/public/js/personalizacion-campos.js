/* ==========================================================================
   NotApp — Catálogo de lo que se puede personalizar
   Lo usan el sitio público (para aplicar los cambios) y el panel (para armar el editor).
   Cada campo de texto: k = clave, e = etiqueta, t = tipo, d = texto original, s = selector (opcional;
   si no hay, se busca el elemento con data-c="clave" en el HTML).
   ========================================================================== */

var NOTAPP_PERS_DEFECTO = {
  colores: { acento: "#c69a3e", oscuro: "#12181b", claro: "#f1f2ee", texto: "#1c2529", alerta: "#9c3229" },
  fuentes: { titulos: "Oswald", textos: "Inter" },
  estilo: { radio: 6, logoAlto: 60, heroModo: "fondo", heroOscurecer: 55 }
};

var NOTAPP_PALETAS = [
  { n: "Clásico dorado", c: { acento: "#c69a3e", oscuro: "#12181b", claro: "#f1f2ee", texto: "#1c2529", alerta: "#9c3229" } },
  { n: "Azul competición", c: { acento: "#3b82f6", oscuro: "#0f172a", claro: "#f1f5f9", texto: "#0f172a", alerta: "#dc2626" } },
  { n: "Rojo guerrero", c: { acento: "#e11d48", oscuro: "#1a1011", claro: "#f6f1f1", texto: "#241a1b", alerta: "#b91c1c" } },
  { n: "Verde bosque", c: { acento: "#2f9e6b", oscuro: "#0f1f1a", claro: "#f0f4f1", texto: "#17231e", alerta: "#b3392f" } },
  { n: "Violeta", c: { acento: "#8b5cf6", oscuro: "#17122b", claro: "#f4f2fa", texto: "#1f1a35", alerta: "#be123c" } },
  { n: "Naranja", c: { acento: "#f97316", oscuro: "#1c1410", claro: "#f8f3ee", texto: "#2a1f18", alerta: "#b91c1c" } },
  { n: "Blanco y negro", c: { acento: "#111111", oscuro: "#111111", claro: "#ffffff", texto: "#111111", alerta: "#b91c1c" } }
];

var NOTAPP_FUENTES_TITULOS = ["Oswald", "Bebas Neue", "Anton", "Barlow Condensed", "Roboto Condensed", "Montserrat", "Poppins", "Playfair Display", "Raleway", "Archivo Black"];
var NOTAPP_FUENTES_TEXTOS = ["Inter", "Roboto", "Open Sans", "Lato", "Poppins", "Nunito", "Montserrat", "Source Sans 3", "Merriweather", "Work Sans"];

var NOTAPP_SECCIONES = [
  { k: "valores", e: "Inicio: “Por qué comprar acá”" },
  { k: "categorias", e: "Inicio: Categorías" },
  { k: "destacados", e: "Inicio: Productos destacados" },
  { k: "cta", e: "Inicio: Franja de WhatsApp" },
  { k: "faq", e: "Preguntas frecuentes (Inicio y Contacto)" },
  { k: "galeria", e: "Galería de fotos (Inicio y Nosotros)" }
];

var NOTAPP_REDES = [
  { k: "instagram", e: "Instagram", ph: "https://instagram.com/tu_usuario" },
  { k: "facebook", e: "Facebook", ph: "https://facebook.com/tu_pagina" },
  { k: "tiktok", e: "TikTok", ph: "https://tiktok.com/@tu_usuario" },
  { k: "youtube", e: "YouTube", ph: "https://youtube.com/@tu_canal" },
  { k: "x", e: "X (Twitter)", ph: "https://x.com/tu_usuario" },
  { k: "web", e: "Otro enlace", ph: "https://..." }
];

/* Imágenes que se pueden cambiar */
var NOTAPP_IMAGENES = [
  { k: "hero_imagen", e: "Foto de la portada (Inicio)", ayuda: "Se ve en el bloque principal del Inicio. Mejor horizontal y de buena calidad." },
  { k: "nosotros_imagen", e: "Foto de “Nuestra historia” (Nosotros)", ayuda: "Reemplaza el dibujo del kimono en la página Nosotros." },
  { k: "favicon", e: "Ícono de la pestaña del navegador", ayuda: "Imagen cuadrada y chica (PNG o ICO)." }
];

/* Textos editables, agrupados por página */
var NOTAPP_CAMPOS = [
  { grupo: "Menú y pie de página (todas las páginas)", campos: [
    { k: "nav_inicio", e: "Menú: Inicio", t: "texto", d: "Inicio", s: ".main-nav > ul > li:nth-child(1) > a" },
    { k: "nav_productos", e: "Menú: Productos", t: "texto", d: "Productos", s: ".main-nav .dropdown-toggle" },
    { k: "nav_nosotros", e: "Menú: Nosotros", t: "texto", d: "Nosotros", s: ".main-nav > ul > li:nth-child(3) > a" },
    { k: "nav_contacto", e: "Menú: Contacto", t: "texto", d: "Contacto", s: ".main-nav > ul > li:nth-child(4) > a" },
    { k: "buscador_ph", e: "Buscador: texto de ayuda", t: "texto", d: "Buscar productos…" },
    { k: "footer_about", e: "Pie: descripción", t: "parrafo", d: "Catálogo online de equipamiento para Jiu-Jitsu. Consultá disponibilidad y coordiná tu compra directo con el vendedor por WhatsApp.", s: ".footer-about" },
    { k: "footer_atencion", e: "Pie: horario de atención", t: "texto", d: "Lunes a sábado, consultas por WhatsApp" },
    { k: "footer_lema", e: "Pie: frase junto al nombre", t: "texto", d: "Catálogo online de Jiu-Jitsu" },
    { k: "footer_legal", e: "Pie: aviso legal", t: "parrafo", d: "Este sitio no realiza ventas ni pagos online. La compra se coordina por WhatsApp.", s: ".footer-bottom-inner > span:last-child" }
  ]},
  { grupo: "Inicio", campos: [
    { k: "hero_eyebrow", e: "Portada: frase chica de arriba", t: "texto", d: "Catálogo online" },
    { k: "hero_titulo", e: "Portada: título principal", t: "titulo", d: "Equipamiento de Jiu-Jitsu para *entrenar en serio*", ayuda: "Lo que pongas entre asteriscos *así* se resalta con el color de acento." },
    { k: "hero_bajada", e: "Portada: texto de bajada", t: "parrafo", d: "Kimonos, rashguards, cinturones y accesorios pensados para el tatami. Elegí tu producto, seleccioná las opciones y consultá directo por WhatsApp con el vendedor." },
    { k: "hero_btn1", e: "Portada: botón principal", t: "texto", d: "Ver catálogo" },
    { k: "hero_btn2", e: "Portada: botón secundario", t: "texto", d: "Contactar al vendedor" },
    { k: "valores_titulo", e: "“Por qué comprar acá”: título", t: "texto", d: "Por qué comprar acá" },
    { k: "valor1_t", e: "Ventaja 1: título", t: "texto", d: "Consulta directa" },
    { k: "valor1_d", e: "Ventaja 1: texto", t: "parrafo", d: "Elegís el producto y hablás directo con el vendedor por WhatsApp, sin intermediarios." },
    { k: "valor2_t", e: "Ventaja 2: título", t: "texto", d: "Talles y colores reales" },
    { k: "valor2_d", e: "Ventaja 2: texto", t: "parrafo", d: "Cada producto muestra únicamente los talles y colores que realmente tiene disponibles." },
    { k: "valor3_t", e: "Ventaja 3: título", t: "texto", d: "Todas las categorías" },
    { k: "valor3_d", e: "Ventaja 3: texto", t: "parrafo", d: "Kimonos, rashguards, cinturones, shorts y accesorios en un solo catálogo ordenado." },
    { k: "valor4_t", e: "Ventaja 4: título", t: "texto", d: "Enfocado en calidad" },
    { k: "valor4_d", e: "Ventaja 4: texto", t: "parrafo", d: "Productos pensados para el entrenamiento diario y la competencia, sin vueltas." },
    { k: "cat_titulo", e: "Categorías: título", t: "texto", d: "Categorías" },
    { k: "cat_link", e: "Categorías: enlace", t: "texto", d: "Ver catálogo completo" },
    { k: "destacados_titulo", e: "Destacados: título", t: "texto", d: "Productos destacados" },
    { k: "destacados_link", e: "Destacados: enlace", t: "texto", d: "Ver todos los productos" },
    { k: "cta_titulo", e: "Franja de WhatsApp: título", t: "texto", d: "¿Ya sabés qué producto necesitás?" },
    { k: "cta_texto", e: "Franja de WhatsApp: texto", t: "texto", d: "Escribinos por WhatsApp y te ayudamos a elegir talle y color." },
    { k: "cta_boton", e: "Franja de WhatsApp: botón", t: "texto", d: "Escribir por WhatsApp" }
  ]},
  { grupo: "Nosotros", campos: [
    { k: "nos_titulo", e: "Título de la página", t: "texto", d: "Hecho por gente que entrena" },
    { k: "nos_bajada", e: "Texto de bajada", t: "parrafo", d: "NotApp nació de la necesidad de encontrar equipamiento de calidad sin vueltas: un catálogo claro, con información real de cada producto, y una forma simple de consultar antes de comprar." },
    { k: "historia_titulo", e: "Historia: título", t: "texto", d: "Nuestra historia" },
    { k: "historia_p1", e: "Historia: párrafo 1", t: "parrafo", d: "Empezamos armando este catálogo para resolver algo simple: mostrar el equipamiento de forma clara, con fotos, talles y colores reales, sin que el usuario tenga que escribir a ciegas preguntando \"¿tenés esto en talle A2?\"." },
    { k: "historia_p2", e: "Historia: párrafo 2", t: "parrafo", d: "Cada producto que ves acá está pensado para el uso real arriba del tatami: kimonos, rashguards, cinturones, shorts y accesorios que usamos y recomendamos nosotros mismos." },
    { k: "historia_p3", e: "Historia: párrafo 3", t: "parrafo", d: "No vendemos online ni procesamos pagos en el sitio: cuando encontrás lo que buscás, te ponemos en contacto directo por WhatsApp con el vendedor para coordinar todo — disponibilidad, forma de pago y entrega." },
    { k: "importa_titulo", e: "“Lo que nos importa”: título", t: "texto", d: "Lo que nos importa" },
    { k: "imp1_t", e: "Valor 1: título", t: "texto", d: "Información real" },
    { k: "imp1_d", e: "Valor 1: texto", t: "parrafo", d: "Cada ficha muestra únicamente los talles y colores que ese producto realmente tiene disponibles." },
    { k: "imp2_t", e: "Valor 2: título", t: "texto", d: "Trato directo" },
    { k: "imp2_d", e: "Valor 2: texto", t: "parrafo", d: "Sin pasarelas de pago ni carritos: hablás directo con el vendedor y coordinan todo entre ustedes." },
    { k: "imp3_t", e: "Valor 3: título", t: "texto", d: "Foco en el deporte" },
    { k: "imp3_d", e: "Valor 3: texto", t: "parrafo", d: "Elegimos cada producto pensando en el entrenamiento diario y la competencia, no solo en la estética." },
    { k: "noscta_titulo", e: "Franja final: título", t: "texto", d: "Dale una vuelta al catálogo" },
    { k: "noscta_texto", e: "Franja final: texto", t: "texto", d: "Kimonos, rashguards, cinturones, shorts y accesorios, todo en un solo lugar." },
    { k: "noscta_boton", e: "Franja final: botón", t: "texto", d: "Ver catálogo" }
  ]},
  { grupo: "Contacto", campos: [
    { k: "con_titulo", e: "Título de la página", t: "texto", d: "Hablemos por WhatsApp" },
    { k: "con_bajada", e: "Texto de bajada", t: "parrafo", d: "La forma más rápida de consultar disponibilidad, talles y coordinar tu compra es escribiéndonos directo. También podés encontrarnos en persona o por correo." },
    { k: "wa_titulo", e: "Bloque WhatsApp: título", t: "texto", d: "Escribinos directo" },
    { k: "wa_texto", e: "Bloque WhatsApp: texto", t: "parrafo", d: "Contanos qué producto te interesa (talle, color, cantidad) y te respondemos con disponibilidad y forma de coordinar la compra." },
    { k: "wa_boton", e: "Bloque WhatsApp: botón", t: "texto", d: "Iniciar conversación por WhatsApp" },
    { k: "wa_mensaje", e: "Mensaje que llega por WhatsApp al consultar en general", t: "parrafo", d: "Hola! Te escribo desde la página de NotApp, quería hacer una consulta." },
    { k: "otras_titulo", e: "Otras formas de contacto: título", t: "texto", d: "Otras formas de contacto" },
    { k: "otras_texto", e: "Otras formas de contacto: texto", t: "texto", d: "Si preferís, también podés encontrarnos por estos medios." },
    { k: "correo", e: "Correo electrónico", t: "email", d: "contacto@jiustore.com", ayuda: "Se muestra en Contacto y en el pie de página." },
    { k: "correo_label", e: "Correo: título", t: "texto", d: "Correo" },
    { k: "zona_label", e: "Zona: título", t: "texto", d: "Zona de entrega" },
    { k: "zona_texto", e: "Zona: texto", t: "parrafo", d: "Coordinamos entrega o retiro según la zona, a confirmar por WhatsApp." },
    { k: "direccion", e: "Dirección del local (opcional)", t: "texto", d: "", ayuda: "Si la completás, aparece en Contacto y en el pie de página." },
    { k: "horario_label", e: "Horario: título", t: "texto", d: "Horario de atención" },
    { k: "horario_texto", e: "Horario: texto", t: "parrafo", d: "Lunes a sábado, respondemos consultas por WhatsApp durante el día." },
    { k: "antes_label", e: "Aviso: título", t: "texto", d: "Antes de escribir" },
    { k: "antes_texto", e: "Aviso: texto", t: "parrafo", d: "Si ya viste un producto puntual, decinos el nombre, talle y color para responderte más rápido." }
  ]},
  { grupo: "Secciones nuevas", campos: [
    { k: "faq_titulo", e: "Preguntas frecuentes: título", t: "texto", d: "Preguntas frecuentes" },
    { k: "galeria_titulo", e: "Galería: título", t: "texto", d: "Galería" },
    { k: "redes_titulo", e: "Redes sociales (pie): título", t: "texto", d: "Seguinos" },
    { k: "meta_titulo", e: "Título del Inicio en Google y en la pestaña", t: "texto", d: "NotApp — Catálogo online de equipamiento para Jiu-Jitsu" },
    { k: "meta_descripcion", e: "Descripción del sitio en Google", t: "parrafo", d: "Catálogo online de kimonos, rashguards, cinturones, shorts y accesorios para Jiu-Jitsu. Consultá por WhatsApp y coordiná tu compra directo con el vendedor." }
  ]}
];


/* ---------------- Ayudas de color y tema (las usan el sitio y el panel) ---------------- */

function notappARgb(hex) {
  var h = String(hex || "").replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return [0, 0, 0];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function notappAHex(rgb) {
  return "#" + rgb.map(function (v) { return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"); }).join("");
}
/** Mezcla a con b: t = 0 → a, t = 1 → b. */
function notappMezclar(a, b, t) {
  var x = notappARgb(a), y = notappARgb(b);
  return notappAHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}
function notappLuminancia(hex) {
  var c = notappARgb(hex).map(function (v) {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

var NOTAPP_FUENTES_SIN_PESOS = ["Bebas Neue", "Anton", "Archivo Black"];
var NOTAPP_FUENTES_YA_CARGADAS = ["Oswald", "Inter"];

function notappCargarFuente(nombre) {
  if (!nombre || NOTAPP_FUENTES_YA_CARGADAS.indexOf(nombre) !== -1) return;
  var id = "fuente-" + nombre.replace(/\s+/g, "-");
  if (document.getElementById(id)) return;
  var fam = nombre.replace(/ /g, "+") + (NOTAPP_FUENTES_SIN_PESOS.indexOf(nombre) === -1 ? ":wght@400;700" : "");
  var link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=" + fam + "&display=swap";
  document.head.appendChild(link);
}

function notappPilaFuente(nombre) {
  var serif = ["Playfair Display", "Merriweather"].indexOf(nombre) !== -1;
  return "'" + nombre + "', " + (serif ? "serif" : "sans-serif");
}

/** Variables CSS a partir de la personalización (con lo no elegido en su valor original). */
function notappVariablesTema(p) {
  var d = NOTAPP_PERS_DEFECTO;
  var col = Object.assign({}, d.colores, (p && p.colores) || {});
  var fue = Object.assign({}, d.fuentes, (p && p.fuentes) || {});
  var est = Object.assign({}, d.estilo, (p && p.estilo) || {});
  var sobreOscuro = notappLuminancia(col.oscuro) < 0.45 ? "#f4f4f0" : "#12181b";
  return {
    "--ink": col.oscuro,
    "--ink-soft": notappMezclar(col.oscuro, "#ffffff", 0.06),
    "--ink-softer": notappMezclar(col.oscuro, "#ffffff", 0.12),
    "--paper": col.claro,
    "--paper-dim": notappMezclar(col.claro, "#000000", 0.05),
    "--line": notappMezclar(col.claro, "#000000", 0.1),
    "--gold": col.acento,
    "--gold-dark": notappMezclar(col.acento, "#000000", 0.2),
    "--crimson": col.alerta,
    "--text": col.texto,
    "--text-muted": notappMezclar(col.texto, col.claro, 0.4),
    "--text-on-ink": sobreOscuro,
    "--text-on-ink-muted": notappMezclar(sobreOscuro, col.oscuro, 0.32),
    "--on-gold": notappLuminancia(col.acento) > 0.45 ? "#12181b" : "#ffffff",
    "--font-display": notappPilaFuente(fue.titulos),
    "--font-body": notappPilaFuente(fue.textos),
    "--radius": Number(est.radio) + "px",
    "--logo-h": Number(est.logoAlto) + "px",
    _fuenteTitulos: fue.titulos,
    _fuenteTextos: fue.textos
  };
}
