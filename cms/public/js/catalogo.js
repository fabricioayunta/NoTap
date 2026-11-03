/* ==========================================================================
   NotApp — Lógica de la página de catálogo (datos desde la API)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", async function () {

  const filterPills = document.getElementById("filterPills");
  const productGrid = document.getElementById("productGrid");
  const emptyState = document.getElementById("emptyState");
  const emptyStateText = document.getElementById("emptyStateText");
  const resultsCount = document.getElementById("resultsCount");
  const catalogTitle = document.getElementById("catalogTitle");
  const catalogSubtitle = document.getElementById("catalogSubtitle");
  const footerWhatsapp = document.getElementById("footerWhatsapp");

  const [categorias, productos] = await Promise.all([obtenerCategorias(), obtenerProductos()]);

  if (footerWhatsapp) footerWhatsapp.href = await construirLinkWhatsApp(mensajeContactoGeneral());

  const footerCategorias = document.getElementById("footerCategorias");
  if (footerCategorias) {
    footerCategorias.innerHTML = categorias.map(function (cat) {
      return '<li><a href="catalogo.html?categoria=' + cat.id + '">' + cat.nombre + "</a></li>";
    }).join("");
  }

  /* ---- Pills de categoría ("Ver todos" + cada categoría existente) ---- */
  const pillsData = [{ id: "todos", nombre: "Ver todos" }].concat(categorias);
  filterPills.innerHTML = pillsData.map(function (cat) {
    return '<button type="button" class="filter-pill" data-cat="' + cat.id + '">' + cat.nombre + "</button>";
  }).join("");

  const pillButtons = Array.from(filterPills.querySelectorAll(".filter-pill"));

  function leerParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      categoria: params.get("categoria") || "todos",
      buscar: params.get("buscar") || ""
    };
  }

  function actualizarURL(categoria, buscar) {
    const params = new URLSearchParams();
    if (categoria && categoria !== "todos") params.set("categoria", categoria);
    if (buscar) params.set("buscar", buscar);
    const query = params.toString();
    const nuevaURL = window.location.pathname + (query ? "?" + query : "");
    window.history.pushState({}, "", nuevaURL);
  }

  function render(categoria, buscar) {
    let resultado = obtenerProductosPorCategoria(productos, categoria);
    if (buscar) {
      const t = buscar.toLowerCase();
      resultado = resultado.filter(function (p) {
        return (
          p.nombre.toLowerCase().includes(t) ||
          (p.descripcionCorta || "").toLowerCase().includes(t) ||
          obtenerNombreCategoria(categorias, p.categoriaId).toLowerCase().includes(t)
        );
      });
    }

    pillButtons.forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.cat === categoria);
    });

    if (buscar) {
      catalogTitle.textContent = "Resultados para \u201c" + buscar + "\u201d";
      catalogSubtitle.textContent = categoria !== "todos"
        ? "Buscando dentro de " + obtenerNombreCategoria(categorias, categoria) + "."
        : "Buscando en todo el catálogo.";
    } else if (categoria !== "todos") {
      catalogTitle.textContent = obtenerNombreCategoria(categorias, categoria);
      catalogSubtitle.textContent = "Productos disponibles en esta categoría.";
    } else {
      catalogTitle.textContent = "Catálogo completo";
      catalogSubtitle.textContent = "Explorá todos nuestros productos para Jiu-Jitsu.";
    }

    if (resultado.length === 0) {
      productGrid.hidden = true;
      emptyState.hidden = false;
      emptyStateText.textContent = buscar
        ? "No encontramos productos que coincidan con \u201c" + buscar + "\u201d."
        : "No hay productos en esta categoría por el momento.";
      resultsCount.textContent = "";
    } else {
      productGrid.hidden = false;
      emptyState.hidden = true;
      productGrid.innerHTML = resultado.map(function (p) { return renderProductCard(p, categorias); }).join("");
      resultsCount.textContent = resultado.length + (resultado.length === 1 ? " producto" : " productos");
    }
  }

  pillButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const estado = leerParams();
      const nuevaCategoria = btn.dataset.cat;
      actualizarURL(nuevaCategoria, estado.buscar);
      render(nuevaCategoria, estado.buscar);
    });
  });

  const navSearchForm = document.querySelector("[data-nav-search]");
  if (navSearchForm) {
    navSearchForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const input = navSearchForm.querySelector("input");
      const termino = input.value.trim();
      const estado = leerParams();
      actualizarURL(estado.categoria, termino);
      render(estado.categoria, termino);
    });
  }

  window.addEventListener("popstate", function () {
    const estado = leerParams();
    render(estado.categoria, estado.buscar);
  });

  const inicial = leerParams();
  render(inicial.categoria, inicial.buscar);
});
