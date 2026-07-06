/* ═══════════════════════════════════════════════════════
   CRUZYMAR ERP · models/configuracionModel.js
   Acceso a datos de configuración del sistema
   Módulos: Empresa · Usuarios · Roles · Productos · Sistema
═══════════════════════════════════════════════════════ */

const db = require('../data/db');
const bcrypt = require('bcryptjs');

// ── Inicialización de datos en memoria ──────────────────

if (!db.empresa) db.empresa = {};

if (!db.usuarios) db.usuarios = [
  {
    id:            'admin-001',
    username:      'admin',
    nombre:        'Administrador',
    email:         'admin@cruzymar.com',
    password_hash: '$2a$10$defaultHashCambiarEnProduccion',
    rol:           'administrador',
    estado:        'activo',
    telefono:      '',
    ultimo_acceso: null,
    created_at:    new Date().toISOString()
  }
];

if (!db.roles) db.roles = [
  {
    id:          'rol-admin',
    nombre:      'administrador',
    descripcion: 'Acceso total al sistema',
    es_sistema:  true,
    permisos: {
      dashboard: true, acopio: true, produccion: true,
      inventario: true, ventas: true, facturacion: true,
      clientes: true, proveedores: true, gastos: true, configuracion: true
    },
    created_at: new Date().toISOString()
  },
  {
    id:          'rol-produccion',
    nombre:      'produccion',
    descripcion: 'Operario de planta',
    es_sistema:  true,
    permisos: {
      dashboard: 'lectura', acopio: true, produccion: true,
      inventario: 'lectura', ventas: false, facturacion: false,
      clientes: false, proveedores: false, gastos: false, configuracion: false
    },
    created_at: new Date().toISOString()
  },
  {
    id:          'rol-ventas',
    nombre:      'ventas',
    descripcion: 'Gestión comercial',
    es_sistema:  true,
    permisos: {
      dashboard: 'lectura', acopio: false, produccion: false,
      inventario: 'lectura', ventas: true, facturacion: true,
      clientes: true, proveedores: false, gastos: false, configuracion: false
    },
    created_at: new Date().toISOString()
  }
];

if (!db.catalogo) db.catalogo = [];

if (!db.sistema) db.sistema = {
  formato_fecha:      'DD/MM/YYYY',
  zona_horaria:       'America/Tegucigalpa',
  decimales:          2,
  alerta_stock:       true,
  backup_auto:        'diario',
  sesion_minutos:     60,
  max_intentos_login: 5,
  min_pass_chars:     8
};


/* ═══════════════════════════════════════════
   1. EMPRESA
═══════════════════════════════════════════ */

exports.empresa = {
  get: () => db.empresa,

  update: (data) => {
    const {
      nombre, razon_social, rtn, cai, giro,
      direccion, ciudad, departamento, telefono, email,
      moneda, isv
    } = data;

    db.empresa = {
      ...db.empresa,
      nombre, razon_social, rtn, cai, giro,
      direccion, ciudad, departamento, telefono, email,
      moneda: moneda || 'HNL',
      isv:    isv    || 15,
      updated_at: new Date().toISOString()
    };

    if (!db.empresa.created_at) {
      db.empresa.created_at = new Date().toISOString();
    }

    return db.empresa;
  }
};


/* ═══════════════════════════════════════════
   2. USUARIOS
═══════════════════════════════════════════ */

exports.usuarios = {
  findAll: () => {
    const lista = db.usuarios.map(({ password_hash, ...u }) => u);
    lista.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return lista;
  },

  findById: (id) => {
    const u = db.usuarios.find(x => x.id === id);
    if (!u) return null;
    const { password_hash, ...sinHash } = u;
    return sinHash;
  },

  findByUsernameOrEmail: (username, email) => {
    return db.usuarios.find(u => u.username === username || u.email === email);
  },

  create: async ({ username, nombre, email, password, rol, estado, telefono }) => {
    const hash = await bcrypt.hash(password, 10);
    const maxNum = db.usuarios.reduce((max, u) => {
      const parts = u.id.split('-');
      const num = parseInt(parts[parts.length - 1], 10);
      return (!isNaN(num) && num > max) ? num : max;
    }, 0);
    const nuevoId = `usr-${String(maxNum + 1).padStart(3, '0')}`;
    const nuevo = {
      id:            nuevoId,
      username:      username.toLowerCase().trim(),
      nombre:        nombre.trim(),
      email:         email.toLowerCase().trim(),
      password_hash: hash,
      rol,
      estado:        estado || 'activo',
      telefono:      telefono || '',
      ultimo_acceso: null,
      created_at:    new Date().toISOString()
    };
    db.usuarios.push(nuevo);
    const { password_hash, ...sinHash } = nuevo;
    return sinHash;
  },

  update: async (id, data) => {
    const idx = db.usuarios.findIndex(u => u.id === id);
    if (idx === -1) return null;

    const { nombre, email, rol, estado, telefono, password } = data;
    const actualizado = { ...db.usuarios[idx], nombre, email, rol, estado, telefono };

    if (password) {
      actualizado.password_hash = await bcrypt.hash(password, 10);
    }
    actualizado.updated_at = new Date().toISOString();
    db.usuarios[idx] = actualizado;

    const { password_hash, ...sinHash } = actualizado;
    return sinHash;
  },

  deactivate: (id) => {
    const idx = db.usuarios.findIndex(u => u.id === id);
    if (idx === -1) return false;
    db.usuarios[idx].estado     = 'inactivo';
    db.usuarios[idx].updated_at = new Date().toISOString();
    return true;
  }
};


