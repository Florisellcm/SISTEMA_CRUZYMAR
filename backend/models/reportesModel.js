/* ═══════════════════════════════════════════════════════════════
   CRUZYMAR · models/reportesModel.js
   Reportes consolidados — MySQL (datos reales)
   Victoria, Yoro, Honduras
═══════════════════════════════════════════════════════════════ */

const pool = require('../database');

/* ──────────────────────────────────────────────────────────────
   REPORTE 1 — Detallado Producción Diaria
   Departamento de Producción | Supervisor + Jefe de Planta
   Frecuencia: Diario | Almacenamiento: 5 años
────────────────────────────────────────────────────────────── */
exports.getDetalladoProduccion = async ({ fecha, fechaFin, estado } = {}) => {
  const now = new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000);
  const primerDia = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const hoy = fecha || primerDia;
  const hasta = fechaFin || now.toISOString().slice(0, 10);

  let sql = `
    SELECT
      pl.*,
      r.producto AS receta_nombre,
      r.rendimiento_esperado,
      u.nombre AS operario_nombre,
      u.email AS operario_email
    FROM produccion_lotes pl
    LEFT JOIN recetas r ON r.id = pl.receta_id
    LEFT JOIN usuarios u ON u.id = pl.operario_id
    WHERE pl.fecha_produccion BETWEEN ? AND ?
  `;

  const params = [hoy, hasta];

  if (estado) {
    sql += ' AND pl.estado = ?';
    params.push(estado);
  }

  sql += ' ORDER BY pl.fecha_produccion DESC, pl.creado_en DESC';

  const [registros] = await pool.query(sql, params);

  // ============================
  // KPIs DEL REPORTE
  // ============================

  const [kpiRow] = await pool.query(`
    SELECT

      /* Solo leche cruda (lotes raíz) */
      COALESCE(
        SUM(
          CASE
            WHEN lote_padre_id IS NULL
            THEN leche_usada
            ELSE 0
          END
        ),
      0) AS total_litros,

      /* Total producido */
     /* Total producido SOLO en libras */
COALESCE(
  SUM(
    CASE
      WHEN LOWER(unidad) LIKE '%libr%'
      THEN cantidad_obtenida
      ELSE 0
    END
  ),
0) AS total_libras,
 /* Total producido SOLO en litros */
COALESCE(
  SUM(
    CASE
      WHEN LOWER(unidad) LIKE '%litr%'
      THEN cantidad_obtenida
      ELSE 0
    END
  ),
0) AS total_litros,

      /* Merma total */
      COALESCE(SUM(merma),0) AS total_merma,

      /* Lotes completados */
      SUM(estado='Completada') AS completados,

      /* Total de lotes */
      COUNT(*) AS total_lotes,

      /* Procesos con subproducto */
      SUM(
        salida_secundaria_cantidad IS NOT NULL
        AND salida_secundaria_cantidad > 0
      ) AS lotes_subproducto

    FROM produccion_lotes
    WHERE fecha_produccion BETWEEN ? AND ?
  `, [hoy, hasta]);

  return {
    periodo: {
      desde: hoy,
      hasta
    },
    kpis: kpiRow[0],
    registros
  };
};

