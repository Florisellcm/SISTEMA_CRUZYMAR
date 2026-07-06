/* ═══════════════════════════════════════
   CRUZYMAR · models/recetasModel.js
   Acceso a datos de Recetas — MySQL
═══════════════════════════════════════ */

const pool = require('../database');
const { generarIdSecuencial } = require('../utils/idGenerator');

exports.findAll = async ({ activo } = {}) => {
  let sql = 'SELECT * FROM recetas';
  const params = [];
  if (activo !== undefined) {
    sql += ' WHERE activo = ?';
    params.push(activo === 'true' || activo === true ? 1 : 0);
  }
  sql += ' ORDER BY producto ASC';
  const [rows] = await pool.query(sql, params);
  return rows;
};

exports.findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM recetas WHERE id = ?', [id]);
  return rows[0] || null;
};

exports.create = async (data) => {
  const { producto, unidad_producto, litros_por_unidad, rendimiento_esperado, tiempo_estimado, descripcion } = data;
  const id = await generarIdSecuencial('recetas', 'rec');
  await pool.query(
    `INSERT INTO recetas (id, producto, unidad_producto, litros_por_unidad, rendimiento_esperado, tiempo_estimado, descripcion)
     VALUES (?,?,?,?,?,?,?)`,
    [id, producto, unidad_producto||'kg',
     litros_por_unidad != null && litros_por_unidad !== '' ? parseFloat(litros_por_unidad) : null,
     rendimiento_esperado != null && rendimiento_esperado !== '' ? parseFloat(rendimiento_esperado) : null,
     tiempo_estimado||'', descripcion||'']
  );
  const [rows] = await pool.query('SELECT * FROM recetas WHERE id = ?', [id]);
  return rows[0];
};

exports.update = async (id, data) => {
  const campos = ['producto','unidad_producto','litros_por_unidad','rendimiento_esperado','tiempo_estimado','descripcion','activo'];
  const sets   = campos.filter(c => data[c] !== undefined).map(c => `${c} = ?`);
  const vals   = campos.filter(c => data[c] !== undefined).map(c => data[c]);
  if (!sets.length) return null;
  await pool.query(`UPDATE recetas SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
  const [rows] = await pool.query('SELECT * FROM recetas WHERE id = ?', [id]);
  return rows[0] || null;
};

exports.remove = async (id) => {
  const [res] = await pool.query('DELETE FROM recetas WHERE id = ?', [id]);
  return res.affectedRows > 0;
};

exports.toggleActivo = async (id) => {
  await pool.query('UPDATE recetas SET activo = NOT activo WHERE id = ?', [id]);
  const [rows] = await pool.query('SELECT * FROM recetas WHERE id = ?', [id]);
  return rows[0] || null;
};
exports.toggle = async (id) => {
  await pool.query('UPDATE recetas SET activo = NOT activo WHERE id = ?', [id]);
  return exports.findById(id);
};