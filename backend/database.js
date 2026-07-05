/* ═══════════════════════════════════════
   CRUZYMAR · database.js
   Conexión MySQL con pool de promesas
═══════════════════════════════════════ */

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:             process.env.DB_HOST     || 'localhost',
  user:             process.env.DB_USER     || 'root',
  password:         process.env.DB_PASSWORD || '12345',
  database:         process.env.DB_NAME     || 'cruzymar',
  port:             parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit:  10,
  queueLimit:       0,
  charset:          'utf8mb4',
  timezone:         '-06:00'   // Honduras (UTC-6)
});

// Verificar conexión al iniciar
pool.getConnection()
  .then(conn => {
    console.log(' CRUZYMAR conectado a MySQL correctamente');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Error conectando a MySQL:', err.message);
    console.error('   Asegúrese de que el contenedor Docker está corriendo:');
    console.error('   docker compose up -d');
  });

module.exports = pool;