/* ==========================================================================
   NotApp CMS — Personalización del sitio (colores, fuentes, textos, imágenes, secciones)
   Se guarda como un solo JSON en la tabla configuracion (clave "personalizacion").
   Acá se limpia todo lo que llega desde el panel antes de guardarlo.
   ========================================================================== */

const HEX = /^#[0-9a-fA-F]{6}$/;
const CLAVE = /^[a-z0-9_]{1,40}$/;
const FUENTE = /^[A-Za-z0-9 ]{1,40}$/;

function texto(v, max) {
  return typeof v === "string" ? v.replace(/\r/g, "").slice(0, max) : "";
}
function numero(v, min, max, defecto) {
  const n = Number(v);
  return isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : defecto;
}
function urlSegura(v) {
  v = texto(v, 600).trim();
  return /^(https?:\/\/|\/)/i.test(v) ? v : "";
}

function limpiar(entrada) {
  const e = entrada && typeof entrada === "object" ? entrada : {};
  const salida = {};

  if (e.colores && typeof e.colores === "object") {
    salida.colores = {};
    ["acento", "oscuro", "claro", "texto", "alerta"].forEach(function (k) {
      if (typeof e.colores[k] === "string" && HEX.test(e.colores[k])) salida.colores[k] = e.colores[k].toLowerCase();
    });
  }
  if (e.fuentes && typeof e.fuentes === "object") {
    salida.fuentes = {};
    ["titulos", "textos"].forEach(function (k) {
      if (typeof e.fuentes[k] === "string" && FUENTE.test(e.fuentes[k])) salida.fuentes[k] = e.fuentes[k];
    });
  }
  if (e.estilo && typeof e.estilo === "object") {
    salida.estilo = {
      radio: numero(e.estilo.radio, 0, 28, 6),
      logoAlto: numero(e.estilo.logoAlto, 24, 160, 60),
      heroModo: e.estilo.heroModo === "lado" ? "lado" : "fondo",
      heroOscurecer: numero(e.estilo.heroOscurecer, 0, 90, 55)
    };
  }

  salida.textos = {};
  if (e.textos && typeof e.textos === "object") {
    Object.keys(e.textos).slice(0, 200).forEach(function (k) {
      if (!CLAVE.test(k)) return;
      const v = texto(e.textos[k], 1200).trim();
      if (v) salida.textos[k] = v;
    });
  }

  salida.imagenes = {};
  if (e.imagenes && typeof e.imagenes === "object") {
    Object.keys(e.imagenes).slice(0, 20).forEach(function (k) {
      if (!CLAVE.test(k)) return;
      const u = urlSegura(e.imagenes[k]);
      if (u) salida.imagenes[k] = u;
    });
  }

  salida.redes = {};
  if (e.redes && typeof e.redes === "object") {
    Object.keys(e.redes).slice(0, 12).forEach(function (k) {
      if (!CLAVE.test(k)) return;
      const v = texto(e.redes[k], 300).trim();
      if (/^https?:\/\//i.test(v)) salida.redes[k] = v;
    });
  }

  salida.secciones = {};
  if (e.secciones && typeof e.secciones === "object") {
    Object.keys(e.secciones).slice(0, 20).forEach(function (k) {
      if (CLAVE.test(k)) salida.secciones[k] = e.secciones[k] !== false;
    });
  }

  salida.faq = (Array.isArray(e.faq) ? e.faq : []).slice(0, 30).map(function (x) {
    return { p: texto(x && x.p, 200).trim(), r: texto(x && x.r, 1500).trim() };
  }).filter(function (x) { return x.p && x.r; });

  salida.galeria = (Array.isArray(e.galeria) ? e.galeria : []).slice(0, 24).map(function (x) {
    return { url: urlSegura(x && x.url), pie: texto(x && x.pie, 160).trim() };
  }).filter(function (x) { return x.url; });

  return salida;
}

/** Devuelve todas las URLs de imágenes usadas (para borrar del Storage las que se dejaron de usar). */
function urlsDeImagenes(p) {
  const r = [];
  if (!p) return r;
  Object.keys(p.imagenes || {}).forEach(function (k) { r.push(p.imagenes[k]); });
  (p.galeria || []).forEach(function (g) { r.push(g.url); });
  return r;
}

function leer(json) {
  if (!json) return limpiar({});
  try { return limpiar(JSON.parse(json)); } catch (e) { return limpiar({}); }
}

module.exports = { limpiar, leer, urlsDeImagenes };
