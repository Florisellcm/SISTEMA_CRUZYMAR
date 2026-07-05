/* ═══════════════════════════════════════
   CRUZYMAR · models/produccionModel.js
   Producción de lotes — MySQL

   UN SOLO FLUJO por transición de estado, cada uno transaccional:
     create()    → crea el lote y consume la materia prima del
                   inventario (Salida). Si nace ya "Completada",
                   también acredita la(s) salida(s) en el mismo paso.
     completar() → acredita la(s) salida(s) de un lote que estaba
                   "En proceso". No se puede completar dos veces.
     cancelar()  → revierte la materia prima consumida (y la salida
                   acreditada, si ya estaba completado).
     remove()    → elimina el lote revirtiendo cualquier movimiento
                   de inventario que haya generado.
     update()    → SOLO metadatos (turno, fecha, observaciones).
                   No toca cantidades ni estado — eso evita que el
                   inventario se desincronice por una edición suelta.
═══════════════════════════════════════ */

const pool = require('../database');
const { v4: uuidv4 } = require('uuid');
const Inventario = require('./inventarioModel');

// Genera número de lote: YYYYMMDD-T-NNN sin duplicados.
// Usa MAX en lugar de COUNT para evitar colisiones cuando hay filas eliminadas
// o múltiples lotes del mismo día con distinta letra de turno.
const genLote = async (conn, fechaProduccion, turno) => {
  const fecha = (fechaProduccion || new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000).toISOString().slice(0, 10)).replace(/-/g, '');
  const inicial = (turno || 'M').charAt(0).toUpperCase();
  const prefijo = `${fecha}-`;

  // Extraer el número consecutivo más alto de todos los lotes de esa fecha (cualquier turno)
  const [rows] = await conn.query(
    `SELECT numero_lote FROM produccion_lotes
     WHERE numero_lote LIKE ? FOR UPDATE`,
    [`${prefijo}%`]
  );

  let maxNum = 0;
  for (const row of rows) {
    // formato: YYYYMMDD-T-NNN → partes[2] = NNN
    const partes = row.numero_lote.split('-');
    if (partes.length >= 3) {
      const n = parseInt(partes[partes.length - 1], 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  }
  const consec = String(maxNum + 1).padStart(3, '0');
  return `${fecha}-${inicial}-${consec}`;
};

exports.findAll = async ({ estado, fecha, tipoProceso } = {}) => {
  let sql = `
    SELECT pl.*, u.nombre AS operario_nombre, padre.numero_lote AS lote_padre_numero
    FROM produccion_lotes pl
    LEFT JOIN usuarios u ON u.id = pl.operario_id
    LEFT JOIN produccion_lotes padre ON padre.id = pl.lote_padre_id
    WHERE 1=1
  `;
  const params = [];
  if (estado) { sql += ' AND pl.estado = ?'; params.push(estado); }
  if (fecha) { sql += ' AND pl.fecha_produccion = ?'; params.push(fecha); }
  if (tipoProceso) { sql += ' AND pl.tipo_proceso = ?'; params.push(tipoProceso); }
  sql += ' ORDER BY pl.creado_en DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
};

exports.findById = async (id) => {
  const [rows] = await pool.query(
    `SELECT pl.*, u.nombre AS operario_nombre, padre.numero_lote AS lote_padre_numero
     FROM produccion_lotes pl
     LEFT JOIN usuarios u ON u.id = pl.operario_id
     LEFT JOIN produccion_lotes padre ON padre.id = pl.lote_padre_id
     WHERE pl.id = ?`, [id]);
  return rows[0] || null;
};

// Últimos lotes completados, solo para el selector informativo de
// "Lote de origen" (trazabilidad, no valida cantidades).
exports.findRecientes = async (limit = 20) => {
  const [rows] = await pool.query(
    `SELECT id, numero_lote, producto_nombre, tipo_proceso, fecha_produccion
     FROM produccion_lotes
     WHERE estado = 'Completada'
     ORDER BY fecha_produccion DESC, creado_en DESC
     LIMIT ?`,
    [limit]
  );
  return rows;
};

/**
 * Crea un lote. Consume la materia prima del inventario de inmediato
 * (una vez que la leche/insumo entra al proceso, ya no está disponible
 * para otra cosa). Si el lote nace directamente "Completada", también
 * acredita la salida principal (y secundaria, si aplica) en el mismo
 * paso transaccional.
 */
exports.create = async (data) => {
  const {
    tipoProceso, entradaTipo, lotePadreId,
    materiaPrimaInventarioId, productoInventarioId, salidaSecundariaInventarioId,
    productoNombre, lecheUsada, cantidadObtenida, unidad,
    salidaSecundariaNombre, salidaSecundariaCantidad, salidaSecundariaUnidad,
    fechaProduccion, turno, operario, operario_id,
    receta_id, insumos, observaciones, estado
  } = data;

  if (!materiaPrimaInventarioId) throw new Error('Debe indicar de qué producto de inventario sale la materia prima');
  if (!productoInventarioId) throw new Error('Debe indicar a qué producto de inventario corresponde la salida principal');

  const tipo = tipoProceso || 'Manual';
  const entrada = parseFloat(lecheUsada) || 0;
  const principal = parseFloat(cantidadObtenida) || 0;
  const secundaria = (salidaSecundariaCantidad !== undefined && salidaSecundariaCantidad !== null && salidaSecundariaCantidad !== '')
    ? parseFloat(salidaSecundariaCantidad) : null;
  const estadoFinal = estado || 'En proceso';

  if (entrada <= 0) throw new Error('La cantidad de materia prima utilizada debe ser mayor a 0');

  const salidasParaRendimiento = tipo === 'Descremado' ? (principal + (secundaria || 0)) : principal;
  const rendimiento = entrada > 0 ? parseFloat(((salidasParaRendimiento / entrada) * 100).toFixed(1)) : 0;
  const merma = parseFloat(Math.max(0, entrada - salidasParaRendimiento).toFixed(2));

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const numLote = await genLote(conn, fechaProduccion, turno);
    const id = uuidv4();
    const fecha = fechaProduccion || new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000).toISOString().slice(0, 10);

    await conn.query(
      `INSERT INTO produccion_lotes
        (id, numero_lote, receta_id, tipo_proceso, entrada_tipo, lote_padre_id,
         materia_prima_inventario_id, producto_inventario_id, salida_secundaria_inventario_id,
         producto_nombre, leche_usada, cantidad_obtenida, unidad,
         salida_secundaria_nombre, salida_secundaria_cantidad, salida_secundaria_unidad,
         rendimiento, merma, fecha_produccion, turno, operario, operario_id,
         insumos, observaciones, estado, calidad)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, numLote, receta_id || null, tipo, entradaTipo || null, lotePadreId || null,
        materiaPrimaInventarioId, productoInventarioId, salidaSecundariaInventarioId || null,
        productoNombre, entrada, principal, unidad || 'libras',
        salidaSecundariaNombre || null, secundaria, salidaSecundariaUnidad || null,
        rendimiento, merma, fecha, turno || 'Mañana', operario || '', operario_id || null,
        insumos || '', observaciones || '', estadoFinal, 'Pendiente']
    );

    // Consumir la materia prima del inventario (siempre, sin importar el estado del lote)
    await Inventario.registrarMovimientoTx(conn, {
      producto_id: materiaPrimaInventarioId,
      tipo: 'Salida',
      cantidad: entrada,
      motivo: `Consumo en Lote ${numLote} (${tipo})`,
      operario_id
    });

    // No acreditamos stock de salida aquí, solo al ser Aprobado por Control de Calidad.

    await conn.commit();
    return exports.findById(id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

/**
 * Marca un lote "En proceso" como "Completada" y acredita su(s) salida(s)
 * al inventario. No se puede completar un lote ya completado o cancelado
 * (evita acreditar el mismo producto dos veces).
 */
exports.completar = async (id, { cantidadObtenida, salidaSecundariaCantidad }) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query('SELECT * FROM produccion_lotes WHERE id = ? FOR UPDATE', [id]);
    const lote = rows[0];
    if (!lote) throw new Error('Lote no encontrado');
    if (lote.estado === 'Completada') throw new Error('Este lote ya fue completado anteriormente');
    if (lote.estado === 'Cancelada') throw new Error('No se puede completar un lote cancelado');

    const principal = parseFloat(cantidadObtenida) || 0;
    const secundaria = (salidaSecundariaCantidad !== undefined && salidaSecundariaCantidad !== null && salidaSecundariaCantidad !== '')
      ? parseFloat(salidaSecundariaCantidad) : null;

    if (principal <= 0) throw new Error('Debe ingresar la cantidad obtenida');
    if (lote.tipo_proceso === 'Descremado' && (!secundaria || secundaria <= 0)) {
      throw new Error('El descremado requiere la cantidad de leche descremada obtenida');
    }

    const entrada = parseFloat(lote.leche_usada) || 0;
    const salidasParaRendimiento = lote.tipo_proceso === 'Descremado' ? (principal + (secundaria || 0)) : principal;
    const rendimiento = entrada > 0 ? parseFloat(((salidasParaRendimiento / entrada) * 100).toFixed(1)) : 0;
    const merma = parseFloat(Math.max(0, entrada - salidasParaRendimiento).toFixed(2));

    // Actualizar datos del lote y marcarlo como Completada (su calidad inicial nace como Pendiente)
    await conn.query(
      `UPDATE produccion_lotes
       SET cantidad_obtenida = ?, salida_secundaria_cantidad = ?, rendimiento = ?, merma = ?, estado = 'Completada', calidad = 'Pendiente'
       WHERE id = ?`,
      [principal, secundaria, rendimiento, merma, id]
    );

    await conn.commit();
    return exports.findById(id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

/**
 * Cancela un lote: revierte la materia prima consumida (siempre) y,
 * si ya estaba completado, también revierte la(s) salida(s) acreditada(s).
 */
exports.cancelar = async (id) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query('SELECT * FROM produccion_lotes WHERE id = ? FOR UPDATE', [id]);
    const lote = rows[0];
    if (!lote) throw new Error('Lote no encontrado');
    if (lote.estado === 'Cancelada') throw new Error('Este lote ya está cancelado');

    if (lote.materia_prima_inventario_id && parseFloat(lote.leche_usada) > 0) {
      await Inventario.registrarMovimientoTx(conn, {
        producto_id: lote.materia_prima_inventario_id,
        tipo: 'Entrada',
        cantidad: lote.leche_usada,
        motivo: `Reverso por cancelación de Lote ${lote.numero_lote}`
      });
    }

    if (lote.estado === 'Completada') {
      if (lote.producto_inventario_id && parseFloat(lote.cantidad_obtenida) > 0) {
        await Inventario.registrarMovimientoTx(conn, {
          producto_id: lote.producto_inventario_id,
          tipo: 'Salida',
          cantidad: lote.cantidad_obtenida,
          motivo: `Reverso por cancelación de Lote ${lote.numero_lote}`
        });
      }
      if (lote.salida_secundaria_inventario_id && parseFloat(lote.salida_secundaria_cantidad) > 0) {
        await Inventario.registrarMovimientoTx(conn, {
          producto_id: lote.salida_secundaria_inventario_id,
          tipo: 'Salida',
          cantidad: lote.salida_secundaria_cantidad,
          motivo: `Reverso por cancelación de Lote ${lote.numero_lote}`
        });
      }
    }

    await conn.query(`UPDATE produccion_lotes SET estado = 'Cancelada' WHERE id = ?`, [id]);

    await conn.commit();
    return exports.findById(id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

/**
 * Edita SOLO metadatos (turno, fecha, observaciones). No toca cantidades
 * ni estado: esos cambios solo pueden pasar por create/completar/cancelar,
 * para que el inventario nunca se desincronice por una edición suelta.
 */
exports.update = async (id, data) => {
  const campos = ['turno', 'fecha_produccion', 'observaciones', 'insumos'];
  const sets = campos.filter(c => data[c] !== undefined).map(c => `${c} = ?`);
  const vals = campos.filter(c => data[c] !== undefined).map(c => data[c]);
  if (!sets.length) return exports.findById(id);
  await pool.query(`UPDATE produccion_lotes SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
  return exports.findById(id);
};

/**
 * Elimina un lote revirtiendo cualquier movimiento de inventario que
 * haya generado (materia prima consumida y, si aplica, salida acreditada).
 * Nota: si otro lote ya usó la salida de este como su materia prima
 * (lote_padre_id), esa referencia queda en NULL automáticamente (FK
 * ON DELETE SET NULL) — la trazabilidad de ese lote hijo se pierde,
 * pero su inventario no se ve afectado.
 */
exports.remove = async (id) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query('SELECT * FROM produccion_lotes WHERE id = ? FOR UPDATE', [id]);
    const lote = rows[0];
    if (!lote) { await conn.rollback(); return false; }

    if (lote.estado !== 'Cancelada') {
      if (lote.materia_prima_inventario_id && parseFloat(lote.leche_usada) > 0) {
        await Inventario.registrarMovimientoTx(conn, {
          producto_id: lote.materia_prima_inventario_id,
          tipo: 'Entrada',
          cantidad: lote.leche_usada,
          motivo: `Reverso por eliminación de Lote ${lote.numero_lote}`
        });
      }
      if (lote.estado === 'Completada') {
        if (lote.producto_inventario_id && parseFloat(lote.cantidad_obtenida) > 0) {
          await Inventario.registrarMovimientoTx(conn, {
            producto_id: lote.producto_inventario_id,
            tipo: 'Salida',
            cantidad: lote.cantidad_obtenida,
            motivo: `Reverso por eliminación de Lote ${lote.numero_lote}`
          });
        }
        if (lote.salida_secundaria_inventario_id && parseFloat(lote.salida_secundaria_cantidad) > 0) {
          await Inventario.registrarMovimientoTx(conn, {
            producto_id: lote.salida_secundaria_inventario_id,
            tipo: 'Salida',
            cantidad: lote.salida_secundaria_cantidad,
            motivo: `Reverso por eliminación de Lote ${lote.numero_lote}`
          });
        }
      }
    }

    await conn.query('DELETE FROM produccion_lotes WHERE id = ?', [id]);
    await conn.commit();
    return true;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};