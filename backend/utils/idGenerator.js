const pool = require('../database');

/**
 * Genera un ID secuencial con formato prefijo-000 (ej: prov-001, prov-002...)
 * @param {string} tabla Nombre de la tabla
 * @param {string} prefijo Prefijo (ej: prov, aco, cli)
 * @param {object} [conn] Conexión transaccional opcional (usa el pool por defecto)
 * @returns {Promise<string>} Nuevo ID secuencial
 */
async function generarIdSecuencial(tabla, prefijo, conn = pool) {
  const pattern = `${prefijo}-%`;
  const [rows] = await conn.query(
    'SELECT id FROM ?? WHERE id LIKE ?',
    [tabla, pattern]
  );
  
  let maxNum = 0;
  for (const row of rows) {
    const parts = row.id.split('-');
    const numPart = parts[parts.length - 1];
    const num = parseInt(numPart, 10);
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  }
  
  const siguiente = maxNum + 1;
  const numFormateado = String(siguiente).padStart(3, '0');
  return `${prefijo}-${numFormateado}`;
}

module.exports = { generarIdSecuencial };
