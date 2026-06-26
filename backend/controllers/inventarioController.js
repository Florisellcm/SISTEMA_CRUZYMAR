/* ═══════════════════════════════════════
   CRUZYMAR · controllers/inventarioController.js
═══════════════════════════════════════ */

const m = require('../models/inventarioModel');

exports.getAll = async (req, res) => {
  try { res.json(await m.findAll(req.query)); }
  catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getById = async (req, res) => {
  try {
    const item = await m.findById(req.params.id);
    item ? res.json(item) : res.status(404).json({ error: 'No encontrado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
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
    const ok = await m.softDelete(req.params.id);
    ok ? res.json({ ok: true }) : res.status(404).json({ error: 'No encontrado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getMovimientos = async (req, res) => {
  try { res.json(await m.getMovimientos(req.query)); }
  catch (e) { res.status(500).json({ error: e.message }); }
};

exports.registrarMovimiento = async (req, res) => {
  try {
    const r = await m.registrarMovimiento({ ...req.body, usuario: req.user?.nombre });
    r ? res.status(201).json(r) : res.status(400).json({ error: 'Producto no encontrado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getVencimientos = async (req, res) => {
  try { res.json(await m.getVencimientos()); }
  catch (e) { res.status(500).json({ error: e.message }); }
};