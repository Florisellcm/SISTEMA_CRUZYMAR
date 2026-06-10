/* ═══════════════════════════════════════
   CRUZYMAR · controllers/acopioController.js
═══════════════════════════════════════ */

const AcopioModel = require('../models/acopioModel');

exports.getAll = (req, res) => {
  const { fecha, proveedor_id, turno } = req.query;
  const lista = AcopioModel.findAll({ fecha, proveedor_id, turno });
  res.json(lista);
};

exports.getResumen = (req, res) => {
  const resumen = AcopioModel.getResumen(req.query.fecha);
  res.json(resumen);
};

exports.create = (req, res) => {
  const { proveedor_id, litros, precio_litro } = req.body;

  if (!proveedor_id)                return res.status(400).json({ error: 'El proveedor es obligatorio' });
  if (!litros || litros <= 0)       return res.status(400).json({ error: 'Los litros deben ser mayores a 0' });
  if (!precio_litro || precio_litro <= 0) return res.status(400).json({ error: 'El precio por litro es obligatorio' });

  const prov = AcopioModel.findProveedorActivo(proveedor_id);
  if (!prov) return res.status(404).json({ error: 'Proveedor no encontrado' });

  const nuevo = AcopioModel.create(req.body);
  res.status(201).json({ ...nuevo, proveedor_nombre: prov.nombre });
};

exports.update = (req, res) => {
  const actualizado = AcopioModel.update(req.params.id, req.body);
  if (!actualizado) return res.status(404).json({ error: 'Registro no encontrado' });
  res.json(actualizado);
};

exports.remove = (req, res) => {
  const eliminado = AcopioModel.remove(req.params.id);
  if (!eliminado) return res.status(404).json({ error: 'Registro no encontrado' });
  res.json({ message: 'Registro eliminado' });
};