/* ──────────────────────────────────────────────────────────────
   REPORTE 2 — Detallado Control de Calidad
   Departamento de Calidad | Jefe de Calidad + Supervisor
   Frecuencia: Diario | Almacenamiento: 5 años
────────────────────────────────────────────────────────────── */
exports.getDetalladoCalidad = async ({ fecha, fechaFin, resultado } = {}) => {
  const now = new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000);
  const primerDia = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const hoy   = fecha    || primerDia;
  const hasta = fechaFin || now.toISOString().slice(0, 10);

  // 1. Pruebas de Calidad de Recepción de Leche (Materia Prima)
  let sqlLeche = `
    SELECT cp.*,
           a.litros          AS litros_acopio,
           a.turno           AS turno_acopio,
           a.total_pagar     AS pago_acopio,
           p.nombre          AS proveedor_nombre,
           p.telefono        AS proveedor_tel,
           u.nombre          AS analista_nombre
    FROM calidad_pruebas cp
    LEFT JOIN acopio_leche a ON a.id = cp.acopio_id
    LEFT JOIN proveedores  p ON p.id = a.proveedor_id
    LEFT JOIN usuarios     u ON u.id = cp.analista_id
    WHERE cp.fecha BETWEEN ? AND ?
  `;
  const paramsLeche = [hoy, hasta];
  if (resultado) { sqlLeche += ' AND cp.resultado = ?'; paramsLeche.push(resultado); }
  sqlLeche += ' ORDER BY cp.fecha DESC, cp.creado_en DESC';

  const [recepcionLeche] = await pool.query(sqlLeche, paramsLeche);

  // 2. Pruebas de Calidad de Lotes de Producción (Producto Terminado)
  let sqlLotes = `
    SELECT pl.id, pl.numero_lote, pl.producto_nombre, pl.cantidad_obtenida, pl.unidad, pl.fecha_produccion, pl.turno, pl.calidad AS resultado, pl.observaciones
    FROM produccion_lotes pl
    WHERE pl.fecha_produccion BETWEEN ? AND ? AND pl.estado = 'Completada'
  `;
  const paramsLotes = [hoy, hasta];
  if (resultado) { sqlLotes += ' AND pl.calidad = ?'; paramsLotes.push(resultado); }
  sqlLotes += ' ORDER BY pl.fecha_produccion DESC, pl.numero_lote DESC';

  const [lotesProduccion] = await pool.query(sqlLotes, paramsLotes);

  // 3. KPIs Consolidados
  const totalLeche = recepcionLeche.length;
  const aprobadosLeche = recepcionLeche.filter(r => r.resultado === 'Aprobado').length;
  
  const totalLotes = lotesProduccion.length;
  const aprobadosLotes = lotesProduccion.filter(l => l.resultado === 'Aprobado').length;

  const totalPruebas = totalLeche + totalLotes;
  const totalAprobados = aprobadosLeche + aprobadosLotes;
  const tasaAprobacion = totalPruebas > 0 ? (totalAprobados / totalPruebas * 100) : 100;

  const kpis = {
    total_pruebas: totalPruebas,
    aprobados: totalAprobados,
    rechazados: totalPruebas - totalAprobados,
    tasa_aprobacion: tasaAprobacion,
    recepcion_total: totalLeche,
    recepcion_aprobados: aprobadosLeche,
    lotes_total: totalLotes,
    lotes_aprobados: aprobadosLotes
  };

  return { periodo: { desde: hoy, hasta }, kpis, recepcionLeche, lotesProduccion };
};

/* ──────────────────────────────────────────────────────────────
   REPORTE 3 — Detallado Distribución / Ventas
   Departamento de Distribución | Encargado Distribución
   Frecuencia: Diario | Almacenamiento: 5 años
────────────────────────────────────────────────────────────── */
exports.getDetalladoDistribucion = async ({ fecha, fechaFin, estado } = {}) => {
  const now = new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000);
  const primerDia = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const hoy   = fecha    || primerDia;
  const hasta = fechaFin || now.toISOString().slice(0, 10);

  let sql = `
    SELECT v.*,
           c.telefono AS cliente_tel,
           c.rtn      AS cliente_rtn,
           c.tipo     AS cliente_tipo,
           c.direccion AS cliente_dir,
           u.nombre   AS vendedor_nombre
    FROM ventas v
    LEFT JOIN clientes  c ON c.id = v.cliente_id
    LEFT JOIN usuarios  u ON u.id = v.vendedor_id
    WHERE v.fecha BETWEEN ? AND ?
      AND (c.tipo IS NULL OR c.tipo != 'Particular')
  `;
  const params = [hoy, hasta];
  if (estado) { sql += ' AND v.estado = ?'; params.push(estado); }
  sql += ' ORDER BY v.fecha DESC, v.creado_en DESC';

  const [ventasCab] = await pool.query(sql, params);

  // Detalle de items por venta
  const [items] = await pool.query(`
    SELECT vd.*, v.fecha AS fecha_venta, v.cliente_nombre
    FROM ventas_detalle vd
    JOIN ventas v ON v.id = vd.venta_id
    LEFT JOIN clientes c ON c.id = v.cliente_id
    WHERE v.fecha BETWEEN ? AND ?
      AND (c.tipo IS NULL OR c.tipo != 'Particular')
    ORDER BY v.fecha DESC
  `, [hoy, hasta]);

  const [kpiRow] = await pool.query(`
    SELECT
      COUNT(*)                                    AS total_facturas,
      COALESCE(SUM(CASE WHEN v.estado='Pagada'   THEN v.total END), 0) AS total_facturado,
      COALESCE(SUM(CASE WHEN v.estado='Pendiente'THEN v.total END), 0) AS pendiente_cobro,
      SUM(v.estado = 'Pendiente')                   AS facturas_pendientes,
      ROUND(AVG(v.total), 2)                        AS ticket_promedio,
      COUNT(DISTINCT v.cliente_id)                  AS clientes_atendidos
    FROM ventas v
    LEFT JOIN clientes c ON c.id = v.cliente_id
    WHERE v.fecha BETWEEN ? AND ?
      AND (c.tipo IS NULL OR c.tipo != 'Particular')
  `, [hoy, hasta]);

  return { periodo: { desde: hoy, hasta }, kpis: kpiRow[0], registros: ventasCab, detalle: items };
};

