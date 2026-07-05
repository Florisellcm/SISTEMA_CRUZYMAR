/* ═══════════════════════════════════════
   CRUZYMAR · controllers/proveedoresController.js
═══════════════════════════════════════ */
const m = require('../models/proveedoresModel');

exports.getAll = async (req, res) => {
  try { res.json(await m.findAll(req.query.buscar)); }
  catch (e) { res.status(500).json({ error: e.message }); }
};
exports.create = async (req, res) => {
  try {
    if (!req.body.nombre) return res.status(400).json({ error: 'Nombre obligatorio' });
    res.status(201).json(await m.create(req.body));
  } catch (e) { res.status(500).json({ error: e.message }); }
};
exports.update = async (req, res) => {
  try {
    const r = await m.update(req.params.id, req.body);
    r ? res.json(r) : res.status(404).json({ error: 'Proveedor no encontrado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
exports.remove = async (req, res) => {
  try {
    const ok = await m.softDelete(req.params.id);
    ok ? res.json({ message: 'Proveedor eliminado' }) : res.status(404).json({ error: 'Proveedor no encontrado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};