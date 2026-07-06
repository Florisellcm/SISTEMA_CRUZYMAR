/* ══════════════════════════════════════════════
   CRUZYMAR · ventas.js
   Módulo de Comercial — Ventas, Clientes, Factura SAR
   Empresa: CRUZYMAR Productos Lácteos S. de R.L.
   Victoria, Yoro, Honduras
══════════════════════════════════════════════ */

let ventasData      = [];
let clientesData    = [];
let inventarioLista = [];
let itemsVenta      = [];   // carrito de la venta actual
let editCliId       = null; // ID del cliente en edición

/* ─── CARGAR DATOS GENERALES (Compatibilidad) ───
   Nota: _currentPage (con guion bajo) es la variable global real que
   declara app.js. Usar "currentPage" (sin guion bajo) revienta con un
   ReferenceError apenas se evalúa, y la tabla se queda pegada para
   siempre en "Cargando..." porque la función nunca llega a ejecutar
   loadVentasStandalone(). */
async function loadVentas() {
  try {
    if (_currentPage === 'clientes') {
      await loadClientesStandalone();
    } else {
      await loadVentasStandalone();
    }
  } catch (e) {
    toast('Error cargando el módulo: ' + e.message, 'err');
  }
}

/* ─── CARGAR VENTAS (STANDALONE) ─── */
async function loadVentasStandalone() {
  try {
    [ventasData, clientesData, inventarioLista] = await Promise.all([
      req('GET', '/ventas'),
      req('GET', '/clientes'),
      req('GET', '/inventario')
    ]);
    actualizarTarjetasComercial();
    renderVentasList();
  } catch(e) {
    toast('Error cargando ventas: ' + e.message, 'err');
  }
}

/* ─── CARGAR CLIENTES (STANDALONE) ─── */
async function loadClientesStandalone() {
  try {
    clientesData = await req('GET', '/clientes');
    actualizarTarjetasClientes();
    renderClientesStandaloneList();
  } catch(e) {
    toast('Error cargando clientes: ' + e.message, 'err');
  }
}

/* ─── ACTUALIZACIÓN DE TARJETAS ─── */
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

  if (el('vtaVentasDia'))       el('vtaVentasDia').textContent       = ventasHoy;
  if (el('vtaIngresosDia'))     el('vtaIngresosDia').textContent     = L(ingresosHoy);
  if (el('vtaPorCobrar'))       el('vtaPorCobrar').textContent       = L(porCobrar);
}

function actualizarTarjetasClientes() {
  const total = clientesData.length;
  const negocios = clientesData.filter(c => c.tipo !== 'Particular').length;
  const conRTN = clientesData.filter(c => c.rtn && c.rtn.trim()).length;

  if (el('cardTotalClientes'))     el('cardTotalClientes').textContent     = total;
  if (el('cardClientesNegocios'))  el('cardClientesNegocios').textContent  = negocios;
  if (el('cardClientesRTN'))       el('cardClientesRTN').textContent       = conRTN;
}

/* ─── RELOAD ROUTER INTERNO ───
   Mismo fix: _currentPage (con guion bajo), no currentPage. */
function reloadComercialData() {
  if (_currentPage === 'comercial') {
    loadVentasStandalone();
  } else if (_currentPage === 'clientes') {
    loadClientesStandalone();
  }
}

/* ─── TABLA VENTAS ─── */
function renderVentasList() {
  const tbody = el('ventasTableBody');
  if (!tbody) return;
  if (!ventasData.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#64748B">Sin ventas registradas en el sistema.<br><small>Registre una venta haciendo clic en "Registrar Venta"</small></td></tr>`;
    return;
  }
  renderVentasListFiltered(ventasData);
}

