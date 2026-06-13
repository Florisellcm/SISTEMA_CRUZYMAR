const model = require('../models/reportesModel');

exports.getResumen = (req, res) => {
  try {
    const data = model.getResumen();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
