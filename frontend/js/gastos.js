/* ══════════════════════════════════════════════
   CRUZYMAR · gastos.js (Unificado Compras)
   Módulo frontend de Gastos y Proveedores
   Empresa: CRUZYMAR Productos Lácteos S. de R.L.
   Victoria, Yoro, Honduras
══════════════════════════════════════════════ */

let gastosData = [];
let proveedoresGeneralData = [];

/* ─── CARGAR DATOS GENERALES (Compatibilidad) ─── */
async function loadGastos() {
  if (currentPage === 'proveedores') {
    await loadProveedoresStandalone();
  } else {
    await loadGastosStandalone();
  }
}

/* ─── CARGAR GASTOS (STANDALONE) ─── */
async function loadGastosStandalone() {
  try {
    [gastosData, proveedoresGeneralData] = await Promise.all([
      req('GET', '/gastos'),
      req('GET', '/proveedores')
    ]);
    actualizarTarjetasCompras();
    renderGastosList();
  } catch(e) {
    toast('Error cargando compras: ' + e.message, 'err');
  }
}

/* ─── CARGAR PROVEEDORES (STANDALONE) ─── */
async function loadProveedoresStandalone() {
  try {
    proveedoresGeneralData = await req('GET', '/proveedores');
    actualizarTarjetasProveedores();
    renderProveedoresStandaloneList();
  } catch(e) {
    toast('Error cargando proveedores: ' + e.message, 'err');
  }
}

// ── ACTUALIZAR TARJETAS ──
function actualizarTarjetasCompras() {
  let totalEgresos = 0, materiaPrima = 0, servicios = 0;

  gastosData.forEach(g => {
    totalEgresos += parseFloat(g.monto) || 0;
    if (g.categoria === 'Materia Prima') materiaPrima += parseFloat(g.monto) || 0;
    if (g.categoria === 'Servicios') servicios += parseFloat(g.monto) || 0;
  });

  if (el('gsTotalGeneral')) el('gsTotalGeneral').textContent = L(totalEgresos);
  if (el('gsMateriaPrima')) el('gsMateriaPrima').textContent = L(materiaPrima);
  if (el('gsServicios')) el('gsServicios').textContent = L(servicios);
}

function actualizarTarjetasProveedores() {
  const total = proveedoresGeneralData.length;
  const ganaderos = proveedoresGeneralData.filter(p => p.tipo === 'Ganadero' || p.tipo === 'Ganadería').length;
  const cooperativas = proveedoresGeneralData.filter(p => p.tipo === 'Cooperativa').length;

  if (el('cardTotalProveedores')) el('cardTotalProveedores').textContent = total;
  if (el('cardGanaderosTotal'))    el('cardGanaderosTotal').textContent    = ganaderos;
  if (el('cardCooperativasTotal')) el('cardCooperativasTotal').textContent = cooperativas;
}

/* ─── RELOAD ROUTER INTERNO ─── */
function reloadComprasData() {
  if (currentPage === 'compras') {
    loadGastosStandalone();
  } else if (currentPage === 'proveedores') {
    loadProveedoresStandalone();
  }
}

// ── RENDERIZAR TABLAS ──
function renderGastosList() {
  const tbody = el('gastosTableBody');
  if (!tbody) return;

  if (gastosData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:40px;color:#64748B">Sin registros de compras/gastos aún.<br><small>Registre el primer gasto haciendo clic en "Registrar Gasto / Compra"</small></td></tr>`;
    return;
  }
  renderGastosListFiltered(gastosData);
}

