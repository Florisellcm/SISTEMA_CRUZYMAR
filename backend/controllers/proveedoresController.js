/* ═══════════════════════════════════════
   CRUZYMAR · controllers/proveedoresController.js
═══════════════════════════════════════ */

const ProveedoresModel = require('../models/proveedoresModel');

exports.getAll = (req, res) => {
  const { buscar } = req.query;
  const lista = ProveedoresModel.findAll(buscar);
  res.json(lista);
};

exports.create = (req, res) => {
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const nuevo = ProveedoresModel.create(req.body);
  res.status(201).json(nuevo);
};

exports.update = (req, res) => {
  const actualizado = ProveedoresModel.update(req.params.id, req.body);
  if (!actualizado) return res.status(404).json({ error: 'Proveedor no encontrado' });
  res.json(actualizado);
};

exports.remove = (req, res) => {
  const eliminado = ProveedoresModel.softDelete(req.params.id);
  if (!eliminado) return res.status(404).json({ error: 'Proveedor no encontrado' });
  res.json({ message: 'Proveedor eliminado' });
};
