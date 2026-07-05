/* migrate_produccion.js
   Adds missing columns to produccion_lotes so the new multi-process
   production workflow works correctly.
   Run once: node migrate_produccion.js
*/
require('dotenv').config();
const pool = require('./database');

async function run() {
  const conn = await pool.getConnection();
  try {
    // Check which columns already exist
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'produccion_lotes'`
    );
    const existing = new Set(cols.map(c => c.COLUMN_NAME));

    const toAdd = [
      { name: 'tipo_proceso',              ddl: `VARCHAR(50) DEFAULT 'Manual' AFTER receta_id` },
      { name: 'entrada_tipo',              ddl: `VARCHAR(100) DEFAULT NULL AFTER tipo_proceso` },
      { name: 'lote_padre_id',             ddl: `CHAR(36) DEFAULT NULL AFTER entrada_tipo` },
      { name: 'salida_secundaria_nombre',  ddl: `VARCHAR(150) DEFAULT NULL AFTER unidad` },
      { name: 'salida_secundaria_cantidad',ddl: `DECIMAL(10,2) DEFAULT NULL AFTER salida_secundaria_nombre` },
      { name: 'salida_secundaria_unidad',  ddl: `VARCHAR(30) DEFAULT NULL AFTER salida_secundaria_cantidad` },
    ];

    for (const col of toAdd) {
      if (existing.has(col.name)) {
        console.log(`  ✓ ${col.name} — ya existe`);
      } else {
        await conn.query(`ALTER TABLE produccion_lotes ADD COLUMN ${col.name} ${col.ddl}`);
        console.log(`  + ${col.name} — agregada`);
      }
    }

    // Add FK for lote_padre_id (only if column was just added or already exists)
    try {
      await conn.query(
        `ALTER TABLE produccion_lotes
         ADD CONSTRAINT fk_prod_padre FOREIGN KEY (lote_padre_id)
         REFERENCES produccion_lotes(id) ON DELETE SET NULL`
      );
      console.log('  + FK fk_prod_padre — agregada');
    } catch (e) {
      if (e.code === 'ER_DUP_KEY' || e.message.includes('Duplicate key') || e.message.includes('already exists') || e.message.includes('errno: 121')) {
        console.log('  ✓ FK fk_prod_padre — ya existe');
      } else {
        console.log('  ~ FK fk_prod_padre skipped:', e.message);
      }
    }

    console.log('\n✅ Migración completada');
  } finally {
    conn.release();
    process.exit(0);
  }
}

run().catch(e => { console.error('Error:', e.message); process.exit(1); });
