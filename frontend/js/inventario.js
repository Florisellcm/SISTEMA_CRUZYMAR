/* ══════════════════════════════════════════════
   CRUZYMAR · inventario.js (Unificado)
   Módulo frontend de Inventario y Movimientos
══════════════════════════════════════════════ */

let inventarioData = [];
let movimientosData = [];

async function loadInventario() {
  try {
    // Cargar stock y movimientos en paralelo
    [inventarioData, movimientosData] = await Promise.all([
      req('GET', '/inventario'),
      req('GET', '/inventario/movimientos')
    ]);
    
    actualizarTarjetasInventario();
    renderStock();
    renderMovimientos();
    poblarSelectMovimiento();
  } catch(e) {
    toast('Error cargando inventario: ' + e.message, 'err');
  }
}

function actualizarTarjetasInventario() {
  let totalProd = inventarioData.length;
  let valor = 0;
  let critico = 0;
  let proximosVencer = 0;

  const hoy = new Date();
  
  inventarioData.forEach(p => {
    valor += (p.stock * p.precio);
    if (p.stock <= p.stock_minimo) critico++;
    
    if (p.fecha_vencimiento) {
      const v = new Date(p.fecha_vencimiento);
      const diff = (v - hoy) / (1000 * 60 * 60 * 24);
      if (diff >= 0 && diff <= 7) proximosVencer++;
    }
  });

  if (el('invTotal')) el('invTotal').textContent = totalProd;
  if (el('invValor')) el('invValor').textContent = L(valor);
  if (el('invStockCritico')) el('invStockCritico').textContent = critico;
  if (el('invVencimientosProximos')) el('invVencimientosProximos').textContent = proximosVencer;
}

function filtrarInventario() {
  const query = (el('buscarProducto')?.value || '').toLowerCase();
  
  let filtrados = inventarioData;
  if (query) {
    filtrados = filtrados.filter(p => p.nombre.toLowerCase().includes(query) || p.categoria.toLowerCase().includes(query));
  }
  
  renderStockList(filtrados);
}

function renderStock() {
  renderStockList(inventarioData);
}

function renderStockList(lista) {
  const tbody = el('inventarioTableBody');
  if (!tbody) return;

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:40px;color:#64748B">No hay productos</td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map(p => {
    const isOk = p.stock > p.stock_minimo;
    const badgeClass = isOk ? 'b-ok' : 'b-err';
    const status = isOk ? 'OK' : 'Crítico';

    return `
    <tr>
      <td><strong>${p.nombre}</strong><br><span style="font-size:10px;color:#94A3B8">${L(p.precio)}</span></td>
      <td>${p.categoria}</td>
      <td><span style="font-size:14px;font-weight:700;color:#003C78">${N(p.stock)} ${p.unidad}</span></td>
      <td><span class="badge ${badgeClass}">${status}</span></td>
    </tr>
    `;
  }).join('');
}

function renderMovimientos() {
  const tbody = el('movimientosTableBody');
  if (!tbody) return;

  if (movimientosData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:40px;color:#64748B">Sin movimientos</td></tr>`;
    return;
  }

  // Mostrar solo los últimos 20 movimientos para no sobrecargar
  const recientes = movimientosData.slice(0, 20);

  tbody.innerHTML = recientes.map(m => {
    const isEntrada = m.tipo === 'Entrada';
    const badgeClass = isEntrada ? 'b-in' : 'b-out';
    const cantColor = isEntrada ? '#0A4A8F' : '#991B1B';
    const signo = isEntrada ? '+' : '-';

    return `
    <tr>
      <td><strong>${m.producto_nombre}</strong><br><span style="font-size:10px;color:#94A3B8">${m.motivo || ''}</span></td>
      <td><span class="badge ${badgeClass}">${m.tipo}</span></td>
      <td><span style="font-size:13px;font-weight:700;color:${cantColor}">${signo}${N(m.cantidad)}</span></td>
      <td style="font-size:11px;color:#64748B">${formatFechaMov(m.fecha)}</td>
    </tr>
    `;
  }).join('');
}

function poblarSelectMovimiento() {
  const sel = el('movProducto');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Seleccionar producto —</option>' + 
                  inventarioData.map(p => `<option value="${p.id}">${p.nombre} (Stock: ${p.stock} ${p.unidad})</option>`).join('');
}

// ── PRODUCTOS ──
function openModalProducto() {
  el('formProducto').reset();
  el('modalProducto').style.display = 'flex';
}

function closeModalProducto() {
  el('modalProducto').style.display = 'none';
}

async function saveProducto() {
  const body = {
    nombre: el('invNombre').value.trim(),
    categoria: el('invCategoria').value,
    unidad: el('invUnidad').value,
    stock: parseFloat(el('invStock').value) || 0,
    stockMinimo: parseFloat(el('invStockMinimo').value) || 0,
    precio: parseFloat(el('invPrecio').value) || 0,
    vencimiento: el('invVencimiento').value || null
  };

  if (!body.nombre) return toast('El nombre es obligatorio', 'err');

  try {
    await req('POST', '/inventario', body);
    toast('Producto registrado');
    closeModalProducto();
    loadInventario();
  } catch(e) {
    toast('Error: ' + e.message, 'err');
  }
}

// ── MOVIMIENTOS ──
function openModalMovimiento() {
  poblarSelectMovimiento();
  el('formMovimiento').reset();
  el('modalMovimiento').style.display = 'flex';
}

function closeModalMovimiento() {
  el('modalMovimiento').style.display = 'none';
}

async function saveMovimiento() {
  const prodId = el('movProducto').value;
  const tipo = el('movTipo').value;
  const cantidad = parseFloat(el('movCantidad').value);
  const motivo = el('movMotivo').value.trim();

  if (!prodId || !cantidad || cantidad <= 0) {
    return toast('Complete los campos obligatorios', 'err');
  }

  // Verificar stock si es salida
  if (tipo === 'Salida') {
    const prod = inventarioData.find(p => p.id === prodId);
    if (prod && cantidad > prod.stock) {
      return toast('Stock insuficiente para esta salida', 'err');
    }
  }

  const body = {
    producto_id: prodId,
    tipo: tipo,
    cantidad: cantidad,
    motivo: motivo || 'Ajuste manual',
    usuario: Auth.user ? Auth.user.nombre : 'Admin',
    fecha: new Date().toISOString()
  };

  try {
    await req('POST', '/inventario/movimientos', body);
    toast('Movimiento registrado');
    closeModalMovimiento();
    loadInventario();
  } catch(e) {
    toast('Error: ' + e.message, 'err');
  }
}

function formatFechaMov(str) {
  if (!str) return '—';
  try {
    const d = new Date(str);
    return d.toLocaleDateString('es-HN', {day:'2-digit', month:'2-digit'}) + ' ' + d.toLocaleTimeString('es-HN', {hour:'2-digit', minute:'2-digit'});
  } catch(e) { return str; }
}