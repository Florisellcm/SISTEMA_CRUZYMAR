/* ═══════════════════════════════════════
   CRUZYMAR · controllers/gastosController.js
═══════════════════════════════════════ */
const GastosModel = require('../models/gastosModel');

exports.getAll = async (req, res) => {
  try {
    const lista = await GastosModel.findAll(req.query.categoria);
    res.json(lista);
  } catch (e) { res.status(500).json({ error: e.message }); }
};
exports.create = async (req, res) => {
  try {
    const { concepto, monto } = req.body;
    if (!concepto || !monto) return res.status(400).json({ error: 'Concepto y monto son obligatorios' });
    const nuevo = await GastosModel.create({ ...req.body, usuario_id: req.user?.id || null });
    res.status(201).json(nuevo);
  } catch (e) { res.status(500).json({ error: e.message }); }
};
exports.update = async (req, res) => {
  try {
    const r = await GastosModel.update(req.params.id, req.body);
    r ? res.json(r) : res.status(404).json({ error: 'Gasto no encontrado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
exports.remove = async (req, res) => {
  try {
    const ok = await GastosModel.remove(req.params.id);
    ok ? res.json({ message: 'Gasto eliminado' }) : res.status(404).json({ error: 'Gasto no encontrado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};