/* ═══════════════════════════════════════════
   3. ROLES Y PERMISOS
═══════════════════════════════════════════ */

exports.roles = {
  findAll: () => db.roles,

  findByNombre: (nombre) => {
    return db.roles.find(r => r.nombre === nombre);
  },

  findByNombreDuplicado: (nombre) => {
    return db.roles.find(r => r.nombre.toLowerCase() === nombre.toLowerCase());
  },

  create: ({ nombre, descripcion, permisos }) => {
    const maxNum = db.roles.reduce((max, r) => {
      const parts = r.id.split('-');
      const num = parseInt(parts[parts.length - 1], 10);
      return (!isNaN(num) && num > max) ? num : max;
    }, 0);
    const nuevoId = `rol-${String(maxNum + 1).padStart(3, '0')}`;
    const nuevo = {
      id:          nuevoId,
      nombre:      nombre.toLowerCase().trim(),
      descripcion: descripcion || '',
      es_sistema:  false,
      permisos:    permisos || {
        dashboard: false, acopio: false, produccion: false,
        inventario: false, ventas: false, facturacion: false,
        clientes: false, proveedores: false, gastos: false, configuracion: false
      },
      created_at: new Date().toISOString()
    };
    db.roles.push(nuevo);
    return nuevo;
  },

  update: (id, data) => {
    const idx = db.roles.findIndex(r => r.id === id);
    if (idx === -1) return null;
    if (db.roles[idx].es_sistema) return { esSistema: true };

    db.roles[idx] = {
      ...db.roles[idx],
      nombre:      data.nombre      || db.roles[idx].nombre,
      descripcion: data.descripcion || db.roles[idx].descripcion,
      permisos:    data.permisos    || db.roles[idx].permisos,
      updated_at:  new Date().toISOString()
    };
    return db.roles[idx];
  }
};


/* ═══════════════════════════════════════════
   4. CATÁLOGO DE PRODUCTOS
═══════════════════════════════════════════ */

exports.productos = {
  findAll: () => {
    const activos = db.catalogo.filter(p => p.activo !== false);
    activos.sort((a, b) => a.nombre.localeCompare(b.nombre));
    return activos;
  },

  findById: (id) => {
    return db.catalogo.find(x => x.id === id) || null;
  },

  findByCodigo: (codigo) => {
    return db.catalogo.find(p => p.codigo.toLowerCase() === codigo.toLowerCase());
  },

  create: (data) => {
    const { codigo, nombre, categoria, unidad, precio_costo, precio_venta, isv, stock_minimo, descripcion } = data;
    const maxNum = db.catalogo.reduce((max, p) => {
      const parts = p.id.split('-');
      const num = parseInt(parts[parts.length - 1], 10);
      return (!isNaN(num) && num > max) ? num : max;
    }, 0);
    const nuevoId = `cat-${String(maxNum + 1).padStart(3, '0')}`;
    const nuevo = {
      id:           nuevoId,
      codigo:       codigo.toUpperCase().trim(),
      nombre:       nombre.trim(),
      categoria:    categoria    || 'Otro',
      unidad:       unidad       || 'litros',
      precio_costo: parseFloat(precio_costo) || 0,
      precio_venta: parseFloat(precio_venta) || 0,
      isv:          isv          || 'no',
      stock_minimo: parseInt(stock_minimo)   || 0,
      descripcion:  descripcion  || '',
      activo:       true,
      created_at:   new Date().toISOString()
    };
    db.catalogo.push(nuevo);
    return nuevo;
  },

  update: (id, data) => {
    const idx = db.catalogo.findIndex(p => p.id === id);
    if (idx === -1) return null;
    db.catalogo[idx] = {
      ...db.catalogo[idx],
      ...data,
      precio_costo: parseFloat(data.precio_costo) || db.catalogo[idx].precio_costo,
      precio_venta: parseFloat(data.precio_venta) || db.catalogo[idx].precio_venta,
      stock_minimo: parseInt(data.stock_minimo)   || db.catalogo[idx].stock_minimo,
      updated_at:   new Date().toISOString()
    };
    return db.catalogo[idx];
  },

  deactivate: (id) => {
    const idx = db.catalogo.findIndex(p => p.id === id);
    if (idx === -1) return false;
    db.catalogo[idx].activo     = false;
    db.catalogo[idx].updated_at = new Date().toISOString();
    return true;
  }
};


/* ═══════════════════════════════════════════
   5. PREFERENCIAS DEL SISTEMA
═══════════════════════════════════════════ */

exports.sistema = {
  get: () => db.sistema,

  update: (data) => {
    const {
      formato_fecha, zona_horaria, decimales, alerta_stock,
      backup_auto, sesion_minutos, max_intentos_login, min_pass_chars
    } = data;

    db.sistema = {
      ...db.sistema,
      formato_fecha:      formato_fecha      || db.sistema.formato_fecha,
      zona_horaria:       zona_horaria       || db.sistema.zona_horaria,
      decimales:          parseInt(decimales) ?? db.sistema.decimales,
      alerta_stock:       Boolean(alerta_stock),
      backup_auto:        backup_auto        || db.sistema.backup_auto,
      sesion_minutos:     parseInt(sesion_minutos)     || db.sistema.sesion_minutos,
      max_intentos_login: parseInt(max_intentos_login) || db.sistema.max_intentos_login,
      min_pass_chars:     parseInt(min_pass_chars)     || db.sistema.min_pass_chars,
      updated_at:         new Date().toISOString()
    };
    return db.sistema;
  }
};
