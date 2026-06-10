/* ═══════════════════════════════════════
   CRUZYMAR · controllers/gastosController.js
═══════════════════════════════════════ */

const GastosModel = require('../models/gastosModel');

exports.getAll = (req, res) => {
  const { categoria } = req.query;
  const lista = GastosModel.findAll(categoria);
  res.json(lista);
};

exports.create = (req, res) => {
  const { concepto, monto } = req.body;
  if (!concepto || !monto) return res.status(400).json({ error: 'Concepto y monto son obligatorios' });
  const nuevo = GastosModel.create(req.body);
  res.status(201).json(nuevo);
};

exports.update = (req, res) => {
  const actualizado = GastosModel.update(req.params.id, req.body);
  if (!actualizado) return res.status(404).json({ error: 'Gasto no encontrado' });
  res.json(actualizado);
};

exports.remove = (req, res) => {
  const eliminado = GastosModel.remove(req.params.id);
  if (!eliminado) return res.status(404).json({ error: 'Gasto no encontrado' });
  res.json({ message: 'Gasto eliminado' });
};
