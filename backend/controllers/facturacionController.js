const model = require('../models/facturacionModel');

exports.getAll = (req, res) => {
  try {
    const data = model.findAll();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = (req, res) => {
  try {
    const nuevo = model.create(req.body);
    res.status(201).json(nuevo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.update = (req, res) => {
  try {
    const act = model.update(req.params.id, req.body);
    if (!act) return res.status(404).json({ error: 'No encontrado' });
    res.json(act);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.remove = (req, res) => {
  try {
    const ok = model.remove(req.params.id);
    if (!ok) return res.status(404).json({ error: 'No encontrado' });
    res.json({ message: 'Eliminado' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
