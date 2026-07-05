/* ═══════════════════════════════════════════════════════════
   CRUZYMAR · seed.js
   Script para sembrar la base de datos automáticamente
   desde backend/sql/init.sql
═══════════════════════════════════════════════════════════ */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./database');

async function seed() {
  console.log('⌛ Iniciando siembra de base de datos...');

  const sqlPath = path.join(__dirname, 'sql', 'init.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ No se encontró el archivo init.sql en: ${sqlPath}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  // Separar consultas por ';' al final de línea, y LIMPIAR los comentarios
  // de cada trozo ANTES de decidir si quedó vacío. Antes esto se hacía al
  // revés (se filtraba por el texto crudo y LUEGO se limpiaba), lo que
  // provocaba que cualquier consulta precedida por un bloque de comentario
  // (prácticamente todas en este archivo) se descartara completa, comentario
  // y consulta real juntos, porque el trozo crudo empezaba con '--'.
  const queries = sqlContent
    .split(/;\s*$/m)
    .map(q => {
      return q
        .replace(/\/\*[\s\S]*?\*\//g, '')          // comentarios /* ... */
        .split('\n')
        .filter(line => !line.trim().startsWith('--')) // comentarios --
        .join('\n')
        .trim();
    })
    .filter(q => q.length > 0);

  const connection = await pool.getConnection();
  try {
    // Desactivar temporalmente revisión de llaves foráneas para evitar problemas de orden al insertar
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    console.log('✓ Claves foráneas desactivadas temporalmente');

    let ejecutadas = 0;
    for (let i = 0; i < queries.length; i++) {
      const cleanQuery = queries[i];
      if (!cleanQuery) continue;

      try {
        await connection.query(cleanQuery);
        ejecutadas++;
      } catch (err) {
        // Ignorar errores específicos de duplicados si volvemos a correr el seed
        if (err.code !== 'ER_DUP_ENTRY') {
          console.warn(`⚠ Advertencia en la consulta ${i + 1}: ${err.message}`);
          console.debug(`Consulta con error:\n${cleanQuery}\n`);
        }
      }
    }

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✓ Claves foráneas reactivadas');
    console.log(`✓ ${ejecutadas} de ${queries.length} consultas ejecutadas correctamente`);
    console.log('🚀 ¡Base de datos sembrada con éxito! Tablas creadas y datos iniciales listos.');

  } catch (error) {
    console.error('❌ Error general durante el sembrado:', error.message);
  } finally {
    connection.release();
    pool.end();
  }
}

seed();