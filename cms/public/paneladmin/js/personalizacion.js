/* ==========================================================================
   NotApp CMS — Pantalla "Personalización" del panel
   Arma el editor a partir de personalizacion-campos.js y guarda todo con
   PUT /api/admin/personalizacion. admin.js la inicializa con iniciarPersonalizacion().
   ========================================================================== */

function iniciarPersonalizacion(ctx) {
  const D = NOTAPP_PERS_DEFECTO;
  const panel = document.getElementById("persPanel");
  const tabsEl = document.getElementById("persTabs");
  const estadoEl = document.getElementById("persEstado");
  const btnGuardar = document.getElementById("persGuardar");
  if (!panel || !tabsEl) return;

  const TABS = [
    { id: "colores", nombre: "Colores" },
    { id: "letras", nombre: "Letras y estilo" },
    { id: "imagenes", nombre: "Fotos" },
    { id: "textos", nombre: "Textos" },
    { id: "contacto", nombre: "Contacto y redes" },
    { id: "secciones", nombre: "Secciones" }
  ];
  const CLAVES_CONTACTO = ["correo", "direccion", "zona_texto", "horario_texto"];

  let tab = "colores";
  let grupoTextos = 0;
  let sucio = false;
  let p = normalizar(ctx.inicial);

  function normalizar(x) {
    x = JSON.parse(JSON.stringify(x || {}));
    x.colores = Object.assign({}, D.colores, x.colores || {});
    x.fuentes = Object.assign({}, D.fuentes, x.fuentes || {});
    x.estilo = Object.assign({}, D.estilo, x.estilo || {});
    x.textos = x.textos || {};
    x.imagenes = x.imagenes || {};
    x.redes = x.redes || {};
    x.secciones = x.secciones || {};
    x.faq = x.faq || [];
    x.galeria = x.galeria || [];
    return x;
  }

  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function marcarCambio() {
    sucio = true;
    estadoEl.textContent = "Hay cambios sin guardar";
    estadoEl.classList.add("pers-sucio");
  }

  /* ---------------- Vista previa (colores, letras, estilo) ---------------- */

  function vistaPrevia() {
    const v = notappVariablesTema(p);
    notappCargarFuente(v._fuenteTitulos);
    notappCargarFuente(v._fuenteTextos);
    const estilo = Object.keys(v).filter(function (k) { return k.indexOf("--") === 0; }).map(function (k) { return k + ":" + v[k]; }).join(";");
    return '<div class="pers-preview" id="persPreview" style="' + esc(estilo) + '">' +
      '<div class="pv-header"><b class="pv-brand">' + esc(ctx.nombreSitio || "NotApp") + '</b><span>Inicio</span><span>Productos</span><span>Contacto</span></div>' +
      '<div class="pv-hero"><small>Catálogo online</small><h3>Equipamiento para <em>entrenar en serio</em></h3><p>Así se van a ver tus textos y botones.</p>' +
      '<span class="pv-btn">Ver catálogo</span> <span class="pv-btn pv-btn-out">Contactar</span></div>' +
      '<div class="pv-body"><div class="pv-card"><b>Kimono tradicional</b><span>$120.000</span><i class="pv-tag">Agotado</i></div>' +
      '<div class="pv-card"><b>Rashguard</b><span>$35.000</span></div></div></div>';
  }
  function refrescarVistaPrevia() {
    const el = document.getElementById("persPreview");
    if (!el) return;
    const tmp = document.createElement("div");
    tmp.innerHTML = vistaPrevia();
    el.setAttribute("style", tmp.firstChild.getAttribute("style"));
  }

  /* ---------------- Pestaña: Colores ---------------- */

  const COLORES = [
    { k: "acento", e: "Color de acento", a: "Botones principales, detalles y enlaces destacados." },
    { k: "oscuro", e: "Color oscuro", a: "Barra de arriba, portada, franjas y pie de página." },
    { k: "claro", e: "Fondo claro", a: "Fondo general de las páginas." },
    { k: "texto", e: "Color del texto", a: "Títulos y párrafos sobre fondo claro." },
    { k: "alerta", e: "Color de alerta", a: "Etiquetas como “Agotado”." }
  ];

  function htmlColores() {
    const paletas = NOTAPP_PALETAS.map(function (x, i) {
      return '<button type="button" class="pers-paleta" data-paleta="' + i + '" title="' + esc(x.n) + '">' +
        '<span class="pers-sw" style="background:' + x.c.oscuro + '"></span><span class="pers-sw" style="background:' + x.c.acento + '"></span><span class="pers-sw" style="background:' + x.c.claro + '"></span>' +
        '<em>' + esc(x.n) + '</em></button>';
    }).join("");
    const filas = COLORES.map(function (c) {
      return '<div class="pers-color"><div><strong>' + c.e + '</strong><small>' + c.a + '</small></div>' +
        '<div class="pers-color-ctrl"><input type="color" data-color="' + c.k + '" value="' + p.colores[c.k] + '">' +
        '<input type="text" class="admin-input pers-hex" data-hex="' + c.k + '" value="' + p.colores[c.k] + '" maxlength="7"></div></div>';
    }).join("");
    return '<div class="pers-cols"><div>' +
      '<div class="admin-card"><h2>Paletas listas</h2><p class="admin-card-hint">Elegí una y después ajustá lo que quieras.</p><div class="pers-paletas">' + paletas + '</div></div>' +
      '<div class="admin-card"><h2>Tus colores</h2>' + filas +
      '<button type="button" class="btn-admin btn-admin-ghost" id="persResetColores">Volver a los colores originales</button></div>' +
      '</div><div class="pers-sticky"><div class="admin-card"><h2>Vista previa</h2>' + vistaPrevia() + '</div></div></div>';
  }

  /* ---------------- Pestaña: Letras y estilo ---------------- */

  function opciones(lista, actual) {
    return lista.map(function (f) { return '<option value="' + esc(f) + '"' + (f === actual ? " selected" : "") + ">" + esc(f) + "</option>"; }).join("");
  }
  function htmlLetras() {
    return '<div class="pers-cols"><div>' +
      '<div class="admin-card"><h2>Tipografías</h2>' +
      '<label class="field"><span>Letra de los títulos</span><select class="admin-select" data-fuente="titulos">' + opciones(NOTAPP_FUENTES_TITULOS, p.fuentes.titulos) + '</select></label>' +
      '<label class="field"><span>Letra de los textos</span><select class="admin-select" data-fuente="textos">' + opciones(NOTAPP_FUENTES_TEXTOS, p.fuentes.textos) + '</select></label>' +
      '<p class="admin-card-hint">Son fuentes gratuitas de Google Fonts. Mirá cómo quedan en la vista previa.</p></div>' +
      '<div class="admin-card"><h2>Estilo</h2>' +
      '<label class="field"><span>Esquinas de botones y tarjetas: <b id="valRadio">' + p.estilo.radio + ' px</b></span><input type="range" min="0" max="28" step="1" data-estilo="radio" value="' + p.estilo.radio + '"></label>' +
      '<label class="field"><span>Alto del logo en la barra de arriba: <b id="valLogo">' + p.estilo.logoAlto + ' px</b></span><input type="range" min="24" max="140" step="2" data-estilo="logoAlto" value="' + p.estilo.logoAlto + '"></label>' +
      '<p class="admin-card-hint">El logo se sube en “Configuración”. Acá solo elegís qué tan grande se ve.</p>' +
      '<button type="button" class="btn-admin btn-admin-ghost" id="persResetLetras">Volver a lo original</button></div>' +
      '</div><div class="pers-sticky"><div class="admin-card"><h2>Vista previa</h2>' + vistaPrevia() + '</div></div></div>';
  }

  /* ---------------- Pestaña: Fotos ---------------- */

  function htmlImagenes() {
    const items = NOTAPP_IMAGENES.map(function (im) {
      const url = p.imagenes[im.k];
      return '<div class="pers-img"><div class="pers-thumb">' + (url ? '<img src="' + esc(url) + '" alt="">' : "<span>Sin foto</span>") + '</div>' +
        '<div class="pers-img-info"><strong>' + im.e + '</strong><small>' + im.ayuda + '</small>' +
        '<div class="admin-actions-row"><label class="btn-admin btn-admin-outline">Elegir foto<input type="file" accept="image/*" hidden data-subir="' + im.k + '"></label>' +
        (url ? '<button type="button" class="btn-admin btn-admin-ghost" data-quitar-img="' + im.k + '">Quitar</button>' : "") + '</div></div></div>';
    }).join("");

    const hero =
      '<div class="admin-card"><h2>Cómo se ve la foto de la portada</h2>' +
      '<label class="pers-radio"><input type="radio" name="heroModo" value="fondo" data-estilo="heroModo"' + (p.estilo.heroModo !== "lado" ? " checked" : "") + '> Como fondo de toda la portada</label>' +
      '<label class="pers-radio"><input type="radio" name="heroModo" value="lado" data-estilo="heroModo"' + (p.estilo.heroModo === "lado" ? " checked" : "") + '> Al costado del texto</label>' +
      '<label class="field" style="margin-top:12px"><span>Oscurecer la foto de fondo (para que se lea el texto): <b id="valOscurecer">' + p.estilo.heroOscurecer + '%</b></span>' +
      '<input type="range" min="0" max="90" step="5" data-estilo="heroOscurecer" value="' + p.estilo.heroOscurecer + '"></label></div>';

    const gal = p.galeria.map(function (g, i) {
      return '<div class="pers-gal-item"><img src="' + esc(g.url) + '" alt="">' +
        '<input type="text" class="admin-input" placeholder="Pie de foto (opcional)" data-gal-pie="' + i + '" value="' + esc(g.pie || "") + '" maxlength="160">' +
        '<button type="button" class="btn-admin btn-admin-ghost" data-gal-del="' + i + '">Quitar</button></div>';
    }).join("");

    return '<div class="admin-card"><h2>Fotos del sitio</h2><div class="pers-imgs">' + items + '</div></div>' + hero +
      '<div class="admin-card"><h2>Galería de fotos</h2><p class="admin-card-hint">Aparece en el Inicio y en Nosotros cuando tiene fotos. Podés elegir varias a la vez (hasta 24).</p>' +
      '<div class="pers-gal">' + gal + '</div>' +
      '<label class="btn-admin btn-admin-outline">+ Agregar fotos<input type="file" accept="image/*" multiple hidden data-gal-add></label></div>';
  }

  /* ---------------- Pestaña: Textos ---------------- */

  function campoHTML(c) {
    const v = p.textos[c.k] || "";
    const campo = (c.t === "parrafo")
      ? '<textarea class="admin-input" rows="3" maxlength="1200" data-texto="' + c.k + '" placeholder="' + esc(c.d) + '">' + esc(v) + '</textarea>'
      : '<input type="' + (c.t === "email" ? "email" : "text") + '" class="admin-input" maxlength="1200" data-texto="' + c.k + '" placeholder="' + esc(c.d) + '" value="' + esc(v) + '">';
    return '<label class="field"><span>' + c.e + '</span>' + campo + (c.ayuda ? '<small class="pers-ayuda">' + c.ayuda + '</small>' : "") + '</label>';
  }

  function gruposTexto() {
    return NOTAPP_CAMPOS.map(function (g) {
      return { grupo: g.grupo, campos: g.campos.filter(function (c) { return CLAVES_CONTACTO.indexOf(c.k) === -1 && ["faq_titulo", "galeria_titulo", "redes_titulo"].indexOf(c.k) === -1; }) };
    }).filter(function (g) { return g.campos.length; });
  }

  function htmlTextos() {
    const grupos = gruposTexto();
    if (grupoTextos >= grupos.length) grupoTextos = 0;
    const chips = grupos.map(function (g, i) {
      return '<button type="button" class="pers-chip' + (i === grupoTextos ? " activo" : "") + '" data-grupo="' + i + '">' + esc(g.grupo) + '</button>';
    }).join("");
    return '<div class="pers-chips">' + chips + '</div><div class="admin-card">' +
      '<p class="admin-card-hint">Lo que está en gris es el texto actual. Escribí para cambiarlo; si lo dejás vacío se usa el original.</p>' +
      grupos[grupoTextos].campos.map(campoHTML).join("") + '</div>';
  }

  /* ---------------- Pestaña: Contacto y redes ---------------- */

  function htmlContacto() {
    const campos = [];
    NOTAPP_CAMPOS.forEach(function (g) { g.campos.forEach(function (c) { if (CLAVES_CONTACTO.indexOf(c.k) !== -1) campos.push(c); }); });
    const redes = NOTAPP_REDES.map(function (r) {
      return '<label class="field"><span>' + r.e + '</span><input type="url" class="admin-input" data-red="' + r.k + '" placeholder="' + r.ph + '" value="' + esc(p.redes[r.k] || "") + '"></label>';
    }).join("");
    const tit = NOTAPP_CAMPOS.reduce(function (acc, g) { return acc.concat(g.campos); }, []).filter(function (c) { return c.k === "redes_titulo"; })[0];
    return '<div class="admin-card"><h2>Datos de contacto</h2>' + campos.map(campoHTML).join("") +
      '<p class="admin-card-hint">El número de WhatsApp y el nombre del sitio se cambian en “Configuración”.</p></div>' +
      '<div class="admin-card"><h2>Redes sociales</h2><p class="admin-card-hint">Se muestran en el pie de página solo las que completes. Pegá el enlace completo (empieza con https://).</p>' +
      campoHTML(tit) + redes + '</div>';
  }

  /* ---------------- Pestaña: Secciones ---------------- */

  function seccionActiva(k) {
    if (p.secciones[k] === false) return false;
    return true;
  }
  function htmlSecciones() {
    const tit = NOTAPP_CAMPOS.reduce(function (acc, g) { return acc.concat(g.campos); }, []);
    const campoTit = function (k) { return tit.filter(function (c) { return c.k === k; })[0]; };
    const checks = NOTAPP_SECCIONES.map(function (s) {
      return '<label class="pers-check"><input type="checkbox" data-seccion="' + s.k + '"' + (seccionActiva(s.k) ? " checked" : "") + '> ' + s.e + '</label>';
    }).join("");
    const faq = p.faq.map(function (x, i) {
      return '<div class="pers-faq-item"><input type="text" class="admin-input" placeholder="Pregunta" data-faq-p="' + i + '" value="' + esc(x.p) + '" maxlength="200">' +
        '<textarea class="admin-input" rows="2" placeholder="Respuesta" data-faq-r="' + i + '" maxlength="1500">' + esc(x.r) + '</textarea>' +
        '<button type="button" class="btn-admin btn-admin-ghost" data-faq-del="' + i + '">Quitar</button></div>';
    }).join("");
    return '<div class="admin-card"><h2>Qué se muestra</h2><p class="admin-card-hint">Destildá una sección para ocultarla del sitio.</p><div class="pers-checks">' + checks + '</div></div>' +
      '<div class="admin-card"><h2>Preguntas frecuentes</h2>' + campoHTML(campoTit("faq_titulo")) +
      '<div class="pers-faq">' + faq + '</div><button type="button" class="btn-admin btn-admin-outline" id="faqAdd">+ Agregar pregunta</button></div>' +
      '<div class="admin-card"><h2>Título de la galería</h2>' + campoHTML(campoTit("galeria_titulo")) + '<p class="admin-card-hint">Las fotos de la galería se cargan en la pestaña “Fotos”.</p></div>';
  }

  /* ---------------- Dibujo y eventos ---------------- */

  function dibujar() {
    tabsEl.innerHTML = TABS.map(function (t) {
      return '<button type="button" class="pers-tab' + (t.id === tab ? " activo" : "") + '" data-tab="' + t.id + '">' + t.nombre + '</button>';
    }).join("");
    panel.innerHTML = { colores: htmlColores, letras: htmlLetras, imagenes: htmlImagenes, textos: htmlTextos, contacto: htmlContacto, secciones: htmlSecciones }[tab]();
  }

  tabsEl.addEventListener("click", function (e) {
    const b = e.target.closest("[data-tab]");
    if (!b) return;
    tab = b.dataset.tab;
    dibujar();
  });

  panel.addEventListener("click", async function (e) {
    const t = e.target.closest("button");
    if (!t) return;
    if (t.dataset.paleta !== undefined) {
      p.colores = Object.assign({}, NOTAPP_PALETAS[Number(t.dataset.paleta)].c);
      marcarCambio(); dibujar(); return;
    }
    if (t.id === "persResetColores") { p.colores = Object.assign({}, D.colores); marcarCambio(); dibujar(); return; }
    if (t.id === "persResetLetras") { p.fuentes = Object.assign({}, D.fuentes); p.estilo.radio = D.estilo.radio; p.estilo.logoAlto = D.estilo.logoAlto; marcarCambio(); dibujar(); return; }
    if (t.dataset.grupo !== undefined) { grupoTextos = Number(t.dataset.grupo); dibujar(); return; }
    if (t.dataset.quitarImg) { delete p.imagenes[t.dataset.quitarImg]; marcarCambio(); dibujar(); return; }
    if (t.dataset.galDel !== undefined) { p.galeria.splice(Number(t.dataset.galDel), 1); marcarCambio(); dibujar(); return; }
    if (t.dataset.faqDel !== undefined) { p.faq.splice(Number(t.dataset.faqDel), 1); marcarCambio(); dibujar(); return; }
    if (t.id === "faqAdd") {
      if (p.faq.length >= 30) { ctx.toast("Máximo 30 preguntas.", true); return; }
      p.faq.push({ p: "", r: "" }); marcarCambio(); dibujar(); return;
    }
  });

  panel.addEventListener("input", function (e) {
    const el = e.target;
    if (el.dataset.color) {
      p.colores[el.dataset.color] = el.value;
      const hex = panel.querySelector('[data-hex="' + el.dataset.color + '"]');
      if (hex) hex.value = el.value;
      marcarCambio(); refrescarVistaPrevia(); return;
    }
    if (el.dataset.hex) {
      let v = el.value.trim();
      if (v && v[0] !== "#") v = "#" + v;
      if (/^#[0-9a-fA-F]{6}$/.test(v)) {
        p.colores[el.dataset.hex] = v.toLowerCase();
        const sel = panel.querySelector('[data-color="' + el.dataset.hex + '"]');
        if (sel) sel.value = v.toLowerCase();
        marcarCambio(); refrescarVistaPrevia();
      }
      return;
    }
    if (el.dataset.estilo && el.type === "range") {
      p.estilo[el.dataset.estilo] = Number(el.value);
      const rot = { radio: "valRadio", logoAlto: "valLogo", heroOscurecer: "valOscurecer" }[el.dataset.estilo];
      const suf = el.dataset.estilo === "heroOscurecer" ? "%" : " px";
      if (rot && document.getElementById(rot)) document.getElementById(rot).textContent = el.value + suf;
      marcarCambio(); refrescarVistaPrevia(); return;
    }
    if (el.dataset.texto) { p.textos[el.dataset.texto] = el.value; marcarCambio(); return; }
    if (el.dataset.red) { p.redes[el.dataset.red] = el.value.trim(); marcarCambio(); return; }
    if (el.dataset.faqP !== undefined) { p.faq[Number(el.dataset.faqP)].p = el.value; marcarCambio(); return; }
    if (el.dataset.faqR !== undefined) { p.faq[Number(el.dataset.faqR)].r = el.value; marcarCambio(); return; }
    if (el.dataset.galPie !== undefined) { p.galeria[Number(el.dataset.galPie)].pie = el.value; marcarCambio(); return; }
  });

  panel.addEventListener("change", async function (e) {
    const el = e.target;
    if (el.dataset.fuente) { p.fuentes[el.dataset.fuente] = el.value; marcarCambio(); refrescarVistaPrevia(); return; }
    if (el.dataset.estilo === "heroModo") { p.estilo.heroModo = el.value; marcarCambio(); return; }
    if (el.dataset.seccion) { p.secciones[el.dataset.seccion] = el.checked; marcarCambio(); return; }
    if (el.dataset.subir && el.files[0]) {
      try {
        ctx.toast("Subiendo foto…");
        p.imagenes[el.dataset.subir] = await ctx.subirImagen(el.files[0], el.dataset.subir);
        marcarCambio(); dibujar(); ctx.toast("Foto cargada. Falta guardar los cambios.");
      } catch (err) { ctx.toast("No se pudo subir la foto: " + err.message, true); }
      return;
    }
    if (el.hasAttribute("data-gal-add") && el.files.length) {
      const archivos = Array.prototype.slice.call(el.files);
      let n = 0;
      try {
        for (let i = 0; i < archivos.length && p.galeria.length < 24; i++) {
          ctx.toast("Subiendo foto " + (i + 1) + " de " + archivos.length + "…");
          p.galeria.push({ url: await ctx.subirImagen(archivos[i], "galeria"), pie: "" });
          n++;
        }
        if (n) { marcarCambio(); ctx.toast(n + (n === 1 ? " foto cargada." : " fotos cargadas.") + " Falta guardar los cambios."); }
      } catch (err) { ctx.toast("No se pudo subir la foto: " + err.message, true); }
      dibujar();
    }
  });

  btnGuardar.addEventListener("click", async function () {
    btnGuardar.disabled = true;
    try {
      // sin textos vacíos ni preguntas a medio escribir
      const aEnviar = JSON.parse(JSON.stringify(p));
      Object.keys(aEnviar.textos).forEach(function (k) { if (!String(aEnviar.textos[k]).trim()) delete aEnviar.textos[k]; });
      aEnviar.faq = aEnviar.faq.filter(function (x) { return x.p.trim() && x.r.trim(); });
      const data = await ctx.apiFetch("/api/admin/personalizacion", { method: "PUT", body: aEnviar });
      p = normalizar(data.personalizacion);
      try { localStorage.removeItem("notapp_pers_v1"); } catch (err) { /* nada */ }
      sucio = false;
      estadoEl.textContent = "Guardado ✓";
      estadoEl.classList.remove("pers-sucio");
      ctx.toast("Cambios guardados. Ya se ven en el sitio.");
      dibujar();
    } catch (err) {
      ctx.toast(err.message, true);
    }
    btnGuardar.disabled = false;
  });

  window.addEventListener("beforeunload", function (e) {
    if (sucio) { e.preventDefault(); e.returnValue = ""; }
  });

  dibujar();
}
