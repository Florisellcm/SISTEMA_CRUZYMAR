/* ═══════════════════════════════════════
   CRUZYMAR · models/gastosModel.js
   Acceso a datos de gastos — MySQL
═══════════════════════════════════════ */

const pool = require('../database');
const { v4: uuidv4 } = require('uuid');

exports.findAll = async (categoria) => {
  let sql = 'SELECT g.*, u.nombre AS usuario_nombre FROM gastos g LEFT JOIN usuarios u ON u.id = g.usuario_id WHERE 1=1';
  const params = [];
  if (categoria) { sql += ' AND g.categoria = ?'; params.push(categoria); }
  sql += ' ORDER BY g.fecha DESC, g.creado_en DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
};

exports.findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM gastos WHERE id = ?', [id]);
  return rows[0] || null;
};

exports.create = async ({ concepto, categoria, monto, fecha, proveedor, comprobante, usuario_id }) => {
  const id = uuidv4();
  await pool.query(
    'INSERT INTO gastos (id, concepto, categoria, monto, fecha, proveedor, comprobante, usuario_id) VALUES (?,?,?,?,?,?,?,?)',
    [id, concepto, categoria||'Otros', parseFloat(monto),
     fecha || new Date().toISOString().slice(0,10),
     proveedor||'', comprobante||'', usuario_id||null]
  );
  return exports.findById(id);
};

exports.update = async (id, data) => {
  const campos = ['concepto','categoria','monto','fecha','proveedor','comprobante'];
  const sets   = campos.filter(c => data[c] !== undefined).map(c => `${c} = ?`);
  const vals   = campos.filter(c => data[c] !== undefined).map(c => data[c]);
  if (!sets.length) return null;
  await pool.query(`UPDATE gastos SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
  return exports.findById(id);
};

exports.remove = async (id) => {
  const [res] = await pool.query('DELETE FROM gastos WHERE id = ?', [id]);
  return res.affectedRows > 0;
};
