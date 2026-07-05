/* ═══════════════════════════════════════
   CRUZYMAR · routes/acopio.js — MySQL
═══════════════════════════════════════ */
const router = require('express').Router();
const auth   = require('../middleware/auth');
const ctrl   = require('../controllers/acopioController');

router.get('/resumen', auth, ctrl.getResumen);
router.get('/',        auth, ctrl.getAll);
router.get('/:id',     auth, ctrl.getById || ctrl.getAll);
router.post('/',       auth, ctrl.create);
router.put('/:id',     auth, ctrl.update);
router.delete('/:id',  auth, ctrl.remove);

module.exports = router;