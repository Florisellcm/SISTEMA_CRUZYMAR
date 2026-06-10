/* ═══════════════════════════════════════
   CRUZYMAR · controllers/clientesController.js
═══════════════════════════════════════ */

const ClientesModel = require('../models/clientesModel');

exports.getAll = (req, res) => {
  const { buscar } = req.query;
  const lista = ClientesModel.findAll(buscar);
  res.json(lista);
};

exports.create = (req, res) => {
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const nuevo = ClientesModel.create(req.body);
  res.status(201).json(nuevo);
};

exports.update = (req, res) => {
  const actualizado = ClientesModel.update(req.params.id, req.body);
  if (!actualizado) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json(actualizado);
};

exports.remove = (req, res) => {
  const eliminado = ClientesModel.softDelete(req.params.id);
  if (!eliminado) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json({ message: 'Cliente eliminado' });
};