function renderVentasListFiltered(lista) {
  const tbody = el('ventasTableBody');
  if (!tbody) return;
  tbody.innerHTML = lista.map(v => {
    const badgeClass = v.estado === 'Pagada' ? 'b-ok' : v.estado === 'Pendiente' ? 'b-pend' : 'b-err';
    const esReparto  = v.tipo_entrega === 'Reparto';
    return `<tr>
      <td><strong style="color:#003C78">${v.numero || '—'}</strong></td>
      <td style="font-size:12px;color:#64748B">${formatFecha((v.fecha||'').slice(0,10))}</td>
      <td>
        <strong>${v.cliente_nombre || 'Consumidor final'}</strong><br>
        <span style="font-size:10px;font-weight:700;color:${esReparto ? '#0A6BC4' : '#94A3B8'}">
          ${esReparto ? 'Reparto' : 'Local'}
        </span>
      </td>
      <td><span style="font-size:12px;color:#64748B">${v.metodo_pago || '—'}</span></td>
      <td><strong style="color:#003C78">${L(v.total)}</strong></td>
      <td><span class="badge ${badgeClass}">${v.estado}</span></td>
      <td style="text-align:center;white-space:nowrap">
        <button class="btn-accion" onclick="imprimirFactura('${v.id}')" title="Ver / Imprimir Factura SAR"
          style="background:#EAF2FB;color:#003C78;width:28px;height:28px;border-radius:6px;border:none;cursor:pointer;margin:0 2px">
          <i class="ri-file-text-line"></i>
        </button>
        ${v.estado === 'Pendiente'
          ? `<button class="btn-accion" onclick="marcarPagada('${v.id}')" title="Marcar como pagada"
              style="background:#DCFCE7;color:#15803D;width:28px;height:28px;border-radius:6px;border:none;cursor:pointer;margin:0 2px">
              <i class="ri-check-line"></i>
             </button>`
          : ''}
        <button class="btn-accion" onclick="cancelarVenta('${v.id}')" title="Cancelar venta"
          style="background:#FEE2E2;color:#DC2626;width:28px;height:28px;border-radius:6px;border:none;cursor:pointer;margin:0 2px">
          <i class="ri-close-line"></i>
        </button>
      </td>
    </tr>`;
  }).join('');
}

function filtrarVentasStand() {
  const query = (el('buscarVentaStand')?.value || '').toLowerCase().trim();
  if (!query) {
    renderVentasListFiltered(ventasData);
    return;
  }
  const filtrados = ventasData.filter(v => 
    (v.numero || '').toLowerCase().includes(query) ||
    (v.cliente_nombre || '').toLowerCase().includes(query) ||
    (v.metodo_pago || '').toLowerCase().includes(query)
  );
  renderVentasListFiltered(filtrados);
}

/* ─── TABLA CLIENTES (STANDALONE) ─── */
function renderClientesStandaloneList() {
  renderClientesStandaloneListFiltered(clientesData);
}

function renderClientesStandaloneListFiltered(lista) {
  const tbody = el('clientesStandaloneTableBody');
  if (!tbody) return;
  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#64748B">Sin clientes registrados que coincidan</td></tr>`;
    return;
  }
  const tipoColors = {
    'Pulpería':      { bg:'#FFF7ED', color:'#EA580C' },
    'Supermercado':  { bg:'#EAF2FB', color:'#003C78' },
    'Restaurante':   { bg:'#F5F3FF', color:'#7C3AED' },
    'Empresa':       { bg:'#F0FDF4', color:'#15803D' },
    'Distribuidor':  { bg:'#FEF3C7', color:'#D97706' },
    'Particular':    { bg:'#F4F7FA', color:'#64748B' }
  };
  /* Zonas de reparto reales de CRUZYMAR:
     - Local: Victoria, Yoro y alrededores cercanos
     - Aldea: aldeas rurales alrededor de Victoria
     - Yoro:  resto del departamento de Yoro
     - Norte: zona norte del país (San Pedro Sula y alrededores) */
  const zonaColors = {
    'Local':  { bg:'#EAF2FB', color:'#003C78' },
    'Aldea':  { bg:'#F0FDF4', color:'#15803D' },
    'Yoro':   { bg:'#FEF3C7', color:'#D97706' },
    'Norte':  { bg:'#F5F3FF', color:'#7C3AED' }
  };
  tbody.innerHTML = lista.map(c => {
    const tc = tipoColors[c.tipo] || tipoColors['Particular'];
    const zc = zonaColors[c.zona] || zonaColors['Local'];
    return `
    <tr>
      <td><strong style="color:#1E293B">${c.nombre}</strong></td>
      <td><span style="font-family:monospace;font-size:12px">${c.rtn || '—'}</span></td>
      <td>${c.telefono || '—'}</td>
      <td><span style="font-size:11px;font-weight:700;color:${tc.color};background:${tc.bg};padding:3px 8px;border-radius:4px">${c.tipo || 'Particular'}</span></td>
      <td><span style="font-size:11px;font-weight:700;color:${zc.color};background:${zc.bg};padding:3px 8px;border-radius:4px">${c.zona || 'Local'}</span></td>
      <td><span style="font-size:12.5px;color:#475569">${c.direccion || '—'}</span></td>
      <td style="text-align:center;white-space:nowrap">
        <button class="btn-accion" onclick="editCliente('${c.id}')" title="Editar cliente"
          style="background:#EAF2FB;color:#003C78;width:28px;height:28px;border-radius:6px;border:none;cursor:pointer;margin:0 2px">
          <i class="ri-edit-line"></i>
        </button>
        <button class="btn-accion" onclick="desactivarCliente('${c.id}','${c.nombre.replace(/'/g,"\\'")}')" title="Desactivar cliente"
          style="background:#FEE2E2;color:#DC2626;width:28px;height:28px;border-radius:6px;border:none;cursor:pointer;margin:0 2px">
          <i class="ri-forbid-line"></i>
        </button>
      </td>
    </tr>`;
  }).join('');
}

