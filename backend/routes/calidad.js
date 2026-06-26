/* ═══════════════════════════════════════
   CRUZYMAR · routes/calidad.js
═══════════════════════════════════════ */

const router = require('express').Router();
const auth   = require('../middleware/auth');
const ctrl   = require('../controllers/calidadController');

router.get('/resumen', auth, ctrl.getResumen);
router.get('/',        auth, ctrl.getAll);
router.get('/:id',     auth, ctrl.getOne);
router.post('/',       auth, ctrl.create);
router.put('/:id',     auth, ctrl.update);
router.delete('/:id',  auth, ctrl.remove);

module.exports = router;