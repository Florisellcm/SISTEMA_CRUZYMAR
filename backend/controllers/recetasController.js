/* ═══════════════════════════════════════
   CRUZYMAR · controllers/recetasController.js
═══════════════════════════════════════ */
const m = require('../models/recetasModel');

exports.getAll = async (req, res) => {
  try { res.json(await m.findAll(req.query)); }
  catch (e) { res.status(500).json({ error: e.message }); }
};
exports.getOne = async (req, res) => {
  try {
    const r = await m.findById(req.params.id);
    r ? res.json(r) : res.status(404).json({ error: 'Receta no encontrada' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
exports.create = async (req, res) => {
  try {
    if (!req.body.producto?.trim()) return res.status(400).json({ error: 'El nombre del producto es obligatorio' });
    res.status(201).json(await m.create(req.body));
  } catch (e) { res.status(500).json({ error: e.message }); }
};
exports.update = async (req, res) => {
  try {
    const r = await m.update(req.params.id, req.body);
    r ? res.json(r) : res.status(404).json({ error: 'Receta no encontrada' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
exports.remove = async (req, res) => {
  try {
    const ok = await m.remove(req.params.id);
    ok ? res.json({ message: 'Receta eliminada' }) : res.status(404).json({ error: 'Receta no encontrada' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.toggleActivo = async (req, res) => {
  try {
    const r = await m.toggle(req.params.id);
    r ? res.json(r) : res.status(404).json({ error: 'Receta no encontrada' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};