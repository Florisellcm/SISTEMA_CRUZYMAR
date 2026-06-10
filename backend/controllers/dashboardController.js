/* ═══════════════════════════════════════
   CRUZYMAR · controllers/dashboardController.js
═══════════════════════════════════════ */

const DashboardModel = require('../models/dashboardModel');

exports.getDashboard = (req, res) => {
  const data = DashboardModel.getAll();
  res.json({
    ...data,
    fechaActualizacion: new Date().toISOString()
  });
};
