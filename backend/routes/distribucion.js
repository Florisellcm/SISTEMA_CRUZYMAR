const router = require('express').Router();
const auth   = require('../middleware/auth');
const ctrl   = require('../controllers/distribucionController');
router.get('/resumen-zonas', auth, ctrl.getResumenZonas);
router.get('/',              auth, ctrl.getHojaRuta);
router.post('/',             auth, ctrl.guardarRuta);
module.exports = router;