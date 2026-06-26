/* ═══════════════════════════════════════
   CRUZYMAR · models/inventarioModel.js
   Inventario + Movimientos + Vencimientos — MySQL
═══════════════════════════════════════ */

const pool = require('../database');
const { v4: uuid } = require('uuid');

// ── Inventario General ──────────────────────
exports.findAll = async ({ categoria, buscar } = {}) => {
  let sql = "SELECT *, IF(stock <= stock_minimo,'Bajo','OK') AS estado_stock FROM inventario_productos WHERE activo = 1";
  const params = [];
  if (categoria) { sql += ' AND categoria = ?'; params.push(categoria); }
  if (buscar)    { sql += ' AND nombre LIKE ?';  params.push(`%${buscar}%`); }
  sql += ' ORDER BY nombre ASC';
  const [rows] = await pool.query(sql, params);
  return rows;
};

exports.findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM inventario_productos WHERE id = ?', [id]);
  return rows[0] || null;
};

exports.create = async (data) => {
  const id = uuid();
  await pool.query(
    `INSERT INTO inventario_productos (id, nombre, categoria, stock, stock_minimo, unidad, precio, vencimiento)
     VALUES (?,?,?,?,?,?,?,?)`,
    [id, data.nombre, data.categoria||'General',
     parseFloat(data.stock)||0, parseFloat(data.stockMinimo)||0,
     data.unidad||'Unidades', parseFloat(data.precio)||0,
     data.vencimiento||null]
  );
  return exports.findById(id);
};

exports.update = async (id, data) => {
  const mapa = {
    nombre:'nombre', categoria:'categoria', stock:'stock',
    stockMinimo:'stock_minimo', unidad:'unidad', precio:'precio', vencimiento:'vencimiento'
  };
  const sets = Object.keys(mapa).filter(k => data[k] !== undefined).map(k => `${mapa[k]} = ?`);
  const vals = Object.keys(mapa).filter(k => data[k] !== undefined).map(k => data[k]);
  if (!sets.length) return null;
  await pool.query(`UPDATE inventario_productos SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
  return exports.findById(id);
};

exports.softDelete = async (id) => {
  const [res] = await pool.query('UPDATE inventario_productos SET activo = 0 WHERE id = ?', [id]);
  return res.affectedRows > 0;
};

// ── Movimientos ─────────────────────────────
exports.getMovimientos = async ({ tipo, productoId } = {}) => {
  let sql = `
    SELECT m.*, p.nombre AS producto_nombre
    FROM inventario_movimientos m
    LEFT JOIN inventario_productos p ON p.id = m.producto_id
    WHERE 1=1
  `;
  const params = [];
  if (tipo)       { sql += ' AND m.tipo = ?';        params.push(tipo); }
  if (productoId) { sql += ' AND m.producto_id = ?'; params.push(productoId); }
  sql += ' ORDER BY m.fecha DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
};

exports.registrarMovimiento = async ({ producto_id, tipo, cantidad, motivo, usuario, usuario_id }) => {
  const [prods] = await pool.query('SELECT * FROM inventario_productos WHERE id = ?', [producto_id]);
  if (!prods[0]) return null;

  const prod   = prods[0];
  const cantNum= parseFloat(cantidad) || 0;
  let   nuevoStock = parseFloat(prod.stock);

  if (tipo === 'Entrada')    nuevoStock += cantNum;
  else if (tipo === 'Salida') nuevoStock = Math.max(0, nuevoStock - cantNum);
  else nuevoStock += cantNum; // Ajuste puede ser negativo

  // Actualizar stock
  await pool.query('UPDATE inventario_productos SET stock = ? WHERE id = ?', [nuevoStock, producto_id]);

  // Registrar movimiento
  const id = uuid();
  await pool.query(
    `INSERT INTO inventario_movimientos (id, producto_id, tipo, cantidad, stock_resultante, motivo, usuario, usuario_id)
     VALUES (?,?,?,?,?,?,?,?)`,
    [id, producto_id, tipo, cantNum, nuevoStock, motivo||'', usuario||'Sistema', usuario_id||null]
  );

  const [movs] = await pool.query(
    'SELECT m.*, p.nombre AS producto_nombre FROM inventario_movimientos m LEFT JOIN inventario_productos p ON p.id = m.producto_id WHERE m.id = ?',
    [id]
  );
  return movs[0];
};

// ── Vencimientos ────────────────────────────
exports.getVencimientos = async () => {
  const [rows] = await pool.query(`
    SELECT id, nombre, 'Inventario' AS tipo, stock, unidad, vencimiento,
      CASE
        WHEN vencimiento < CURDATE()                                  THEN 'Vencido'
        WHEN vencimiento <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)       THEN 'Crítico'
        WHEN vencimiento <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)      THEN 'Por Vencer'
        ELSE 'Vigente'
      END AS estado
    FROM inventario_productos
    WHERE activo = 1 AND vencimiento IS NOT NULL
    ORDER BY vencimiento ASC
  `);
  return rows;
};
