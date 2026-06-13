/* ═══════════════════════════════════════
   CRUZYMAR · models/produccionModel.js
   Acceso a datos y lógica de producción
═══════════════════════════════════════ */

const db = require('../data/db');
const { v4: uuidv4 } = require('uuid');

// Inicialización de datos en memoria
if (!db.producciones) db.producciones = [];
if (!db.nextLote)     db.nextLote = 1;

/**
 * Listar producciones con filtros opcionales
 */
exports.findAll = ({ estado, fecha } = {}) => {
  let lista = [...db.producciones];
  if (estado) lista = lista.filter(p => p.estado === estado);
  if (fecha)  lista = lista.filter(p => p.fechaProduccion === fecha);
  lista.sort((a, b) => new Date(b.creadoEn) - new Date(a.creadoEn));
  return lista;
};

/**
 * Buscar una producción por ID
 */
exports.findById = (id) => {
  return db.producciones.find(p => p.id === id);
};

/**
 * Crear nuevo lote de producción
 */
exports.create = (data) => {
  const {
    productoNombre, lecheUsada, cantidadObtenida,
    unidad, fechaProduccion, turno, operario,
    insumos, observaciones, estado
  } = data;

  const leche      = parseFloat(lecheUsada)      || 0;
  const cantidad   = parseFloat(cantidadObtenida) || 0;
  const rendimiento = leche > 0 ? ((cantidad / leche) * 100).toFixed(1) : 0;
  const merma       = leche - cantidad > 0 ? (leche - cantidad).toFixed(2) : 0;

  // Generar número de lote automático
  const fecha       = fechaProduccion.replace(/-/g, '');
  const inicial     = (turno || 'M').charAt(0).toUpperCase();
  const consecutivo = String(db.nextLote).padStart(3, '0');
  const numeroLote  = `${fecha}-${inicial}-${consecutivo}`;
  db.nextLote++;

  const nuevo = {
    id:               uuidv4(),
    numeroLote,
    productoNombre,
    lecheUsada:       leche,
    cantidadObtenida: cantidad,
    unidad:           unidad || 'libras',
    rendimiento:      parseFloat(rendimiento),
    merma:            parseFloat(merma),
    fechaProduccion,
    turno:            turno      || 'Mañana',
    operario:         operario   || '',
    insumos:          insumos    || '',
    observaciones:    observaciones || '',
    estado:           estado     || 'En proceso',
    calidad:          'Pendiente',
    creadoEn:         new Date().toISOString(),
  };

  db.producciones.push(nuevo);
  return nuevo;
};

/**
 * Actualizar producción existente
 */
exports.update = (id, data) => {
  const idx = db.producciones.findIndex(p => p.id === id);
  if (idx === -1) return null;

  const anterior = db.producciones[idx];

  // Recalcular si cambian cantidades
  const leche    = parseFloat(data.lecheUsada      || anterior.lecheUsada)      || 0;
  const cantidad = parseFloat(data.cantidadObtenida || anterior.cantidadObtenida) || 0;

  db.producciones[idx] = {
    ...anterior,
    ...data,
    lecheUsada:       leche,
    cantidadObtenida: cantidad,
    rendimiento:      leche > 0 ? parseFloat(((cantidad / leche) * 100).toFixed(1)) : 0,
    merma:            parseFloat((leche - cantidad > 0 ? leche - cantidad : 0).toFixed(2)),
    actualizadoEn:    new Date().toISOString(),
  };

  return db.producciones[idx];
};

/**
 * Eliminar producción (borrado físico)
 */
exports.remove = (id) => {
  const idx = db.producciones.findIndex(p => p.id === id);
  if (idx === -1) return false;
  db.producciones.splice(idx, 1);
  return true;
};
