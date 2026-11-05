/* ==========================================================================
   NotApp CMS — Lógica del panel de administración
   ========================================================================== */

const scriptTag = document.currentScript;
const PAGINA = scriptTag ? scriptTag.dataset.page : "dashboard";

/* ---------------- Helpers de red ---------------- */

async function apiFetch(url, options) {
  options = options || {};
  options.credentials = "same-origin";
  if (options.body && typeof options.body !== "string") {
    options.body = JSON.stringify(options.body);
  }
  if (options.body) {
    options.headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
  }
  const res = await fetch(url, options);
  let data = null;
  try { data = await res.json(); } catch (e) { data = null; }
  if (!res.ok) {
    const msg = (data && data.error) || ("Error " + res.status);
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

function leerArchivoCrudo(file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onload = function () { resolve(reader.result); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Lee la imagen y, si es pesada o muy grande, la reduce (el servidor admite hasta 3 MB por foto). */
async function leerArchivoComoDataURL(file) {
  const crudo = await leerArchivoCrudo(file);
  const LIMITE = 2400000; // caracteres base64 ≈ 1,8 MB
  if (file.type === "image/svg+xml" || file.type === "image/gif") return crudo;
  const img = await new Promise(function (resolve, reject) {
    const i = new Image();
    i.onload = function () { resolve(i); };
    i.onerror = function () { reject(new Error("No se pudo leer la imagen")); };
    i.src = crudo;
  });
  const MAX_LADO = 1600;
  if (crudo.length <= LIMITE && img.width <= MAX_LADO && img.height <= MAX_LADO) return crudo;
  const escala = Math.min(1, MAX_LADO / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * escala);
  canvas.height = Math.round(img.height * escala);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  let calidad = 0.88;
  let salida = canvas.toDataURL("image/webp", calidad);
  while (salida.length > LIMITE && calidad > 0.4) {
    calidad -= 0.12;
    salida = canvas.toDataURL("image/webp", calidad);
  }
  return salida;
}

async function subirImagen(file, nombreSugerido) {
  const dataBase64 = await leerArchivoComoDataURL(file);
  const data = await apiFetch("/api/admin/upload", { method: "POST", body: { dataBase64: dataBase64, nombre: nombreSugerido || file.name } });
  return data.url;
}

/* ==========================================================================
   PÁGINA: LOGIN
   ========================================================================== */

if (PAGINA === "login") {
  document.addEventListener("DOMContentLoaded", async function () {
    // Si ya hay una sesión activa, saltamos directo al dashboard.
    try {
      const sesion = await apiFetch("/api/admin/session");
      if (sesion.authenticated) {
        window.location.href = "/paneladmin/";
        return;
      }
    } catch (e) { /* seguimos mostrando el login */ }

    const form = document.getElementById("loginForm");
    const errorEl = document.getElementById("loginError");
    const btn = document.getElementById("loginBtn");

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      errorEl.hidden = true;
      btn.disabled = true;
      btn.textContent = "Ingresando…";

      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;

      try {
        await apiFetch("/api/admin/login", { method: "POST", body: { email: email, password: password } });
        window.location.href = "/paneladmin/";
      } catch (err) {
        const esErrorDeConexion = err.status === undefined;
        errorEl.textContent = esErrorDeConexion
          ? "No se pudo conectar con el servidor. Entrá por la dirección http de tu servidor (por ejemplo http://localhost:3000/paneladmin), no abriendo el archivo directamente."
          : (err.message || "No se pudo iniciar sesión.");
        errorEl.hidden = false;
        btn.disabled = false;
        btn.textContent = "Ingresar";
      }
    });
  });
}

/* ==========================================================================
   PÁGINA: DASHBOARD
   ========================================================================== */

if (PAGINA === "dashboard") {

  let categorias = [];
  let productos = [];
  let config = {};

  // Estado del formulario de producto abierto en el modal
  let tallesActuales = [];
  let imagenPrincipalUrl = null;
  let galeriaUrls = [];

  document.addEventListener("DOMContentLoaded", async function () {
    const sesion = await verificarSesionODevolver();
    if (!sesion) return;

    document.getElementById("adminUserEmail").textContent = sesion.email;

    try {
      await cargarDatos();
    } catch (e) {
      mostrarErrorConexion();
      return;
    }

    inicializarNav();
    inicializarProductos();
    inicializarStock();
    inicializarCategorias();
    inicializarConfig();
    if (typeof iniciarPersonalizacion === "function") {
      iniciarPersonalizacion({ inicial: config.personalizacion, nombreSitio: config.nombreSitio, toast: mostrarToast, apiFetch: apiFetch, subirImagen: subirImagen });
    }
    inicializarModales();
    inicializarLogout();

    renderDashboard();
  });

  function mostrarErrorConexion() {
    document.querySelector(".admin-main").innerHTML =
      '<div class="admin-conn-error">' +
        "<h1>No se pudo conectar con el servidor</h1>" +
        "<p>El panel necesita que el servidor esté corriendo (<code>node server.js</code>) y hay que entrar por su dirección http (por ejemplo <code>http://localhost:3000/paneladmin</code> o la URL de tu hosting), nunca abriendo el archivo HTML directamente desde la computadora.</p>" +
        '<a class="btn-admin btn-admin-primary" href="' + window.location.href + '">Reintentar</a>' +
      "</div>";
  }

  async function verificarSesionODevolver() {
    let sesion;
    try {
      sesion = await apiFetch("/api/admin/session");
    } catch (e) {
      mostrarErrorConexion();
      return null;
    }
    if (!sesion.authenticated) {
      window.location.href = "/paneladmin/login.html";
      return null;
    }
    return sesion;
  }

  async function cargarDatos() {
    const [resCat, resProd, resConfig] = await Promise.all([
      fetch("/api/categorias").then(function (r) { return r.json(); }),
      apiFetch("/api/admin/productos"),
      apiFetch("/api/admin/config")
    ]);
    categorias = resCat.categorias;
    productos = resProd.productos;
    config = resConfig.config;
  }

  function mostrarToast(mensaje, esError) {
    const toast = document.getElementById("adminToast");
    toast.textContent = mensaje;
    toast.classList.toggle("error", !!esError);
    toast.hidden = false;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () { toast.hidden = true; }, 3200);
  }

  function esc(t) {
    return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* ---------------- Cálculo de stock ---------------- */

  function umbralProducto(p) {
    if (p.stockMinimo !== null && p.stockMinimo !== undefined) return p.stockMinimo;
    return typeof config.stockBajoGeneral === "number" ? config.stockBajoGeneral : 3;
  }

  function totalStock(p) {
    if (!Array.isArray(p.stock)) return null;
    return p.stock.reduce(function (a, v) { return a + v.cantidad; }, 0);
  }

  /** "sin" = nada en stock, "bajo" = alguna variante en o debajo del umbral, "ok" = todo bien, "nd" = no se controla. */
  function estadoStock(p) {
    if (!Array.isArray(p.stock) || p.stock.length === 0) return "nd";
    if (totalStock(p) === 0) return "sin";
    const u = umbralProducto(p);
    return p.stock.some(function (v) { return v.cantidad <= u; }) ? "bajo" : "ok";
  }

  function variantesParaReponer(p) {
    if (!Array.isArray(p.stock)) return [];
    const u = umbralProducto(p);
    return p.stock.filter(function (v) { return v.cantidad <= u; });
  }

  function etiquetaVariante(v) {
    return [v.talle, v.color].filter(Boolean).join(" · ") || "Único";
  }

  function badgeEstado(est) {
    if (est === "sin") return '<span class="badge badge-off">Agotado</span>';
    if (est === "bajo") return '<span class="badge badge-warn">Stock bajo</span>';
    if (est === "ok") return '<span class="badge badge-ok">OK</span>';
    return '<span class="badge badge-muted">Sin control</span>';
  }

  function nombreCategoria(id) {
    const c = categorias.find(function (c) { return c.id === id; });
    return c ? c.nombre : "—";
  }

  /* ---------------- Navegación entre vistas ---------------- */

  function inicializarNav() {
    const botones = document.querySelectorAll(".admin-nav-item");
    botones.forEach(function (btn) {
      btn.addEventListener("click", function () { irAVista(btn.dataset.view); });
    });

    document.querySelectorAll(".quick-link").forEach(function (btn) {
      btn.addEventListener("click", function () {
        irAVista(btn.dataset.view);
        if (btn.dataset.action === "nuevo-producto") abrirModalProducto(null);
        if (btn.dataset.action === "nueva-categoria") abrirModalCategoria(null);
      });
    });
  }

  function irAVista(vista) {
    document.querySelectorAll(".admin-view").forEach(function (v) { v.hidden = true; });
    document.querySelectorAll(".admin-nav-item").forEach(function (b) { b.classList.toggle("active", b.dataset.view === vista); });
    const target = document.getElementById("view-" + vista);
    if (target) target.hidden = false;
    if (vista === "dashboard") renderDashboard();
    if (vista === "stock") renderStock();
  }

  function renderDashboard() {
    const disponibles = productos.filter(function (p) { return p.disponible !== false && estadoStock(p) !== "sin"; }).length;
    const sinStock = productos.length - disponibles;
    const bajos = productos.filter(function (p) { return estadoStock(p) === "bajo"; }).length;
    const stats = [
      { valor: productos.length, label: "Productos" },
      { valor: categorias.length, label: "Categorías" },
      { valor: disponibles, label: "Disponibles" },
      { valor: sinStock, label: "Sin stock" },
      { valor: bajos, label: "Con stock bajo", clase: bajos ? "stat-warn" : "" }
    ];
    document.getElementById("statsGrid").innerHTML = stats.map(function (s) {
      return '<div class="stat-card ' + (s.clase || "") + '"><div class="stat-value">' + s.valor + '</div><div class="stat-label">' + s.label + "</div></div>";
    }).join("");

    // alerta y lista para reponer
    const alertas = productos.filter(function (p) { const e = estadoStock(p); return e === "bajo" || e === "sin"; });
    const banner = document.getElementById("alertaStock");
    const card = document.getElementById("reponerCard");
    const badgeNav = document.getElementById("navStockBadge");
    if (alertas.length === 0) {
      banner.hidden = true;
      card.hidden = true;
      badgeNav.hidden = true;
    } else {
      const n = alertas.length;
      banner.innerHTML = '<strong>⚠ ' + n + (n === 1 ? " producto necesita" : " productos necesitan") + ' reposición.</strong> ' +
        '<button type="button" class="link-btn" id="irAStockBajo">Ver en Stock</button>';
      banner.hidden = false;
      document.getElementById("irAStockBajo").addEventListener("click", function () {
        document.getElementById("filtroEstadoStock").value = "bajo";
        irAVista("stock");
      });
      badgeNav.textContent = n;
      badgeNav.hidden = false;
      card.hidden = false;
      document.getElementById("listaReponer").innerHTML = '<table class="admin-table reponer-table"><thead><tr><th>Casillero</th><th>Producto</th><th>Talle / color</th><th>Quedan</th></tr></thead><tbody>' +
        alertas.map(function (p) {
          return variantesParaReponer(p).map(function (v) {
            return "<tr><td><span class=\"casillero-tag\">" + esc(p.casillero || "—") + "</span></td><td>" + esc(p.nombre) + "</td><td>" + esc(etiquetaVariante(v)) + "</td>" +
              '<td><span class="badge ' + (v.cantidad === 0 ? "badge-off" : "badge-warn") + '">' + v.cantidad + "</span></td></tr>";
          }).join("");
        }).join("") + "</tbody></table>";
    }
  }

  /* ---------------- Vista Stock (por casillero) ---------------- */

  function inicializarStock() {
    document.getElementById("filtroStock").addEventListener("input", renderStock);
    document.getElementById("filtroEstadoStock").addEventListener("change", renderStock);
  }

  function renderStock() {
    const termino = document.getElementById("filtroStock").value.trim().toLowerCase();
    const estado = document.getElementById("filtroEstadoStock").value;

    let lista = productos.filter(function (p) {
      if (termino && !(p.nombre.toLowerCase().includes(termino) || (p.casillero || "").toLowerCase().includes(termino))) return false;
      const e = estadoStock(p);
      if (estado === "bajo") return e === "bajo" || e === "sin";
      if (estado === "sin") return e === "sin";
      return true;
    });

    const grupos = {};
    lista.forEach(function (p) {
      const k = p.casillero || "";
      (grupos[k] = grupos[k] || []).push(p);
    });
    const claves = Object.keys(grupos).sort(function (a, b) {
      if (a === "") return 1;
      if (b === "") return -1;
      return a.localeCompare(b, "es", { numeric: true });
    });

    const cont = document.getElementById("stockContenido");
    document.getElementById("stockVacio").hidden = claves.length > 0;

    cont.innerHTML = claves.map(function (k) {
      return '<div class="casillero-group"><h2 class="casillero-title"><span class="casillero-tag">' + (k ? esc(k) : "—") + "</span>" +
        (k ? "Casillero " + esc(k) : "Sin casillero asignado") + "</h2>" +
        grupos[k].map(function (p) {
          const est = estadoStock(p);
          const u = umbralProducto(p);
          const celdas = Array.isArray(p.stock) ? p.stock.map(function (v) {
            const cls = v.cantidad === 0 ? "v-sin" : (v.cantidad <= u ? "v-bajo" : "");
            return '<label class="variante ' + cls + '"><span>' + esc(etiquetaVariante(v)) + '</span>' +
              '<input type="number" min="0" step="1" value="' + v.cantidad + '" data-sid="' + esc(p.id) + '" data-st="' + esc(v.talle) + '" data-sc="' + esc(v.color) + '"></label>';
          }).join("") : '<p class="admin-card-hint">Este producto no controla stock. Editalo para cargar las cantidades.</p>';
          return '<div class="stock-producto"><div class="stock-producto-head"><strong>' + esc(p.nombre) + "</strong>" + badgeEstado(est) +
            '<span class="stock-total">Total: ' + (totalStock(p) === null ? "—" : totalStock(p)) + " · aviso en " + u + " o menos</span></div>" +
            '<div class="variantes">' + celdas + "</div></div>";
        }).join("") + "</div>";
    }).join("");

    cont.querySelectorAll("input[data-sid]").forEach(function (inp) {
      inp.addEventListener("change", async function () {
        const valor = Math.floor(Number(inp.value));
        if (!isFinite(valor) || valor < 0) { inp.value = 0; return; }
        try {
          await apiFetch("/api/admin/stock", { method: "PUT", body: { productoId: inp.dataset.sid, talle: inp.dataset.st, color: inp.dataset.sc, cantidad: valor } });
          const prod = productos.find(function (p) { return p.id === inp.dataset.sid; });
          const v = prod.stock.find(function (x) { return x.talle === inp.dataset.st && x.color === inp.dataset.sc; });
          v.cantidad = valor;
          renderDashboard();
          renderStock();
          mostrarToast("Stock guardado.");
        } catch (err) {
          mostrarToast(err.message, true);
        }
      });
    });
  }

  function inicializarLogout() {
    document.getElementById("logoutBtn").addEventListener("click", async function () {
      try { await apiFetch("/api/admin/logout", { method: "POST" }); } catch (e) {}
      window.location.href = "/paneladmin/login.html";
    });
  }

  /* ==========================================================================
     PRODUCTOS
     ========================================================================== */

  function inicializarProductos() {
    document.getElementById("btnNuevoProducto").addEventListener("click", function () { abrirModalProducto(null); });
    document.getElementById("filtroProductos").addEventListener("input", renderTablaProductos);
    document.getElementById("filtroCategoriaProductos").addEventListener("change", renderTablaProductos);

    document.getElementById("tallesNuevo").addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        agregarTalle(this.value);
        this.value = "";
      }
    });

    document.getElementById("btnAgregarColor").addEventListener("click", function () {
      agregarFilaColor({ nombre: "", hex: "#1a1a1a" });
    });

    document.getElementById("imagenPrincipalInput").addEventListener("change", async function (e) {
      const file = e.target.files[0];
      if (!file) return;
      const preview = document.getElementById("imagenPrincipalPreview");
      preview.innerHTML = "<span>Subiendo…</span>";
      try {
        const url = await subirImagen(file, "principal");
        imagenPrincipalUrl = url;
        preview.innerHTML = '<img src="' + url + '" alt="Imagen principal">';
      } catch (err) {
        preview.innerHTML = "<span>Sin imagen</span>";
        mostrarToast("No se pudo subir la imagen: " + err.message, true);
      }
      e.target.value = "";
    });

    document.getElementById("galeriaInput").addEventListener("change", async function (e) {
      const file = e.target.files[0];
      if (!file) return;
      const idxTemp = galeriaUrls.length;
      galeriaUrls.push(null);
      renderGaleria();
      try {
        const url = await subirImagen(file, "galeria");
        galeriaUrls[idxTemp] = url;
      } catch (err) {
        galeriaUrls.splice(idxTemp, 1);
        mostrarToast("No se pudo subir la imagen: " + err.message, true);
      }
      renderGaleria();
      e.target.value = "";
    });

    document.getElementById("formProducto").addEventListener("submit", guardarProducto);

    renderFiltroCategorias();
    renderTablaProductos();
  }

  function renderFiltroCategorias() {
    const select = document.getElementById("filtroCategoriaProductos");
    select.innerHTML = '<option value="todas">Todas las categorías</option>' +
      categorias.map(function (c) { return '<option value="' + c.id + '">' + c.nombre + "</option>"; }).join("");

    const selectModal = document.getElementById("pCategoria");
    selectModal.innerHTML = categorias.map(function (c) { return '<option value="' + c.id + '">' + c.nombre + "</option>"; }).join("");
  }

  function renderTablaProductos() {
    const termino = document.getElementById("filtroProductos").value.trim().toLowerCase();
    const catFiltro = document.getElementById("filtroCategoriaProductos").value;

    let lista = productos.slice();
    if (catFiltro && catFiltro !== "todas") lista = lista.filter(function (p) { return p.categoriaId === catFiltro; });
    if (termino) lista = lista.filter(function (p) { return p.nombre.toLowerCase().includes(termino); });

    const tbody = document.getElementById("tablaProductos");
    const vacio = document.getElementById("productosVacio");

    if (lista.length === 0) {
      tbody.innerHTML = "";
      vacio.hidden = false;
      return;
    }
    vacio.hidden = true;

    tbody.innerHTML = lista.map(function (p) {
      const thumb = p.imagenPrincipal
        ? '<img class="tabla-thumb" src="' + p.imagenPrincipal + '" alt="">'
        : '<div class="tabla-thumb-placeholder">Sin foto</div>';
      const disponible = p.disponible !== false && estadoStock(p) !== "sin";
      const badge = disponible
        ? '<span class="badge badge-ok">Disponible</span>'
        : '<span class="badge badge-off">Sin stock</span>';
      return (
        "<tr>" +
          "<td>" + thumb + "</td>" +
          "<td>" + p.nombre + (p.destacado ? " ⭐" : "") + "</td>" +
          "<td>" + nombreCategoria(p.categoriaId) + "</td>" +
          '<td><span class="casillero-tag">' + esc(p.casillero || "—") + "</span></td>" +
          "<td>$" + Number(p.precio).toLocaleString("es-AR") + "</td>" +
          "<td>" + badgeEstado(estadoStock(p)) + (totalStock(p) === null ? "" : ' <small class="stock-mini">' + totalStock(p) + " u.</small>") + "</td>" +
          "<td>" + badge + "</td>" +
          '<td><div class="tabla-acciones">' +
            '<button type="button" data-editar="' + p.id + '">Editar</button>' +
            '<button type="button" class="btn-eliminar" data-eliminar="' + p.id + '">Eliminar</button>' +
          "</div></td>" +
        "</tr>"
      );
    }).join("");

    tbody.querySelectorAll("[data-editar]").forEach(function (btn) {
      btn.addEventListener("click", function () { abrirModalProducto(btn.dataset.editar); });
    });
    tbody.querySelectorAll("[data-eliminar]").forEach(function (btn) {
      btn.addEventListener("click", function () { confirmarEliminarProducto(btn.dataset.eliminar); });
    });
  }

  function agregarTalle(valor) {
    const v = valor.trim();
    if (!v) return;
    if (tallesActuales.some(function (t) { return t.toLowerCase() === v.toLowerCase(); })) return;
    tallesActuales.push(v);
    renderTalles();
    renderStockGrid();
  }

  function renderTalles() {
    document.getElementById("tallesList").innerHTML = tallesActuales.map(function (t, i) {
      return '<span class="tag-chip">' + t + '<button type="button" data-quitar-talle="' + i + '">&times;</button></span>';
    }).join("");
    document.querySelectorAll("[data-quitar-talle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        tallesActuales.splice(Number(btn.dataset.quitarTalle), 1);
        renderTalles();
        renderStockGrid();
      });
    });
  }

  function agregarFilaColor(color) {
    const lista = document.getElementById("coloresList");
    const row = document.createElement("div");
    row.className = "color-row";
    row.innerHTML =
      '<input type="color" value="' + (color.hex || "#1a1a1a") + '">' +
      '<input type="text" placeholder="Nombre del color (ej: Negro)" value="' + (color.nombre || "") + '">' +
      '<button type="button" title="Quitar color">&times;</button>';
    row.querySelector("button").addEventListener("click", function () { row.remove(); renderStockGrid(); });
    row.querySelector('input[type="text"]').addEventListener("input", function () { clearTimeout(renderStockGrid._t); renderStockGrid._t = setTimeout(renderStockGrid, 350); });
    lista.appendChild(row);
  }

  function leerColoresDelForm() {
    return Array.from(document.querySelectorAll("#coloresList .color-row")).map(function (row) {
      const inputs = row.querySelectorAll("input");
      return { hex: inputs[0].value, nombre: inputs[1].value.trim() };
    }).filter(function (c) { return c.nombre; });
  }

  /** Cantidades del formulario: se conservan al agregar o quitar talles y colores. */
  let stockForm = {};

  function claveStock(t, c) { return t + "\u0001" + c; }

  function leerStockDeGrilla() {
    document.querySelectorAll("#stockGrid input[data-t]").forEach(function (inp) {
      stockForm[claveStock(inp.dataset.t, inp.dataset.c)] = inp.value;
    });
  }

  function renderStockGrid() {
    leerStockDeGrilla();
    const talles = tallesActuales.length ? tallesActuales : ["Único"];
    const colores = leerColoresDelForm().map(function (c) { return c.nombre; });
    const cols = colores.length ? colores : [""];
    const cont = document.getElementById("stockGrid");
    cont.innerHTML = talles.map(function (t) {
      return cols.map(function (c) {
        const val = stockForm[claveStock(t, c)];
        return '<label class="variante"><span>' + esc(etiquetaVariante({ talle: t, color: c })) + '</span>' +
          '<input type="number" min="0" step="1" value="' + (val === undefined ? 0 : esc(val)) + '" data-t="' + esc(t) + '" data-c="' + esc(c) + '"></label>';
      }).join("");
    }).join("");
  }

  function leerStockDelForm() {
    leerStockDeGrilla();
    return Array.from(document.querySelectorAll("#stockGrid input[data-t]")).map(function (inp) {
      return { talle: inp.dataset.t, color: inp.dataset.c, cantidad: Math.max(0, Math.floor(Number(inp.value)) || 0) };
    });
  }

  function renderGaleria() {
    const grid = document.getElementById("galeriaGrid");
    grid.innerHTML = galeriaUrls.map(function (url, i) {
      if (!url) return '<div class="gallery-item uploading"></div>';
      return '<div class="gallery-item"><img src="' + url + '" alt=""><button type="button" data-quitar-galeria="' + i + '">&times;</button></div>';
    }).join("");
    grid.querySelectorAll("[data-quitar-galeria]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        galeriaUrls.splice(Number(btn.dataset.quitarGaleria), 1);
        renderGaleria();
      });
    });
  }

  function abrirModalProducto(id) {
    const producto = id ? productos.find(function (p) { return p.id === id; }) : null;

    document.getElementById("modalProductoTitulo").textContent = producto ? "Editar producto" : "Agregar producto";
    document.getElementById("productoId").value = producto ? producto.id : "";
    document.getElementById("pNombre").value = producto ? producto.nombre : "";
    document.getElementById("pCategoria").value = producto ? producto.categoriaId : (categorias[0] ? categorias[0].id : "");
    document.getElementById("pPrecio").value = producto ? producto.precio : "";
    document.getElementById("pDisponible").checked = producto ? producto.disponible !== false : true;
    document.getElementById("pDestacado").checked = producto ? !!producto.destacado : false;
    document.getElementById("pDescripcionCorta").value = producto ? (producto.descripcionCorta || "") : "";
    document.getElementById("pDescripcion").value = producto ? (producto.descripcion || "") : "";
    document.getElementById("productoFormError").hidden = true;

    tallesActuales = producto && Array.isArray(producto.talles) ? producto.talles.slice() : [];
    renderTalles();
    document.getElementById("tallesNuevo").value = "";

    document.getElementById("coloresList").innerHTML = "";
    const colores = producto && Array.isArray(producto.colores) ? producto.colores : [];
    colores.forEach(function (c) { agregarFilaColor(c); });

    document.getElementById("pCasillero").value = producto ? (producto.casillero || "") : "";
    document.getElementById("pStockMinimo").value = producto && producto.stockMinimo !== null && producto.stockMinimo !== undefined ? producto.stockMinimo : "";
    document.getElementById("pStockMinimoHint").textContent = "Vacío = usa el valor general (" + (config.stockBajoGeneral == null ? 3 : config.stockBajoGeneral) + ").";
    stockForm = {};
    document.getElementById("stockGrid").innerHTML = ""; // evita arrastrar valores del producto anterior
    if (producto && Array.isArray(producto.stock)) {
      producto.stock.forEach(function (v) { stockForm[claveStock(v.talle, v.color)] = v.cantidad; });
    }
    renderStockGrid();

    imagenPrincipalUrl = producto ? producto.imagenPrincipal : null;
    document.getElementById("imagenPrincipalPreview").innerHTML = imagenPrincipalUrl
      ? '<img src="' + imagenPrincipalUrl + '" alt="Imagen principal">'
      : "<span>Sin imagen</span>";

    galeriaUrls = producto && Array.isArray(producto.galeria) ? producto.galeria.slice() : [];
    renderGaleria();

    document.getElementById("modalProducto").hidden = false;
  }

  async function guardarProducto(e) {
    e.preventDefault();
    const errorEl = document.getElementById("productoFormError");
    errorEl.hidden = true;

    const id = document.getElementById("productoId").value;
    const payload = {
      nombre: document.getElementById("pNombre").value.trim(),
      categoriaId: document.getElementById("pCategoria").value,
      precio: Number(document.getElementById("pPrecio").value) || 0,
      disponible: document.getElementById("pDisponible").checked,
      destacado: document.getElementById("pDestacado").checked,
      descripcionCorta: document.getElementById("pDescripcionCorta").value.trim(),
      descripcion: document.getElementById("pDescripcion").value.trim(),
      talles: tallesActuales,
      colores: leerColoresDelForm(),
      imagenPrincipal: imagenPrincipalUrl,
      galeria: galeriaUrls.filter(Boolean),
      casillero: document.getElementById("pCasillero").value.trim(),
      stockMinimo: document.getElementById("pStockMinimo").value === "" ? null : Number(document.getElementById("pStockMinimo").value),
      stock: leerStockDelForm()
    };

    if (!payload.nombre || !payload.categoriaId) {
      errorEl.textContent = "Completá al menos el nombre y la categoría.";
      errorEl.hidden = false;
      return;
    }

    const btn = document.getElementById("btnGuardarProducto");
    btn.disabled = true;
    btn.textContent = "Guardando…";

    try {
      if (id) {
        await apiFetch("/api/admin/productos/" + encodeURIComponent(id), { method: "PUT", body: payload });
      } else {
        await apiFetch("/api/admin/productos", { method: "POST", body: payload });
      }
      await cargarDatos();
      renderFiltroCategorias();
      renderTablaProductos();
      renderDashboard();
      renderStock();
      cerrarModales();
      mostrarToast(id ? "Producto actualizado." : "Producto agregado.");
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = "Guardar producto";
    }
  }

  function confirmarEliminarProducto(id) {
    const producto = productos.find(function (p) { return p.id === id; });
    abrirConfirmacion({
      titulo: "Eliminar producto",
      texto: '¿Seguro que querés eliminar "' + (producto ? producto.nombre : id) + '"? Esta acción no se puede deshacer.',
      accion: async function () {
        await apiFetch("/api/admin/productos/" + encodeURIComponent(id), { method: "DELETE" });
        await cargarDatos();
        renderTablaProductos();
        renderDashboard();
        mostrarToast("Producto eliminado.");
      }
    });
  }

  /* ==========================================================================
     CATEGORÍAS
     ========================================================================== */

  function inicializarCategorias() {
    document.getElementById("btnNuevaCategoria").addEventListener("click", function () { abrirModalCategoria(null); });
    document.getElementById("formCategoria").addEventListener("submit", guardarCategoria);
    renderTablaCategorias();
  }

  function renderTablaCategorias() {
    const tbody = document.getElementById("tablaCategorias");
    tbody.innerHTML = categorias.map(function (c) {
      const cantidad = productos.filter(function (p) { return p.categoriaId === c.id; }).length;
      return (
        "<tr>" +
          "<td>" + c.nombre + "</td>" +
          "<td>" + cantidad + "</td>" +
          '<td><div class="tabla-acciones">' +
            '<button type="button" data-editar-cat="' + c.id + '">Editar</button>' +
            '<button type="button" class="btn-eliminar" data-eliminar-cat="' + c.id + '">Eliminar</button>' +
          "</div></td>" +
        "</tr>"
      );
    }).join("");

    tbody.querySelectorAll("[data-editar-cat]").forEach(function (btn) {
      btn.addEventListener("click", function () { abrirModalCategoria(btn.dataset.editarCat); });
    });
    tbody.querySelectorAll("[data-eliminar-cat]").forEach(function (btn) {
      btn.addEventListener("click", function () { confirmarEliminarCategoria(btn.dataset.eliminarCat); });
    });
  }

  function abrirModalCategoria(id) {
    const categoria = id ? categorias.find(function (c) { return c.id === id; }) : null;
    document.getElementById("modalCategoriaTitulo").textContent = categoria ? "Editar categoría" : "Agregar categoría";
    document.getElementById("categoriaId").value = categoria ? categoria.id : "";
    document.getElementById("categoriaNombre").value = categoria ? categoria.nombre : "";
    document.getElementById("categoriaFormError").hidden = true;
    document.getElementById("modalCategoria").hidden = false;
  }

  async function guardarCategoria(e) {
    e.preventDefault();
    const errorEl = document.getElementById("categoriaFormError");
    errorEl.hidden = true;
    const id = document.getElementById("categoriaId").value;
    const nombre = document.getElementById("categoriaNombre").value.trim();
    if (!nombre) { errorEl.textContent = "Ingresá un nombre."; errorEl.hidden = false; return; }

    try {
      if (id) {
        await apiFetch("/api/admin/categorias/" + encodeURIComponent(id), { method: "PUT", body: { nombre: nombre } });
      } else {
        await apiFetch("/api/admin/categorias", { method: "POST", body: { nombre: nombre } });
      }
      await cargarDatos();
      renderFiltroCategorias();
      renderTablaCategorias();
      renderTablaProductos();
      renderDashboard();
      cerrarModales();
      mostrarToast(id ? "Categoría actualizada." : "Categoría agregada.");
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    }
  }

  function confirmarEliminarCategoria(id) {
    const categoria = categorias.find(function (c) { return c.id === id; });
    abrirConfirmacion({
      titulo: "Eliminar categoría",
      texto: '¿Seguro que querés eliminar "' + (categoria ? categoria.nombre : id) + '"?',
      accion: async function () {
        await apiFetch("/api/admin/categorias/" + encodeURIComponent(id), { method: "DELETE" });
        await cargarDatos();
        renderFiltroCategorias();
        renderTablaCategorias();
        renderDashboard();
        mostrarToast("Categoría eliminada.");
      }
    });
  }

  /* ==========================================================================
     CONFIGURACIÓN
     ========================================================================== */

  function inicializarConfig() {
    actualizarPreviewLogo();
    document.getElementById("configNombre").value = config.nombreSitio || "";
    document.getElementById("configWhatsapp").value = config.whatsappNumero || "";
    document.getElementById("configStockBajo").value = typeof config.stockBajoGeneral === "number" ? config.stockBajoGeneral : 3;

    document.getElementById("formStock").addEventListener("submit", async function (e) {
      e.preventDefault();
      const msg = document.getElementById("stockSaveMsg");
      msg.textContent = "";
      msg.classList.remove("error");
      try {
        const data = await apiFetch("/api/admin/config", { method: "PUT", body: { stockBajoGeneral: Number(document.getElementById("configStockBajo").value) } });
        config = data.config;
        renderDashboard();
        msg.textContent = "Guardado ✓";
        setTimeout(function () { msg.textContent = ""; }, 2500);
      } catch (err) {
        msg.textContent = err.message;
        msg.classList.add("error");
      }
    });

    document.getElementById("logoInput").addEventListener("change", async function (e) {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const dataBase64 = await leerArchivoComoDataURL(file);
        const data = await apiFetch("/api/admin/logo", { method: "POST", body: { dataBase64: dataBase64 } });
        config = data.config;
        actualizarPreviewLogo();
        mostrarToast("Logo actualizado.");
      } catch (err) {
        mostrarToast("No se pudo subir el logo: " + err.message, true);
      }
      e.target.value = "";
    });

    document.getElementById("btnQuitarLogo").addEventListener("click", async function () {
      try {
        const data = await apiFetch("/api/admin/logo", { method: "DELETE" });
        config = data.config;
        actualizarPreviewLogo();
        mostrarToast("Logo quitado.");
      } catch (err) {
        mostrarToast(err.message, true);
      }
    });

    document.getElementById("formConfig").addEventListener("submit", async function (e) {
      e.preventDefault();
      const msg = document.getElementById("configSaveMsg");
      msg.textContent = "";
      msg.classList.remove("error");
      try {
        const data = await apiFetch("/api/admin/config", {
          method: "PUT",
          body: {
            nombreSitio: document.getElementById("configNombre").value.trim(),
            whatsappNumero: document.getElementById("configWhatsapp").value.trim()
          }
        });
        config = data.config;
        msg.textContent = "Guardado ✓";
        setTimeout(function () { msg.textContent = ""; }, 2500);
      } catch (err) {
        msg.textContent = err.message;
        msg.classList.add("error");
      }
    });

    document.getElementById("formPassword").addEventListener("submit", async function (e) {
      e.preventDefault();
      const msg = document.getElementById("passwordSaveMsg");
      msg.textContent = "";
      msg.classList.remove("error");
      const actual = document.getElementById("passwordActual").value;
      const nueva = document.getElementById("passwordNueva").value;
      try {
        await apiFetch("/api/admin/password", { method: "POST", body: { actual: actual, nueva: nueva } });
        msg.textContent = "Contraseña actualizada ✓";
        document.getElementById("formPassword").reset();
        setTimeout(function () { msg.textContent = ""; }, 2500);
      } catch (err) {
        msg.textContent = err.message;
        msg.classList.add("error");
      }
    });
  }

  function actualizarPreviewLogo() {
    const preview = document.getElementById("logoPreview");
    preview.innerHTML = config.logoUrl ? '<img src="' + config.logoUrl + '" alt="Logo">' : "<span>Sin logo</span>";
  }

  /* ==========================================================================
     MODALES (genérico)
     ========================================================================== */

  function inicializarModales() {
    document.querySelectorAll("[data-close-modal]").forEach(function (btn) {
      btn.addEventListener("click", cerrarModales);
    });
    document.querySelectorAll(".admin-modal-backdrop").forEach(function (backdrop) {
      backdrop.addEventListener("click", function (e) {
        if (e.target === backdrop) cerrarModales();
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") cerrarModales();
    });
  }

  function cerrarModales() {
    document.querySelectorAll(".admin-modal-backdrop").forEach(function (m) { m.hidden = true; });
  }

  function abrirConfirmacion(opts) {
    document.getElementById("confirmarTitulo").textContent = opts.titulo;
    document.getElementById("confirmarTexto").textContent = opts.texto;
    const errorEl = document.getElementById("confirmarError");
    errorEl.hidden = true;

    const btn = document.getElementById("confirmarBtn");
    const nuevoBtn = btn.cloneNode(true); // limpiamos listeners previos
    btn.parentNode.replaceChild(nuevoBtn, btn);

    nuevoBtn.addEventListener("click", async function () {
      nuevoBtn.disabled = true;
      nuevoBtn.textContent = "Eliminando…";
      try {
        await opts.accion();
        cerrarModales();
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.hidden = false;
      } finally {
        nuevoBtn.disabled = false;
        nuevoBtn.textContent = "Eliminar";
      }
    });

    document.getElementById("modalConfirmar").hidden = false;
  }
}
