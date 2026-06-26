/* ═══════════════════════════════════════
   CRUZYMAR · routes/inventario.js
═══════════════════════════════════════ */

const router = require('express').Router();
const auth   = require('../middleware/auth');
const ctrl   = require('../controllers/inventarioController');

router.get('/',              auth, ctrl.getAll);
router.post('/',             auth, ctrl.create);
router.put('/:id',           auth, ctrl.update);
router.delete('/:id',        auth, ctrl.remove);

// Movimientos de stock
router.get('/movimientos',   auth, ctrl.getMovimientos);
router.post('/movimientos',  auth, ctrl.registrarMovimiento);

// Vencimientos
router.get('/vencimientos',  auth, ctrl.getVencimientos);

module.exports = router;