/* ==========================================================================
   NotApp — Aplica la personalización hecha desde el panel (colores, fuentes, textos,
   imágenes, secciones, redes). Necesita personalizacion-campos.js cargado antes.
   Todo lo que no se haya cambiado queda como está en el HTML.
   ========================================================================== */

(function () {
  const CLAVE_CACHE = "notapp_pers_v1";

  /* ---------------- Tema: colores, fuentes, estilo ---------------- */

  function aplicarTema(p) {
    const vars = notappVariablesTema(p);
    const r = document.documentElement.style;
    Object.keys(vars).forEach(function (k) { if (k.indexOf("--") === 0) r.setProperty(k, vars[k]); });
    notappCargarFuente(vars._fuenteTitulos);
    notappCargarFuente(vars._fuenteTextos);
  }

  /* ---------------- Textos ---------------- */

  function setTexto(el, valor, tipo) {
    if (el._origHTML === undefined) el._origHTML = el.innerHTML;
    if (tipo === "titulo") {
      el.textContent = "";
      valor.split("*").forEach(function (parte, i) {
        if (!parte) return;
        if (i % 2) { const em = document.createElement("em"); em.textContent = parte; el.appendChild(em); }
        else el.appendChild(document.createTextNode(parte));
      });
      return;
    }
    if (el.children.length === 0) { el.textContent = valor; return; }
    for (let i = 0; i < el.childNodes.length; i++) {
      const n = el.childNodes[i];
      if (n.nodeType === 3 && n.nodeValue.trim()) {
        n.nodeValue = (i > 0 ? " " : "") + valor + (i === 0 ? " " : " ");
        return;
      }
    }
  }
  function restaurar(el) {
    if (el._origHTML !== undefined) el.innerHTML = el._origHTML;
  }

  function aplicarTextos(textos) {
    NOTAPP_CAMPOS.forEach(function (g) {
      g.campos.forEach(function (c) {
        const sel = c.s || '[data-c="' + c.k + '"]';
        let els;
        try { els = document.querySelectorAll(sel); } catch (e) { return; }
        const v = textos[c.k];
        els.forEach(function (el) {
          if (c.k === "buscador_ph") return;
          if (c.k === "correo") return;
          if (v) setTexto(el, v, c.t); else restaurar(el);
        });
      });
    });

    document.querySelectorAll('input[type="search"]').forEach(function (i) {
      if (i._phOrig === undefined) i._phOrig = i.getAttribute("placeholder") || "";
      i.setAttribute("placeholder", textos.buscador_ph || i._phOrig);
    });
    document.querySelectorAll('a[href^="mailto:"]').forEach(function (a) {
      if (a._origHTML === undefined) { a._origHTML = a.innerHTML; a._origHref = a.getAttribute("href"); }
      if (textos.correo) { a.textContent = textos.correo; a.setAttribute("href", "mailto:" + textos.correo); }
      else { a.innerHTML = a._origHTML; a.setAttribute("href", a._origHref); }
    });
  }

  /* ---------------- Imágenes ---------------- */

  function imgEl(url, alt) {
    const i = document.createElement("img");
    i.src = url;
    i.alt = alt || "";
    i.loading = "lazy";
    return i;
  }

  function aplicarImagenes(imgs, est) {
    est = Object.assign({}, NOTAPP_PERS_DEFECTO.estilo, est || {});

    const hero = document.querySelector(".hero");
    if (hero) {
      const visual = hero.querySelector(".hero-visual");
      if (visual && visual._origHTML === undefined) visual._origHTML = visual.innerHTML;
      hero.classList.remove("hero-con-fondo", "hero-con-foto");
      hero.style.removeProperty("--hero-img");
      hero.style.removeProperty("--hero-oscurecer");
      if (visual) visual.innerHTML = visual._origHTML;
      if (imgs.hero_imagen) {
        if (est.heroModo === "lado" && visual) {
          visual.innerHTML = "";
          visual.appendChild(imgEl(imgs.hero_imagen, ""));
          hero.classList.add("hero-con-foto");
        } else {
          hero.style.setProperty("--hero-img", 'url("' + imgs.hero_imagen.replace(/"/g, "%22") + '")');
          hero.style.setProperty("--hero-oscurecer", String(Number(est.heroOscurecer) / 100));
          hero.classList.add("hero-con-fondo");
        }
      }
    }

    document.querySelectorAll("[data-img]").forEach(function (el) {
      const url = imgs[el.getAttribute("data-img")];
      if (el._origHTML === undefined) el._origHTML = el.innerHTML;
      if (url) { el.innerHTML = ""; el.appendChild(imgEl(url, "")); el.classList.add("con-foto"); }
      else { el.innerHTML = el._origHTML; el.classList.remove("con-foto"); }
    });

    let fav = document.getElementById("favicon-personal");
    if (imgs.favicon) {
      if (!fav) { fav = document.createElement("link"); fav.id = "favicon-personal"; fav.rel = "icon"; document.head.appendChild(fav); }
      fav.href = imgs.favicon;
    } else if (fav) fav.remove();
  }

  /* ---------------- Secciones, redes, contacto, bloques nuevos ---------------- */

  function aplicarSecciones(sec) {
    document.querySelectorAll("[data-seccion]").forEach(function (el) {
      el.hidden = sec[el.getAttribute("data-seccion")] === false;
    });
  }

  function pagina() {
    const r = location.pathname.replace(/\/+$/, "");
    if (r === "" || /\/index(\.html)?$/.test(r)) return "inicio";
    if (/nosotros(\.html)?$/.test(r)) return "nosotros";
    if (/contacto(\.html)?$/.test(r)) return "contacto";
    return "";
  }

  function crearSeccion(tipo, titulo, contenido) {
    const s = document.createElement("section");
    s.className = "section seccion-extra";
    s.setAttribute("data-extra", tipo);
    const c = document.createElement("div");
    c.className = "container";
    const h = document.createElement("div");
    h.className = "section-heading";
    const t = document.createElement("h2");
    t.textContent = titulo;
    h.appendChild(t);
    c.appendChild(h);
    c.appendChild(contenido);
    s.appendChild(c);
    return s;
  }

  function aplicarBloquesNuevos(p) {
    document.querySelectorAll("[data-extra]").forEach(function (el) { el.remove(); });
    const pag = pagina();
    const main = document.querySelector("main");
    if (!main || !pag) return;
    const antesDe = main.querySelector(".cta-band");
    const sec = p.secciones || {};
    const textos = p.textos || {};

    function insertar(el) {
      if (antesDe) main.insertBefore(el, antesDe); else main.appendChild(el);
    }

    if ((pag === "inicio" || pag === "nosotros") && p.galeria && p.galeria.length && sec.galeria !== false) {
      const grid = document.createElement("div");
      grid.className = "galeria-grid";
      p.galeria.forEach(function (g) {
        const f = document.createElement("figure");
        const a = document.createElement("a");
        a.href = g.url;
        a.target = "_blank";
        a.rel = "noopener";
        a.appendChild(imgEl(g.url, g.pie));
        f.appendChild(a);
        if (g.pie) { const cap = document.createElement("figcaption"); cap.textContent = g.pie; f.appendChild(cap); }
        grid.appendChild(f);
      });
      insertar(crearSeccion("galeria", textos.galeria_titulo || "Galería", grid));
    }

    if ((pag === "inicio" || pag === "contacto") && p.faq && p.faq.length && sec.faq !== false) {
      const lista = document.createElement("div");
      lista.className = "faq-list";
      p.faq.forEach(function (x) {
        const d = document.createElement("details");
        const s = document.createElement("summary");
        s.textContent = x.p;
        const r = document.createElement("p");
        r.textContent = x.r;
        d.appendChild(s);
        d.appendChild(r);
        lista.appendChild(d);
      });
      insertar(crearSeccion("faq", textos.faq_titulo || "Preguntas frecuentes", lista));
    }
  }

  function aplicarContactoYRedes(p) {
    const textos = p.textos || {};
    const redes = p.redes || {};

    // Contacto: dirección (opcional)
    const zona = document.querySelector('[data-c="zona_label"]');
    if (zona && textos.direccion) {
      const bloque = zona.closest(".contact-detail");
      if (bloque) {
        const copia = bloque.cloneNode(true);
        copia.setAttribute("data-extra", "direccion");
        copia.querySelectorAll("[data-c]").forEach(function (e) { e.removeAttribute("data-c"); });
        copia.querySelector("strong").textContent = "Dirección";
        copia.querySelector("span").textContent = textos.direccion;
        bloque.parentNode.insertBefore(copia, bloque.nextSibling);
      }
    }

    // Pie: correo, dirección y redes
    const col = document.querySelector(".footer-col:last-child");
    if (!col) return;
    function item(titulo, nodo) {
      const d = document.createElement("div");
      d.className = "footer-contact-item";
      d.setAttribute("data-extra", "pie");
      const s = document.createElement("strong");
      s.textContent = titulo;
      d.appendChild(s);
      d.appendChild(nodo);
      col.appendChild(d);
    }
    if (textos.correo) {
      const a = document.createElement("a");
      a.href = "mailto:" + textos.correo;
      a.textContent = textos.correo;
      item("Correo", a);
    }
    if (textos.direccion) {
      const s = document.createElement("span");
      s.textContent = textos.direccion;
      item("Dirección", s);
    }
    const activas = NOTAPP_REDES.filter(function (r) { return redes[r.k]; });
    if (activas.length) {
      const w = document.createElement("div");
      w.className = "footer-redes";
      activas.forEach(function (r) {
        const a = document.createElement("a");
        a.href = redes[r.k];
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = r.e;
        w.appendChild(a);
      });
      item(textos.redes_titulo || "Seguinos", w);
    }
  }

  /* ---------------- Todo junto ---------------- */

  function aplicarTodo(p, nombreSitio) {
    p = p || {};
    aplicarTema(p);
    const textos = p.textos || {};
    aplicarTextos(textos);
    aplicarImagenes(p.imagenes || {}, p.estilo);
    aplicarSecciones(p.secciones || {});
    aplicarBloquesNuevos(p);
    aplicarContactoYRedes(p);

    if (nombreSitio) {
      document.querySelectorAll("[data-nombre]").forEach(function (e) { e.textContent = nombreSitio; });
    }
    if (pagina() === "inicio") {
      if (textos.meta_titulo) document.title = textos.meta_titulo;
      const m = document.querySelector('meta[name="description"]');
      if (m && textos.meta_descripcion) m.setAttribute("content", textos.meta_descripcion);
    }
  }

  window.aplicarPersonalizacionSitio = function (config) {
    const p = (config && config.personalizacion) || {};
    // se limpian los bloques creados antes (cache) para no duplicarlos
    document.querySelectorAll("[data-extra]").forEach(function (el) { el.remove(); });
    aplicarTodo(p, config && config.nombreSitio);
    try { localStorage.setItem(CLAVE_CACHE, JSON.stringify({ p: p, n: config && config.nombreSitio })); } catch (e) { /* sin almacenamiento: no pasa nada */ }
  };

  /* Primera pintura: se usa lo último que se vio, así no parpadea con los colores viejos. */
  let cache = null;
  try { cache = JSON.parse(localStorage.getItem(CLAVE_CACHE) || "null"); } catch (e) { cache = null; }
  if (cache && cache.p) {
    aplicarTema(cache.p);
    document.addEventListener("DOMContentLoaded", function () { aplicarTodo(cache.p, cache.n); });
  }
})();
