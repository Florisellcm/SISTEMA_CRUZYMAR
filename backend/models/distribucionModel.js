/* ═══════════════════════════════════════
   CRUZYMAR · models/distribucionModel.js
   Sub-módulo Distribución (dentro de Comercial)

   La hoja de ruta se arma automáticamente cada día tomando
   las ventas marcadas como tipo_entrega = 'Reparto' en esa
   fecha (el vendedor elige "Reparto" al registrar la venta,
   en el módulo Comercial). No requiere asignación manual.
═══════════════════════════════════════ */
const pool = require('../database');
const { v4: uuid } = require('uuid');

/* Genera la hoja de ruta cruzando las ventas del día */
exports.getHojaRuta = async (fecha) => {
  /* ── Detalle de entregas por cliente ── */
  const [entregas] = await pool.query(`
    SELECT
      v.id, v.numero, v.fecha, v.total, v.metodo_pago, v.estado,
      v.cliente_nombre,
      c.telefono AS cliente_tel, c.direccion AS cliente_dir,
      GROUP_CONCAT(
        CONCAT(vd.cantidad, ' ', ip.nombre)
        ORDER BY ip.nombre SEPARATOR ', '
      ) AS productos_texto
    FROM ventas v
    LEFT JOIN clientes c        ON c.id  = v.cliente_id
    LEFT JOIN ventas_detalle vd ON vd.venta_id = v.id
    LEFT JOIN inventario_productos ip ON ip.id = vd.producto_id
    WHERE DATE(v.fecha) = ?
      AND v.estado != 'Cancelada'
      AND v.tipo_entrega = 'Reparto'
    GROUP BY v.id
    ORDER BY v.cliente_nombre
  `, [fecha]);

  /* Asignar número de secuencia */
  entregas.forEach((e, i) => { e.secuencia = i + 1; });

  /* ── Resumen de carga (consolidado por producto) ── */
  const [carga] = await pool.query(`
    SELECT
      ip.nombre AS producto,
      SUM(vd.cantidad) AS total_cantidad,
      ip.unidad
    FROM ventas v
    JOIN ventas_detalle vd      ON vd.venta_id = v.id
    JOIN inventario_productos ip ON ip.id = vd.producto_id
    WHERE DATE(v.fecha) = ?
      AND v.estado != 'Cancelada'
      AND v.tipo_entrega = 'Reparto'
    GROUP BY ip.id, ip.nombre, ip.unidad
    ORDER BY ip.nombre
  `, [fecha]);

  /* ── Totales ── */
  const totalCobrar    = entregas.reduce((s, e) => s + Number(e.total), 0);
  const totalClientes  = entregas.length;
  const totalEfectivo  = entregas.filter(e => e.metodo_pago === 'Efectivo').reduce((s,e)=>s+Number(e.total),0);
  const totalCredito   = entregas.filter(e => e.metodo_pago === 'Crédito').reduce((s,e)=>s+Number(e.total),0);

  return { fecha, entregas, carga, totalCobrar, totalClientes, totalEfectivo, totalCredito };
};

/* Guardar hoja de ruta generada */
exports.guardarRuta = async ({ fecha, transportista, generado_por }) => {
  const data  = await exports.getHojaRuta(fecha);
  const id    = uuid();
  await pool.query(`
    INSERT INTO distribucion_rutas
      (id, fecha_reparto, transportista, total_clientes, total_items, total_cobrar, generado_por)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [id, fecha, transportista || 'Repartidor',
      data.totalClientes,
      data.carga.reduce((s,c)=>s+Number(c.total_cantidad),0),
      data.totalCobrar, generado_por || null]);
  return { id, ...data };
};