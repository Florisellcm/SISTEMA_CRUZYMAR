/* ═══════════════════════════════════════════════════════
   CRUZYMAR ERP · routes/configuracion.js
   Definición de rutas de configuración
   Módulos: Empresa · Usuarios · Roles · Productos · Sistema
═══════════════════════════════════════════════════════ */

const router = require('express').Router();
const auth   = require('../middleware/auth');
const ctrl   = require('../controllers/configuracionController');

// ── Helper: solo administrador puede modificar config ──
function soloAdmin(req, res, next) {
  if (req.usuario?.rol !== 'administrador') {
    return res.status(403).json({ error: 'Solo el administrador puede realizar esta acción' });
  }
  next();
}

// Auth en TODAS las rutas
router.use(auth);

// ── 1. Empresa ──────────────────────────
router.get('/empresa',          ctrl.getEmpresa);
router.put('/empresa', soloAdmin, ctrl.updateEmpresa);

// ── 2. Usuarios ─────────────────────────
router.get('/usuarios',          soloAdmin, ctrl.getUsuarios);
router.get('/usuarios/:id',      soloAdmin, ctrl.getUsuarioById);
router.post('/usuarios',         soloAdmin, ctrl.createUsuario);
router.put('/usuarios/:id',      soloAdmin, ctrl.updateUsuario);
router.delete('/usuarios/:id',   soloAdmin, ctrl.deleteUsuario);

// ── 3. Roles ────────────────────────────
router.get('/roles',             ctrl.getRoles);
router.post('/roles',   soloAdmin, ctrl.createRol);
router.put('/roles/:id', soloAdmin, ctrl.updateRol);

// ── 4. Catálogo de Productos ────────────
router.get('/productos',         ctrl.getProductos);
router.get('/productos/:id',     ctrl.getProductoById);
router.post('/productos',        soloAdmin, ctrl.createProducto);
router.put('/productos/:id',     soloAdmin, ctrl.updateProducto);
router.delete('/productos/:id',  soloAdmin, ctrl.deleteProducto);

// ── 5. Preferencias del Sistema ─────────
router.get('/sistema',           soloAdmin, ctrl.getSistema);
router.put('/sistema',           soloAdmin, ctrl.updateSistema);

module.exports = router;