/* ═══════════════════════════════════════
   CRUZYMAR · models/pedidosModel.js — MySQL
═══════════════════════════════════════ */
const pool = require('../database');
const { v4: uuid } = require('uuid');

exports.findAll = async ({ estado, cliente_id } = {}) => {
  let sql = `
    SELECT p.*, c.nombre AS cli_nombre_real, c.telefono AS cliente_tel
    FROM pedidos p
    LEFT JOIN clientes c ON c.id = p.cliente_id
    WHERE 1=1
  `;
  const params = [];
  if (estado)     { sql += ' AND p.estado = ?';     params.push(estado); }
  if (cliente_id) { sql += ' AND p.cliente_id = ?'; params.push(cliente_id); }
  sql += ' ORDER BY p.creado_en DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
};

exports.findById = async (id) => {
  const [rows] = await pool.query(`
    SELECT p.*, c.nombre AS cli_nombre_real
    FROM pedidos p LEFT JOIN clientes c ON c.id = p.cliente_id
    WHERE p.id = ?`, [id]);
  return rows[0] || null;
};

exports.create = async (data) => {
  const id = uuid();
  const fecha = data.fecha || new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  await pool.query(
    `INSERT INTO pedidos (id, cliente_id, cliente_nombre, total, estado, fecha, observaciones)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, data.cliente_id || null, data.cliente_nombre || 'Consumidor final',
     parseFloat(data.total) || 0, data.estado || 'Pendiente',
     fecha, data.observaciones || '']
  );
  return exports.findById(id);
};

exports.update = async (id, data) => {
  const campos = ['cliente_id','cliente_nombre','total','estado','observaciones'];
  const sets   = campos.filter(c => data[c] !== undefined).map(c => `${c} = ?`);
  const vals   = campos.filter(c => data[c] !== undefined).map(c => data[c]);
  if (!sets.length) return exports.findById(id);
  await pool.query(`UPDATE pedidos SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
  return exports.findById(id);
};

exports.remove = async (id) => {
  const [r] = await pool.query("UPDATE pedidos SET estado='Cancelado' WHERE id = ?", [id]);
  return r.affectedRows > 0;
};