function filtrarClientesStand() {
  const query = (el('buscarClienteStand')?.value || '').toLowerCase().trim();
  if (!query) {
    renderClientesStandaloneListFiltered(clientesData);
    return;
  }
  const filtrados = clientesData.filter(c => 
    (c.nombre || '').toLowerCase().includes(query) ||
    (c.rtn || '').toLowerCase().includes(query) ||
    (c.direccion || '').toLowerCase().includes(query) ||
    (c.zona || '').toLowerCase().includes(query)
  );
  renderClientesStandaloneListFiltered(filtrados);
}

/* ─── MODAL CLIENTE ─── */
function openNuevoCliente() {
  editCliId = null;
  el('formCliente').reset();
  if (el('tituloModalCliente')) el('tituloModalCliente').textContent = 'Nuevo Cliente';
  if (el('cliZona')) el('cliZona').value = 'Local'; // valor por defecto
  el('modalCliente').style.display = 'flex';
}

function closeModalCliente() {
  el('modalCliente').style.display = 'none';
  editCliId = null;
}

function editCliente(id) {
  const c = clientesData.find(x => x.id === id);
  if (!c) return toast('Cliente no encontrado', 'err');
  editCliId = id;
  if (el('tituloModalCliente')) el('tituloModalCliente').textContent = 'Editar Cliente';
  el('cliNombre').value           = c.nombre    || '';
  el('cliTelefono').value         = c.telefono  || '';
  el('cliTipo').value             = c.tipo      || 'Particular';
  el('cliRTN').value              = c.rtn       || '';
  if (el('cliDireccion')) el('cliDireccion').value = c.direccion || '';
  if (el('cliZona'))      el('cliZona').value      = c.zona      || 'Local';
  el('modalCliente').style.display = 'flex';
}

