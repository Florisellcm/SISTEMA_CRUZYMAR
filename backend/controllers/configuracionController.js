/* ═══════════════════════════════════════════════════════
   CRUZYMAR ERP · controllers/configuracionController.js
   Controladores de configuración del sistema
   Módulos: Empresa · Usuarios · Roles · Productos · Sistema
═══════════════════════════════════════════════════════ */

const ConfigModel = require('../models/configuracionModel');


/* ═══════════════════════════════════════════
   1. EMPRESA
═══════════════════════════════════════════ */

exports.getEmpresa = (req, res) => {
  res.json(ConfigModel.empresa.get());
};

exports.updateEmpresa = (req, res) => {
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre de la empresa es requerido' });
  const data = ConfigModel.empresa.update(req.body);
  res.json({ ok: true, mensaje: 'Datos de empresa guardados', data });
};


/* ═══════════════════════════════════════════
   2. USUARIOS
═══════════════════════════════════════════ */

exports.getUsuarios = (req, res) => {
  res.json(ConfigModel.usuarios.findAll());
};

exports.getUsuarioById = (req, res) => {
  const usuario = ConfigModel.usuarios.findById(req.params.id);
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(usuario);
};

exports.createUsuario = async (req, res) => {
  const { username, nombre, email, password, rol } = req.body;

  if (!username || !nombre || !email || !password || !rol)
    return res.status(400).json({ error: 'Campos requeridos: username, nombre, email, password, rol' });

  if (password.length < 8)
    return res.status(400).json({ error: 'La contraseña debe tener mínimo 8 caracteres' });

  const existe = ConfigModel.usuarios.findByUsernameOrEmail(username, email);
  if (existe) return res.status(409).json({ error: 'El usuario o correo ya existe' });

  const rolValido = ConfigModel.roles.findByNombre(rol);
  if (!rolValido) return res.status(400).json({ error: 'Rol no válido' });

  try {
    const usuario = await ConfigModel.usuarios.create(req.body);
    res.status(201).json({ ok: true, mensaje: 'Usuario creado', data: usuario });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.updateUsuario = async (req, res) => {
  const { rol, password } = req.body;

  // No se puede cambiar el rol del propio admin logueado
  if (req.params.id === req.usuario?.id && rol !== 'administrador')
    return res.status(400).json({ error: 'No puedes quitarte el rol de administrador' });

  if (password && password.length < 8)
    return res.status(400).json({ error: 'Contraseña mínimo 8 caracteres' });

  try {
    const usuario = await ConfigModel.usuarios.update(req.params.id, req.body);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ ok: true, mensaje: 'Usuario actualizado', data: usuario });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.deleteUsuario = (req, res) => {
  if (req.params.id === req.usuario?.id)
    return res.status(400).json({ error: 'No puedes desactivar tu propio usuario' });

  const desactivado = ConfigModel.usuarios.deactivate(req.params.id);
  if (!desactivado) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ ok: true, mensaje: 'Usuario desactivado' });
};


/* ═══════════════════════════════════════════
   3. ROLES Y PERMISOS
═══════════════════════════════════════════ */

exports.getRoles = (req, res) => {
  res.json(ConfigModel.roles.findAll());
};

exports.createRol = (req, res) => {
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre del rol es requerido' });

  const existe = ConfigModel.roles.findByNombreDuplicado(nombre);
  if (existe) return res.status(409).json({ error: 'Ya existe un rol con ese nombre' });

  const rol = ConfigModel.roles.create(req.body);
  res.status(201).json({ ok: true, data: rol });
};

exports.updateRol = (req, res) => {
  const result = ConfigModel.roles.update(req.params.id, req.body);
  if (!result) return res.status(404).json({ error: 'Rol no encontrado' });
  if (result.esSistema) return res.status(403).json({ error: 'No se pueden editar roles del sistema' });
  res.json({ ok: true, data: result });
};


/* ═══════════════════════════════════════════
   4. CATÁLOGO DE PRODUCTOS
═══════════════════════════════════════════ */

exports.getProductos = (req, res) => {
  res.json(ConfigModel.productos.findAll());
};

exports.getProductoById = (req, res) => {
  const producto = ConfigModel.productos.findById(req.params.id);
  if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(producto);
};

exports.createProducto = (req, res) => {
  const { codigo, nombre } = req.body;
  if (!codigo || !nombre)
    return res.status(400).json({ error: 'Código y nombre son requeridos' });

  const existe = ConfigModel.productos.findByCodigo(codigo);
  if (existe) return res.status(409).json({ error: 'El código de producto ya existe' });

  const producto = ConfigModel.productos.create(req.body);
  res.status(201).json({ ok: true, mensaje: 'Producto creado', data: producto });
};

exports.updateProducto = (req, res) => {
  const producto = ConfigModel.productos.update(req.params.id, req.body);
  if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json({ ok: true, mensaje: 'Producto actualizado', data: producto });
};

exports.deleteProducto = (req, res) => {
  const desactivado = ConfigModel.productos.deactivate(req.params.id);
  if (!desactivado) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json({ ok: true, mensaje: 'Producto desactivado' });
};


/* ═══════════════════════════════════════════
   5. PREFERENCIAS DEL SISTEMA
═══════════════════════════════════════════ */

exports.getSistema = (req, res) => {
  res.json(ConfigModel.sistema.get());
};

exports.updateSistema = (req, res) => {
  const data = ConfigModel.sistema.update(req.body);
  res.json({ ok: true, mensaje: 'Preferencias guardadas', data });
};
