/* ═══════════════════════════════════════
   CRUZYMAR · models/authModel.js
   Autenticación — MySQL
═══════════════════════════════════════ */

const pool = require('../database');

exports.findByEmail = async (email) => {
  const [rows] = await pool.query(
    'SELECT * FROM usuarios WHERE email = ? AND activo = 1 LIMIT 1',
    [email]
  );
  return rows[0] || null;
};

exports.findById = async (id) => {
  const [rows] = await pool.query(
    'SELECT id, nombre, email, rol, activo FROM usuarios WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
};
