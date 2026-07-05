/* ═══════════════════════════════════════════════════════
   CRUZYMAR · models/calidadLotesModel.js
   Control de Calidad de Lotes — trabaja sobre produccion_lotes
   La tabla calidad_lotes NO existe; el estado de calidad
   se almacena en produccion_lotes.calidad (ENUM Aprobado/Rechazado/Pendiente)
   y los detalles de la inspección en el campo observaciones.
═══════════════════════════════════════════════════════ */
const pool = require('../database');

/* ── Lista de lotes completados con su estado de calidad ── */
exports.getLotes = async ({ estado, fecha, fechaFin } = {}) => {
  let sql = `
    SELECT
      pl.id,
      pl.numero_lote,
      pl.producto_nombre,
      pl.cantidad_obtenida,
      pl.unidad,
      pl.fecha_produccion,
      pl.turno,
      pl.estado          AS estado_prod,
      pl.calidad         AS estado_calidad,
      pl.observaciones,
      pl.operario        AS inspector
    FROM produccion_lotes pl
    WHERE pl.estado = 'Completada'
  `;
  const p = [];
  if (estado && estado !== 'Todos') {
    sql += ' AND pl.calidad = ?';
    p.push(estado);
  }
  if (fecha)    { sql += ' AND pl.fecha_produccion >= ?'; p.push(fecha); }
  if (fechaFin) { sql += ' AND pl.fecha_produccion <= ?'; p.push(fechaFin); }
  sql += ' ORDER BY pl.fecha_produccion DESC, pl.numero_lote DESC';
  const [rows] = await pool.query(sql, p);
  return rows;
};

/* ── KPIs del mes actual ── */
exports.getKpis = async () => {
  const [[r]] = await pool.query(`
    SELECT
      COUNT(*)                                                        AS total,
      COALESCE(SUM(calidad = 'Aprobado'),  0)                        AS aprobados,
      COALESCE(SUM(calidad = 'Rechazado'), 0)                        AS rechazados,
      COALESCE(SUM(calidad = 'Pendiente'), 0)                        AS pendientes,
      ROUND(
        COALESCE(SUM(calidad = 'Aprobado'), 0)
        / NULLIF(COUNT(*), 0) * 100,
        1
      )                                                               AS tasa_aprobacion
    FROM produccion_lotes
    WHERE estado = 'Completada'
      AND MONTH(fecha_produccion) = MONTH(CURDATE())
      AND YEAR(fecha_produccion)  = YEAR(CURDATE())
  `);
  return r;
};
/* ── Registrar inspección — actualiza produccion_lotes.calidad ── */
exports.inspeccionar = async (data) => {
  const estado = data.estado; // 'Aprobado' | 'Rechazado'
  
  // Formatear parámetros sensoriales para la bitácora en la columna observaciones
  const comentario = data.observaciones || data.motivo_rechazo || '';
  const notaSensorial = `Sal: ${data.sal_nivel || 'Normal'} | Textura: ${data.consistencia || 'Adecuada'} | Color/Olor: ${data.color_olor || 'Normal'}`;
  const obsCompleto = comentario ? `${notaSensorial} | Notas: ${comentario}` : notaSensorial;

  /* 1. Actualizar calidad + observaciones en produccion_lotes */
  await pool.query(
    `UPDATE produccion_lotes SET calidad = ?, observaciones = ? WHERE id = ?`,
    [estado, obsCompleto, data.lote_id]
  );

  /* 2. Si Aprobado → mover al inventario automáticamente */
  if (estado === 'Aprobado') {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [[lote]] = await conn.query(
        `SELECT numero_lote, tipo_proceso, producto_nombre, cantidad_obtenida, producto_inventario_id,
                salida_secundaria_nombre, salida_secundaria_cantidad, salida_secundaria_inventario_id
         FROM produccion_lotes WHERE id = ? FOR UPDATE`,
        [data.lote_id]
      );

      if (lote) {
        const Inventario = require('./inventarioModel');

        // Acreditar producto principal
        if (lote.producto_inventario_id && lote.cantidad_obtenida > 0) {
          await Inventario.registrarMovimientoTx(conn, {
            producto_id: lote.producto_inventario_id,
            tipo: 'Entrada',
            cantidad: lote.cantidad_obtenida,
            motivo: `Lote ${lote.numero_lote} aprobado por calidad`,
            usuario: 'Control Calidad',
            usuario_id: data.inspector_id || null
          });
        }

        // Acreditar subproducto (ej. Leche descremada o suero)
        if (lote.salida_secundaria_inventario_id && lote.salida_secundaria_cantidad > 0) {
          await Inventario.registrarMovimientoTx(conn, {
            producto_id: lote.salida_secundaria_inventario_id,
            tipo: 'Entrada',
            cantidad: lote.salida_secundaria_cantidad,
            motivo: `Subproducto Lote ${lote.numero_lote} aprobado por calidad`,
            usuario: 'Control Calidad',
            usuario_id: data.inspector_id || null
          });
        }
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  return { lote_id: data.lote_id, estado };
};