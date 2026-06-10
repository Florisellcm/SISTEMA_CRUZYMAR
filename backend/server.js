// ═══════════════════════════════════════════
// CRUZYMAR · server.js ACTUALIZADO
// ═══════════════════════════════════════════

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ── Rutas API ──────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/dashboard',  require('./routes/dashboard'));
app.use('/api/produccion', require('./routes/produccion'));
app.use('/api/clientes',   require('./routes/clientes'));  
app.use('/api/proveedores', require('./routes/proveedores'));  
app.use('/api/acopio', require('./routes/acopio')); // ← 
app.use('/api/config', require('./routes/configuracion'));
//app.use('/api/inventario', require('./routes/inventario'));  // 
//app.use('/api/ventas',     require('./routes/ventas'));      // 
//app.use('/api/gastos',     require('./routes/gastos'));      // 

app.get('*', (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'))
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\nSistema Lacteos CRUZYMAR corriendo en http://localhost:${PORT}`);
  console.log(`   Login: admin@cruzymar.com / admin123\n`);
});