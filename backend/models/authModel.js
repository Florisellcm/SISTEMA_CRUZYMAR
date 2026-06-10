/* ═══════════════════════════════════════
   CRUZYMAR · models/authModel.js
   Acceso a datos de autenticación
═══════════════════════════════════════ */

const db = require('../data/db');

/**
 * Buscar un usuario activo por email
 * @param {string} email
 * @returns {object|undefined}
 */
exports.findByEmail = (email) => {
  return db.usuarios.find(u => u.email === email && u.activo);
};
