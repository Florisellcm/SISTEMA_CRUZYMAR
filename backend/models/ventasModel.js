/* ═══════════════════════════════════════
   CRUZYMAR · models/ventasModel.js
   Acceso a datos de ventas — MySQL
═══════════════════════════════════════ */

const pool = require('../database');
const { v4: uuidv4 } = require('uuid');

exports.findAll = async (estado) => {
  let sql = `
    SELECT v.*, c.telefono AS cliente_tel, c.rtn AS cliente_rtn
    FROM ventas v
    LEFT JOIN clientes c ON c.id = v.cliente_id
    WHERE 1=1
  `;
  const params = [];
  if (estado) { sql += ' AND v.estado = ?'; params.push(estado); }
  sql += ' ORDER BY v.creado_en DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
};

exports.findById = async (id) => {
  const [[venta], items] = await Promise.all([
    pool.query('SELECT v.*, c.telefono AS cliente_tel FROM ventas v LEFT JOIN clientes c ON c.id = v.cliente_id WHERE v.id = ?', [id]),
    pool.query('SELECT * FROM ventas_detalle WHERE venta_id = ?', [id])
  ]);
  if (!venta[0]) return null;
  return { ...venta[0], items: items[0] };
};

exports.create = async ({ clienteId, clienteNombre, items, metodoPago, observaciones, vendedor_id }) => {
  const total  = (items || []).reduce((s, i) => s + parseFloat(i.cantidad) * parseFloat(i.precio), 0);
  const [[cnt]]= await pool.query("SELECT LPAD(COUNT(*)+1,4,'0') AS num FROM ventas");
  const numero = `VTA-${cnt[0].num}`;
  const id     = uuidv4();
  const fecha  = new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  await pool.query(
    `INSERT INTO ventas (id, numero, cliente_id, cliente_nombre, total, metodo_pago, estado, observaciones, fecha, vendedor_id)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [id, numero, clienteId||null, clienteNombre||'Consumidor final', total,
     metodoPago||'Efectivo', 'Pagada', observaciones||'', fecha, vendedor_id||null]
  );

  // Insertar detalle
  for (const it of (items||[])) {
    const sub = parseFloat(it.cantidad) * parseFloat(it.precio);
    await pool.query(
      'INSERT INTO ventas_detalle (id, venta_id, producto_id, nombre, cantidad, precio, subtotal) VALUES (?,?,?,?,?,?,?)',
      [uuidv4(), id, it.producto_id||it.id||null, it.nombre||it.producto, it.cantidad, it.precio, sub]
    );
  }

  return exports.findById(id);
};

exports.update = async (id, data) => {
  const campos = ['cliente_id','cliente_nombre','total','metodo_pago','estado','observaciones'];
  const sets   = campos.filter(c => data[c] !== undefined).map(c => `${c} = ?`);
  const vals   = campos.filter(c => data[c] !== undefined).map(c => data[c]);
  if (!sets.length) return null;
  await pool.query(`UPDATE ventas SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
  return exports.findById(id);
};

exports.cancel = async (id) => {
  const [res] = await pool.query("UPDATE ventas SET estado = 'Cancelada' WHERE id = ?", [id]);
  return res.affectedRows > 0;
};