async function saveCliente() {
  const nombre = el('cliNombre')?.value.trim();
  if (!nombre) return toast('El nombre es obligatorio', 'err');

  const body = {
    nombre,
    rtn:       el('cliRTN')?.value.trim()       || '',
    telefono:  el('cliTelefono')?.value.trim()  || '',
    tipo:      el('cliTipo')?.value              || 'Particular',
    direccion: el('cliDireccion')?.value.trim() || '',
    zona:      el('cliZona')?.value              || 'Local',
    email:     ''
  };

  try {
    const method = editCliId ? 'PUT' : 'POST';
    const url    = editCliId ? `/clientes/${editCliId}` : '/clientes';
    await req(method, url, body);
    toast(editCliId ? `Cliente "${nombre}" actualizado ✅` : `Cliente "${nombre}" registrado ✅`);
    closeModalCliente();
    reloadComercialData();
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

async function desactivarCliente(id, nombre) {
  if (!confirm(`¿Desactivar a "${nombre}"?\n\nEl cliente no se eliminará, solo quedará inactivo.`)) return;
  try {
    await req('DELETE', `/clientes/${id}`);
    toast(`Cliente "${nombre}" desactivado`);
    reloadComercialData();
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

// Alias para compatibilidad
function deleteCliente(id) { desactivarCliente(id, 'este cliente'); }

/* ─── ZONA AUTOMÁTICA AL ELEGIR "REPARTO" ───
   Cuando el vendedor marca tipo_entrega = 'Reparto', se muestra la
   zona del cliente seleccionado (tomada de clientesData, la misma
   que usa distribucionModel.js para separar la hoja de ruta). Si no
   hay cliente elegido (venta a "Consumidor final"), se avisa que se
   asumirá "Local" por defecto. La zona NO se guarda en la venta: se
   sigue leyendo del cliente al momento de generar la hoja de ruta. */
function actualizarZonaEntrega() {
  const tipoEntrega = el('vtaTipoEntrega')?.value;
  const infoBox = el('vtaZonaInfo');
  if (!infoBox) return;

  if (tipoEntrega !== 'Reparto') {
    infoBox.style.display = 'none';
    infoBox.innerHTML = '';
    return;
  }

  const clienteId = el('vtaClienteId')?.value;
  const cliente = clientesData.find(c => c.id === clienteId);
  const zonaColors = {
    Local: { bg:'#EAF2FB', color:'#003C78' },
    Aldea: { bg:'#F0FDF4', color:'#15803D' },
    Yoro:  { bg:'#FEF3C7', color:'#D97706' },
    Norte: { bg:'#F5F3FF', color:'#7C3AED' }
  };

  infoBox.style.display = 'block';

  if (!cliente) {
    infoBox.innerHTML = `
      <div style="background:#FEF3C7;color:#92400E;padding:8px 12px;border-radius:8px;font-size:12px;font-weight:600">
        <i class="ri-alert-line"></i> Seleccioná un cliente registrado para conocer su zona (si no, se asume "Local").
      </div>`;
    return;
  }

  const zona = cliente.zona || 'Local';
  const zc = zonaColors[zona] || zonaColors.Local;
  infoBox.innerHTML = `
    <div style="background:${zc.bg};color:${zc.color};padding:8px 12px;border-radius:8px;font-size:12.5px;font-weight:700;display:flex;align-items:center;gap:6px">
      <i class="ri-map-pin-line"></i> Zona de reparto: ${zona}
    </div>`;
}

/* ─── MODAL VENTA ─── */
function openNuevaVenta() {
  itemsVenta = [];
  el('formVenta')?.reset();
  if (el('vtaTipoEntrega')) el('vtaTipoEntrega').value = 'Local';

  // Poblar clientes
  const sel = el('vtaClienteId');
  if (sel) {
    sel.innerHTML = '<option value="">— Consumidor final (contado) —</option>' +
      clientesData.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
    sel.onchange = actualizarZonaEntrega;
  }
  if (el('vtaTipoEntrega')) el('vtaTipoEntrega').onchange = actualizarZonaEntrega;

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
  actualizarZonaEntrega();
  el('modalVenta').style.display = 'flex';
}
function closeModalVenta() { el('modalVenta').style.display = 'none'; }

function agregarItemVenta() {
  const sel  = el('vtaProductoSel');
  const cant = parseFloat(el('vtaCantItem')?.value) || 1;
  if (!sel?.value) return toast('Seleccione un producto', 'err');

  const opt   = sel.options[sel.selectedIndex];
  const precio= parseFloat(opt.dataset.precio) || 0;
  const stock = parseFloat(opt.dataset.stock)  || 0;

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

  const clienteId    = el('vtaClienteId')?.value;
  const metodoPago   = el('vtaFormaPago')?.value    || 'Efectivo';
  const estado       = el('vtaEstado')?.value       || 'Pagada';
  const tipoEntrega  = el('vtaTipoEntrega')?.value   || 'Local';

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
      tipoEntrega,
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
      toast(tipoEntrega === 'Reparto'
        ? 'Venta y factura SAR generadas ✅ — se agregó a la hoja de ruta del día'
        : 'Venta y factura SAR generadas ✅');
      closeModalVenta();
      reloadComercialData();
      // Abrir factura automáticamente
      setTimeout(() => imprimirFactura(nuevaVenta.id), 400);
    } else {
      toast(tipoEntrega === 'Reparto'
        ? 'Venta registrada ✅ — se agregó a la hoja de ruta del día'
        : 'Venta registrada ✅');
      closeModalVenta();
      reloadComercialData();
    }
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

/* ─── MARCAR PAGADA / CANCELAR ─── */
async function marcarPagada(id) {
  try {
    await req('PUT', `/ventas/${id}`, { estado: 'Pagada' });
    toast('Venta marcada como pagada ✅');
    reloadComercialData();
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

async function cancelarVenta(id) {
  if (!confirm('¿Cancelar esta venta? La operación no se puede deshacer.')) return;
  try {
    await req('DELETE', `/ventas/${id}`);
    toast('Venta cancelada');
    reloadComercialData();
  } catch(e) { toast('Error: ' + e.message, 'err'); }
}

/* ─── FACTURA SAR (Honduras) ───
   IMPORTANTE: si la venta se registró SIN marcar "Generar factura SAR
   automáticamente", todavía no existe ninguna fila en `facturacion` para
   ella. Antes, en ese caso, esta función caía en un fallback que mostraba
   el NÚMERO DE LA VENTA (ej. "VTA-0007") como si fuera el número de
   factura. Ahora, si no existe factura todavía, se genera aquí mismo
   contra POST /facturacion, que le asigna su propio ID y su propio
   número secuencial (FAC-000N) de la tabla `facturacion` — nunca
   reutiliza el de la venta. */
async function imprimirFactura(ventaId) {
  try {
    // Cargar detalle de la venta (incluye items)
    const venta = await req('GET', `/ventas/${ventaId}`);
    if (!venta) return toast('Venta no encontrada', 'err');

    // Intentar cargar factura ya asociada a esta venta
    let facturas = [];
    try { facturas = await req('GET', '/facturacion'); } catch(_) {}
    let factura = facturas.find(f => f.venta_id === ventaId) || null;

    // Si aún no tiene factura, la generamos ahora con su propio ID/número
    if (!factura) {
      factura = await req('POST', '/facturacion', {
        venta_id:    venta.id,
        cliente_id:  venta.cliente_id || null,
        monto_total: venta.total,
        fecha:       (venta.fecha || '').slice(0, 10)
      });
      toast('Factura SAR generada ✅');
    }

    // Número de documento — SIEMPRE el propio de la factura, nunca el de la venta
    const numero = factura.numero || '—';
    const fechaDoc = (venta.fecha || '').slice(0, 10);

    // Rellenar encabezado
    if (el('facNumero'))   el('facNumero').textContent   = numero;
    if (el('facFecha'))    el('facFecha').textContent    = formatFecha(fechaDoc);
    if (el('facMetodoPago')) el('facMetodoPago').textContent = venta.metodo_pago || 'Efectivo';

    // Datos del cliente
    const clienteNombre = venta.cliente_nombre || 'Consumidor Final';
    const clienteRTN    = venta.cliente_rtn    || '—';
    const clienteTel    = venta.cliente_tel    || '';
    if (el('facClienteNombre')) el('facClienteNombre').textContent = clienteNombre;
    if (el('facClienteRTN'))    el('facClienteRTN').textContent    = clienteRTN;
    if (el('facClienteTel'))    el('facClienteTel').textContent    = clienteTel ? `Tel: ${clienteTel}` : '';

    // Items de la venta
    const items = venta.items || [];
    const subtotalSinISV = items.reduce((s, i) => s + (parseFloat(i.subtotal) || parseFloat(i.cantidad) * parseFloat(i.precio)), 0) / 1.15;
    const isv            = subtotalSinISV * 0.15;
    const totalConISV    = subtotalSinISV + isv;

    const tbody = el('facItemsBody');
    if (tbody) {
      if (items.length) {
        tbody.innerHTML = items.map((i, idx) => {
          const sub = parseFloat(i.subtotal) || parseFloat(i.cantidad) * parseFloat(i.precio);
          const precioSinISV = parseFloat(i.precio) / 1.15;
          const subSinISV    = sub / 1.15;
          const bg = idx % 2 === 0 ? '#fff' : '#F8FAFC';
          return `<tr style="background:${bg}">
            <td style="padding:7px 12px;border-bottom:1px solid #F1F5F9">${i.nombre || i.producto}</td>
            <td style="padding:7px 10px;text-align:center;border-bottom:1px solid #F1F5F9">${parseFloat(i.cantidad).toFixed(2)}</td>
            <td style="padding:7px 10px;text-align:right;border-bottom:1px solid #F1F5F9">L. ${precioSinISV.toFixed(2)}</td>
            <td style="padding:7px 12px;text-align:right;border-bottom:1px solid #F1F5F9;font-weight:600">L. ${subSinISV.toFixed(2)}</td>
          </tr>`;
        }).join('');
      } else {
        // Fallback si no hay items detallados
        tbody.innerHTML = `<tr>
          <td style="padding:7px 12px">Total de la venta</td>
          <td style="padding:7px 10px;text-align:center">1</td>
          <td style="padding:7px 10px;text-align:right">L. ${(parseFloat(venta.total)/1.15).toFixed(2)}</td>
          <td style="padding:7px 12px;text-align:right;font-weight:600">L. ${(parseFloat(venta.total)/1.15).toFixed(2)}</td>
        </tr>`;
      }
    }

    // Totales con ISV
    if (el('facSubtotal')) el('facSubtotal').textContent = `L. ${subtotalSinISV.toFixed(2)}`;
    if (el('facISV'))      el('facISV').textContent      = `L. ${isv.toFixed(2)}`;
    if (el('facTotal'))    el('facTotal').textContent    = `L. ${totalConISV.toFixed(2)}`;

    // Vendedor
  // Vendedor (temporal)
if (el('facVendedor')) {
  el('facVendedor').textContent = 'Atendido por: Vendedor';
}

    // Mostrar modal
    el('modalFactura').style.display = 'flex';

    // Refrescar el listado para reflejar la factura recién asociada
    reloadComercialData();

  } catch(e) {
    toast('Error cargando factura: ' + e.message, 'err');
  }
}

function closeModalFactura() {
  const m = el('modalFactura');
  if (m) m.style.display = 'none';
}

/* ─── UTILITARIOS ─── */
function formatFecha(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}