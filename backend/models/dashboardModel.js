/* ═══════════════════════════════════════
   CRUZYMAR · models/dashboardModel.js
   KPIs del dashboard — MySQL (datos reales)
═══════════════════════════════════════ */

const pool = require('../database');

exports.getAll = async () => {
  const hoy = new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const mesInicio = hoy.slice(0, 7) + '-01';

  // Ejecutar todas las queries en paralelo
  const [
    [ventasHoyR], [ventasMesR], [gastosMesR],
    [clientesR],  [prodHoyR],   [stockBajoR],
    semanR,       topProdR,     actividadR,    prodHoyListR
  ] = await Promise.all([
    pool.query("SELECT COALESCE(SUM(total),0) AS v FROM ventas WHERE fecha = ? AND estado='Pagada'", [hoy]),
    pool.query("SELECT COALESCE(SUM(total),0) AS v FROM ventas WHERE fecha >= ? AND estado='Pagada'", [mesInicio]),
    pool.query("SELECT COALESCE(SUM(monto),0) AS v FROM gastos WHERE fecha >= ?", [mesInicio]),
    pool.query("SELECT COUNT(DISTINCT cliente_id) AS v FROM ventas WHERE fecha >= ? AND cliente_id IS NOT NULL", [mesInicio]),
    pool.query("SELECT COALESCE(SUM(cantidad_obtenida),0) AS v FROM produccion_lotes WHERE fecha_produccion = ?", [hoy]),
    pool.query("SELECT COUNT(*) AS v FROM inventario_productos WHERE activo=1 AND stock <= stock_minimo"),
    pool.query(`SELECT DAYNAME(fecha) AS dia, SUM(total) AS total FROM ventas
                WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND estado='Pagada'
                GROUP BY fecha ORDER BY fecha ASC`),
    pool.query(`SELECT p.nombre, COALESCE(SUM(a.litros), 0) AS litros
                FROM acopio_leche a JOIN proveedores p ON p.id = a.proveedor_id
                WHERE a.fecha >= ? AND a.estado='Aceptada'
                GROUP BY p.id, p.nombre ORDER BY litros DESC LIMIT 5`, [mesInicio]),
    pool.query(`(SELECT 'venta' AS tipo, CONCAT('Venta ',v.numero,' — ',v.cliente_nombre) AS texto,
                  v.total AS monto, v.creado_en AS tiempo FROM ventas v ORDER BY v.creado_en DESC LIMIT 3)
                UNION ALL
                (SELECT 'produccion', CONCAT('Lote ',pl.numero_lote,' — ',pl.producto_nombre), NULL, pl.creado_en
                 FROM produccion_lotes pl ORDER BY pl.creado_en DESC LIMIT 2)
                ORDER BY tiempo DESC LIMIT 5`),
    pool.query("SELECT producto_nombre, cantidad_obtenida, estado, turno FROM produccion_lotes WHERE fecha_produccion = ? ORDER BY creado_en DESC", [hoy])
  ]);

  const ventasMes   = Number(ventasMesR[0].v);
  const gastosMes   = Number(gastosMesR[0].v);

  // Mapear días en español
  const diasES = { Monday:'Lun', Tuesday:'Mar', Wednesday:'Mié', Thursday:'Jue', Friday:'Vie', Saturday:'Sáb', Sunday:'Dom' };
  const ventasSemana = semanR[0].map(r => ({ dia: diasES[r.dia] || r.dia, total: Number(r.total) }));

  return {
    kpis: {
      ventasMes,
      gastosMes,
      utilidadMes:        ventasMes - gastosMes,
      clientesActivos:    Number(clientesR[0].v),
      produccionHoy:      Number(prodHoyR[0].v),
      productosStockBajo: Number(stockBajoR[0].v)
    },
    ventasSemana,
    topProductos:  topProdR[0].map(r => ({ nombre: r.nombre, litros: Number(r.litros) })),
    actividad:     actividadR[0].map(r => ({
      tipo:   r.tipo,
      texto:  r.texto,
      monto:  r.monto ? Number(r.monto) : null,
      tiempo: r.tiempo
    })),
    produccionHoy: prodHoyListR[0].map(r => ({
      producto:  r.producto_nombre,
      cantidad:  Number(r.cantidad_obtenida),
      estado:    r.estado,
      turno:     r.turno
    }))
  };
};

