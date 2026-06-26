/* ═══════════════════════════════════════
   CRUZYMAR · controllers/acopioController.js
═══════════════════════════════════════ */

const AcopioModel = require('../models/acopioModel');

exports.getAll = async (req, res) => {
  try {
    const { fecha, proveedor_id, turno } = req.query;
    const lista = await AcopioModel.findAll({ fecha, proveedor_id, turno });
    res.json(lista);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getResumen = async (req, res) => {
  try {
    const resumen = await AcopioModel.getResumen(req.query.fecha);
    res.json(resumen);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
  try {
    const { proveedor_id, litros, precio_litro } = req.body;
    if (!proveedor_id)                        return res.status(400).json({ error: 'El proveedor es obligatorio' });
    if (!litros || litros <= 0)               return res.status(400).json({ error: 'Los litros deben ser mayores a 0' });
    if (!precio_litro || precio_litro <= 0)   return res.status(400).json({ error: 'El precio por litro es obligatorio' });

    const prov = await AcopioModel.findProveedorActivo(proveedor_id);
    if (!prov) return res.status(404).json({ error: 'Proveedor no encontrado' });

    const nuevo = await AcopioModel.create(req.body);
    res.status(201).json(nuevo);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.update = async (req, res) => {
  try {
    const actualizado = await AcopioModel.update(req.params.id, req.body);
    if (!actualizado) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json(actualizado);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
  try {
    const eliminado = await AcopioModel.remove(req.params.id);
    if (!eliminado) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json({ message: 'Registro eliminado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getById = async (req, res) => {
  try {
    const item = await AcopioModel.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
};