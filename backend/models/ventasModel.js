/* ═══════════════════════════════════════
   CRUZYMAR · models/ventasModel.js
   Acceso a datos de ventas — MySQL

   create() es UNA sola transacción: venta + detalle + baja de
   inventario (vía Inventario.registrarMovimientoTx, la única función
   del sistema que muta stock) + factura si se pidió. Todo o nada.

   FIX (2026-07-06): la generación de `numero` usaba COUNT(*)+1 sobre
   la tabla, que asume "filas totales == número más alto emitido".
   Si alguna vez se borró una fila (o hay gaps por cualquier razón),
   COUNT(*)+1 puede devolver un número que YA existe -> duplicate key
   en ventas.numero (y lo mismo aplicaba a facturacion.numero). Se
   cambió a MAX(numero real) + 1, que es inmune a esos gaps.
═══════════════════════════════════════ */

const pool = require('../database');
const { generarIdSecuencial } = require('../utils/idGenerator');
const Inventario = require('./inventarioModel');

const hoy = () => new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000).toISOString().slice(0, 10);

exports.findAll = async ({ estado, tipoEntrega, rutaId } = {}) => {
  let sql = `
    SELECT v.*, c.telefono AS cliente_tel, c.rtn AS cliente_rtn,
           f.id AS factura_id, f.numero AS factura_numero
    FROM ventas v
    LEFT JOIN clientes c     ON c.id = v.cliente_id
    LEFT JOIN facturacion f  ON f.venta_id = v.id
    WHERE 1=1
  `;
  const params = [];
  if (estado)      { sql += ' AND v.estado = ?';       params.push(estado); }
  if (tipoEntrega)  { sql += ' AND v.tipo_entrega = ?'; params.push(tipoEntrega); }
  if (rutaId)       { sql += ' AND v.ruta_id = ?';      params.push(rutaId); }
  sql += ' ORDER BY v.creado_en DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
};

exports.findById = async (id) => {
  const [[venta], [items]] = await Promise.all([
    pool.query(`
      SELECT v.*, c.telefono AS cliente_tel, c.rtn AS cliente_rtn,
             f.id AS factura_id, f.numero AS factura_numero
      FROM ventas v
      LEFT JOIN clientes c    ON c.id = v.cliente_id
      LEFT JOIN facturacion f ON f.venta_id = v.id
      WHERE v.id = ?`, [id]),
    pool.query('SELECT * FROM ventas_detalle WHERE venta_id = ?', [id])
  ]);
  if (!venta[0]) return null;
  return { ...venta[0], items };
};

// Ventas de reparto que todavía no se han metido a ninguna hoja de
// ruta — esto es lo que el módulo de Distribución debe listar para
// armar la ruta del día.
exports.findPendientesReparto = async () => {
  const [rows] = await pool.query(`
    SELECT v.*, c.telefono AS cliente_tel, c.direccion AS cliente_direccion
    FROM ventas v
    LEFT JOIN clientes c ON c.id = v.cliente_id
    WHERE v.tipo_entrega = 'Reparto' AND v.ruta_id IS NULL AND v.estado <> 'Cancelada'
    ORDER BY v.creado_en ASC
  `);
  return rows;
};

