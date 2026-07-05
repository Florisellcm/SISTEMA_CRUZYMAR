/* ═══════════════════════════════════════
   CRUZYMAR · controllers/comprasController.js
═══════════════════════════════════════ */
const m = require('../models/comprasModel');

exports.getAll = async (req, res) => {
  try { res.json(await m.findAll(req.query)); }
  catch (e) { res.status(500).json({ error: e.message }); }
};
exports.create = async (req, res) => {
  try { res.status(201).json(await m.create(req.body)); }
  catch (e) { res.status(500).json({ error: e.message }); }
};
exports.update = async (req, res) => {
  try {
    const r = await m.update(req.params.id, req.body);
    r ? res.json(r) : res.status(404).json({ error: 'No encontrado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
exports.remove = async (req, res) => {
  try {
    const ok = await m.remove(req.params.id);
    ok ? res.json({ ok: true }) : res.status(404).json({ error: 'No encontrado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};