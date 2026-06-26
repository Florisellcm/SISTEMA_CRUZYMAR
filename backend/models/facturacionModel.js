/* ═══════════════════════════════════════
   CRUZYMAR · models/facturacionModel.js — MySQL
═══════════════════════════════════════ */
const pool = require('../database');
const { v4: uuidv4 } = require('uuid');

exports.findAll = async () => {
  const [rows] = await pool.query(`
    SELECT f.*, c.nombre AS cliente_nombre
    FROM facturacion f
    LEFT JOIN clientes c ON c.id = f.cliente_id
    ORDER BY f.creado_en DESC
  `);
  return rows;
};

exports.findById = async (id) => {
  const [rows] = await pool.query(`
    SELECT f.*, c.nombre AS cliente_nombre
    FROM facturacion f
    LEFT JOIN clientes c ON c.id = f.cliente_id
    WHERE f.id = ?`, [id]);
  return rows[0] || null;
};

exports.create = async (data) => {
  const [[cnt]] = await pool.query("SELECT LPAD(COUNT(*)+1,4,'0') AS num FROM facturacion");
  const numero  = `FAC-${cnt.num}`;
  const id      = uuidv4();
  const fecha   = data.fecha || new Date().toISOString().slice(0, 10);
  const total   = parseFloat(data.monto_total || data.total || 0);

  await pool.query(
    `INSERT INTO facturacion (id, numero, cliente_id, venta_id, total, estado, fecha)
     VALUES (?, ?, ?, ?, ?, 'Emitida', ?)`,
    [id, numero, data.cliente_id || null, data.venta_id || null, total, fecha]
  );
  return exports.findById(id);
};

exports.update = async (id, data) => {
  const campos = ['estado'];
  const sets   = campos.filter(c => data[c] !== undefined).map(c => `${c} = ?`);
  const vals   = campos.filter(c => data[c] !== undefined).map(c => data[c]);
  if (!sets.length) return exports.findById(id);
  await pool.query(`UPDATE facturacion SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
  return exports.findById(id);
};

exports.remove = async (id) => {
  const [res] = await pool.query("UPDATE facturacion SET estado='Anulada' WHERE id = ?", [id]);
  return res.affectedRows > 0;
};