/* ──────────────────────────────────────────────────────────────
   REPORTE 4 — Sintetizado Inventario
   Supervisor Almacén | Semanalmente | Municipio Victoria, Yoro
   Almacenamiento: 5 años
────────────────────────────────────────────────────────────── */
exports.getSintetizadoInventario = async () => {
  const [productos] = await pool.query(`
    SELECT ip.*,
           COALESCE(SUM(CASE WHEN m.tipo='Entrada' THEN m.cantidad END), 0) AS entradas_mes,
           COALESCE(SUM(CASE WHEN m.tipo='Salida'  THEN m.cantidad END), 0) AS salidas_mes,
           IF(ip.stock <= ip.stock_minimo, 'Bajo', 'OK') AS estado_stock
    FROM inventario_productos ip
    LEFT JOIN inventario_movimientos m ON m.producto_id = ip.id
      AND m.fecha >= DATE_FORMAT(CURDATE(),'%Y-%m-01')
    WHERE ip.activo = 1
    GROUP BY ip.id
    ORDER BY ip.categoria, ip.nombre
  `);

  const [kpiRow] = await pool.query(`
    SELECT
      SUM(stock)                            AS total_unidades,
      SUM(stock * precio)                   AS valor_estimado,
      COUNT(*)                              AS total_productos,
      SUM(stock <= stock_minimo)            AS productos_bajo_stock,
      SUM(stock = 0)                        AS productos_agotados
    FROM inventario_productos WHERE activo = 1
  `);

  const [movRecientes] = await pool.query(`
    SELECT m.*, p.nombre AS producto_nombre
    FROM inventario_movimientos m
    JOIN inventario_productos p ON p.id = m.producto_id
    ORDER BY m.fecha DESC LIMIT 20
  `);

  return { kpis: kpiRow[0], productos, movimientos: movRecientes };
};

