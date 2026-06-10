/* ═══════════════════════════════════════
   CRUZYMAR · models/dashboardModel.js
   Acceso a datos del dashboard
═══════════════════════════════════════ */

const db = require('../data/db');

/**
 * Obtener todos los datos del dashboard
 * @returns {object}
 */
exports.getAll = () => {
  return {
    kpis:           db.kpis,
    produccionKpis: db.produccionKpis,
    logisticaKpis:  db.logisticaKpis,
    ventasSemana:   db.ventasSemana,
    topProductos:   db.topProductos,
    actividad:      db.actividad,
    produccionHoy:  db.produccionHoy,
  };
};
