const router = require('express').Router();
const auth   = require('../middleware/auth');
const ctrl   = require('../controllers/reportesController');

router.get('/resumen', auth, ctrl.getResumen);

module.exports = router;
