/* ═══════════════════════════════════════
   CRUZYMAR · models/distribucionModel.js
   Sub-módulo Distribución (dentro de Comercial)

   La hoja de ruta se arma automáticamente cada día tomando
   las ventas marcadas como tipo_entrega = 'Reparto' en esa
   fecha (el vendedor elige "Reparto" al registrar la venta,
   en el módulo Comercial). No requiere asignación manual.

   Cada entrega trae también la ZONA del cliente (Local, Aldea,
   Yoro, Norte) para poder separar la hoja de ruta por repartidor:
   cada repartidor solo cubre una zona, así que el front agrupa
   las entregas por zona y arma una hoja de ruta independiente
   para cada uno.
═══════════════════════════════════════ */
const pool = require('../database');
const { generarIdSecuencial } = require('../utils/idGenerator');

/* Genera la hoja de ruta cruzando las ventas del día.
   Si se pasa "zona", filtra solo las entregas de esa zona
   (útil si querés generar/imprimir de una vez la hoja de un
   solo repartidor). Si no se pasa, trae TODAS las zonas juntas
   y el front las separa visualmente. */
exports.getHojaRuta = async (fecha, zona) => {
  const paramsEntregas = [fecha];
  let filtroZonaEntregas = '';
  if (zona) {
    filtroZonaEntregas = ' AND COALESCE(c.zona, "Local") = ? ';
    paramsEntregas.push(zona);
  }

  /* ── Detalle de entregas por cliente ── */
  const [entregas] = await pool.query(`
    SELECT
      v.id, v.numero, v.fecha, v.total, v.metodo_pago, v.estado,
      v.cliente_nombre,
      c.telefono AS cliente_tel, c.direccion AS cliente_dir,
      COALESCE(c.zona, 'Local') AS cliente_zona,
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
      ${filtroZonaEntregas}
    GROUP BY v.id
    ORDER BY cliente_zona, v.cliente_nombre
  `, paramsEntregas);

  /* Secuencia global (por si se imprime todo junto) */
  entregas.forEach((e, i) => { e.secuencia = i + 1; });

  /* ── Resumen de carga (consolidado por producto) ──
     Si hay zona, la carga también se limita a esa zona
     (para que el repartidor sepa exactamente qué llevar). */
  const paramsCarga = [fecha];
  let filtroZonaCarga = '';
  if (zona) {
    filtroZonaCarga = ' AND COALESCE(c.zona, "Local") = ? ';
    paramsCarga.push(zona);
  }

  const [carga] = await pool.query(`
    SELECT
      ip.nombre AS producto,
      SUM(vd.cantidad) AS total_cantidad,
      ip.unidad
    FROM ventas v
    JOIN ventas_detalle vd       ON vd.venta_id = v.id
    JOIN inventario_productos ip ON ip.id = vd.producto_id
    LEFT JOIN clientes c         ON c.id = v.cliente_id
    WHERE DATE(v.fecha) = ?
      AND v.estado != 'Cancelada'
      AND v.tipo_entrega = 'Reparto'
      ${filtroZonaCarga}
    GROUP BY ip.id, ip.nombre, ip.unidad
    ORDER BY ip.nombre
  `, paramsCarga);

  /* ── Totales ── */
  const totalCobrar    = entregas.reduce((s, e) => s + Number(e.total), 0);
  const totalClientes  = entregas.length;
  const totalEfectivo  = entregas.filter(e => e.metodo_pago === 'Efectivo').reduce((s,e)=>s+Number(e.total),0);
  const totalCredito   = entregas.filter(e => e.metodo_pago === 'Crédito').reduce((s,e)=>s+Number(e.total),0);

  return { fecha, zona: zona || null, entregas, carga, totalCobrar, totalClientes, totalEfectivo, totalCredito };
};

/* Resumen rápido de cuántas entregas y cuánto hay que cobrar
   en cada zona ese día — útil si luego querés pintar pestañas
   o tarjetas de "elegir zona" con esos números ya calculados. */
exports.getResumenZonas = async (fecha) => {
  const [rows] = await pool.query(`
    SELECT
      COALESCE(c.zona, 'Local') AS zona,
      COUNT(DISTINCT v.id) AS total_clientes,
      SUM(v.total) AS total_cobrar
    FROM ventas v
    LEFT JOIN clientes c ON c.id = v.cliente_id
    WHERE DATE(v.fecha) = ?
      AND v.estado != 'Cancelada'
      AND v.tipo_entrega = 'Reparto'
    GROUP BY zona
  `, [fecha]);
  return rows;
};

/* Guardar hoja de ruta generada (opcionalmente de una sola zona) */
exports.guardarRuta = async ({ fecha, zona, transportista, generado_por }) => {
  const data  = await exports.getHojaRuta(fecha, zona);
  const id    = await generarIdSecuencial('distribucion_rutas', 'rut');
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