/* ──────────────────────────────────────────────────────────────
   REPORTE 5 — Sintetizado Desempeño de Proveedores
   Encargado de Compras + Supervisor de Producción + Gerencia
   Frecuencia: Mensual | Área: Recepción de Leche y Compras
   Almacenamiento: 5 años
────────────────────────────────────────────────────────────── */
exports.getSintetizadoProveedores = async ({ mes, anio } = {}) => {
  const now = new Date();
  const a   = anio || now.getFullYear();
  let inicio, fin, m;

  if (mes === 'todos') {
    m      = 'Todo el año';
    inicio = `${a}-01-01`;
    fin    = `${a}-12-31`;
  } else {
    m      = mes ? String(mes).padStart(2, '0') : String(now.getMonth() + 1).padStart(2, '0');
    inicio = `${a}-${m}-01`;
    fin    = `${a}-${m}-31`;
  }

  /* ── KPIs globales del período ── */
  const [[kpiRow]] = await pool.query(`
    SELECT
      COUNT(*)                                                        AS total_entregas,
      SUM(estado = 'Aceptada')                                        AS total_aceptadas,
      SUM(estado = 'Rechazada')                                       AS total_rechazadas,
      COALESCE(SUM(CASE WHEN estado = 'Aceptada' THEN litros END), 0) AS litros_aceptados,
      COALESCE(SUM(CASE WHEN estado = 'Rechazada' THEN litros END), 0) AS litros_rechazados,
      COALESCE(SUM(CASE WHEN estado = 'Aceptada' THEN total_pagar END), 0) AS total_pagado,
      COUNT(DISTINCT proveedor_id)                                    AS total_proveedores,
      ROUND(SUM(estado = 'Aceptada') / NULLIF(COUNT(*), 0) * 100, 1) AS pct_aceptacion_global
    FROM acopio_leche
    WHERE fecha BETWEEN ? AND ?
  `, [inicio, fin]);

  /* ── Tabla maestra por proveedor ── */
  const [porProveedor] = await pool.query(`
    SELECT
      p.nombre                                                          AS proveedor,
      p.telefono,
      COUNT(*)                                                          AS total_entregas,
      SUM(a.estado = 'Aceptada')                                        AS aceptadas,
      SUM(a.estado = 'Rechazada')                                       AS rechazadas,
      SUM(a.estado = 'Pendiente')                                       AS pendientes,
      COALESCE(SUM(CASE WHEN a.estado = 'Aceptada'  THEN a.litros END), 0) AS litros_aceptados,
      COALESCE(SUM(CASE WHEN a.estado = 'Rechazada' THEN a.litros END), 0) AS litros_rechazados,
      COALESCE(SUM(CASE WHEN a.estado = 'Aceptada'  THEN a.total_pagar END), 0) AS total_pagado,
      ROUND(AVG(CASE WHEN a.estado = 'Aceptada' THEN a.litros END), 1) AS promedio_litros,
      ROUND(SUM(a.estado = 'Aceptada') / NULLIF(COUNT(*), 0) * 100, 1) AS pct_aceptacion,
      MAX(a.fecha)                                                      AS ultima_entrega
    FROM acopio_leche a
    LEFT JOIN proveedores p ON p.id = a.proveedor_id
    WHERE a.fecha BETWEEN ? AND ?
    GROUP BY a.proveedor_id, p.nombre, p.telefono
    ORDER BY total_entregas DESC, pct_aceptacion DESC
  `, [inicio, fin]);

  /* ── Detalle de entregas individuales ── */
  const [registros] = await pool.query(`
    SELECT
      a.fecha, a.turno, a.litros, a.precio_litro, a.total_pagar,
      a.estado, a.motivo_rechazo, a.observaciones,
      p.nombre AS proveedor_nombre
    FROM acopio_leche a
    LEFT JOIN proveedores p ON p.id = a.proveedor_id
    WHERE a.fecha BETWEEN ? AND ?
    ORDER BY a.fecha DESC, a.creado_en DESC
  `, [inicio, fin]);

  /* ── Top proveedores con más rechazos ── */
  const topRechazados = [...porProveedor]
    .filter(r => Number(r.rechazadas) > 0)
    .sort((a, b) => Number(b.rechazadas) - Number(a.rechazadas))
    .slice(0, 8);

  return {
    periodo: { mes: mes === 'todos' ? String(a) : `${a}-${m}`, inicio, fin },
    kpis: kpiRow,
    porProveedor,
    registros,
    topRechazados
  };
};

