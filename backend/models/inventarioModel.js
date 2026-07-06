/* ═══════════════════════════════════════
   CRUZYMAR · models/inventarioModel.js
   Inventario + Movimientos + Vencimientos — MySQL

   registrarMovimientoTx() es la ÚNICA función del sistema que
   modifica `stock` en inventario_productos. Tanto el módulo de
   Inventario como el de Producción la llaman pasándole la misma
   conexión de transacción, para que nunca existan dos lugares
   distintos con lógica de mutación de stock (fuente única de verdad).
═══════════════════════════════════════ */

const pool = require('../database');
const { generarIdSecuencial } = require('../utils/idGenerator');

// ── Inventario General ──────────────────────
exports.findAll = async ({ categoria, buscar } = {}) => {
  let sql = "SELECT *, IF(stock <= stock_minimo,'Bajo','OK') AS estado_stock FROM inventario_productos WHERE activo = 1";
  const params = [];
  if (categoria) { sql += ' AND categoria = ?'; params.push(categoria); }
  if (buscar) { sql += ' AND nombre LIKE ?'; params.push(`%${buscar}%`); }
  sql += ' ORDER BY categoria ASC, nombre ASC';
  const [rows] = await pool.query(sql, params);
  return rows;
};

exports.findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM inventario_productos WHERE id = ?', [id]);
  return rows[0] || null;
};

exports.create = async (data) => {
  const id = await generarIdSecuencial('inventario_productos', 'inv');
  await pool.query(
    `INSERT INTO inventario_productos (id, nombre, categoria, stock, stock_minimo, unidad, precio, vencimiento)
     VALUES (?,?,?,?,?,?,?,?)`,
    [id, data.nombre, data.categoria || 'General',
      parseFloat(data.stock) || 0, parseFloat(data.stockMinimo) || 0,
      data.unidad || 'Unidades', parseFloat(data.precio) || 0,
      data.vencimiento || null]
  );
  return exports.findById(id);
};

exports.update = async (id, data) => {
  const mapa = {
    nombre: 'nombre', categoria: 'categoria', stock: 'stock',
    stockMinimo: 'stock_minimo', unidad: 'unidad', precio: 'precio', vencimiento: 'vencimiento'
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
  if (tipo) { sql += ' AND m.tipo = ?'; params.push(tipo); }
  if (productoId) { sql += ' AND m.producto_id = ?'; params.push(productoId); }
  sql += ' ORDER BY m.fecha DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
};

/**
 * ÚNICA función que muta stock. Requiere una conexión de transacción
 * ya abierta (conn.beginTransaction() hecho por quien la llama).
 * Bloquea la fila del producto (FOR UPDATE) para evitar condiciones
 * de carrera si dos movimientos llegan al mismo tiempo.
 *
 * Lanza un Error (y por lo tanto revierte la transacción del llamador)
 * si el producto no existe o si una Salida deja el stock en negativo.
 */
exports.registrarMovimientoTx = async (conn, { producto_id, tipo, cantidad, motivo, usuario, usuario_id }) => {
  const [prods] = await conn.query('SELECT * FROM inventario_productos WHERE id = ? FOR UPDATE', [producto_id]);
  const prod = prods[0];
  if (!prod) throw new Error(`Producto de inventario no encontrado (id=${producto_id})`);

  const cantNum = parseFloat(cantidad) || 0;
  let nuevoStock = parseFloat(prod.stock);

  if (tipo === 'Entrada') {
    nuevoStock += cantNum;
  } else if (tipo === 'Salida') {
    if (cantNum > nuevoStock) {
      throw new Error(`Stock insuficiente de "${prod.nombre}" (disponible: ${nuevoStock}, requerido: ${cantNum})`);
    }
    nuevoStock -= cantNum;
  } else {
    nuevoStock += cantNum; // Ajuste manual, puede ser negativo
  }

  await conn.query('UPDATE inventario_productos SET stock = ? WHERE id = ?', [nuevoStock, producto_id]);

  const id = await generarIdSecuencial('inventario_movimientos', 'mov', conn);
  await conn.query(
    `INSERT INTO inventario_movimientos (id, producto_id, tipo, cantidad, stock_resultante, motivo, usuario, usuario_id)
     VALUES (?,?,?,?,?,?,?,?)`,
    [id, producto_id, tipo, cantNum, nuevoStock, motivo || '', usuario || 'Sistema', usuario_id || null]
  );

  return { id, producto_id, producto_nombre: prod.nombre, tipo, cantidad: cantNum, stock_resultante: nuevoStock };
};

// Movimiento manual desde el módulo de Inventario (registra su propia
// transacción de un solo paso, reutilizando registrarMovimientoTx).
exports.registrarMovimiento = async (data) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const resultado = await exports.registrarMovimientoTx(conn, data);
    await conn.commit();
    return resultado;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// ── Vencimientos ────────────────────────────
exports.getVencimientos = async () => {
  const [rows] = await pool.query(`
    SELECT id, nombre, 'Inventario' AS tipo, stock, unidad, vencimiento,
      CASE
        WHEN vencimiento < CURDATE()                             THEN 'Vencido'
        WHEN vencimiento <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)  THEN 'Crítico'
        WHEN vencimiento <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'Por Vencer'
        ELSE 'Vigente'
      END AS estado
    FROM inventario_productos
    WHERE activo = 1 AND vencimiento IS NOT NULL
    ORDER BY vencimiento ASC
  `);
  return rows;
};