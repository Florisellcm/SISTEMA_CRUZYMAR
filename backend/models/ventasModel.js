/* ═══════════════════════════════════════
   CRUZYMAR · models/ventasModel.js
   Acceso a datos de ventas
═══════════════════════════════════════ */

const db = require('../data/db');
const { v4: uuidv4 } = require('uuid');

if (!db.ventas)    db.ventas    = [];
if (!db.nextVenta) db.nextVenta = 1;

/**
 * Listar ventas con filtro opcional por estado
 */
exports.findAll = (estado) => {
  let lista = [...db.ventas];
  if (estado) lista = lista.filter(v => v.estado === estado);
  lista.sort((a, b) => new Date(b.creadoEn) - new Date(a.creadoEn));
  return lista;
};

/**
 * Crear nueva venta
 */
exports.create = ({ clienteId, clienteNombre, items, metodoPago, observaciones }) => {
  const total = items.reduce((s, i) => s + (parseFloat(i.cantidad) * parseFloat(i.precio)), 0);
  const numero = `VTA-${String(db.nextVenta).padStart(4, '0')}`;
  db.nextVenta++;

  const nueva = {
    id: uuidv4(), numero,
    clienteId: clienteId || null,
    clienteNombre: clienteNombre || 'Consumidor final',
    items, total,
    metodoPago: metodoPago || 'Efectivo',
    estado: 'Pagada',
    observaciones: observaciones || '',
    fecha: new Date().toISOString().split('T')[0],
    creadoEn: new Date().toISOString()
  };
  db.ventas.push(nueva);
  return nueva;
};

/**
 * Actualizar venta existente
 */
exports.update = (id, data) => {
  const idx = db.ventas.findIndex(v => v.id === id);
  if (idx === -1) return null;
  db.ventas[idx] = { ...db.ventas[idx], ...data, actualizadoEn: new Date().toISOString() };
  return db.ventas[idx];
};

/**
 * Cancelar venta (soft delete)
 */
exports.cancel = (id) => {
  const idx = db.ventas.findIndex(v => v.id === id);
  if (idx === -1) return false;
  db.ventas[idx].estado = 'Cancelada';
  return true;
};
