const bcrypt = require('bcryptjs');

const db = {
  usuarios: [
    {
      id: '1',
      nombre: 'Administrador',
      email: 'admin@cruzymar.com',
      password: bcrypt.hashSync('admin123', 10),
      rol: 'admin',
      activo: true
    }
  ],

  // KPIs del dashboard
  kpis: {
    ventasHoy: 14850.00,
    ventasMes: 187320.00,
    produccionHoy: 480,
    clientesActivos: 34,
    gastosMes: 98400.00,
    utilidadMes: 88920.00,
    productosStockBajo: 2,
  },

  // Ventas últimos 7 días
  ventasSemana: [
    { dia: 'Lun', total: 18200 },
    { dia: 'Mar', total: 22400 },
    { dia: 'Mié', total: 15800 },
    { dia: 'Jue', total: 27600 },
    { dia: 'Vie', total: 31200 },
    { dia: 'Sáb', total: 19800 },
    { dia: 'Hoy', total: 14850 },
  ],

  // Top productos
  topProductos: [
    { nombre: 'Leche Entera 1L',     vendidos: 320, ingresos: 8960 },
    { nombre: 'Queso Fresco 500g',   vendidos: 140, ingresos: 9100 },
    { nombre: 'Crema de Leche',      vendidos: 95,  ingresos: 3325 },
    { nombre: 'Yogur Natural 500g',  vendidos: 88,  ingresos: 3696 },
    { nombre: 'Mantequilla 250g',    vendidos: 62,  ingresos: 3410 },
  ],

  // Actividad reciente
  actividad: [
    { tipo: 'venta',      texto: 'Venta VTA-047 — Supermercado La Colonia',     monto: 4200,  tiempo: 'hace 12 min' },
    { tipo: 'produccion', texto: 'Lote LOT-2024-089 completado — Queso Fresco', monto: null,  tiempo: 'hace 28 min' },
    { tipo: 'alerta',     texto: 'Stock bajo — Mantequilla 250g (8 unidades)',   monto: null,  tiempo: 'hace 45 min' },
    { tipo: 'venta',      texto: 'Venta VTA-046 — Pulpería Don José',            monto: 780,   tiempo: 'hace 1h' },
    { tipo: 'venta',      texto: 'Venta VTA-045 — Restaurante El Buen Sabor',    monto: 2650,  tiempo: 'hace 2h' },
  ],

  // Producción hoy
  produccionHoy: [
    { producto: 'Leche Entera 1L',  cantidad: 200, estado: 'Completada', turno: 'Mañana' },
    { producto: 'Queso Fresco',     cantidad: 80,  estado: 'Completada', turno: 'Mañana' },
    { producto: 'Yogur Natural',    cantidad: 100, estado: 'En proceso', turno: 'Tarde'  },
    { producto: 'Crema de Leche',   cantidad: 100, estado: 'Pendiente',  turno: 'Tarde'  },
  ]
};

module.exports = db;
