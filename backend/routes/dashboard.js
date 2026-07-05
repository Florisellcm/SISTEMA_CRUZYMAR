/* ═══════════════════════════════════════
   CRUZYMAR · routes/dashboard.js — MySQL
═══════════════════════════════════════ */
const router = require('express').Router();
const auth   = require('../middleware/auth');
const ctrl   = require('../controllers/dashboardController');

router.get('/', auth, ctrl.getDashboard);

module.exports = router;