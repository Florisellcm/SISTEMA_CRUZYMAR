const db = require('../data/db');
const { v4: uuidv4 } = require('uuid');

if (!db.facturacion)    db.facturacion    = [];
if (!db.nextFactura) db.nextFactura = 1;

exports.findAll = () => {
  let lista = [...db.facturacion];
  lista.sort((a, b) => new Date(b.creadoEn) - new Date(a.creadoEn));
  return lista;
};

exports.create = (data) => {
  const numero = `FAC-${String(db.nextFactura).padStart(4, '0')}`;
  db.nextFactura++;
  const nueva = {
    id: uuidv4(),
    numero,
    ...data,
    creadoEn: new Date().toISOString()
  };
  db.facturacion.push(nueva);
  return nueva;
};

exports.update = (id, data) => {
  const idx = db.facturacion.findIndex(f => f.id === id);
  if (idx === -1) return null;
  db.facturacion[idx] = { ...db.facturacion[idx], ...data, actualizadoEn: new Date().toISOString() };
  return db.facturacion[idx];
};

exports.remove = (id) => {
  const idx = db.facturacion.findIndex(f => f.id === id);
  if (idx === -1) return false;
  db.facturacion.splice(idx, 1);
  return true;
};
