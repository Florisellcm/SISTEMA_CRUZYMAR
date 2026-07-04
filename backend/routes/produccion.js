/* ═══════════════════════════════════════
   CRUZYMAR · routes/produccion.js
═══════════════════════════════════════ */

const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/produccionController');

// IMPORTANTE: /recientes debe ir ANTES de /:id, si no Express
// interpreta "recientes" como un id y nunca llega al controlador correcto.
router.get('/recientes', auth, ctrl.getRecientes);
router.get('/', auth, ctrl.getAll);
router.get('/:id', auth, ctrl.getById);

router.post('/', auth, ctrl.create);
router.put('/:id', auth, ctrl.update);      // solo metadatos
router.put('/:id/completar', auth, ctrl.completar);   // acredita salida(s) al inventario
router.put('/:id/cancelar', auth, ctrl.cancelar);     // revierte movimientos de inventario
router.delete('/:id', auth, ctrl.remove);

module.exports = router;