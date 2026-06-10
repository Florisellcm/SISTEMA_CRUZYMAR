/* ═══════════════════════════════════════
   CRUZYMAR · controllers/inventarioController.js
═══════════════════════════════════════ */

const InventarioModel = require('../models/inventarioModel');

exports.getAll = (req, res) => {
  const { categoria, buscar } = req.query;
  const lista = InventarioModel.findAll({ categoria, buscar });
  res.json(lista);
};

exports.create = (req, res) => {
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const nuevo = InventarioModel.create(req.body);
  res.status(201).json(nuevo);
};

exports.update = (req, res) => {
  const actualizado = InventarioModel.update(req.params.id, req.body);
  if (!actualizado) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(actualizado);
};

exports.remove = (req, res) => {
  const eliminado = InventarioModel.softDelete(req.params.id);
  if (!eliminado) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json({ message: 'Producto eliminado' });
};
