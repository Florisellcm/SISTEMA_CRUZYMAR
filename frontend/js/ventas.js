/* ══════════════════════════════════════════════
   CRUZYMAR · ventas.js
   Módulo de Comercial — Ventas, Clientes
══════════════════════════════════════════════ */

let ventasData      = [];
let clientesData    = [];
let inventarioLista = [];
let itemsVenta      = [];   // carrito de la venta actual

/* ─── CARGAR DATOS ─── */
async function loadVentas() {
  try {
    [ventasData, clientesData, inventarioLista] = await Promise.all([
      req('GET', '/ventas'),
      req('GET', '/clientes'),
      req('GET', '/inventario')
    ]);
    actualizarTarjetasComercial();
    renderVentasList();
    renderClientesList();
  } catch(e) {
    toast('Error cargando datos: ' + e.message, 'err');
  }
}

/* ─── TARJETAS ─── */
function actualizarTarjetasComercial() {
  const hoy = new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  let ventasHoy = 0, ingresosHoy = 0, porCobrar = 0;

  ventasData.forEach(v => {
    if ((v.fecha || '').slice(0, 10) === hoy) {
      ventasHoy++;
      if (v.estado === 'Pagada') ingresosHoy += parseFloat(v.total || 0);
    }
    if (v.estado === 'Pendiente') porCobrar += parseFloat(v.total || 0);
  });

  if (el('vtaVentasDia'))      el('vtaVentasDia').textContent      = ventasHoy;
  if (el('vtaIngresosDia'))    el('vtaIngresosDia').textContent    = L(ingresosHoy);
  if (el('vtaPorCobrar'))      el('vtaPorCobrar').textContent      = L(porCobrar);
  if (el('vtaClientesActivos'))el('vtaClientesActivos').textContent = clientesData.length;
}

/* ─── TABLA VENTAS ─── */
function renderVentasList() {
  const tbody = el('ventasTableBody');
  if (!tbody) return;
  if (!ventasData.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:#64748B">Sin ventas registradas</td></tr>`;
    return;
  }
  tbody.innerHTML = ventasData.map(v => {
    const badgeClass = v.estado === 'Pagada' ? 'b-ok' : v.estado === 'Pendiente' ? 'b-pend' : 'b-err';
    return `<tr>
      <td><strong style="color:#003C78">${v.numero || '—'}</strong><br>
          <span style="font-size:10px;color:#94A3B8">${formatFecha((v.fecha||'').slice(0,10))}</span></td>
      <td>${v.cliente_nombre || 'Consumidor final'}</td>
      <td><strong style="color:#003C78">${L(v.total)}</strong><br>
          <span style="font-size:10px;color:#64748B">${v.metodo_pago || '—'}</span></td>
      <td><span class="badge ${badgeClass}">${v.estado}</span></td>
      <td>
        ${v.estado === 'Pendiente'
          ? `<button class="btn-accion verde" onclick="marcarPagada('${v.id}')" title="Marcar como pagada"><i class="ri-check-line"></i></button>`
          : ''}
        <button class="btn-accion rojo" onclick="cancelarVenta('${v.id}')" title="Cancelar"><i class="ri-close-line"></i></button>
      </td>
    </tr>`;
  }).join('');
}

/* ─── TABLA CLIENTES ─── */
function renderClientesList() {
  const tbody = el('clientesTableBody');
  if (!tbody) return;
  if (!clientesData.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:40px;color:#64748B">Sin clientes registrados</td></tr>`;
    return;
  }
  tbody.innerHTML = clientesData.map(c => `
    <tr>
      <td><strong>${c.nombre}</strong></td>
      <td>${c.telefono || '—'}</td>
      <td><span style="font-size:11px;background:#F4F7FA;padding:3px 8px;border-radius:4px;font-weight:700;color:#64748B">${c.tipo || 'Particular'}</span></td>
      <td>
        <button class="btn-accion rojo" onclick="deleteCliente('${c.id}')" title="Eliminar"><i class="ri-delete-bin-line"></i></button>
      </td>
    </tr>`).join('');
}

/* ─── MODAL CLIENTE ─── */
function openNuevoCliente() {
  el('formCliente').reset();
  el('modalCliente').style.display = 'flex';
}
function closeModalCliente() { el('modalCliente').style.display = 'none'; }

