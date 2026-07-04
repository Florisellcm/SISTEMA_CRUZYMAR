/* ═══════════════════════════════════════
   CRUZYMAR · controllers/produccionController.js
═══════════════════════════════════════ */

const ProduccionModel = require('../models/produccionModel');

exports.getAll = async (req, res) => {
  try {
    const { estado, fecha, tipoProceso } = req.query;
    const lista = await ProduccionModel.findAll({ estado, fecha, tipoProceso });
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

// Lotes completados recientes, para el selector opcional de "Lote de origen"
exports.getRecientes = async (req, res) => {
  try {
    const lista = await ProduccionModel.findRecientes(20);
    res.json(lista);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
  try {
    const { productoNombre, lecheUsada, fechaProduccion, materiaPrimaInventarioId, productoInventarioId } = req.body;
    if (!productoNombre) return res.status(400).json({ error: 'El producto es obligatorio' });
    if (!lecheUsada) return res.status(400).json({ error: 'La cantidad de materia prima utilizada es obligatoria' });
    if (!fechaProduccion) return res.status(400).json({ error: 'La fecha es obligatoria' });
    if (!materiaPrimaInventarioId) return res.status(400).json({ error: 'Debe seleccionar de qué producto de inventario sale la materia prima' });
    if (!productoInventarioId) return res.status(400).json({ error: 'Debe seleccionar a qué producto de inventario corresponde la salida' });

    const nuevo = await ProduccionModel.create({
      ...req.body,
      tipoProceso: req.body.tipoProceso || 'Manual',
      operario_id: req.user?.id || null
    });
    res.status(201).json(nuevo);
  } catch (e) { res.status(400).json({ error: e.message }); }
};

// Edita SOLO metadatos (turno, fecha, observaciones)
exports.update = async (req, res) => {
  try {
    const { turno, fechaProduccion, observaciones, insumos } = req.body;
    const actualizado = await ProduccionModel.update(req.params.id, {
      turno, fecha_produccion: fechaProduccion, observaciones, insumos
    });
    if (!actualizado) return res.status(404).json({ error: 'Lote no encontrado' });
    res.json(actualizado);
  } catch (e) { res.status(400).json({ error: e.message }); }
};

// Completa un lote "En proceso" y acredita su(s) salida(s) al inventario
exports.completar = async (req, res) => {
  try {
    const actualizado = await ProduccionModel.completar(req.params.id, req.body);
    res.json(actualizado);
  } catch (e) { res.status(400).json({ error: e.message }); }
};

// Cancela un lote, revirtiendo cualquier movimiento de inventario que haya generado
exports.cancelar = async (req, res) => {
  try {
    const actualizado = await ProduccionModel.cancelar(req.params.id);
    res.json(actualizado);
  } catch (e) { res.status(400).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
  try {
    const eliminado = await ProduccionModel.remove(req.params.id);
    if (!eliminado) return res.status(404).json({ error: 'Lote no encontrado' });
    res.json({ message: 'Lote eliminado' });
  } catch (e) { res.status(400).json({ error: e.message }); }
};