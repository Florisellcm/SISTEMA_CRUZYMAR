/* ═══════════════════════════════════════
   CRUZYMAR · controllers/produccionController.js
═══════════════════════════════════════ */

const ProduccionModel = require('../models/produccionModel');

exports.getAll = (req, res) => {
  const { estado, fecha } = req.query;
  const lista = ProduccionModel.findAll({ estado, fecha });
  res.json(lista);
};

exports.getById = (req, res) => {
  const prod = ProduccionModel.findById(req.params.id);
  if (!prod) return res.status(404).json({ error: 'Producción no encontrada' });
  res.json(prod);
};

exports.create = (req, res) => {
  const { productoNombre, lecheUsada, fechaProduccion } = req.body;

  // Validaciones
  if (!productoNombre)   return res.status(400).json({ error: 'El producto es obligatorio' });
  if (!lecheUsada)       return res.status(400).json({ error: 'Litros de leche usados es obligatorio' });
  if (!fechaProduccion)  return res.status(400).json({ error: 'La fecha es obligatoria' });

  const nuevo = ProduccionModel.create(req.body);
  res.status(201).json(nuevo);
};

exports.update = (req, res) => {
  const actualizado = ProduccionModel.update(req.params.id, req.body);
  if (!actualizado) return res.status(404).json({ error: 'Producción no encontrada' });
  res.json(actualizado);
};

exports.remove = (req, res) => {
  const eliminado = ProduccionModel.remove(req.params.id);
  if (!eliminado) return res.status(404).json({ error: 'Producción no encontrada' });
  res.json({ message: 'Lote eliminado correctamente' });
};