/* ──────────────────────────────────────────────────────────────
   REPORTE 6 — Sintetizado Estados Financieros
   Departamento Contabilidad | Mensual/Anual | Victoria, Yoro
   Almacenamiento: 5 años
────────────────────────────────────────────────────────────── */
exports.getSintetizadoFinanciero = async ({ mes, anio } = {}) => {
  const now = new Date();
  const a   = anio || now.getFullYear();
  let inicio, fin, m;
  if (mes === 'todos') {
    m = 'Todo el año';
    inicio = `${a}-01-01`;
    fin    = `${a}-12-31`;
  } else {
    m = mes ? String(mes).padStart(2,'0') : String(now.getMonth()+1).padStart(2,'0');
    inicio = `${a}-${m}-01`;
    fin    = `${a}-${m}-31`;
  }

  const [[ingR]]  = await pool.query("SELECT COALESCE(SUM(total),0) AS v FROM ventas  WHERE fecha BETWEEN ? AND ? AND estado='Pagada'", [inicio, fin]);
  const [[egR]]   = await pool.query("SELECT COALESCE(SUM(monto),0) AS v FROM gastos  WHERE fecha BETWEEN ? AND ?", [inicio, fin]);
  const [[compR]] = await pool.query("SELECT COALESCE(SUM(monto),0) AS v FROM compras WHERE fecha BETWEEN ? AND ? AND estado='Recibida'", [inicio, fin]);
  const [[pendR]] = await pool.query("SELECT COALESCE(SUM(total),0) AS v, COUNT(*) AS cnt FROM ventas WHERE fecha BETWEEN ? AND ? AND estado='Pendiente'", [inicio, fin]);

  const ingresos = Number(ingR.v);
  const egresos  = Number(egR.v) + Number(compR.v);

  // Ventas por semana del mes
  const [semanas] = await pool.query(`
    SELECT WEEK(fecha, 1) AS semana, SUM(total) AS total
    FROM ventas WHERE fecha BETWEEN ? AND ? AND estado='Pagada'
    GROUP BY WEEK(fecha,1) ORDER BY semana
  `, [inicio, fin]);

  // Ventas por día del período (para gráfica diaria)
  const [porDia] = await pool.query(`
    SELECT DATE(fecha) AS dia,
           SUM(CASE WHEN estado='Pagada' THEN total ELSE 0 END) AS ingresos,
           COUNT(*) AS num_ventas
    FROM ventas WHERE fecha BETWEEN ? AND ?
    GROUP BY DATE(fecha) ORDER BY dia ASC
  `, [inicio, fin]);

  // Top productos del período
  const [topProd] = await pool.query(`
    SELECT vd.nombre, SUM(vd.cantidad) AS vendidos, SUM(vd.subtotal) AS ingresos
    FROM ventas_detalle vd JOIN ventas v ON v.id = vd.venta_id
    WHERE v.fecha BETWEEN ? AND ? AND v.estado='Pagada'
    GROUP BY vd.nombre ORDER BY ingresos DESC LIMIT 8
  `, [inicio, fin]);

  // Gastos por categoría
  const [gastosCateg] = await pool.query(`
    SELECT categoria, SUM(monto) AS total FROM gastos
    WHERE fecha BETWEEN ? AND ? GROUP BY categoria ORDER BY total DESC
  `, [inicio, fin]);

  // Historial detallado de ventas del período
  const [historialVentas] = await pool.query(`
    SELECT v.numero, v.fecha, v.cliente_nombre, v.total, v.estado,
           v.metodo_pago,
           u.nombre AS vendedor_nombre,
           COALESCE(GROUP_CONCAT(vd.nombre ORDER BY vd.subtotal DESC SEPARATOR ', '), '—') AS productos
    FROM ventas v
    LEFT JOIN usuarios u ON u.id = v.vendedor_id
    LEFT JOIN ventas_detalle vd ON vd.venta_id = v.id
    WHERE v.fecha BETWEEN ? AND ?
    GROUP BY v.id, v.numero, v.fecha, v.cliente_nombre, v.total, v.estado, v.metodo_pago, u.nombre
    ORDER BY v.fecha DESC, v.creado_en DESC
  `, [inicio, fin]);

  // Historial de gastos del período
  const [historialGastos] = await pool.query(`
    SELECT g.fecha, g.concepto, g.categoria, g.monto, g.proveedor
    FROM gastos g
    WHERE g.fecha BETWEEN ? AND ?
    ORDER BY g.fecha DESC, g.creado_en DESC
  `, [inicio, fin]);

  // Historial de compras recibidas del período
  const [historialCompras] = await pool.query(`
    SELECT c.fecha, c.numero, c.concepto, c.proveedor_nombre, c.monto
    FROM compras c
    WHERE c.fecha BETWEEN ? AND ? AND c.estado = 'Recibida'
    ORDER BY c.fecha DESC, c.creado_en DESC
  `, [inicio, fin]);

  return {
    periodo: { mes: mes === 'todos' ? String(a) : `${a}-${m}`, inicio, fin },
    kpis: {
      ingresos, egresos, utilidad: ingresos - egresos,
      margen: ingresos > 0 ? parseFloat(((ingresos - egresos) / ingresos * 100).toFixed(1)) : 0,
      pendiente_cobro: Number(pendR.v),
      ventas_pendientes: Number(pendR.cnt)
    },
    semanas: semanas.map((s, i) => ({ semana: `Sem ${i+1}`, total: Number(s.total) })),
    porDia: porDia.map(d => ({ dia: d.dia, ingresos: Number(d.ingresos), num_ventas: Number(d.num_ventas) })),
    topProductos: topProd,
    gastosCategoria: gastosCateg,
    historialVentas,
    historialGastos,
    historialCompras
  };
};

