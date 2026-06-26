/* ═══════════════════════════════════════
   CRUZYMAR · models/clientesModel.js
   Acceso a datos de clientes — MySQL
═══════════════════════════════════════ */

const pool = require('../database');
const { v4: uuidv4 } = require('uuid');

exports.findAll = async (buscar) => {
  let sql    = 'SELECT * FROM clientes WHERE activo = 1';
  const params = [];
  if (buscar) { sql += ' AND nombre LIKE ?'; params.push(`%${buscar}%`); }
  sql += ' ORDER BY nombre ASC';
  const [rows] = await pool.query(sql, params);
  return rows;
};

exports.findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM clientes WHERE id = ?', [id]);
  return rows[0] || null;
};

exports.create = async ({ nombre, telefono, email, direccion, tipo, rtn }) => {
  const id = uuidv4();
  await pool.query(
    'INSERT INTO clientes (id, nombre, telefono, email, direccion, tipo, rtn) VALUES (?,?,?,?,?,?,?)',
    [id, nombre, telefono||'', email||'', direccion||'', tipo||'Particular', rtn||'']
  );
  const [rows] = await pool.query('SELECT * FROM clientes WHERE id = ?', [id]);
  return rows[0];
};

exports.update = async (id, data) => {
  const campos = ['nombre','telefono','email','direccion','tipo','rtn'];
  const sets   = campos.filter(c => data[c] !== undefined).map(c => `${c} = ?`);
  const vals   = campos.filter(c => data[c] !== undefined).map(c => data[c]);
  if (!sets.length) return null;
  await pool.query(`UPDATE clientes SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
  const [rows] = await pool.query('SELECT * FROM clientes WHERE id = ?', [id]);
  return rows[0] || null;
};

exports.softDelete = async (id) => {
  const [res] = await pool.query('UPDATE clientes SET activo = 0 WHERE id = ?', [id]);
  return res.affectedRows > 0;
};
