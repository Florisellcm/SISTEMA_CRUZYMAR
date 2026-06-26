/* ═══════════════════════════════════════
   CRUZYMAR · controllers/dashboardController.js
═══════════════════════════════════════ */
const DashboardModel = require('../models/dashboardModel');

exports.getDashboard = async (req, res) => {
  try {
    const data = await DashboardModel.getAll();
    res.json({ ...data, fechaActualizacion: new Date().toISOString() });
  } catch (e) { res.status(500).json({ error: e.message }); }
};