/* ──────────────────────────────────────────────────────────────
   REPORTE 7 — Sintetizado Ventas de Productos Lácteos
   Departamento de Ventas | Mensual | Victoria, Yoro
   Almacenamiento: 5 años
────────────────────────────────────────────────────────────── */
exports.getSintetizadoVentas = async ({ mes, anio } = {}) => {
  const now = new Date();
  const a   = anio || now.getFullYear();
  let inicio, fin, m;
  if (mes === 'todos') {
    m = 'Todo el año';
    inicio = `${a}-01-01`;
    fin    = `${a}-12-31`;
  } else {
    m = mes ? String(mes).padStart(2,'0') : String(now.getMonth()+1).padStart(2,'0');
    inicio = `${a}-${m}-01`;
    fin    = `${a}-${m}-31`;
  }

  const [productos] = await pool.query(`
    SELECT vd.nombre AS producto,
           SUM(vd.cantidad)  AS total_vendido,
           SUM(vd.subtotal)  AS total_ingresos,
           AVG(vd.precio)    AS precio_prom,
           COUNT(DISTINCT v.id) AS num_ventas
    FROM ventas_detalle vd
    JOIN ventas v ON v.id = vd.venta_id
    WHERE v.fecha BETWEEN ? AND ? AND v.estado='Pagada'
    GROUP BY vd.nombre ORDER BY total_ingresos DESC
  `, [inicio, fin]);

  const [topClientes] = await pool.query(`
    SELECT v.cliente_nombre, COUNT(*) AS num_compras, SUM(v.total) AS total_comprado
    FROM ventas v
    WHERE v.fecha BETWEEN ? AND ? AND v.estado='Pagada'
    GROUP BY v.cliente_id, v.cliente_nombre ORDER BY total_comprado DESC LIMIT 10
  `, [inicio, fin]);

  const [[kpiR]] = await pool.query(`
    SELECT COUNT(*) AS total_ventas,
           COALESCE(SUM(total),0) AS total_ingresos,
           ROUND(AVG(total),2) AS ticket_promedio,
           COUNT(DISTINCT cliente_id) AS clientes_distintos
    FROM ventas WHERE fecha BETWEEN ? AND ? AND estado='Pagada'
  `, [inicio, fin]);

  return {
    periodo: { mes: mes === 'todos' ? String(a) : `${a}-${m}`, inicio, fin },
    kpis: kpiR,
    productos,
    topClientes
  };
};

