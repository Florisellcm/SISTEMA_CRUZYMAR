const m = require('../models/distribucionModel');

exports.getHojaRuta = async (req, res) => {
  try {
    const fecha = req.query.fecha || new Date().toISOString().slice(0,10);
    res.json(await m.getHojaRuta(fecha));
  } catch(e){ res.status(500).json({error:e.message}); }
};
exports.guardarRuta = async (req, res) => {
  try {
    if (!req.body.fecha) return res.status(400).json({ error: 'La fecha es obligatoria' });
    res.status(201).json(await m.guardarRuta({ ...req.body, generado_por: req.user?.id }));
  } catch(e){ res.status(500).json({error:e.message}); }
};