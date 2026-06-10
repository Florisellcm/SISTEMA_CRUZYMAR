/* ═══════════════════════════════════════
   CRUZYMAR · models/proveedoresModel.js
   Acceso a datos de proveedores
═══════════════════════════════════════ */

const db = require('../data/db');
const { v4: uuidv4 } = require('uuid');

if (!db.proveedores) db.proveedores = [];

/**
 * Listar proveedores activos con búsqueda opcional
 */
exports.findAll = (buscar) => {
  let lista = db.proveedores.filter(p => p.activo !== false);
  if (buscar) {
    lista = lista.filter(p =>
      p.nombre.toLowerCase().includes(buscar.toLowerCase())
    );
  }
  return lista;
};

/**
 * Buscar proveedor activo por ID
 */
exports.findActiveById = (id) => {
  return db.proveedores.find(p => p.id === id && p.activo !== false);
};

/**
 * Crear nuevo proveedor
 */
exports.create = ({ nombre, telefono, email, direccion, tipo, rtn }) => {
  const nuevo = {
    id: uuidv4(),
    nombre,
    telefono: telefono || '',
    email: email || '',
    direccion: direccion || '',
    tipo: tipo || 'Local',
    rtn: rtn || '',
    activo: true,
    creadoEn: new Date().toISOString()
  };
  db.proveedores.push(nuevo);
  return nuevo;
};

/**
 * Actualizar proveedor existente
 */
exports.update = (id, data) => {
  const idx = db.proveedores.findIndex(p => p.id === id);
  if (idx === -1) return null;
  db.proveedores[idx] = {
    ...db.proveedores[idx],
    ...data,
    actualizadoEn: new Date().toISOString()
  };
  return db.proveedores[idx];
};

/**
 * Eliminar proveedor (soft delete)
 */
exports.softDelete = (id) => {
  const idx = db.proveedores.findIndex(p => p.id === id);
  if (idx === -1) return false;
  db.proveedores[idx].activo = false;
  return true;
};
