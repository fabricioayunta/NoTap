/* Función de Vercel: atiende todas las rutas /api/... con el mismo código que el servidor local.
   vercel.json reenvía /api/lo/que/sea a /api/index?ruta=lo/que/sea (así funcionan también las rutas con varios tramos). */
const { manejarAPI } = require("../lib/api");

module.exports = async function (req, res) {
  const url = new URL(req.url, "http://localhost");
  const ruta = url.searchParams.get("ruta");
  if (ruta !== null) {
    url.searchParams.delete("ruta");
    url.pathname = "/api/" + ruta.replace(/^\/+/, "");
  }
  return manejarAPI(req, res, url);
};