function renderGastosListFiltered(lista) {
  const tbody = el('gastosTableBody');
  if (!tbody) return;
  tbody.innerHTML = lista.map(g => {
    const catColors = {
      'Materia Prima': { bg:'#FFF7ED', color:'#EA580C' },
      'Servicios':    { bg:'#F5F3FF', color:'#7C3AED' },
      'Personal':     { bg:'#EFF6FF', color:'#1D4ED8' },
      'Insumos':      { bg:'#F0FDF4', color:'#15803D' },
      'Otros':        { bg:'#F4F7FA', color:'#64748B' }
    };
    const cat = catColors[g.categoria] || catColors['Otros'];
    return `
    <tr>
      <td><strong style="color:#1E293B">${g.concepto}</strong>${g.proveedor ? `<br><span style="font-size:10px;color:#94A3B8"><i class="ri-truck-line"></i> ${g.proveedor}</span>` : ''}</td>
      <td><span style="font-size:11px;font-weight:700;color:${cat.color};background:${cat.bg};padding:3px 8px;border-radius:4px">${g.categoria}</span></td>
      <td><strong style="color:#DC2626">${L(g.monto)}</strong></td>
      <td style="font-size:12px;color:#64748B">${formatFecha(g.fecha)}</td>
    </tr>
    `;
  }).join('');
}

function filtrarGastosStand() {
  const query = (el('buscarGastoStand')?.value || '').toLowerCase().trim();
  if (!query) {
    renderGastosListFiltered(gastosData);
    return;
  }
  const filtrados = gastosData.filter(g => 
    (g.concepto || '').toLowerCase().includes(query) ||
    (g.categoria || '').toLowerCase().includes(query) ||
    (g.proveedor || '').toLowerCase().includes(query)
  );
  renderGastosListFiltered(filtrados);
}

function renderProveedoresStandaloneList() {
  renderProveedoresStandaloneListFiltered(proveedoresGeneralData);
}

function renderProveedoresStandaloneListFiltered(lista) {
  const tbody = el('proveedoresStandaloneTableBody');
  if (!tbody) return;

  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#64748B">Sin proveedores registrados que coincidan</td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map(p => {
    const tipoColors = {
      'Ganadero':    { bg:'#FFF7ED', color:'#EA580C' },
      'Cooperativa': { bg:'#F0FDF4', color:'#15803D' },
      'Local':       { bg:'#EAF2FB', color:'#003C78' },
      'Regional':    { bg:'#F5F3FF', color:'#7C3AED' }
    };
    const tc = tipoColors[p.tipo] || tipoColors['Local'];
    return `
    <tr>
      <td>
        <strong style="color:#1E293B">${p.nombre}</strong>
      </td>
      <td><span style="font-family:monospace;font-size:12px">${p.rtn || '—'}</span></td>
      <td>${p.telefono || '—'}</td>
      <td><span style="font-size:11px;font-weight:700;color:${tc.color};background:${tc.bg};padding:3px 8px;border-radius:4px">${p.tipo}</span></td>
      <td><span style="font-size:12.5px;color:#475569">${p.direccion || '—'}</span></td>
      <td style="text-align:center;white-space:nowrap">
        <button class="btn-accion" onclick="editProveedor('${p.id}')" title="Editar proveedor"
          style="background:#EAF2FB;color:#003C78;width:28px;height:28px;border-radius:6px;border:none;cursor:pointer;margin:0 2px">
          <i class="ri-edit-line"></i>
        </button>
        <button class="btn-accion" onclick="desactivarProveedor('${p.id}','${p.nombre.replace(/'/g,"\\'")}')" title="Desactivar proveedor"
          style="background:#FEF2F2;color:#DC2626;width:28px;height:28px;border-radius:6px;border:none;cursor:pointer;margin:0 2px">
          <i class="ri-forbid-line"></i>
        </button>
      </td>
    </tr>
    `;
  }).join('');
}

function filtrarProveedoresStand() {
  const query = (el('buscarProveedorStand')?.value || '').toLowerCase().trim();
  if (!query) {
    renderProveedoresStandaloneListFiltered(proveedoresGeneralData);
    return;
  }
  const filtrados = proveedoresGeneralData.filter(p => 
    (p.nombre || '').toLowerCase().includes(query) ||
    (p.rtn || '').toLowerCase().includes(query) ||
    (p.direccion || '').toLowerCase().includes(query)
  );
  renderProveedoresStandaloneListFiltered(filtrados);
}

let editProvId = null;

// ── MODAL PROVEEDOR ──
function openNuevoProveedor() {
  editProvId = null;
  el('formProveedor').reset();
  if (el('tituloModalProveedor')) el('tituloModalProveedor').textContent = 'Nuevo Proveedor';
  if (el('provEstadoBadge')) el('provEstadoBadge').style.display = 'none';
  el('modalProveedor').style.display = 'flex';
}

