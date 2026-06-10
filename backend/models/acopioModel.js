/* ═══════════════════════════════════════
   CRUZYMAR · models/acopioModel.js
   Acceso a datos de acopio de leche
═══════════════════════════════════════ */

const db = require('../data/db');
const { v4: uuidv4 } = require('uuid');

if (!db.acopio) db.acopio = [];

/**
 * Obtener nombre del proveedor por ID
 */
function getNombreProveedor(proveedorId) {
  const prov = (db.proveedores || []).find(p => p.id === proveedorId);
  return prov ? prov.nombre : 'Desconocido';
}

/**
 * Listar registros de acopio con filtros y enriquecimiento
 */
exports.findAll = ({ fecha, proveedor_id, turno } = {}) => {
  let lista = [...db.acopio];

  if (fecha)         lista = lista.filter(r => r.fecha === fecha);
  if (proveedor_id)  lista = lista.filter(r => r.proveedor_id === proveedor_id);
  if (turno)         lista = lista.filter(r => r.turno === turno);

  // Enriquecer con nombre del proveedor
  lista = lista.map(r => ({
    ...r,
    proveedor_nombre: getNombreProveedor(r.proveedor_id)
  }));

  // Ordenar del más reciente al más antiguo
  lista.sort((a, b) => new Date(b.creadoEn) - new Date(a.creadoEn));

  return lista;
};

/**
 * Obtener resumen del día
 */
exports.getResumen = (fecha) => {
  const hoy = fecha || new Date().toISOString().slice(0, 10);
  const registros = db.acopio.filter(r => r.fecha === hoy);

  const totalLitros = registros.reduce((s, r) => s + (r.litros || 0), 0);
  const totalPagar  = registros.reduce((s, r) => s + (r.total_pagar || 0), 0);
  const cantProveedores = new Set(registros.map(r => r.proveedor_id)).size;

  return {
    fecha: hoy,
    total_litros: totalLitros,
    total_pagar: totalPagar,
    cant_proveedores: cantProveedores,
    registros: registros.length
  };
};

/**
 * Validar y buscar proveedor activo
 */
exports.findProveedorActivo = (id) => {
  return (db.proveedores || []).find(p => p.id === id && p.activo !== false);
};

/**
 * Crear nuevo registro de acopio
 */
exports.create = (data) => {
  const { proveedor_id, litros, temperatura, precio_litro, turno, fecha, observaciones } = data;

  const total_pagar = parseFloat(litros) * parseFloat(precio_litro);

  const nuevo = {
    id:            uuidv4(),
    proveedor_id,
    litros:        parseFloat(litros),
    temperatura:   temperatura ? parseFloat(temperatura) : null,
    precio_litro:  parseFloat(precio_litro),
    total_pagar:   parseFloat(total_pagar.toFixed(2)),
    turno:         turno || 'Mañana',
    fecha:         fecha || new Date().toISOString().slice(0, 10),
    observaciones: observaciones || '',
    creadoEn:      new Date().toISOString()
  };

  db.acopio.push(nuevo);
  return nuevo;
};

/**
 * Actualizar registro de acopio
 */
exports.update = (id, data) => {
  const idx = db.acopio.findIndex(r => r.id === id);
  if (idx === -1) return null;

  const { litros, precio_litro } = data;

  const updated = {
    ...db.acopio[idx],
    ...data,
    actualizadoEn: new Date().toISOString()
  };

  // Recalcular total si cambiaron litros o precio
  if (litros || precio_litro) {
    updated.litros       = parseFloat(litros       || db.acopio[idx].litros);
    updated.precio_litro = parseFloat(precio_litro || db.acopio[idx].precio_litro);
    updated.total_pagar  = parseFloat((updated.litros * updated.precio_litro).toFixed(2));
  }

  db.acopio[idx] = updated;

  return {
    ...updated,
    proveedor_nombre: getNombreProveedor(updated.proveedor_id)
  };
};

/**
 * Eliminar registro de acopio (borrado físico)
 */
exports.remove = (id) => {
  const idx = db.acopio.findIndex(r => r.id === id);
  if (idx === -1) return false;
  db.acopio.splice(idx, 1);
  return true;
};
