/* ═══════════════════════════════════════
   CRUZYMAR · controllers/produccionController.js
═══════════════════════════════════════ */

const ProduccionModel = require('../models/produccionModel');

exports.getAll = async (req, res) => {
  try {
    const { estado, fecha } = req.query;
    const lista = await ProduccionModel.findAll({ estado, fecha });
    res.json(lista);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getById = async (req, res) => {
  try {
    const prod = await ProduccionModel.findById(req.params.id);
    if (!prod) return res.status(404).json({ error: 'Lote no encontrado' });
    res.json(prod);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
  try {
    const { productoNombre, lecheUsada, fechaProduccion } = req.body;
    if (!productoNombre)  return res.status(400).json({ error: 'El producto es obligatorio' });
    if (!lecheUsada)      return res.status(400).json({ error: 'Los litros de leche son obligatorios' });
    if (!fechaProduccion) return res.status(400).json({ error: 'La fecha es obligatoria' });
    const nuevo = await ProduccionModel.create({
      ...req.body,
      operario_id: req.user?.id || null
    });
    res.status(201).json(nuevo);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.update = async (req, res) => {
  try {
    const actualizado = await ProduccionModel.update(req.params.id, req.body);
    if (!actualizado) return res.status(404).json({ error: 'Lote no encontrado' });
    res.json(actualizado);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
  try {
    const eliminado = await ProduccionModel.remove(req.params.id);
    if (!eliminado) return res.status(404).json({ error: 'Lote no encontrado' });
    res.json({ message: 'Lote eliminado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Override del update para mapear camelCase -> snake_case
const _origUpdate = exports.update;
exports.update = async (req, res) => {
  try {
    const raw = req.body;
    // Mapeo camelCase -> snake_case
    const data = {};
    if (raw.cantidadObtenida !== undefined) data.cantidad_obtenida = parseFloat(raw.cantidadObtenida);
    if (raw.lecheUsada       !== undefined) data.leche_usada       = parseFloat(raw.lecheUsada);
    if (raw.productoNombre   !== undefined) data.producto_nombre   = raw.productoNombre;
    if (raw.fechaProduccion  !== undefined) data.fecha_produccion  = raw.fechaProduccion;
    if (raw.estado           !== undefined) data.estado            = raw.estado;
    if (raw.turno            !== undefined) data.turno             = raw.turno;
    if (raw.observaciones    !== undefined) data.observaciones      = raw.observaciones;
    // También aceptar snake_case directo
    Object.assign(data, Object.fromEntries(
      Object.entries(raw).filter(([k]) => k === k.toLowerCase() && k.includes('_'))
    ));
    const actualizado = await ProduccionModel.update(req.params.id, data);
    if (!actualizado) return res.status(404).json({ error: 'Lote no encontrado' });
    res.json(actualizado);
  } catch (e) { res.status(500).json({ error: e.message }); }
};