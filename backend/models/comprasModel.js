/* ═══════════════════════════════════════
   CRUZYMAR · models/comprasModel.js
   Compras / órdenes de compra — MySQL
═══════════════════════════════════════ */

const pool = require('../database');
const { generarIdSecuencial } = require('../utils/idGenerator');

exports.findAll = async ({ estado, proveedor_id } = {}) => {
  let sql = `
    SELECT c.*, p.nombre AS prov_nombre_real
    FROM compras c
    LEFT JOIN proveedores p ON p.id = c.proveedor_id
    WHERE 1=1
  `;
  const params = [];
  if (estado)       { sql += ' AND c.estado = ?';       params.push(estado); }
  if (proveedor_id) { sql += ' AND c.proveedor_id = ?'; params.push(proveedor_id); }
  sql += ' ORDER BY c.fecha DESC, c.creado_en DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
};

exports.findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM compras WHERE id = ?', [id]);
  return rows[0] || null;
};

exports.create = async (data) => {
  const [[cnt]] = await pool.query("SELECT LPAD(COUNT(*)+1,4,'0') AS num FROM compras");
  const id     = await generarIdSecuencial('compras', 'com');
  const numero = `OC-${cnt.num}`;
  await pool.query(
    `INSERT INTO compras (id, numero, proveedor_id, proveedor_nombre, concepto, monto, estado, fecha, notas)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [id, numero, data.proveedor_id||null, data.proveedor_nombre||'',
     data.concepto||'', parseFloat(data.monto)||0,
     data.estado||'Pendiente',
     data.fecha || new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000).toISOString().slice(0, 10),
     data.notas||'']
  );
  return exports.findById(id);
};

exports.update = async (id, data) => {
  const campos = ['proveedor_id','proveedor_nombre','concepto','monto','estado','fecha','notas'];
  const sets   = campos.filter(c => data[c] !== undefined).map(c => `${c} = ?`);
  const vals   = campos.filter(c => data[c] !== undefined).map(c => data[c]);
  if (!sets.length) return null;
  await pool.query(`UPDATE compras SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
  return exports.findById(id);
};

exports.remove = async (id) => {
  const [res] = await pool.query('DELETE FROM compras WHERE id = ?', [id]);
  return res.affectedRows > 0;
};
