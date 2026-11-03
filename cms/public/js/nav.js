/* ==========================================================================
   NotApp — Navegación compartida (todas las páginas)
   Menú móvil, dropdown de Productos, buscador del navbar.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", function () {

  /* ---- Menú móvil (hamburguesa) ---- */
  const navToggle = document.getElementById("navToggle");
  const mainNav = document.getElementById("mainNav");

  if (navToggle && mainNav) {
    navToggle.addEventListener("click", function () {
      const abierto = mainNav.classList.toggle("open");
      navToggle.classList.toggle("open", abierto);
      navToggle.setAttribute("aria-expanded", abierto ? "true" : "false");
    });
  }

  /* ---- Dropdown de Productos ---- */
  const dropdownParent = document.querySelector(".has-dropdown");
  const dropdownToggle = document.querySelector(".dropdown-toggle");

  if (dropdownParent && dropdownToggle) {
    dropdownToggle.addEventListener("click", function (e) {
      // En mobile el link no debe navegar, debe desplegar
      if (window.innerWidth <= 860) {
        e.preventDefault();
        dropdownParent.classList.toggle("open");
      }
    });

    document.addEventListener("click", function (e) {
      if (window.innerWidth <= 860) return;
      if (!dropdownParent.contains(e.target)) {
        dropdownParent.classList.remove("open");
      }
    });
  }

  /* Cerrar el menú mobile al elegir un link normal */
  if (mainNav) {
    mainNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        if (window.innerWidth <= 860 && !link.closest(".dropdown-toggle")) {
          mainNav.classList.remove("open");
          if (navToggle) {
            navToggle.classList.remove("open");
            navToggle.setAttribute("aria-expanded", "false");
          }
        }
      });
    });
  }

  /* ---- Buscador del navbar ----
     En catalogo.html el propio catalogo.js maneja el submit (filtra sin
     recargar y conserva la categoría activa). En el resto de las páginas,
     el buscador redirige a catalogo.html con el término. */
  const navSearchForm = document.querySelector("[data-nav-search]");
  const estamosEnCatalogo = /catalogo\.html$/.test(window.location.pathname);

  if (navSearchForm) {
    const params = new URLSearchParams(window.location.search);
    const buscarActual = params.get("buscar");
    const input = navSearchForm.querySelector("input");
    if (buscarActual && input) input.value = buscarActual;

    if (!estamosEnCatalogo) {
      navSearchForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const termino = input.value.trim();
        const destino = "catalogo.html" + (termino ? "?buscar=" + encodeURIComponent(termino) : "");
        window.location.href = destino;
      });
    }
  }

  /* ---- Año del footer ---- */
  const yearEl = document.getElementById("footerYear");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});
