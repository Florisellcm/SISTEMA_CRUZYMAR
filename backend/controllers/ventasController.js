/* ═══════════════════════════════════════
   CRUZYMAR · controllers/ventasController.js
═══════════════════════════════════════ */

const VentasModel = require('../models/ventasModel');

exports.getAll = async (req, res) => {
  try {
    const { estado } = req.query;
    const lista = await VentasModel.findAll(estado);
    res.json(lista);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getById = async (req, res) => {
  try {
    const venta = await VentasModel.findById(req.params.id);
    if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });
    res.json(venta);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
  try {
    const { items, clienteId, clienteNombre } = req.body;
    if (!items || items.length === 0)
      return res.status(400).json({ error: 'Debe agregar al menos un producto' });
    const nueva = await VentasModel.create({
      ...req.body,
      vendedor_id: req.user?.id || null
    });
    res.status(201).json(nueva);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.update = async (req, res) => {
  try {
    const actualizado = await VentasModel.update(req.params.id, req.body);
    if (!actualizado) return res.status(404).json({ error: 'Venta no encontrada' });
    res.json(actualizado);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
  try {
    const cancelada = await VentasModel.cancel(req.params.id);
    if (!cancelada) return res.status(404).json({ error: 'Venta no encontrada' });
    res.json({ message: 'Venta cancelada' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};