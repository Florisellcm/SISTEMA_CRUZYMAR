/* ═══════════════════════════════════════
   CRUZYMAR · models/gastosModel.js
   Acceso a datos de gastos
═══════════════════════════════════════ */

const db = require('../data/db');
const { v4: uuidv4 } = require('uuid');

if (!db.gastos) db.gastos = [
  { id: uuidv4(), concepto: 'Compra leche cruda — Ganadería Los Pinos', categoria: 'Materia Prima', monto: 8500, fecha: new Date().toISOString().split('T')[0], proveedor: 'Ganadería Los Pinos', creadoEn: new Date().toISOString() },
  { id: uuidv4(), concepto: 'Pago energía eléctrica ENEE',              categoria: 'Servicios',     monto: 1200, fecha: new Date().toISOString().split('T')[0], proveedor: 'ENEE',                creadoEn: new Date().toISOString() },
];

/**
 * Listar gastos con filtro opcional por categoría
 */
exports.findAll = (categoria) => {
  let lista = [...db.gastos];
  if (categoria) lista = lista.filter(g => g.categoria === categoria);
  lista.sort((a, b) => new Date(b.creadoEn) - new Date(a.creadoEn));
  return lista;
};

/**
 * Crear nuevo gasto
 */
exports.create = ({ concepto, categoria, monto, fecha, proveedor, comprobante }) => {
  const nuevo = {
    id: uuidv4(), concepto,
    categoria: categoria || 'Otros',
    monto: parseFloat(monto),
    fecha: fecha || new Date().toISOString().split('T')[0],
    proveedor: proveedor || '',
    comprobante: comprobante || '',
    creadoEn: new Date().toISOString()
  };
  db.gastos.push(nuevo);
  return nuevo;
};

/**
 * Actualizar gasto existente
 */
exports.update = (id, data) => {
  const idx = db.gastos.findIndex(g => g.id === id);
  if (idx === -1) return null;
  db.gastos[idx] = { ...db.gastos[idx], ...data, actualizadoEn: new Date().toISOString() };
  return db.gastos[idx];
};

/**
 * Eliminar gasto (borrado físico)
 */
exports.remove = (id) => {
  const idx = db.gastos.findIndex(g => g.id === id);
  if (idx === -1) return false;
  db.gastos.splice(idx, 1);
  return true;
};
