/* ═══════════════════════════════════════
   CRUZYMAR · routes/reportes.js
═══════════════════════════════════════ */
const router = require('express').Router();
const auth   = require('../middleware/auth');
const ctrl   = require('../controllers/reportesController');

router.get('/resumen',                  auth, ctrl.getResumen);

/* ── Detallados ─────────────────────────────────────────────── */
router.get('/detallado/produccion',     auth, ctrl.getDetalladoProduccion);
router.get('/detallado/calidad',        auth, ctrl.getDetalladoCalidad);       // D2 - Control Calidad
router.get('/detallado/distribucion',   auth, ctrl.getDetalladoDistribucion);  // D3 - Distribución
router.get('/detallado/acopio',         auth, ctrl.getDetalladoAcopio);        // alias legacy
router.get('/detallado/inventario',     auth, ctrl.getDetalladoInventario);    // D4 - Inventario
router.get('/detallado/ventas',         auth, ctrl.getDetalladoVentas);        // alias legacy

/* ── Sintetizados ───────────────────────────────────────────── */
router.get('/sintetizado/produccion',       auth, ctrl.getSintetizadoProduccion);      // S1 - Mermas
router.get('/sintetizado/financiero',       auth, ctrl.getSintetizadoFinanciero);      // S2 - Financiero
router.get('/sintetizado/ventas',           auth, ctrl.getSintetizadoVentas);          // S3 - Ventas
router.get('/sintetizado/producto-cliente', auth, ctrl.getSintetizadoProductoCliente); // S4 - Producto x Cliente
router.get('/sintetizado/inventario',       auth, ctrl.getSintetizadoInventario);
router.get('/sintetizado/rendimiento',      auth, ctrl.getSintetizadoRendimiento);

/* ── Por Excepción ──────────────────────────────────────────── */
router.get('/excepcion/leche-no-apta',  auth, ctrl.getExcepcionLecheNoApta); // E1 - Leche no apta
router.get('/excepcion/vencimientos',   auth, ctrl.getExcepcionVencimientos);
router.get('/excepcion/stock',          auth, ctrl.getExcepcionStock);

module.exports = router;