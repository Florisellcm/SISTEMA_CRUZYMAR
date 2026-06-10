/* ═══════════════════════════════════════
   CRUZYMAR · controllers/ventasController.js
═══════════════════════════════════════ */

const VentasModel = require('../models/ventasModel');

exports.getAll = (req, res) => {
  const { estado } = req.query;
  const lista = VentasModel.findAll(estado);
  res.json(lista);
};

exports.create = (req, res) => {
  const { items } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ error: 'Debe agregar al menos un producto' });
  const nueva = VentasModel.create(req.body);
  res.status(201).json(nueva);
};

exports.update = (req, res) => {
  const actualizado = VentasModel.update(req.params.id, req.body);
  if (!actualizado) return res.status(404).json({ error: 'Venta no encontrada' });
  res.json(actualizado);
};

exports.remove = (req, res) => {
  const cancelada = VentasModel.cancel(req.params.id);
  if (!cancelada) return res.status(404).json({ error: 'Venta no encontrada' });
  res.json({ message: 'Venta cancelada' });
};
