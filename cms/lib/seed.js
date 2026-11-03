/* ==========================================================================
   NotApp CMS — Datos de ejemplo
   Se cargan una sola vez, cuando la base de datos está vacía.
   ========================================================================== */

const { listaTalles, listaColores } = require("./stock");

function datosIniciales() {
  return {
    categorias: [
      { id: "kimonos", nombre: "Kimonos" },
      { id: "rashguards", nombre: "Rashguards" },
      { id: "cinturones", nombre: "Cinturones" },
      { id: "shorts", nombre: "Shorts" },
      { id: "accesorios", nombre: "Accesorios" }
    ],
    productos: [
      {
        id: "kimono-tradicional",
        nombre: "Kimono Jiu-Jitsu Tradicional",
        categoriaId: "kimonos",
        precio: 120000,
        disponible: true,
        destacado: true,
        descripcionCorta: "Kimono de trenzado grueso, pensado para entrenamiento diario.",
        descripcion: "Kimono tradicional de algodón de trenzado grueso (pearl weave), reforzado en las zonas de mayor exigencia. Pantalón con cordón resistente y cinturón incluido.",
        talles: ["A0", "A1", "A2", "A3", "A4"],
        colores: [{ nombre: "Negro", hex: "#1a1a1a" }, { nombre: "Blanco", hex: "#f5f5f5" }, { nombre: "Azul", hex: "#1e4d8c" }],
        imagenPrincipal: null,
        galeria: []
      },
      {
        id: "kimono-competicion",
        nombre: "Kimono Jiu-Jitsu Competición",
        categoriaId: "kimonos",
        precio: 145000,
        disponible: true,
        destacado: false,
        descripcionCorta: "Corte ajustado homologado para torneos, tela premium.",
        descripcion: "Kimono de competición con corte ajustado y tela premium de bajo gramaje. Costuras reforzadas triple pespunte.",
        talles: ["A1", "A2", "A3", "A4"],
        colores: [{ nombre: "Negro", hex: "#1a1a1a" }, { nombre: "Blanco", hex: "#f5f5f5" }],
        imagenPrincipal: null,
        galeria: []
      },
      {
        id: "kimono-infantil",
        nombre: "Kimono Jiu-Jitsu Infantil",
        categoriaId: "kimonos",
        precio: 85000,
        disponible: true,
        destacado: true,
        descripcionCorta: "Liviano y resistente, pensado para las clases de chicos.",
        descripcion: "Kimono infantil de tela liviana pero resistente, con cordón de ajuste seguro y cinturón incluido.",
        talles: ["M0", "M1", "M2", "M3"],
        colores: [{ nombre: "Blanco", hex: "#f5f5f5" }, { nombre: "Azul", hex: "#1e4d8c" }],
        imagenPrincipal: null,
        galeria: []
      },
      {
        id: "rashguard-manga-larga",
        nombre: "Rashguard Manga Larga",
        categoriaId: "rashguards",
        precio: 35000,
        disponible: true,
        destacado: true,
        descripcionCorta: "Compresión total, costuras planas, secado rápido.",
        descripcion: "Rashguard de manga larga con tela de compresión de secado rápido. Costuras planas para evitar rozaduras durante el rodado.",
        talles: ["S", "M", "L", "XL"],
        colores: [{ nombre: "Negro", hex: "#1a1a1a" }, { nombre: "Azul", hex: "#1e4d8c" }, { nombre: "Gris", hex: "#8a8f94" }],
        imagenPrincipal: null,
        galeria: []
      },
      {
        id: "rashguard-manga-corta",
        nombre: "Rashguard Manga Corta",
        categoriaId: "rashguards",
        precio: 28000,
        disponible: true,
        destacado: false,
        descripcionCorta: "Versión liviana para entrenar en climas cálidos.",
        descripcion: "Versión de manga corta del rashguard clásico, con la misma compresión y tela de secado rápido.",
        talles: ["S", "M", "L", "XL"],
        colores: [{ nombre: "Negro", hex: "#1a1a1a" }, { nombre: "Blanco", hex: "#f5f5f5" }],
        imagenPrincipal: null,
        galeria: []
      },
      {
        id: "rashguard-mujer",
        nombre: "Rashguard Mujer Competición",
        categoriaId: "rashguards",
        precio: 32000,
        disponible: true,
        destacado: false,
        descripcionCorta: "Corte femenino, compresión suave y tela premium.",
        descripcion: "Rashguard con corte pensado específicamente para cuerpo femenino, compresión suave y tela premium de secado rápido.",
        talles: ["XS", "S", "M", "L"],
        colores: [{ nombre: "Negro", hex: "#1a1a1a" }, { nombre: "Bordó", hex: "#6e1f2a" }],
        imagenPrincipal: null,
        galeria: []
      },
      {
        id: "cinturon-blanco",
        nombre: "Cinturón Blanco",
        categoriaId: "cinturones",
        precio: 18000,
        disponible: true,
        destacado: false,
        descripcionCorta: "Algodón trenzado, punta reforzada, grado inicial.",
        descripcion: "Cinturón de algodón trenzado, punta reforzada con doble costura para mayor durabilidad.",
        talles: ["A1", "A2", "A3", "A4"],
        colores: [{ nombre: "Blanco", hex: "#f5f5f5" }],
        imagenPrincipal: null,
        galeria: []
      },
      {
        id: "cinturon-azul",
        nombre: "Cinturón Azul",
        categoriaId: "cinturones",
        precio: 18000,
        disponible: true,
        destacado: true,
        descripcionCorta: "Algodón trenzado, punta reforzada, grado azul.",
        descripcion: "Cinturón de algodón trenzado, punta reforzada con doble costura para mayor durabilidad.",
        talles: ["A1", "A2", "A3", "A4"],
        colores: [{ nombre: "Azul", hex: "#1e4d8c" }],
        imagenPrincipal: null,
        galeria: []
      },
      {
        id: "cinturon-negro",
        nombre: "Cinturón Negro",
        categoriaId: "cinturones",
        precio: 22000,
        disponible: true,
        destacado: false,
        descripcionCorta: "Algodón trenzado premium, remate en punta con barretes.",
        descripcion: "Cinturón de algodón trenzado premium, remate en punta con espacio para barretes de grado.",
        talles: ["A1", "A2", "A3", "A4"],
        colores: [{ nombre: "Negro", hex: "#1a1a1a" }],
        imagenPrincipal: null,
        galeria: []
      },
      {
        id: "short-fight",
        nombre: "Short Fight Shorts",
        categoriaId: "shorts",
        precio: 30000,
        disponible: true,
        destacado: true,
        descripcionCorta: "Tela elastizada, cierre por cordón, sin costuras internas.",
        descripcion: "Short estilo fight shorts en tela elastizada de secado rápido, cierre por cordón interno.",
        talles: ["S", "M", "L", "XL"],
        colores: [{ nombre: "Negro", hex: "#1a1a1a" }, { nombre: "Gris", hex: "#8a8f94" }],
        imagenPrincipal: null,
        galeria: []
      },
      {
        id: "short-grappling",
        nombre: "Short Grappling",
        categoriaId: "shorts",
        precio: 27000,
        disponible: true,
        destacado: false,
        descripcionCorta: "Corte más suelto, ideal para entrenamiento diario.",
        descripcion: "Short de corte más suelto que el fight short clásico, pensado para el entrenamiento diario de grappling.",
        talles: ["S", "M", "L", "XL"],
        colores: [{ nombre: "Negro", hex: "#1a1a1a" }, { nombre: "Azul", hex: "#1e4d8c" }],
        imagenPrincipal: null,
        galeria: []
      },
      {
        id: "guantes-entrenamiento",
        nombre: "Guantes de Entrenamiento",
        categoriaId: "accesorios",
        precio: 25000,
        disponible: true,
        destacado: true,
        descripcionCorta: "Acolchado en nudillos, cierre de velcro ajustable.",
        descripcion: "Guantes de entrenamiento con acolchado en la zona de nudillos y cierre de velcro ajustable.",
        talles: ["S", "M", "L"],
        colores: [{ nombre: "Negro", hex: "#1a1a1a" }],
        imagenPrincipal: null,
        galeria: []
      },
      {
        id: "bolso-deportivo",
        nombre: "Bolso Deportivo Jiu-Jitsu",
        categoriaId: "accesorios",
        precio: 40000,
        disponible: true,
        destacado: false,
        descripcionCorta: "Compartimento ventilado para el kimono húmedo.",
        descripcion: "Bolso deportivo con compartimento ventilado separado, ideal para guardar el kimono húmedo después de entrenar.",
        talles: ["Único"],
        colores: [{ nombre: "Negro", hex: "#1a1a1a" }, { nombre: "Gris", hex: "#8a8f94" }],
        imagenPrincipal: null,
        galeria: []
      },
      {
        id: "protector-bucal",
        nombre: "Protector Bucal",
        categoriaId: "accesorios",
        precio: 8000,
        disponible: true,
        destacado: false,
        descripcionCorta: "Moldeable por calor, con estuche ventilado.",
        descripcion: "Protector bucal moldeable por calor para un ajuste personalizado, se entrega con estuche ventilado.",
        talles: ["Único"],
        colores: [{ nombre: "Transparente", hex: "#d8ded9" }, { nombre: "Negro", hex: "#1a1a1a" }],
        imagenPrincipal: null,
        galeria: []
      }
    ]
  };
}