async function saveCliente() {
  const nombre = el('cliNombre')?.value.trim();
  if (!nombre) return toast('El nombre es obligatorio', 'err');
  try {
    await req('POST', '/clientes', {
      nombre,
      rtn:      el('cliRTN')?.value.trim()      || '',
      telefono: el('cliTelefono')?.value.trim() || '',
      tipo:     el('cliTipo')?.value            || 'Particular',
      email:    '',
      direccion:''
    });
    toast('Cliente registrado ✅');
    closeModalCliente();
    loadVentas();
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

async function deleteCliente(id) {
  if (!confirm('¿Eliminar este cliente?')) return;
  try {
    await req('DELETE', `/clientes/${id}`);
    toast('Cliente eliminado');
    loadVentas();
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

/* ─── MODAL VENTA ─── */
function openNuevaVenta() {
  itemsVenta = [];
  el('formVenta')?.reset();

  // Poblar clientes
  const sel = el('vtaClienteId');
  if (sel) {
    sel.innerHTML = '<option value="">— Consumidor final (contado) —</option>' +
      clientesData.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
  }

  // Poblar productos del inventario
  const selProd = el('vtaProductoSel');
  if (selProd) {
    selProd.innerHTML = '<option value="">— Seleccionar producto —</option>' +
      inventarioLista
        .filter(p => p.stock > 0)
        .map(p => `<option value="${p.id}" data-precio="${p.precio}" data-nombre="${p.nombre}" data-stock="${p.stock}">${p.nombre} (Stock: ${p.stock} ${p.unidad||'u.'}) — L. ${parseFloat(p.precio).toFixed(2)}</option>`)
        .join('');
  }

  renderItemsVenta();
  el('modalVenta').style.display = 'flex';
}
function closeModalVenta() { el('modalVenta').style.display = 'none'; }

function agregarItemVenta() {
  const sel = el('vtaProductoSel');
  const cant = parseFloat(el('vtaCantItem')?.value) || 1;
  if (!sel?.value) return toast('Seleccione un producto', 'err');

  const opt = sel.options[sel.selectedIndex];
  const precio = parseFloat(opt.dataset.precio) || 0;
  const stock  = parseFloat(opt.dataset.stock)  || 0;

  if (cant > stock) return toast(`Stock insuficiente. Disponible: ${stock}`, 'err');

  // Si ya está en el carrito, sumar cantidad
  const existe = itemsVenta.find(i => i.producto_id === sel.value);
  if (existe) {
    existe.cantidad += cant;
    existe.subtotal  = existe.cantidad * existe.precio;
  } else {
    itemsVenta.push({
      producto_id: sel.value,
      nombre:      opt.dataset.nombre,
      cantidad:    cant,
      precio,
      subtotal:    cant * precio
    });
  }

  sel.value = '';
  if (el('vtaCantItem')) el('vtaCantItem').value = 1;
  renderItemsVenta();
}

function quitarItemVenta(idx) {
  itemsVenta.splice(idx, 1);
  renderItemsVenta();
}

function renderItemsVenta() {
  const cont = el('vtaItemsList');
  if (!cont) return;
  const total = itemsVenta.reduce((s, i) => s + i.subtotal, 0);

  if (!itemsVenta.length) {
    cont.innerHTML = '<p style="text-align:center;color:#94A3B8;font-size:13px;padding:16px">Sin productos agregados</p>';
  } else {
    cont.innerHTML = itemsVenta.map((i, idx) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F1F5F9">
        <div>
          <span style="font-size:13px;font-weight:600;color:#1E293B">${i.nombre}</span>
          <span style="font-size:11px;color:#94A3B8;margin-left:8px">${i.cantidad} × L. ${i.precio.toFixed(2)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <strong style="color:#003C78">L. ${i.subtotal.toFixed(2)}</strong>
          <button onclick="quitarItemVenta(${idx})" style="width:22px;height:22px;border-radius:4px;border:none;background:#FEE2E2;color:#DC2626;cursor:pointer;font-size:11px">✕</button>
        </div>
      </div>`).join('');
  }

  const totEl = el('vtaTotalCalc');
  if (totEl) totEl.textContent = L(total);
}

async function saveVentaUnificada() {
  if (!itemsVenta.length) return toast('Agregue al menos un producto', 'err');

  const clienteId  = el('vtaClienteId')?.value;
  const metodoPago = el('vtaFormaPago')?.value || 'Efectivo';
  const estado     = el('vtaEstado')?.value    || 'Pagada';

  // Buscar nombre cliente
  let clienteNombre = 'Consumidor final';
  if (clienteId) {
    const c = clientesData.find(x => x.id === clienteId);
    if (c) clienteNombre = c.nombre;
  }

  try {
    const nuevaVenta = await req('POST', '/ventas', {
      clienteId,
      clienteNombre,
      items: itemsVenta,
      metodoPago,
      estado,
      vendedor_id: null
    });

    // Si se marcó generar factura
    if (el('vtaGenerarFactura')?.checked) {
      await req('POST', '/facturacion', {
        venta_id:    nuevaVenta.id,
        cliente_id:  clienteId || null,
        monto_total: nuevaVenta.total,
        fecha:       new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000).toISOString().slice(0, 10)
      });
      toast('Venta y factura registradas ✅');
    } else {
      toast('Venta registrada ✅');
    }

    closeModalVenta();
    loadVentas();
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

async function marcarPagada(id) {
  try {
    await req('PUT', `/ventas/${id}`, { estado: 'Pagada' });
    toast('Venta marcada como pagada ✅');
    loadVentas();
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

async function cancelarVenta(id) {
  if (!confirm('¿Cancelar esta venta?')) return;
  try {
    await req('DELETE', `/ventas/${id}`);
    toast('Venta cancelada');
    loadVentas();
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

function formatFecha(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}