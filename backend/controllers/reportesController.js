/* ═══════════════════════════════════════
   CRUZYMAR · controllers/reportesController.js
   Todos los reportes — async/await MySQL
═══════════════════════════════════════ */
const m = require('../models/reportesModel');

const wrap = fn => async (req, res) => {
  try { res.json(await fn(req, res)); }
  catch (e) { console.error('[Reportes]', e.message); res.status(500).json({ error: e.message }); }
};

exports.getResumen = wrap(async (req) => m.getResumen());

/* ── Detallados ─────────────────────────────────────────────── */
exports.getDetalladoProduccion   = wrap(async (req) => m.getDetalladoProduccion(req.query));
exports.getDetalladoCalidad      = wrap(async (req) => m.getDetalladoCalidad(req.query));      // D2
exports.getDetalladoDistribucion = wrap(async (req) => m.getDetalladoDistribucion(req.query)); // D3
/* Legacy aliases */
exports.getDetalladoAcopio       = wrap(async (req) => m.getExcepcionLecheNoApta(req.query));
exports.getDetalladoInventario   = wrap(async (req) => m.getSintetizadoInventario());
exports.getDetalladoVentas       = wrap(async (req) => m.getDetalladoDistribucion(req.query));

/* ── Sintetizados ───────────────────────────────────────────── */
exports.getSintetizadoProduccion      = wrap(async (req) => m.getSintetizadoProveedores(req.query)); // S1 - Desempeño Proveedores
exports.getSintetizadoProveedores     = wrap(async (req) => m.getSintetizadoProveedores(req.query)); // S1 - alias directo
exports.getSintetizadoInventario      = wrap(async (req) => m.getSintetizadoInventario());
exports.getSintetizadoVentas          = wrap(async (req) => m.getSintetizadoVentas(req.query));
exports.getSintetizadoFinanciero      = wrap(async (req) => m.getSintetizadoFinanciero(req.query)); // S2
exports.getSintetizadoRendimiento     = wrap(async (req) => m.getSintetizadoProveedores(req.query));
exports.getSintetizadoProductoCliente = wrap(async (req) => m.getSintetizadoProductoCliente(req.query)); // S4

/* ── Por excepción ──────────────────────────────────────────── */
exports.getExcepcionVencimientos = wrap(async (req) => m.getExcepcionVencimientos());
exports.getExcepcionStock        = wrap(async (req) => m.getExcepcionStock());
exports.getExcepcionLecheNoApta  = wrap(async (req) => m.getExcepcionLecheNoApta(req.query)); // E1