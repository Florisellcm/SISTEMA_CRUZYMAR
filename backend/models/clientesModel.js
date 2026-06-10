/* ═══════════════════════════════════════
   CRUZYMAR · models/clientesModel.js
   Acceso a datos de clientes
═══════════════════════════════════════ */

const db = require('../data/db');
const { v4: uuidv4 } = require('uuid');

if (!db.clientes) db.clientes = [];

/**
 * Listar clientes activos con búsqueda opcional
 */
exports.findAll = (buscar) => {
  let lista = db.clientes.filter(c => c.activo);
  if (buscar) lista = lista.filter(c => c.nombre.toLowerCase().includes(buscar.toLowerCase()));
  return lista;
};

/**
 * Crear nuevo cliente
 */
exports.create = ({ nombre, telefono, email, direccion, tipo, rtn }) => {
  const nuevo = {
    id: uuidv4(), nombre,
    telefono: telefono || '', email: email || '',
    direccion: direccion || '', tipo: tipo || 'Particular',
    rtn: rtn || '', activo: true,
    creadoEn: new Date().toISOString()
  };
  db.clientes.push(nuevo);
  return nuevo;
};

/**
 * Actualizar cliente existente
 */
exports.update = (id, data) => {
  const idx = db.clientes.findIndex(c => c.id === id);
  if (idx === -1) return null;
  db.clientes[idx] = { ...db.clientes[idx], ...data, actualizadoEn: new Date().toISOString() };
  return db.clientes[idx];
};

/**
 * Eliminar cliente (soft delete)
 */
exports.softDelete = (id) => {
  const idx = db.clientes.findIndex(c => c.id === id);
  if (idx === -1) return false;
  db.clientes[idx].activo = false;
  return true;
};
