/* Función de Vercel: atiende todas las rutas /api/... con el mismo código que el servidor local. */
const { manejarAPI } = require("../lib/api");

module.exports = async function (req, res) {
  const url = new URL(req.url, "http://localhost");
  return manejarAPI(req, res, url);
};
