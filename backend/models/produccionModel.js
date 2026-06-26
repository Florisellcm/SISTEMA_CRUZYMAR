/* ═══════════════════════════════════════
   CRUZYMAR · models/produccionModel.js
   Acceso a datos de producción — MySQL
═══════════════════════════════════════ */

const pool = require('../database');
const { v4: uuidv4 } = require('uuid');

// Genera número de lote: YYYYMMDD-T-NNN
const genLote = async (fechaProduccion, turno) => {
  const fecha    = (fechaProduccion || new Date().toISOString().slice(0,10)).replace(/-/g,'');
  const inicial  = (turno || 'M').charAt(0).toUpperCase();
  const [rows]   = await pool.query(
    'SELECT COUNT(*)+1 AS next FROM produccion_lotes WHERE fecha_produccion = ?',
    [fechaProduccion]
  );
  const consec   = String(rows[0].next).padStart(3,'0');
  return `${fecha}-${inicial}-${consec}`;
};

exports.findAll = async ({ estado, fecha } = {}) => {
  let sql = `
    SELECT pl.*, r.producto AS receta_nombre, u.nombre AS operario_nombre
    FROM produccion_lotes pl
    LEFT JOIN recetas  r ON r.id = pl.receta_id
    LEFT JOIN usuarios u ON u.id = pl.operario_id
    WHERE 1=1
  `;
  const params = [];
  if (estado) { sql += ' AND pl.estado = ?';            params.push(estado); }
  if (fecha)  { sql += ' AND pl.fecha_produccion = ?';  params.push(fecha); }
  sql += ' ORDER BY pl.creado_en DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
};

exports.findById = async (id) => {
  const [rows] = await pool.query(
    `SELECT pl.*, r.producto AS receta_nombre, u.nombre AS operario_nombre
     FROM produccion_lotes pl
     LEFT JOIN recetas  r ON r.id = pl.receta_id
     LEFT JOIN usuarios u ON u.id = pl.operario_id
     WHERE pl.id = ?`, [id]);
  return rows[0] || null;
};

exports.create = async (data) => {
  const {
    productoNombre, lecheUsada, cantidadObtenida, unidad,
    fechaProduccion, turno, operario, operario_id,
    receta_id, insumos, observaciones, estado
  } = data;

  const leche     = parseFloat(lecheUsada)      || 0;
  const cantidad  = parseFloat(cantidadObtenida) || 0;
  const rendimiento = leche > 0 ? parseFloat(((cantidad / leche) * 100).toFixed(1)) : 0;
  const merma       = parseFloat(Math.max(0, leche - cantidad).toFixed(2));
  const numLote     = await genLote(fechaProduccion, turno);
  const id          = uuidv4();

  await pool.query(
    `INSERT INTO produccion_lotes
      (id, numero_lote, receta_id, producto_nombre, leche_usada, cantidad_obtenida,
       unidad, rendimiento, merma, fecha_produccion, turno, operario, operario_id,
       insumos, observaciones, estado, calidad)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, numLote, receta_id||null, productoNombre, leche, cantidad,
     unidad||'libras', rendimiento, merma,
     fechaProduccion || new Date().toISOString().slice(0,10),
     turno||'Mañana', operario||'', operario_id||null,
     insumos||'', observaciones||'', estado||'En proceso', 'Pendiente']
  );
  return exports.findById(id);
};

exports.update = async (id, data) => {
  const campos = ['receta_id','producto_nombre','leche_usada','cantidad_obtenida','unidad',
                  'rendimiento','merma','fecha_produccion','turno','operario','operario_id',
                  'insumos','observaciones','estado','calidad'];
  const sets   = campos.filter(c => data[c] !== undefined).map(c => `${c} = ?`);
  const vals   = campos.filter(c => data[c] !== undefined).map(c => data[c]);

  // Recalcular rendimiento/merma si cambian cantidades
  if (data.leche_usada || data.cantidad_obtenida) {
    const [cur] = await pool.query('SELECT leche_usada, cantidad_obtenida FROM produccion_lotes WHERE id = ?', [id]);
    if (cur[0]) {
      const l = parseFloat(data.leche_usada        || cur[0].leche_usada);
      const c = parseFloat(data.cantidad_obtenida  || cur[0].cantidad_obtenida);
      const existsRend = sets.find(s => s.startsWith('rendimiento'));
      if (!existsRend) { sets.push('rendimiento = ?'); vals.push(l > 0 ? parseFloat(((c/l)*100).toFixed(1)) : 0); }
      const existsMerma = sets.find(s => s.startsWith('merma'));
      if (!existsMerma) { sets.push('merma = ?'); vals.push(parseFloat(Math.max(0, l-c).toFixed(2))); }
    }
  }

  if (!sets.length) return null;
  await pool.query(`UPDATE produccion_lotes SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
  return exports.findById(id);
};

exports.remove = async (id) => {
  const [res] = await pool.query('DELETE FROM produccion_lotes WHERE id = ?', [id]);
  return res.affectedRows > 0;
};
