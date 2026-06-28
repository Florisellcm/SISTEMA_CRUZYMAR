/* ═══════════════════════════════════════
   CRUZYMAR · models/acopioModel.js
   Acceso a datos de acopio de leche — MySQL
═══════════════════════════════════════ */

const pool = require('../database');
const { v4: uuidv4 } = require('uuid');

exports.findAll = async ({ fecha, proveedor_id, turno } = {}) => {
  let sql = `
    SELECT a.*, p.nombre AS proveedor_nombre
    FROM acopio_leche a
    LEFT JOIN proveedores p ON p.id = a.proveedor_id
    WHERE 1=1
  `;
  const params = [];
  if (fecha)        { sql += ' AND a.fecha = ?';        params.push(fecha); }
  if (proveedor_id) { sql += ' AND a.proveedor_id = ?'; params.push(proveedor_id); }
  if (turno)        { sql += ' AND a.turno = ?';        params.push(turno); }
  sql += ' ORDER BY a.creado_en DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
};

exports.findById = async (id) => {
  const [rows] = await pool.query(`
    SELECT a.*, p.nombre AS proveedor_nombre
    FROM acopio_leche a
    LEFT JOIN proveedores p ON p.id = a.proveedor_id
    WHERE a.id = ?`, [id]);
  return rows[0] || null;
};

exports.getResumen = async (fecha) => {
  const hoy = fecha || new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const [rows] = await pool.query(
    `SELECT
       COUNT(*)                   AS registros,
       COALESCE(SUM(litros), 0)   AS total_litros,
       COALESCE(SUM(total_pagar),0) AS total_pagar,
       COUNT(DISTINCT proveedor_id) AS cant_proveedores
     FROM acopio_leche WHERE fecha = ?`, [hoy]);
  return { fecha: hoy, ...rows[0] };
};

exports.findProveedorActivo = async (id) => {
  const [rows] = await pool.query('SELECT * FROM proveedores WHERE id = ? AND activo = 1', [id]);
  return rows[0] || null;
};

exports.create = async ({ proveedor_id, litros, temperatura, precio_litro, turno, fecha, estado, motivo_rechazo, observaciones }) => {
  const id         = uuidv4();
  const litrosN    = parseFloat(litros);
  const precioN    = parseFloat(precio_litro);
  const total_pagar = parseFloat((litrosN * precioN).toFixed(2));
  await pool.query(
    `INSERT INTO acopio_leche
      (id, proveedor_id, litros, temperatura, precio_litro, total_pagar, turno, fecha, estado, motivo_rechazo, observaciones)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [id, proveedor_id||null, litrosN, temperatura ? parseFloat(temperatura) : null,
     precioN, total_pagar, turno||'Mañana',
     fecha || new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000).toISOString().slice(0, 10),
     estado||'Pendiente', motivo_rechazo||null, observaciones||'']
  );
  return exports.findById(id);
};

exports.update = async (id, data) => {
  const campos = ['proveedor_id','litros','temperatura','precio_litro','turno','fecha','estado','motivo_rechazo','observaciones'];
  const sets   = campos.filter(c => data[c] !== undefined).map(c => `${c} = ?`);
  const vals   = campos.filter(c => data[c] !== undefined).map(c => data[c]);

  // Recalcular total si cambiaron litros o precio
  const [cur] = await pool.query('SELECT litros, precio_litro FROM acopio_leche WHERE id = ?', [id]);
  if (cur[0]) {
    const l = parseFloat(data.litros        || cur[0].litros);
    const p = parseFloat(data.precio_litro  || cur[0].precio_litro);
    sets.push('total_pagar = ?');
    vals.push(parseFloat((l * p).toFixed(2)));
  }
  if (!sets.length) return null;
  await pool.query(`UPDATE acopio_leche SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
  return exports.findById(id);
};

exports.remove = async (id) => {
  const [res] = await pool.query('DELETE FROM acopio_leche WHERE id = ?', [id]);
  return res.affectedRows > 0;
};
