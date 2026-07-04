/* ═══════════════════════════════════════
   CRUZYMAR · controllers/clientesController.js
   CRUD de Clientes con soft-delete
═══════════════════════════════════════ */

const ClientesModel = require('../models/clientesModel');

exports.getAll = async (req, res) => {
  try {
    const { buscar } = req.query;
    const lista = await ClientesModel.findAll(buscar);
    res.json(lista);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getOne = async (req, res) => {
  try {
    const cliente = await ClientesModel.findById(req.params.id);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(cliente);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
  try {
    if (!req.body.nombre) return res.status(400).json({ error: 'Nombre es obligatorio' });
    const nuevo = await ClientesModel.create(req.body);
    res.status(201).json(nuevo);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.update = async (req, res) => {
  try {
    const actualizado = await ClientesModel.update(req.params.id, req.body);
    if (!actualizado) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(actualizado);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
  try {
    const ok = await ClientesModel.softDelete(req.params.id);
    ok
      ? res.json({ message: 'Cliente desactivado' })
      : res.status(404).json({ error: 'Cliente no encontrado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};