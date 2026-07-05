/* ═══════════════════════════════════════
   CRUZYMAR · controllers/facturacionController.js
═══════════════════════════════════════ */
const model = require('../models/facturacionModel');

exports.getAll = async (req, res) => {
  try { res.json(await model.findAll()); }
  catch (e) { res.status(500).json({ error: e.message }); }
};
exports.create = async (req, res) => {
  try { res.status(201).json(await model.create(req.body)); }
  catch (e) { res.status(400).json({ error: e.message }); }
};
exports.update = async (req, res) => {
  try {
    const r = await model.update(req.params.id, req.body);
    r ? res.json(r) : res.status(404).json({ error: 'No encontrado' });
  } catch (e) { res.status(400).json({ error: e.message }); }
};
exports.remove = async (req, res) => {
  try {
    const ok = await model.remove(req.params.id);
    ok ? res.json({ message: 'Factura anulada' }) : res.status(404).json({ error: 'No encontrado' });
  } catch (e) { res.status(400).json({ error: e.message }); }
};