/** Casilleros y cantidades de ejemplo para una instalación nueva. */
function sembrarStock(datos) {
  const contador = {};
  const letras = { kimonos: "A", rashguards: "B", cinturones: "C", shorts: "D", accesorios: "E" };
  datos.productos.forEach(function (p, i) {
    const letra = letras[p.categoriaId] || "Z";
    contador[letra] = (contador[letra] || 0) + 1;
    p.casillero = letra + contador[letra];
    p.stockMinimo = null;
    const talles = listaTalles(p);
    const colores = listaColores(p);
    p.stock = [];
    let j = 0;
    talles.forEach(function (t) {
      colores.forEach(function (c) {
        p.stock.push({ talle: t, color: c, cantidad: 4 + ((i * 5 + j * 3) % 9) });
        j++;
      });
    });
  });
  // algunos casos de ejemplo para ver las alertas
  if (datos.productos[0] && datos.productos[0].stock[1]) datos.productos[0].stock[1].cantidad = 2;
  if (datos.productos[3] && datos.productos[3].stock[0]) datos.productos[3].stock[0].cantidad = 0;
  if (datos.productos[6] && datos.productos[6].stock[0]) datos.productos[6].stock[0].cantidad = 1;
}

module.exports = { datosIniciales: datosIniciales, sembrarStock: sembrarStock };
