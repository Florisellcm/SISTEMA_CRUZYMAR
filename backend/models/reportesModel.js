const db = require('../data/db');

exports.getResumen = () => {
  // Simulamos un resumen general del dashboard/reportes
  return {
    ventasTotales: db.ventas ? db.ventas.reduce((acc, v) => acc + (v.total || 0), 0) : 0,
    acopioTotal: db.acopio ? db.acopio.reduce((acc, a) => acc + (a.litros || 0), 0) : 0,
    gastosTotales: db.gastos ? db.gastos.reduce((acc, g) => acc + (g.monto || 0), 0) : 0
  };
};