/* ──────────────────────────────────────────────────────────────
   REPORTE 8 — Sintetizado Producto Comprado por Cliente
   Departamento de Ventas | Mensual | Victoria, Yoro
   Almacenamiento: 5 años
────────────────────────────────────────────────────────────── */
exports.getSintetizadoProductoCliente = async ({ mes, anio, cliente_id } = {}) => {
  const now = new Date();
  const a   = anio || now.getFullYear();
  let inicio, fin, m;
  if (mes === 'todos') {
    m = 'Todo el año';
    inicio = `${a}-01-01`;
    fin    = `${a}-12-31`;
  } else {
    m = mes ? String(mes).padStart(2,'0') : String(now.getMonth()+1).padStart(2,'0');
    inicio = `${a}-${m}-01`;
    fin    = `${a}-${m}-31`;
  }

  let sql = `
    SELECT v.cliente_nombre,
           vd.nombre       AS producto,
           SUM(vd.cantidad) AS cantidad_total,
           SUM(vd.subtotal) AS monto_total,
           COUNT(DISTINCT v.id) AS num_pedidos,
           MAX(v.fecha)    AS ultima_compra
    FROM ventas_detalle vd
    JOIN ventas v ON v.id = vd.venta_id
    WHERE v.fecha BETWEEN ? AND ? AND v.estado='Pagada'
  `;
  const params = [inicio, fin];
  if (cliente_id) { sql += ' AND v.cliente_id = ?'; params.push(cliente_id); }
  sql += ' GROUP BY v.cliente_id, v.cliente_nombre, vd.nombre ORDER BY v.cliente_nombre, monto_total DESC';

  const [registros] = await pool.query(sql, params);

  // Agrupar por cliente
  const porCliente = {};
  for (const r of registros) {
    if (!porCliente[r.cliente_nombre]) {
      porCliente[r.cliente_nombre] = { cliente: r.cliente_nombre, productos: [], total: 0 };
    }
    porCliente[r.cliente_nombre].productos.push(r);
    porCliente[r.cliente_nombre].total += Number(r.monto_total);
  }

  return {
    periodo: { mes: mes === 'todos' ? String(a) : `${a}-${m}`, inicio, fin },
    registros,
    porCliente: Object.values(porCliente)
  };
};

/* ──────────────────────────────────────────────────────────────
   REPORTE 9 — Por Excepción: Leche No Apta para Procesamiento
   Analista de Calidad + Proveedor | Eventual (cuando ocurre)
   Impreso (recibo) + Digital | Almacenamiento: 5 años
────────────────────────────────────────────────────────────── */
exports.getExcepcionLecheNoApta = async ({ fecha, fechaFin } = {}) => {
  const hoy   = fecha    || new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const hasta = fechaFin || hoy;

  const [rechazos] = await pool.query(`
    SELECT a.*,
           p.nombre      AS proveedor_nombre,
           p.telefono    AS proveedor_tel,
           cp.resultado  AS resultado_calidad,
           cp.olor, cp.color, cp.aspecto,
           cp.prueba_alcohol, cp.densidad, cp.acidez,
           cp.motivo_rechazo AS motivo_calidad,
           cp.observaciones  AS obs_calidad,
           u.nombre          AS analista_nombre
    FROM acopio_leche a
    LEFT JOIN proveedores   p  ON p.id  = a.proveedor_id
    LEFT JOIN calidad_pruebas cp ON cp.acopio_id = a.id
    LEFT JOIN usuarios       u  ON u.id = cp.analista_id
    WHERE a.estado = 'Rechazada' AND a.fecha BETWEEN ? AND ?
    ORDER BY a.fecha DESC, a.creado_en DESC
  `, [hoy, hasta]);

  const [kpiRow] = await pool.query(`
    SELECT
      COUNT(*)              AS total_rechazos,
      COALESCE(SUM(litros), 0) AS litros_rechazados,
      COALESCE(SUM(total_pagar), 0) AS costo_perdido,
      COUNT(DISTINCT proveedor_id) AS proveedores_afectados
    FROM acopio_leche
    WHERE estado = 'Rechazada' AND fecha BETWEEN ? AND ?
  `, [hoy, hasta]);

  const [porProveedor] = await pool.query(`
    SELECT p.nombre AS proveedor, COUNT(*) AS rechazos, SUM(a.litros) AS litros
    FROM acopio_leche a LEFT JOIN proveedores p ON p.id = a.proveedor_id
    WHERE a.estado = 'Rechazada' AND a.fecha BETWEEN ? AND ?
    GROUP BY a.proveedor_id, p.nombre ORDER BY rechazos DESC
  `, [hoy, hasta]);

  return { periodo: { desde: hoy, hasta }, kpis: kpiRow[0], registros: rechazos, porProveedor };
};