exports.create = async ({ clienteId, clienteNombre, items, metodoPago, estado, observaciones, tipoEntrega, generarFactura, vendedor_id }) => {
  const total = (items || []).reduce((s, i) => s + parseFloat(i.cantidad) * parseFloat(i.precio), 0);
  const fecha = hoy();
  const tipoEntregaFinal = tipoEntrega === 'Reparto' ? 'Reparto' : 'Local';

  const conn = await pool.getConnection();
  const id    = await generarIdSecuencial('ventas', 'vta', conn);
  try {
    await conn.beginTransaction();

    // FIX: antes era SELECT LPAD(COUNT(*)+1,4,'0') ... FROM ventas FOR UPDATE
    // COUNT(*) cuenta filas totales, no el número más alto ya usado.
    // Con cualquier gap (fila borrada, id fuera de secuencia, etc.)
    // esto regeneraba un numero YA existente -> Duplicate entry.
    // Ahora se toma el máximo numero real (parte numérica tras 'VTA-')
    // y se suma 1, así siempre es mayor que cualquier numero existente.
    const [[cnt]] = await conn.query(
      "SELECT LPAD(COALESCE(MAX(CAST(SUBSTRING(numero, 5) AS UNSIGNED)), 0) + 1, 4, '0') AS num FROM ventas FOR UPDATE"
    );
    const numero = `VTA-${cnt.num}`;

    await conn.query(
      `INSERT INTO ventas (id, numero, cliente_id, cliente_nombre, total, metodo_pago, estado, tipo_entrega, observaciones, fecha, vendedor_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [id, numero, clienteId || null, clienteNombre || 'Consumidor final', total,
        metodoPago || 'Efectivo', estado || 'Pagada', tipoEntregaFinal, observaciones || '', fecha, vendedor_id || null]
    );

    for (const it of (items || [])) {
      const sub    = parseFloat(it.cantidad) * parseFloat(it.precio);
      const prodId = it.producto_id || it.id || null;

      const detId = await generarIdSecuencial('ventas_detalle', 'dtl', conn);
      await conn.query(
        'INSERT INTO ventas_detalle (id, venta_id, producto_id, nombre, cantidad, precio, subtotal) VALUES (?,?,?,?,?,?,?)',
        [detId, id, prodId, it.nombre || it.producto, it.cantidad, it.precio, sub]
      );

      // Baja de inventario: SIEMPRE por Inventario.registrarMovimientoTx
      // (única función que muta stock), nunca con un UPDATE suelto.
      if (prodId) {
        await Inventario.registrarMovimientoTx(conn, {
          producto_id: prodId,
          tipo: 'Salida',
          cantidad: it.cantidad,
          motivo: `Venta ${numero}`,
          usuario_id: vendedor_id || null
        });
      }
    }

    let factura = null;
    if (generarFactura) {
      // FIX: mismo problema y misma solución que arriba, pero para facturacion.numero
      const [[cntF]] = await conn.query(
        "SELECT LPAD(COALESCE(MAX(CAST(SUBSTRING(numero, 5) AS UNSIGNED)), 0) + 1, 4, '0') AS num FROM facturacion FOR UPDATE"
      );
      const numeroFactura = `FAC-${cntF.num}`;
      const facturaId = await generarIdSecuencial('facturacion', 'fac', conn);

      await conn.query(
        `INSERT INTO facturacion (id, numero, cliente_id, venta_id, total, estado, fecha)
         VALUES (?,?,?,?,?, 'Emitida', ?)`,
        [facturaId, numeroFactura, clienteId || null, id, total, fecha]
      );
      factura = { id: facturaId, numero: numeroFactura };
    }

    await conn.commit();
    const ventaCompleta = await exports.findById(id);
    return { ...ventaCompleta, factura };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

exports.update = async (id, data) => {
  const campos = ['cliente_id', 'cliente_nombre', 'total', 'metodo_pago', 'estado', 'tipo_entrega', 'observaciones'];
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

// Recalcula los totales de una ruta a partir de las ventas que
// realmente tiene asignadas — así distribucion_rutas nunca queda
// con números inventados o desactualizados.
async function recalcularRuta(conn, rutaId) {
  await conn.query(`
    UPDATE distribucion_rutas r SET
      total_clientes = (SELECT COUNT(DISTINCT cliente_id) FROM ventas WHERE ruta_id = r.id),
      total_items    = (SELECT COALESCE(SUM(vd.cantidad),0) FROM ventas v
                         JOIN ventas_detalle vd ON vd.venta_id = v.id WHERE v.ruta_id = r.id),
      total_cobrar   = (SELECT COALESCE(SUM(total),0) FROM ventas WHERE ruta_id = r.id)
    WHERE r.id = ?`, [rutaId]);
}

// Asigna un lote de ventas (checkbox múltiple en Distribución) a una
// ruta ya creada, y deja los totales de la ruta actualizados.
exports.asignarRuta = async (ventaIds, rutaId) => {
  if (!Array.isArray(ventaIds) || !ventaIds.length) throw new Error('Debe indicar al menos una venta');
  if (!rutaId) throw new Error('Debe indicar la ruta destino');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `UPDATE ventas SET ruta_id = ? WHERE id IN (${ventaIds.map(() => '?').join(',')}) AND tipo_entrega = 'Reparto'`,
      [rutaId, ...ventaIds]
    );
    await recalcularRuta(conn, rutaId);
    await conn.commit();
    return true;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};