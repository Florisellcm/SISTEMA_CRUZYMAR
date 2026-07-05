/* ═══════════════════════════════════════
   CRUZYMAR · controllers/calidadController.js
═══════════════════════════════════════ */

const CalidadModel = require('../models/calidadModel');

exports.getAll = async (req, res) => {
  try {
    const { fecha, resultado, acopio_id } = req.query;
    const lista = await CalidadModel.findAll({ fecha, resultado, acopio_id });
    res.json(lista);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getResumen = async (req, res) => {
  try {
    const resumen = await CalidadModel.getResumen(req.query.fecha);
    res.json(resumen);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getOne = async (req, res) => {
  try {
    const registro = await CalidadModel.findById(req.params.id);
    if (!registro) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json(registro);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
  try {
    const { acopio_id } = req.body;
    if (!acopio_id) return res.status(400).json({ error: 'El registro de acopio es obligatorio' });

    const acopio = await CalidadModel.findAcopio(acopio_id);
    if (!acopio) return res.status(404).json({ error: 'Registro de acopio no encontrado' });

    const nuevo = await CalidadModel.create({
      ...req.body,
      analista_id: req.user?.id || null
    });
    res.status(201).json(nuevo);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.update = async (req, res) => {
  try {
    const actualizado = await CalidadModel.update(req.params.id, req.body);
    if (!actualizado) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json(actualizado);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
  try {
    const eliminado = await CalidadModel.remove(req.params.id);
    if (!eliminado) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json({ message: 'Registro eliminado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};