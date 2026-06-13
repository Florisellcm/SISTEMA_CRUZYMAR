/* ═══════════════════════════════════════
   CRUZYMAR · models/inventarioModel.js
   Acceso a datos de inventario
═══════════════════════════════════════ */

const db = require('../data/db');
const { v4: uuidv4 } = require('uuid');

if (!db.inventario) db.inventario = [
  { id: uuidv4(), nombre: 'Queso Fresco 500g',    categoria: 'Queso',      stock: 120, stockMinimo: 20, unidad: 'Unidades', precio: 65.00,  activo: true, creadoEn: new Date().toISOString() },
  { id: uuidv4(), nombre: 'Leche Entera 1L',       categoria: 'Leche',      stock: 350, stockMinimo: 50, unidad: 'Litros',   precio: 28.00,  activo: true, creadoEn: new Date().toISOString() },
  { id: uuidv4(), nombre: 'Mantequilla 250g',      categoria: 'Mantequilla',stock: 8,   stockMinimo: 15, unidad: 'Unidades', precio: 55.00,  activo: true, creadoEn: new Date().toISOString() },
  { id: uuidv4(), nombre: 'Quesillo Especial 1lb', categoria: 'Queso',      stock: 60,  stockMinimo: 10, unidad: 'Unidades', precio: 80.00,  activo: true, creadoEn: new Date().toISOString() },
  { id: uuidv4(), nombre: 'Cuajo líquido',         categoria: 'Insumo',     stock: 5,   stockMinimo: 2,  unidad: 'Litros',   precio: 120.00, activo: true, creadoEn: new Date().toISOString() },
];

/**
 * Listar inventario activo con filtros opcionales
 */
exports.findAll = ({ categoria, buscar } = {}) => {
  let lista = db.inventario.filter(p => p.activo);
  if (categoria) lista = lista.filter(p => p.categoria === categoria);
  if (buscar)    lista = lista.filter(p => p.nombre.toLowerCase().includes(buscar.toLowerCase()));
  return lista;
};

/**
 * Crear nuevo producto de inventario
 */
exports.create = ({ nombre, categoria, stock, stockMinimo, unidad, precio }) => {
  const nuevo = {
    id: uuidv4(), nombre,
    categoria: categoria || 'General',
    stock: parseFloat(stock) || 0,
    stockMinimo: parseFloat(stockMinimo) || 0,
    unidad: unidad || 'litros',
    precio: parseFloat(precio) || 0,
    activo: true, creadoEn: new Date().toISOString()
  };
  db.inventario.push(nuevo);
  return nuevo;
};

/**
 * Actualizar producto de inventario
 */
exports.update = (id, data) => {
  const idx = db.inventario.findIndex(p => p.id === id);
  if (idx === -1) return null;
  db.inventario[idx] = { ...db.inventario[idx], ...data, actualizadoEn: new Date().toISOString() };
  return db.inventario[idx];
};

/**
 * Eliminar producto (soft delete)
 */
exports.softDelete = (id) => {
  const idx = db.inventario.findIndex(p => p.id === id);
  if (idx === -1) return false;
  db.inventario[idx].activo = false;
  return true;
};
