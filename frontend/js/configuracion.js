/* ═══════════════════════════════════════════════════════
   CRUZYMAR ERP · js/configuracion.js
   Mismo patrón que produccion.js  (usa req(), el(), toast(), hoy())
   Módulos: Empresa · Usuarios · Roles · Productos Catálogo · Sistema
═══════════════════════════════════════════════════════ */

// ── Estado local ─────────────────────────────────────
let _editUsuarioId  = null;
let _editProductoId = null;

/* ══════════════════════════════════════════════════════
   TABS — Navegación (igual que tu switchTab de acopio)
══════════════════════════════════════════════════════ */
function switchTab(tab) {
  document.querySelectorAll('.cfg-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.cfg-tab').forEach(t => {
    t.classList.remove('active');
    t.style.background  = 'transparent';
    t.style.color       = '#64748B';
    t.style.boxShadow   = 'none';
  });

  el('tab-' + tab).style.display = 'block';

  const btn = document.querySelector(`[data-tab="${tab}"]`);
  if (btn) {
    btn.classList.add('active');
    btn.style.background = '#fff';
    btn.style.color      = '#003C78';
    btn.style.boxShadow  = '0 1px 4px rgba(0,0,0,.08)';
  }

  // Carga lazy: solo cuando se abre el tab
  if (tab === 'empresa')   cargarEmpresa();
  if (tab === 'usuarios')  cargarUsuarios();
  if (tab === 'roles')     cargarRoles();
  if (tab === 'productos') cargarProductosCatalogo();
  if (tab === 'sistema')   cargarSistema();
}

/* ══════════════════════════════════════════════════════
   1. EMPRESA
══════════════════════════════════════════════════════ */
async function cargarEmpresa() {
  try {
    const d = await req('GET', '/config/empresa');
    const set = (id, val) => { const e = el(id); if (e && val !== undefined && val !== null) e.value = val; };
    set('empNombre',       d.nombre);
    set('empRazonSocial',  d.razon_social);
    set('empRTN',          d.rtn);
    set('empCAI',          d.cai);
    set('empGiro',         d.giro);
    set('empDireccion',    d.direccion);
    set('empCiudad',       d.ciudad);
    set('empDepartamento', d.departamento);
    set('empTelefono',     d.telefono);
    set('empEmail',        d.email);
    set('empMoneda',       d.moneda);
    set('empISV',          d.isv);
  } catch (e) {
    console.warn('Sin datos de empresa guardados aún');
  }
}

async function saveEmpresa() {
  const g = id => el(id)?.value?.trim();
  if (!g('empNombre')) return toast('El nombre de la empresa es requerido', 'err');

  try {
    await req('PUT', '/config/empresa', {
      nombre:        g('empNombre'),
      razon_social:  g('empRazonSocial'),
      rtn:           g('empRTN'),
      cai:           g('empCAI'),
      giro:          g('empGiro'),
      direccion:     g('empDireccion'),
      ciudad:        g('empCiudad'),
      departamento:  g('empDepartamento'),
      telefono:      g('empTelefono'),
      email:         g('empEmail'),
      moneda:        g('empMoneda'),
      isv:           g('empISV'),
    });
    toast('Datos de empresa guardados ✅');
  } catch (e) {
    toast(e.message, 'err');
  }
}