/* ──────────────────────────────────────────────────────────────
   REPORTE 10 — Por Excepción: Inventario Bajo / Faltantes
────────────────────────────────────────────────────────────── */
exports.getExcepcionStock = async () => {
  const [productos] = await pool.query(`
    SELECT *,
           GREATEST(0, stock_minimo - stock) AS deficit,
           ROUND(stock / NULLIF(stock_minimo, 0) * 100, 0) AS pct_stock
    FROM inventario_productos
    WHERE activo = 1
    ORDER BY pct_stock ASC, nombre ASC
  `);

  const criticos = productos.filter(p => Number(p.stock) < Number(p.stock_minimo));
  const ok       = productos.filter(p => Number(p.stock) >= Number(p.stock_minimo));

  return {
    kpis: { criticos: criticos.length, ok: ok.length, totalProductos: productos.length },
    criticos,
    ok,
    todos: productos
  };
};

/* ──────────────────────────────────────────────────────────────
   REPORTE 11 — Por Excepción: Vencimientos Próximos
────────────────────────────────────────────────────────────── */
exports.getExcepcionVencimientos = async () => {
  const [alertas] = await pool.query(`
    SELECT *,
           DATEDIFF(vencimiento, CURDATE()) AS dias_restantes,
           CASE
             WHEN vencimiento < CURDATE()                          THEN 'Vencido'
             WHEN DATEDIFF(vencimiento, CURDATE()) <= 2            THEN 'Crítico'
             WHEN DATEDIFF(vencimiento, CURDATE()) <= 4            THEN 'Urgente'
             ELSE 'Próximo'
           END AS nivel
    FROM inventario_productos
    WHERE activo = 1
      AND vencimiento IS NOT NULL
      AND vencimiento <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
    ORDER BY vencimiento ASC
  `);

  const criticos = alertas.filter(a => a.nivel === 'Crítico' || a.nivel === 'Vencido');
  const urgentes = alertas.filter(a => a.nivel === 'Urgente');
  const proximos = alertas.filter(a => a.nivel === 'Próximo');

  return {
    kpis: { total: alertas.length, criticos: criticos.length, urgentes: urgentes.length, proximos: proximos.length },
    alertas
  };
};

/* ──────────────────────────────────────────────────────────────
   Resumen global (legacy dashboard)
────────────────────────────────────────────────────────────── */
exports.getResumen = async () => {
  const hoy      = new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const mesInicio= hoy.slice(0,7) + '-01';

  const [[fin]]  = await pool.query("SELECT COALESCE(SUM(total),0) AS ing, COALESCE(SUM(total),0) AS eg FROM ventas WHERE fecha>=? AND estado='Pagada'", [mesInicio]);
  const [[pro]]  = await pool.query("SELECT COALESCE(SUM(litros),0) AS recibidos FROM acopio_leche WHERE estado='Aceptada' AND fecha=?", [hoy]);
  const [[prol]] = await pool.query("SELECT COALESCE(SUM(leche_usada),0) AS procesados, COUNT(*) AS lotes FROM produccion_lotes WHERE fecha_produccion=?", [hoy]);
  const [[inv]]  = await pool.query("SELECT SUM(stock<=stock_minimo) AS bajo, COUNT(*) AS total FROM inventario_productos WHERE activo=1");
  const [[cal]]  = await pool.query("SELECT COUNT(*) AS total, SUM(resultado='Aprobado') AS aprobados FROM calidad_pruebas WHERE fecha=?", [hoy]);

  return {
    financiero: { ingresos: Number(fin.ing), egresos: 0, balance: Number(fin.ing) },
    produccion: { litrosRecibidos: Number(pro.recibidos), litrosProcesados: Number(prol.procesados), lotes: Number(prol.lotes) },
    inventario: { stockBajo: Number(inv.bajo), totalProductos: Number(inv.total) },
    calidad:    { totalPruebas: Number(cal.total), aprobados: Number(cal.aprobados),
                  tasaAprobacion: cal.total > 0 ? Math.round(cal.aprobados/cal.total*100) : 0 }
  };
};