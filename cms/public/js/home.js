/* ==========================================================================
   NotApp — Lógica de la página de inicio (datos desde la API)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", async function () {

  const [categorias, productos] = await Promise.all([obtenerCategorias(), obtenerProductos()]);

  /* ---- Links de WhatsApp genéricos (CTA y footer) ---- */
  const linkGeneral = await construirLinkWhatsApp(mensajeContactoGeneral());
  const ctaWhatsapp = document.getElementById("ctaWhatsapp");
  const footerWhatsapp = document.getElementById("footerWhatsapp");
  if (ctaWhatsapp) ctaWhatsapp.href = linkGeneral;
  if (footerWhatsapp) footerWhatsapp.href = linkGeneral;

  /* ---- Grilla de categorías ---- */
  const catGrid = document.getElementById("catGrid");
  if (catGrid) {
    catGrid.innerHTML = categorias.map(function (cat) {
      return (
        '<a class="cat-card" href="catalogo.html?categoria=' + cat.id + '" style="background:' + fondoDeCategoria(cat.id) + '">' +
          iconoDeCategoria(cat.id) +
          "<span>" + cat.nombre + "</span>" +
        "</a>"
      );
    }).join("");
  }

  /* ---- Footer: lista de categorías ---- */
  const footerCategorias = document.getElementById("footerCategorias");
  if (footerCategorias) {
    footerCategorias.innerHTML = categorias.map(function (cat) {
      return '<li><a href="catalogo.html?categoria=' + cat.id + '">' + cat.nombre + "</a></li>";
    }).join("");
  }

  /* ---- Carrusel de productos destacados ---- */
  const carrusel = document.getElementById("carrusel");
  const btnAnterior = document.getElementById("btnAnterior");
  const btnSiguiente = document.getElementById("btnSiguiente");

  if (carrusel) {
    let destacados = productos.filter(function (p) { return p.destacado; });
    if (destacados.length === 0) destacados = productos.slice(0, 6);

    carrusel.innerHTML = destacados.map(function (p) { return renderProductCard(p, categorias); }).join("");

    let posicion = 0;
    const paso = 292; // ancho de card (270) + gap (22)

    function actualizarFlechas() {
      const maxScroll = carrusel.scrollWidth - carrusel.parentElement.clientWidth;
      btnAnterior.disabled = posicion <= 0;
      btnSiguiente.disabled = posicion >= maxScroll - 2;
    }

    function mover(delta) {
      const maxScroll = Math.max(0, carrusel.scrollWidth - carrusel.parentElement.clientWidth);
      posicion = Math.min(Math.max(0, posicion + delta), maxScroll);
      carrusel.style.transform = "translateX(-" + posicion + "px)";
      actualizarFlechas();
    }

    btnAnterior.addEventListener("click", function () { mover(-paso * 2); });
    btnSiguiente.addEventListener("click", function () { mover(paso * 2); });
    window.addEventListener("resize", actualizarFlechas);

    actualizarFlechas();
  }
});
