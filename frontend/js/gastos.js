/* ══════════════════════════════════════════════
   CRUZYMAR · gastos.js (Unificado Compras)
   Módulo frontend de Gastos y Proveedores
══════════════════════════════════════════════ */

let gastosData = [];
let proveedoresGeneralData = [];

async function loadGastos() {
  try {
    [gastosData, proveedoresGeneralData] = await Promise.all([
      req('GET', '/gastos'),
      req('GET', '/proveedores')
    ]);
    
    actualizarTarjetasCompras();
    renderGastosList();
    renderProveedoresList();
  } catch(e) {
    toast('Error cargando compras: ' + e.message, 'err');
  }
}

// ── ACTUALIZAR TARJETAS ──
function actualizarTarjetasCompras() {
  let totalEgresos = 0, materiaPrima = 0, servicios = 0;

  gastosData.forEach(g => {
    totalEgresos += g.monto;
    if (g.categoria === 'Materia Prima') materiaPrima += g.monto;
    if (g.categoria === 'Servicios') servicios += g.monto;
  });

  if (el('gsTotalGeneral')) el('gsTotalGeneral').textContent = L(totalEgresos);
  if (el('gsMateriaPrima')) el('gsMateriaPrima').textContent = L(materiaPrima);
  if (el('gsServicios')) el('gsServicios').textContent = L(servicios);
  if (el('provTotal')) el('provTotal').textContent = proveedoresGeneralData.length;
}

// ── RENDERIZAR TABLAS ──
function renderGastosList() {
  const tbody = el('gastosTableBody');
  if (!tbody) return;

  if (gastosData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:40px;color:#64748B">Sin registros de compras/gastos</td></tr>`;
    return;
  }

  tbody.innerHTML = gastosData.map(g => {
    return `
    <tr>
      <td><strong>${g.concepto}</strong></td>
      <td><span style="font-size:11px;font-weight:700;color:#64748B;background:#F4F7FA;padding:3px 8px;border-radius:4px">${g.categoria}</span></td>
      <td><strong style="color:#DC2626">${L(g.monto)}</strong></td>
      <td style="font-size:12px;color:#64748B">${formatFecha(g.fecha)}</td>
    </tr>
    `;
  }).join('');
}

function renderProveedoresList() {
  const tbody = el('proveedoresTableBody');
  if (!tbody) return;

  if (proveedoresGeneralData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:40px;color:#64748B">Sin proveedores</td></tr>`;
    return;
  }

  tbody.innerHTML = proveedoresGeneralData.map(p => {
    return `
    <tr>
      <td><strong>${p.nombre}</strong></td>
      <td>${p.telefono || '—'}</td>
      <td><span style="font-size:11px;font-weight:700;color:#003C78;background:#EAF2FB;padding:3px 8px;border-radius:4px">${p.tipo}</span></td>
    </tr>
    `;
  }).join('');
}

// ── MODAL PROVEEDOR ──
function openNuevoProveedor() {
  el('formProveedor').reset();
  el('modalProveedor').style.display = 'flex';
}

function closeModalProveedor() {
  el('modalProveedor').style.display = 'none';
}

async function saveProveedor() {
  const nombre = el('provNombre').value.trim();
  if (!nombre) return toast('Nombre es obligatorio', 'err');

  const body = {
    nombre: nombre,
    telefono: el('provTelefono').value.trim(),
    tipo: el('provTipo').value,
    email: '',
    direccion: ''
  };

  try {
    await req('POST', '/proveedores', body);
    toast('Proveedor registrado');
    closeModalProveedor();
    loadGastos();
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
  const monto = parseFloat(el('gsMonto').value);

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
    loadGastos();
  } catch(e) {
    toast('Error: ' + e.message, 'err');
  }
}

function formatFecha(str) {
  if (!str) return '—';
  try {
    const d = new Date(str);
    return d.toLocaleDateString('es-HN', {day:'2-digit', month:'2-digit'});
  } catch(e) { return str; }
}