function closeModalProveedor() {
  el('modalProveedor').style.display = 'none';
  editProvId = null;
}

function editProveedor(id) {
  const p = proveedoresGeneralData.find(x => x.id === id);
  if (!p) return toast('Proveedor no encontrado', 'err');
  editProvId = id;
  if (el('tituloModalProveedor')) el('tituloModalProveedor').textContent = 'Editar Proveedor';
  el('provNombre').value   = p.nombre     || '';
  el('provTelefono').value = p.telefono   || '';
  el('provTipo').value     = p.tipo       || 'Local';
  if (el('provRTN'))       el('provRTN').value = p.rtn || '';
  if (el('provDireccion')) el('provDireccion').value = p.direccion || '';
  if (el('provEstadoBadge')) {
    el('provEstadoBadge').style.display = 'inline-block';
    el('provEstadoBadge').textContent = p.activo ? '✅ Proveedor Activo' : '⛔ Desactivado';
  }
  el('modalProveedor').style.display = 'flex';
}

async function desactivarProveedor(id, nombre) {
  if (!confirm(`¿Desactivar a "${nombre}"?\n\nEl proveedor no se eliminará, solo quedará inactivo.`)) return;
  try {
    await req('DELETE', '/proveedores/' + id);
    toast(`Proveedor "${nombre}" desactivado`, 'ok');
    reloadComprasData();
  } catch(e) {
    toast('Error: ' + e.message, 'err');
  }
}

// Alias para compatibilidad
function deleteProveedor(id) { desactivarProveedor(id, 'este proveedor'); }

async function saveProveedor() {
  const nombre = el('provNombre').value.trim();
  if (!nombre) return toast('El nombre es obligatorio', 'err');

  const body = {
    nombre:    nombre,
    telefono:  el('provTelefono').value.trim(),
    tipo:      el('provTipo').value,
    rtn:       el('provRTN')       ? el('provRTN').value.trim()       : '',
    direccion: el('provDireccion') ? el('provDireccion').value.trim() : '',
    email:     ''
  };

  try {
    const method = editProvId ? 'PUT' : 'POST';
    const url    = editProvId ? '/proveedores/' + editProvId : '/proveedores';
    await req(method, url, body);
    toast(editProvId ? `Proveedor "${nombre}" actualizado ✅` : `Proveedor "${nombre}" registrado ✅`);
    closeModalProveedor();
    reloadComprasData();
  } catch(e) {
    toast('Error: ' + e.message, 'err');
  }
}

// ── MODAL GASTO/COMPRA ──
function openNuevoGasto() {
  el('formGasto').reset();
  
  const sel = el('gsProveedorId');
  if (sel) {
    sel.innerHTML = '<option value="">— Sin proveedor asociado —</option>' + 
                    proveedoresGeneralData.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
  }
  
  el('modalGasto').style.display = 'flex';
}

function closeModalGasto() {
  el('modalGasto').style.display = 'none';
}

async function saveGasto() {
  const concepto = el('gsConcepto').value.trim();
  const monto    = parseFloat(el('gsMonto').value);

  if (!concepto || !monto || monto <= 0) return toast('Concepto y Monto válido son obligatorios', 'err');

  const provId  = el('gsProveedorId')?.value || null;
  const provObj = proveedoresGeneralData.find(p => p.id === provId);
  const body = {
    concepto,
    categoria: el('gsCategoria')?.value || 'Otros',
    monto,
    proveedor: provObj ? provObj.nombre : '',
    fecha: new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  };

  try {
    await req('POST', '/gastos', body);
    toast('Gasto/Compra registrado ✅');
    closeModalGasto();
    reloadComprasData();
  } catch(e) {
    toast('Error: ' + e.message, 'err');
  }
}

function formatFecha(str) {
  if (!str) return '—';
  try {
    const d = new Date(str);
    return d.toLocaleDateString('es-HN', {day:'2-digit', month:'short', year:'numeric'});
  } catch(e) { return str; }
}