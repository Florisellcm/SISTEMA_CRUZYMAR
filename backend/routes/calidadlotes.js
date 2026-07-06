const router = require('express').Router();
const auth   = require('../middleware/auth');
const ctrl   = require('../controllers/calidadlotesController');
router.get('/kpis',      auth, ctrl.getKpis);
router.get('/',          auth, ctrl.getLotes);
router.post('/inspeccionar', auth, ctrl.inspeccionar);
module.exports = router;