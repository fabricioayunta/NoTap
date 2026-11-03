/* ==========================================================================
   NotApp — Lógica de la ficha de producto (datos desde la API)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", async function () {

  const footerWhatsapp = document.getElementById("footerWhatsapp");
  if (footerWhatsapp) footerWhatsapp.href = await construirLinkWhatsApp(mensajeContactoGeneral());

  const categorias = await obtenerCategorias();
  const footerCategorias = document.getElementById("footerCategorias");
  if (footerCategorias) {
    footerCategorias.innerHTML = categorias.map(function (cat) {
      return '<li><a href="catalogo.html?categoria=' + cat.id + '">' + cat.nombre + "</a></li>";
    }).join("");
  }

  const params = new URLSearchParams(window.location.search);
  const productoId = params.get("producto");
  const producto = productoId ? await obtenerProductoPorId(productoId) : null;

  const contenido = document.getElementById("productoContenido");
  const noEncontrado = document.getElementById("productoNoEncontrado");
  const breadcrumbs = document.getElementById("breadcrumbs");

  if (!producto) {
    noEncontrado.hidden = false;
    breadcrumbs.innerHTML = '<a href="index.html">Inicio</a> / <a href="catalogo.html">Productos</a> / <span style="color:var(--text)">No encontrado</span>';
    return;
  }

  contenido.hidden = false;

  /* ---- Breadcrumbs ---- */
  const nombreCat = obtenerNombreCategoria(categorias, producto.categoriaId);
  breadcrumbs.innerHTML =
    '<a href="index.html">Inicio</a> / <a href="catalogo.html">Productos</a> / ' +
    '<a href="catalogo.html?categoria=' + producto.categoriaId + '">' + nombreCat + '</a> / ' +
    '<span style="color:var(--text)">' + producto.nombre + '</span>';

  document.getElementById("pageTitle").textContent = producto.nombre + " — NotApp";
  document.getElementById("categoriaProducto").textContent = nombreCat;
  document.getElementById("nombreProducto").textContent = producto.nombre;
  document.getElementById("precioProducto").textContent = formatearPrecio(producto.precio);
  document.getElementById("descripcionProducto").textContent = producto.descripcion || producto.descripcionCorta || "";
  document.getElementById("infoCategoria").textContent = nombreCat;

  const infoDisponibilidad = document.getElementById("infoDisponibilidad");
  if (infoDisponibilidad) infoDisponibilidad.textContent = producto.disponible === false ? "Sin stock por el momento" : "Consultar por WhatsApp";

  /* ---- Galería: fotos reales si existen, si no el ícono de categoría ---- */
  const imagenPrincipalWrap = document.querySelector(".imagen-principal");
  const imagenProducto = document.getElementById("imagenProducto");
  const vistaIndicador = document.getElementById("vistaIndicador");
  const miniaturasEl = document.getElementById("miniaturas");
  const fotoAnterior = document.getElementById("fotoAnterior");
  const fotoSiguiente = document.getElementById("fotoSiguiente");

  const fotos = [];
  if (producto.imagenPrincipal) fotos.push(producto.imagenPrincipal);
  if (Array.isArray(producto.galeria)) fotos.push.apply(fotos, producto.galeria.filter(Boolean));

  const usaFotosReales = fotos.length > 0;
  const totalVistas = usaFotosReales ? fotos.length : 1;
  let vistaActual = 0;

  imagenPrincipalWrap.style.background = fondoDeCategoria(producto.categoriaId);

  function contenidoVista(index) {
    if (usaFotosReales) {
      return '<img src="' + fotos[index] + '" alt="' + producto.nombre + '">';
    }
    return iconoDeCategoria(producto.categoriaId);
  }

  miniaturasEl.innerHTML = "";
  if (usaFotosReales) {
    fotos.forEach(function (foto, i) {
      const mini = document.createElement("button");
      mini.className = "miniatura" + (i === 0 ? " activa" : "");
      mini.innerHTML = '<img src="' + foto + '" alt="Foto ' + (i + 1) + '">';
      mini.addEventListener("click", function () { irAVista(i); });
      miniaturasEl.appendChild(mini);
    });
  }

  function irAVista(index) {
    vistaActual = index;
    imagenProducto.style.display = usaFotosReales ? "none" : "";
    imagenPrincipalWrap.querySelectorAll("img").forEach(function (i) { i.remove(); });
    if (usaFotosReales) {
      imagenPrincipalWrap.insertAdjacentHTML("afterbegin", contenidoVista(index));
    } else {
      imagenProducto.innerHTML = extraerContenidoSVG(iconoDeCategoria(producto.categoriaId));
      imagenProducto.style.transform = "rotate(" + (index * 6 - 9) + "deg)";
    }
    vistaIndicador.textContent = usaFotosReales ? ((index + 1) + "/" + totalVistas) : "Vista previa";
    vistaIndicador.hidden = totalVistas <= 1 && !usaFotosReales;
    Array.from(miniaturasEl.children).forEach(function (m, i) {
      m.classList.toggle("activa", i === index);
    });
    fotoAnterior.disabled = totalVistas <= 1;
    fotoSiguiente.disabled = totalVistas <= 1;
  }

  function extraerContenidoSVG(svgCompleto) {
    const inicio = svgCompleto.indexOf(">") + 1;
    const fin = svgCompleto.lastIndexOf("</svg>");
    return svgCompleto.slice(inicio, fin);
  }

  fotoAnterior.addEventListener("click", function () { irAVista((vistaActual - 1 + totalVistas) % totalVistas); });
  fotoSiguiente.addEventListener("click", function () { irAVista((vistaActual + 1) % totalVistas); });

  irAVista(0);
  if (totalVistas <= 1) {
    fotoAnterior.hidden = true;
    fotoSiguiente.hidden = true;
  }

  /* ---- Talles (propios del producto) ---- */
  const opcionesTalle = document.getElementById("opcionesTalle");
  const talleValor = document.getElementById("talleValor");
  const talles = Array.isArray(producto.talles) && producto.talles.length ? producto.talles : ["Único"];
  const agotadas = Array.isArray(producto.variantesAgotadas) ? producto.variantesAgotadas : [];
  function estaAgotada(talle, color) {
    const t = talle === null || talle === undefined ? "" : talle;
    return agotadas.some(function (v) { return v.talle === t && v.color === (color || ""); });
  }
  const nombresColor = Array.isArray(producto.colores) ? producto.colores.map(function (c) { return c.nombre; }) : [];
  function talleAgotado(talle) {
    const cols = nombresColor.length ? nombresColor : [""];
    return cols.every(function (c) { return estaAgotada(talle, c); });
  }
  // empezar en la primera combinación que sí tiene stock
  let talleSeleccionado = talles.find(function (t) { return !talleAgotado(t); }) || talles[0];

  opcionesTalle.innerHTML = talles.map(function (talle) {
    return '<button type="button" class="opcion-talle' + (talleAgotado(talle) ? " agotado" : "") + '" data-talle="' + talle + '"' + (talleAgotado(talle) ? ' title="Sin stock"' : "") + ">" + talle + "</button>";
  }).join("");

  function seleccionarTalle(talle) {
    talleSeleccionado = talle;
    talleValor.textContent = "— " + talle;
    Array.from(opcionesTalle.children).forEach(function (btn) {
      btn.classList.toggle("activa", btn.dataset.talle === talle);
    });
    actualizarResumen();
  }
  opcionesTalle.querySelectorAll(".opcion-talle").forEach(function (btn) {
    btn.addEventListener("click", function () { seleccionarTalle(btn.dataset.talle); });
  });

  /* ---- Colores (propios del producto) ---- */
  const opcionesColor = document.getElementById("opcionesColor");
  const colorValor = document.getElementById("colorValor");
  const colorSection = opcionesColor.closest(".opcion-producto");
  const colores = Array.isArray(producto.colores) ? producto.colores : [];
  let colorSeleccionado = null;
  if (colores.length) {
    const libre = colores.find(function (c) { return !estaAgotada(talleSeleccionado, c.nombre); });
    colorSeleccionado = (libre || colores[0]).nombre;
  }

  if (colores.length === 0) {
    colorSection.hidden = true;
  } else {
    colorSection.hidden = false;
    opcionesColor.innerHTML = colores.map(function (c) {
      return '<button type="button" class="color" data-color="' + c.nombre + '" style="background:' + c.hex + '" title="' + c.nombre + '" aria-label="' + c.nombre + '"></button>';
    }).join("");
  }

  function seleccionarColor(nombre) {
    colorSeleccionado = nombre;
    colorValor.textContent = nombre ? "— " + nombre : "";
    Array.from(opcionesColor.children).forEach(function (btn) {
      btn.classList.toggle("activo", btn.dataset.color === nombre);
    });
    actualizarResumen();
  }
  opcionesColor.querySelectorAll(".color").forEach(function (btn) {
    btn.addEventListener("click", function () { seleccionarColor(btn.dataset.color); });
  });

  /* ---- Cantidad (mínimo 1) ---- */
  const cantidadEl = document.getElementById("cantidadProducto");
  const restarCantidad = document.getElementById("restarCantidad");
  const sumarCantidad = document.getElementById("sumarCantidad");
  let cantidad = 1;

  function actualizarCantidad() {
    cantidadEl.textContent = cantidad;
    restarCantidad.disabled = cantidad <= 1;
    actualizarResumen();
  }
  restarCantidad.addEventListener("click", function () { if (cantidad > 1) { cantidad--; actualizarCantidad(); } });
  sumarCantidad.addEventListener("click", function () { cantidad++; actualizarCantidad(); });

  /* ---- Resumen + link de WhatsApp ---- */
  const resumenSeleccion = document.getElementById("resumenSeleccion");
  const btnWhatsapp = document.getElementById("btnWhatsapp");

  async function actualizarResumen() {
    Array.from(opcionesColor.children).forEach(function (btn) {
      btn.classList.toggle("agotado", estaAgotada(talleSeleccionado, btn.dataset.color));
    });
    const sinStockCombo = estaAgotada(talleSeleccionado, colorSeleccionado);
    let aviso = document.getElementById("avisoSinStock");
    if (!aviso) {
      aviso = document.createElement("p");
      aviso.id = "avisoSinStock";
      aviso.className = "aviso-sin-stock";
      resumenSeleccion.parentNode.insertBefore(aviso, resumenSeleccion);
    }
    aviso.hidden = !sinStockCombo;
    aviso.textContent = "Esta combinación de talle y color está sin stock por ahora. Podés consultar por WhatsApp cuándo vuelve.";

    let resumen = "Vas a consultar por: <strong>" + producto.nombre + "</strong>";
    if (talles.length && talles[0] !== "Único") resumen += " — Talle <strong>" + talleSeleccionado + "</strong>";
    if (colorSeleccionado) resumen += ", color <strong>" + colorSeleccionado + "</strong>";
    resumen += ", cantidad <strong>" + cantidad + "</strong>.";
    resumenSeleccion.innerHTML = resumen;

    const mensaje = mensajeConsultaProducto(producto, talles[0] !== "Único" ? talleSeleccionado : null, colorSeleccionado, cantidad);
    btnWhatsapp.href = await construirLinkWhatsApp(mensaje);
  }

  if (producto.disponible === false) {
    btnWhatsapp.innerHTML = btnWhatsapp.innerHTML.replace("Consultar por WhatsApp", "Consultar disponibilidad");
  }

  seleccionarTalle(talleSeleccionado);
  seleccionarColor(colorSeleccionado);
  actualizarCantidad();

  /* ---- Productos relacionados (misma categoría) ---- */
  const todos = await obtenerProductos();
  const relacionados = todos.filter(function (p) {
    return p.categoriaId === producto.categoriaId && p.id !== producto.id;
  }).slice(0, 4);

  if (relacionados.length > 0) {
    document.getElementById("relacionadosSection").hidden = false;
    document.getElementById("relacionadosGrid").innerHTML = relacionados.map(function (p) { return renderProductCard(p, categorias); }).join("");
  }
});
