/* ═══════════════════════════════════════
   CRUZYMAR · models/calidadModel.js
   Acceso a datos de Control de Calidad — MySQL
═══════════════════════════════════════ */

const pool = require('../database');
const { v4: uuidv4 } = require('uuid');

const BASE_SQL = `
  SELECT c.*,
         a.litros        AS litros_acopio,
         a.turno         AS turno_acopio,
         a.fecha         AS fecha_acopio,
         p.nombre        AS proveedor_nombre,
         u.nombre        AS analista_nombre
  FROM calidad_pruebas c
  LEFT JOIN acopio_leche a ON a.id = c.acopio_id
  LEFT JOIN proveedores  p ON p.id = a.proveedor_id
  LEFT JOIN usuarios     u ON u.id = c.analista_id
`;

exports.findAll = async ({ fecha, resultado, acopio_id } = {}) => {
  let sql = BASE_SQL + ' WHERE 1=1';
  const params = [];
  if (fecha)     { sql += ' AND c.fecha = ?';     params.push(fecha); }
  if (resultado) { sql += ' AND c.resultado = ?'; params.push(resultado); }
  if (acopio_id) { sql += ' AND c.acopio_id = ?'; params.push(acopio_id); }
  sql += ' ORDER BY c.creado_en DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
};

exports.findById = async (id) => {
  const [rows] = await pool.query(BASE_SQL + ' WHERE c.id = ?', [id]);
  return rows[0] || null;
};

exports.findAcopio = async (acopioId) => {
  const [rows] = await pool.query('SELECT * FROM acopio_leche WHERE id = ?', [acopioId]);
  return rows[0] || null;
};

exports.getResumen = async (fecha) => {
  const hoy = fecha || new Date().toISOString().slice(0, 10);
  const [rows] = await pool.query(
    `SELECT
       COUNT(*)                                              AS total_pruebas,
       SUM(resultado = 'Aprobado')                         AS aprobados,
       SUM(resultado = 'Rechazado')                        AS rechazados,
       SUM(resultado = 'Observación')                      AS observacion,
       ROUND(SUM(resultado='Aprobado') / COUNT(*) * 100,1) AS tasa_aprobacion,
       SUM(prueba_alcohol = 'Positiva')                    AS alcohol_positivo,
       SUM(densidad IS NOT NULL AND densidad < 1.028)      AS densidad_baja
     FROM calidad_pruebas WHERE fecha = ?`, [hoy]);
  return { fecha: hoy, ...rows[0] };
};

exports.create = async (data) => {
  const { acopio_id, olor, color, aspecto, prueba_alcohol, densidad,
          acidez, temperatura, resultado, motivo_rechazo, analista_id, fecha, observaciones } = data;
  const id = uuidv4();
  await pool.query(
    `INSERT INTO calidad_pruebas
      (id, acopio_id, olor, color, aspecto, prueba_alcohol, densidad, acidez, temperatura,
       resultado, motivo_rechazo, analista_id, fecha, observaciones)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, acopio_id||null, olor||'Normal', color||'Normal', aspecto||'Normal',
     prueba_alcohol||'Negativa',
     densidad != null && densidad !== '' ? parseFloat(densidad) : null,
     acidez   != null && acidez   !== '' ? parseFloat(acidez)   : null,
     temperatura != null && temperatura !== '' ? parseFloat(temperatura) : null,
     resultado||'Aprobado', motivo_rechazo||null, analista_id||null,
     fecha || new Date().toISOString().slice(0, 10),
     observaciones||'']
  );
  return exports.findById(id);
};

exports.update = async (id, data) => {
  const campos = ['acopio_id','olor','color','aspecto','prueba_alcohol','densidad',
                  'acidez','temperatura','resultado','motivo_rechazo','analista_id','fecha','observaciones'];
  const sets   = campos.filter(c => data[c] !== undefined).map(c => `${c} = ?`);
  const vals   = campos.filter(c => data[c] !== undefined).map(c => data[c]);
  if (!sets.length) return null;
  await pool.query(`UPDATE calidad_pruebas SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
  return exports.findById(id);
};

exports.remove = async (id) => {
  const [res] = await pool.query('DELETE FROM calidad_pruebas WHERE id = ?', [id]);
  return res.affectedRows > 0;
};