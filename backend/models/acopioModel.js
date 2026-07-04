/* ═══════════════════════════════════════
   CRUZYMAR · models/acopioModel.js
   Acopio de leche — MySQL

   create() es transaccional y tiene un solo desenlace posible
   por recepción, según `estado`:
     - 'Aceptada'  → acredita los litros como Entrada en el
                     producto de inventario indicado (inventario_id),
                     usando Inventario.registrarMovimientoTx (la
                     única función que muta stock en todo el sistema).
     - 'Rechazada' → NO toca inventario; en su lugar registra la
                     leche perdida en `mermas` (tipo 'Acopio'), para
                     que el reporte de mermas y desperdicios la vea.
     - 'Pendiente' → no hace ninguna de las dos cosas todavía
                     (por si en el futuro se separa recepción de
                     veredicto de calidad en dos pasos distintos).
═══════════════════════════════════════ */

const pool = require('../database');
const { v4: uuidv4 } = require('uuid');
const Inventario = require('./inventarioModel');

const hoy = () => new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const ESTADOS_VALIDOS = ['Aceptada', 'Rechazada', 'Pendiente'];

exports.findAll = async ({ fecha, proveedor_id, turno } = {}) => {
  let sql = `
    SELECT a.*, p.nombre AS proveedor_nombre, i.nombre AS inventario_nombre
    FROM acopio_leche a
    LEFT JOIN proveedores p ON p.id = a.proveedor_id
    LEFT JOIN inventario_productos i ON i.id = a.inventario_id
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
    SELECT a.*, p.nombre AS proveedor_nombre, i.nombre AS inventario_nombre
    FROM acopio_leche a
    LEFT JOIN proveedores p ON p.id = a.proveedor_id
    LEFT JOIN inventario_productos i ON i.id = a.inventario_id
    WHERE a.id = ?`, [id]);
  return rows[0] || null;
};

exports.getResumen = async (fecha) => {
  const f = fecha || hoy();
  const [rows] = await pool.query(
    `SELECT
       COUNT(*)                     AS registros,
       COALESCE(SUM(litros), 0)     AS total_litros,
       COALESCE(SUM(total_pagar),0) AS total_pagar,
       COUNT(DISTINCT proveedor_id) AS cant_proveedores
     FROM acopio_leche WHERE fecha = ?`, [f]);
  return { fecha: f, ...rows[0] };
};

exports.findProveedorActivo = async (id) => {
  const [rows] = await pool.query('SELECT * FROM proveedores WHERE id = ? AND activo = 1', [id]);
  return rows[0] || null;
};

/**
 * Crea una recepción de leche. Según el estado, en la misma
 * transacción se acredita el inventario (Aceptada) o se registra
 * la merma (Rechazada). Si eso falla, toda la operación se revierte.
 */
exports.create = async (data) => {
  const {
    proveedor_id, litros, temperatura, precio_litro, turno, fecha,
    estado, motivo_rechazo, observaciones, inventario_id,
    usuario, usuario_id
  } = data;

  const litrosN = parseFloat(litros) || 0;
  const precioN = parseFloat(precio_litro) || 0;
  const estadoFinal = ESTADOS_VALIDOS.includes(estado) ? estado : 'Pendiente';

  if (litrosN <= 0) throw new Error('Los litros deben ser mayores a 0');
  if (!inventario_id) throw new Error('Debe indicar a qué producto de inventario corresponde esta recepción');
  if (estadoFinal === 'Rechazada' && !motivo_rechazo) throw new Error('Debe indicar el motivo del rechazo');

  const total_pagar = parseFloat((litrosN * precioN).toFixed(2));
  const id = uuidv4();
  const fechaFinal = fecha || hoy();

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `INSERT INTO acopio_leche
        (id, proveedor_id, litros, temperatura, precio_litro, total_pagar, turno, fecha, estado, motivo_rechazo, observaciones, inventario_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, proveedor_id || null, litrosN,
        temperatura ? parseFloat(temperatura) : null,
        precioN, total_pagar, turno || 'Mañana', fechaFinal,
        estadoFinal, motivo_rechazo || null, observaciones || '',
        inventario_id]
    );

    if (estadoFinal === 'Aceptada') {
      await Inventario.registrarMovimientoTx(conn, {
        producto_id: inventario_id,
        tipo: 'Entrada',
        cantidad: litrosN,
        motivo: 'Recepción de leche (Acopio)',
        usuario, usuario_id
      });
    } else if (estadoFinal === 'Rechazada') {
      const [prodInv] = await conn.query('SELECT nombre FROM inventario_productos WHERE id = ?', [inventario_id]);
      await conn.query(
        `INSERT INTO mermas (id, acopio_id, tipo, producto, cantidad, unidad, causa, fecha, responsable_id)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [uuidv4(), id, 'Acopio',
          `Leche cruda rechazada${prodInv[0] ? ' — ' + prodInv[0].nombre : ''}`,
          litrosN, 'Litros', motivo_rechazo || 'Rechazo en control de calidad',
          fechaFinal, usuario_id || null]
      );
    }

    await conn.commit();
    return exports.findById(id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

exports.update = async (id, data) => {
  const campos = ['proveedor_id', 'litros', 'temperatura', 'precio_litro', 'turno', 'fecha', 'estado', 'motivo_rechazo', 'observaciones'];
  const sets = campos.filter(c => data[c] !== undefined).map(c => `${c} = ?`);
  const vals = campos.filter(c => data[c] !== undefined).map(c => data[c]);

  const [cur] = await pool.query('SELECT litros, precio_litro FROM acopio_leche WHERE id = ?', [id]);
  if (!cur[0]) return null;

  const l = parseFloat(data.litros ?? cur[0].litros);
  const p = parseFloat(data.precio_litro ?? cur[0].precio_litro);
  sets.push('total_pagar = ?');
  vals.push(parseFloat((l * p).toFixed(2)));

  if (!sets.length) return null;
  await pool.query(`UPDATE acopio_leche SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
  return exports.findById(id);
};

// Nota: eliminar una recepción NO revierte automáticamente el
// inventario ni borra la merma asociada. Si quieres ese
// comportamiento simétrico al de Producción, dímelo y lo agrego.
exports.remove = async (id) => {
  const [res] = await pool.query('DELETE FROM acopio_leche WHERE id = ?', [id]);
  return res.affectedRows > 0;
};