/* ══════════════════════════════════════════════════════
   2. USUARIOS
══════════════════════════════════════════════════════ */
async function cargarUsuarios() {
  const tbody = el('usuariosTableBody');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#64748B">Cargando...</td></tr>';
  try {
    const lista = await req('GET', '/config/usuarios');
    if (!lista.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#64748B">No hay usuarios registrados</td></tr>';
      return;
    }
    tbody.innerHTML = lista.map(u => `
      <tr>
        <td><strong style="color:#003C78;font-family:monospace">${u.username}</strong></td>
        <td>${u.nombre}</td>
        <td style="color:#64748B">${u.email}</td>
        <td>${badgeRol(u.rol)}</td>
        <td>${badgeEstado(u.estado)}</td>
        <td style="color:#94A3B8;font-size:12px">${u.ultimo_acceso ? formatFechaConf(u.ultimo_acceso) : '—'}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn-accion azul" onclick="editarUsuario('${u.id}')" title="Editar">
              <i class="ri-edit-line"></i>
            </button>
            <button class="btn-accion rojo" onclick="desactivarUsuario('${u.id}','${u.nombre}')" title="Desactivar">
              <i class="ri-user-unfollow-line"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:#DC2626">${e.message}</td></tr>`;
  }
}

function openNuevoUsuario() {
  _editUsuarioId = null;
  el('modalUsuarioTitulo').textContent = 'Nuevo Usuario';
  el('formUsuario').reset();
  el('usrPassword').placeholder    = 'Mínimo 8 caracteres';
  el('usrPasswordConf').placeholder = 'Repite la contraseña';
  el('modalUsuario').style.display = 'flex';
}

async function editarUsuario(id) {
  try {
    const u = await req('GET', `/config/usuarios/${id}`);
    _editUsuarioId = id;
    el('modalUsuarioTitulo').textContent = 'Editar Usuario';
    el('usrNombre').value    = u.nombre    || '';
    el('usrUsername').value  = u.username  || '';
    el('usrEmail').value     = u.email     || '';
    el('usrRol').value       = u.rol       || 'ventas';
    el('usrEstado').value    = u.estado    || 'activo';
    el('usrTelefono').value  = u.telefono  || '';
    el('usrPassword').value  = '';
    el('usrPasswordConf').value = '';
    el('usrPassword').placeholder    = 'Dejar vacío para no cambiar';
    el('usrPasswordConf').placeholder = 'Dejar vacío para no cambiar';
    el('modalUsuario').style.display = 'flex';
  } catch (e) {
    toast(e.message, 'err');
  }
}

async function saveUsuario() {
  const g = id => el(id)?.value?.trim();
  const nombre   = g('usrNombre');
  const username = g('usrUsername');
  const email    = g('usrEmail');
  const password = g('usrPassword');
  const passConf = g('usrPasswordConf');
  const rol      = g('usrRol');
  const estado   = g('usrEstado');
  const telefono = g('usrTelefono');

  if (!nombre || !username || !email || !rol)
    return toast('Nombre, usuario, correo y rol son requeridos', 'err');

  if (!_editUsuarioId && !password)
    return toast('La contraseña es requerida para un nuevo usuario', 'err');

  if (password && password !== passConf)
    return toast('Las contraseñas no coinciden', 'err');

  const body = { nombre, username, email, rol, estado, telefono };
  if (password) body.password = password;

  try {
    if (_editUsuarioId) {
      await req('PUT', `/config/usuarios/${_editUsuarioId}`, body);
      toast('Usuario actualizado ✅');
    } else {
      await req('POST', '/config/usuarios', body);
      toast('Usuario creado ✅');
    }
    closeModalUsuario();
    cargarUsuarios();
  } catch (e) {
    toast(e.message, 'err');
  }
}

function closeModalUsuario() {
  el('modalUsuario').style.display = 'none';
  _editUsuarioId = null;
}

async function desactivarUsuario(id, nombre) {
  if (!confirm(`¿Desactivar al usuario "${nombre}"?\nPodrás reactivarlo luego desde Editar.`)) return;
  try {
    await req('DELETE', `/config/usuarios/${id}`);
    toast(`Usuario "${nombre}" desactivado`);
    cargarUsuarios();
  } catch (e) {
    toast(e.message, 'err');
  }
}

/* ══════════════════════════════════════════════════════
   3. ROLES Y PERMISOS
══════════════════════════════════════════════════════ */
async function cargarRoles() {
  try {
    const roles = await req('GET', '/config/roles');
    const personalizados = roles.filter(r => !r.es_sistema);
    const contenedor = el('rolesPersonalizados');
    if (!personalizados.length) { contenedor.innerHTML = ''; return; }

    contenedor.innerHTML = `
      <div style="font-size:13px;font-weight:700;color:#003C78;margin-bottom:12px;margin-top:4px">
        Roles Personalizados
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
        ${personalizados.map(r => `
          <div style="background:#fff;border-radius:14px;padding:20px;box-shadow:0 2px 8px rgba(0,60,120,.06);border:1px solid #E0E9F2">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
              <div>
                <div style="font-size:14px;font-weight:700;color:#1e2d42">${r.nombre}</div>
                <div style="font-size:11px;color:#64748B;margin-top:2px">${r.descripcion || '—'}</div>
              </div>
              <button class="btn-accion azul" onclick="editarRol('${r.id}')" title="Editar">
                <i class="ri-edit-line"></i>
              </button>
            </div>
            <div style="font-size:11px;color:#94A3B8">
              ${Object.entries(r.permisos || {}).filter(([,v]) => v && v !== false).map(([k]) => k).join(' · ')}
            </div>
          </div>
        `).join('')}
      </div>`;
  } catch (e) {
    console.warn('Error cargando roles:', e);
  }
}

function openNuevoRol() {
  const nombre = prompt('Nombre del nuevo rol (sin espacios, ej: supervisor):');
  if (!nombre?.trim()) return;
  const descripcion = prompt('Descripción breve:') || '';

  req('POST', '/config/roles', { nombre: nombre.trim(), descripcion })
    .then(() => { toast('Rol creado ✅'); cargarRoles(); })
    .catch(e  => toast(e.message, 'err'));
}

function editarRol(id) {
  // Placeholder — puedes expandir con un modal de checkboxes de permisos
  toast('Editor de permisos avanzado — próximamente', 'info');
}

/* ══════════════════════════════════════════════════════
   4. CATÁLOGO DE PRODUCTOS
══════════════════════════════════════════════════════ */
async function cargarProductosCatalogo() {
  const tbody = el('productosTableBody');
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#64748B">Cargando...</td></tr>';
  try {
    const lista = await req('GET', '/config/productos');
    if (!lista.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#64748B">No hay productos en el catálogo</td></tr>';
      return;
    }
    tbody.innerHTML = lista.map(p => `
      <tr>
        <td>
          <span style="font-family:monospace;background:#F4F7FA;padding:2px 8px;border-radius:4px;font-size:12px;color:#003C78">
            ${p.codigo}
          </span>
        </td>
        <td><strong>${p.nombre}</strong></td>
        <td style="color:#64748B">${p.categoria || '—'}</td>
        <td style="color:#64748B">${p.unidad || '—'}</td>
        <td style="color:#64748B">L. ${parseFloat(p.precio_costo || 0).toFixed(2)}</td>
        <td style="color:#16A34A;font-weight:700">L. ${parseFloat(p.precio_venta || 0).toFixed(2)}</td>
        <td>
          ${p.isv === 'no'
            ? '<span style="color:#94A3B8;font-size:12px">Exento</span>'
            : `<span style="color:#EA580C;font-weight:700">${p.isv}%</span>`}
        </td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn-accion azul" onclick="editarProductoCatalogo('${p.id}')" title="Editar">
              <i class="ri-edit-line"></i>
            </button>
            <button class="btn-accion rojo" onclick="eliminarProductoCatalogo('${p.id}','${p.nombre}')" title="Desactivar">
              <i class="ri-delete-bin-line"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:#DC2626">${e.message}</td></tr>`;
  }
}

function openNuevoProductoCatalogo() {
  _editProductoId = null;
  el('modalProdCatTitulo').textContent = 'Nuevo Producto';
  el('formProductoCatalogo').reset();
  el('modalProductoCatalogo').style.display = 'flex';
}

async function editarProductoCatalogo(id) {
  try {
    const p = await req('GET', `/config/productos/${id}`);
    _editProductoId = id;
    el('modalProdCatTitulo').textContent = 'Editar Producto';
    const set = (elId, val) => { const e = el(elId); if (e) e.value = val ?? ''; };
    set('catCodigo',      p.codigo);
    set('catNombre',      p.nombre);
    set('catCategoria',   p.categoria);
    set('catUnidad',      p.unidad);
    set('catPrecioCosto', p.precio_costo);
    set('catPrecioVenta', p.precio_venta);
    set('catISV',         p.isv);
    set('catStockMin',    p.stock_minimo);
    set('catDescripcion', p.descripcion);
    el('modalProductoCatalogo').style.display = 'flex';
  } catch (e) {
    toast(e.message, 'err');
  }
}

async function saveProductoCatalogo() {
  const g = id => el(id)?.value?.trim();
  if (!g('catCodigo') || !g('catNombre'))
    return toast('Código y nombre son requeridos', 'err');

  const body = {
    codigo:       g('catCodigo'),
    nombre:       g('catNombre'),
    categoria:    g('catCategoria'),
    unidad:       g('catUnidad'),
    precio_costo: parseFloat(g('catPrecioCosto') || 0),
    precio_venta: parseFloat(g('catPrecioVenta') || 0),
    isv:          g('catISV'),
    stock_minimo: parseInt(g('catStockMin') || 0),
    descripcion:  g('catDescripcion'),
  };

  try {
    if (_editProductoId) {
      await req('PUT', `/config/productos/${_editProductoId}`, body);
      toast('Producto actualizado ✅');
    } else {
      await req('POST', '/config/productos', body);
      toast('Producto agregado al catálogo ✅');
    }
    closeModalProductoCatalogo();
    cargarProductosCatalogo();
  } catch (e) {
    toast(e.message, 'err');
  }
}

function closeModalProductoCatalogo() {
  el('modalProductoCatalogo').style.display = 'none';
  _editProductoId = null;
}

async function eliminarProductoCatalogo(id, nombre) {
  if (!confirm(`¿Desactivar el producto "${nombre}"?`)) return;
  try {
    await req('DELETE', `/config/productos/${id}`);
    toast('Producto desactivado');
    cargarProductosCatalogo();
  } catch (e) {
    toast(e.message, 'err');
  }
}

/* ══════════════════════════════════════════════════════
   5. PREFERENCIAS DEL SISTEMA
══════════════════════════════════════════════════════ */
async function cargarSistema() {
  try {
    const d = await req('GET', '/config/sistema');
    const set = (id, val) => { const e = el(id); if (!e || val === undefined) return; e.value = val; };
    set('sysFormatoFecha',  d.formato_fecha);
    set('sysZonaHoraria',   d.zona_horaria);
    set('sysDecimales',     d.decimales);
    set('sysBackup',        d.backup_auto);
    set('sysSesion',        d.sesion_minutos);
    set('sysMaxIntentos',   d.max_intentos_login);
    set('sysMinPass',       d.min_pass_chars);
    const chk = el('sysAlertaStock');
    if (chk) chk.checked = !!d.alerta_stock;
    const actEl = el('sysUltimaActu');
    if (actEl) actEl.textContent = d.updated_at ? formatFechaConf(d.updated_at) : hoy();
  } catch (e) {
    console.warn('Error cargando sistema:', e);
  }
}

async function saveSistema() {
  const g = id => el(id)?.value;
  try {
    await req('PUT', '/config/sistema', {
      formato_fecha:      g('sysFormatoFecha'),
      zona_horaria:       g('sysZonaHoraria'),
      decimales:          g('sysDecimales'),
      alerta_stock:       el('sysAlertaStock')?.checked,
      backup_auto:        g('sysBackup'),
      sesion_minutos:     parseInt(g('sysSesion')       || 60),
      max_intentos_login: parseInt(g('sysMaxIntentos')  || 5),
      min_pass_chars:     parseInt(g('sysMinPass')      || 8),
    });
    toast('Preferencias del sistema guardadas ✅');
    cargarSistema();
  } catch (e) {
    toast(e.message, 'err');
  }
}

/* ══════════════════════════════════════════════════════
   HELPERS UI (mismo estilo que produccion.js)
══════════════════════════════════════════════════════ */
function badgeRol(rol) {
  const map = {
    administrador: ['#003C78', '#EAF2FB', '🛡️'],
    produccion:    ['#EA580C', '#FFF7ED', '🏭'],
    ventas:        ['#16A34A', '#F0FDF4', '🛒'],
  };
  const [color, bg, icon] = map[rol] || ['#64748B', '#F4F7FA', '👤'];
  return `<span style="background:${bg};color:${color};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">${icon} ${rol}</span>`;
}

function badgeEstado(estado) {
  return estado === 'activo'
    ? '<span style="background:#F0FDF4;color:#16A34A;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">● Activo</span>'
    : '<span style="background:#FEF2F2;color:#DC2626;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">● Inactivo</span>';
}

function formatFechaConf(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/* ══════════════════════════════════════════════════════
   INICIALIZACIÓN
   Se llama desde app.js cuando el usuario navega a
   la página de configuración, igual que loadProduccion()
══════════════════════════════════════════════════════ */
function loadConfiguracion() {
  cargarEmpresa();   // El primer tab siempre es empresa
}