let ventasData = [];

async function loadVentas() {
  try {
    const data = await req('GET', '/ventas');
    ventasData = data;
    renderVentas();
    updateVenResumen();
  } catch (err) {
    toast(err.message, 'err');
  }
}

function updateVenResumen() {
  const hoyStr = new Date().toISOString().split('T')[0];
  const ventasHoy = ventasData.filter(v => v.fecha === hoyStr);
  
  el('venTotalVentas').textContent = ventasHoy.length;
  
  const ingresosHoy = ventasHoy.filter(v => v.estado !== 'Cancelada').reduce((s, v) => s + v.total, 0);
  el('venIngresosHoy').textContent = L(ingresosHoy);
  
  const clientes = new Set(ventasHoy.map(v => v.clienteNombre)).size;
  el('venClientesAtendidos').textContent = clientes;
  
  const canceladas = ventasData.filter(v => v.estado === 'Cancelada').length;
  el('venCanceladas').textContent = canceladas;
}

function renderVentas() {
  const estado = el('filtroVenEstado')?.value;
  const buscar = el('buscarVen')?.value.toLowerCase();
  
  let lista = ventasData;
  if (estado) lista = lista.filter(v => v.estado === estado);
  if (buscar) lista = lista.filter(v => 
    v.clienteNombre.toLowerCase().includes(buscar) || 
    v.numero.toLowerCase().includes(buscar)
  );

  const tbody = el('ventasTableBody');
  if (!tbody) return;
  
  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#64748B">No hay ventas registradas.</td></tr>`;
    return;
  }
  
  tbody.innerHTML = lista.map(v => {
    let estHtml = '<span style="color:#16A34A;font-weight:700">Pagada</span>';
    if (v.estado === 'Cancelada') estHtml = '<span style="color:#DC2626;font-weight:700">Cancelada</span>';
    
    return `
      <tr>
        <td style="font-weight:600;color:#003C78">${v.numero}</td>
        <td>${v.fecha}</td>
        <td>${v.clienteNombre}</td>
        <td style="font-weight:700">${L(v.total)}</td>
        <td>${v.metodoPago}</td>
        <td>${estHtml}</td>
        <td>
          ${v.estado !== 'Cancelada' ? `<button class="btn-accion rojo" onclick="cancelarVenta('${v.id}')" title="Anular"><i class="ri-close-circle-line"></i></button>` : ''}
        </td>
      </tr>
    `;
  }).join('');
}

function filtrarVentas() {
  renderVentas();
}

function openNuevaVenta() {
  el('formVenta').reset();
  el('ventaItemsContainer').innerHTML = `
    <div class="venta-item" style="display:flex;gap:10px;align-items:center">
      <input type="text" class="ven-item-desc" placeholder="Producto" style="flex:2;padding:8px;border:1px solid #E0E9F2;border-radius:6px;font-size:13px">
      <input type="number" class="ven-item-cant" placeholder="Cant." value="1" min="1" style="flex:1;padding:8px;border:1px solid #E0E9F2;border-radius:6px;font-size:13px" oninput="calcularTotalVenta()">
      <input type="number" class="ven-item-precio" placeholder="Precio" value="0.00" min="0" step="0.01" style="flex:1;padding:8px;border:1px solid #E0E9F2;border-radius:6px;font-size:13px" oninput="calcularTotalVenta()">
      <button type="button" onclick="this.parentElement.remove(); calcularTotalVenta()" style="background:none;border:none;color:#DC2626;cursor:pointer"><i class="ri-delete-bin-line"></i></button>
    </div>
  `;
  calcularTotalVenta();
  el('modalVenta').style.display = 'flex';
}

function closeModalVenta() {
  el('modalVenta').style.display = 'none';
}

function addVentaItem() {
  const div = document.createElement('div');
  div.className = 'venta-item';
  div.style.display = 'flex';
  div.style.gap = '10px';
  div.style.alignItems = 'center';
  div.innerHTML = `
    <input type="text" class="ven-item-desc" placeholder="Producto" style="flex:2;padding:8px;border:1px solid #E0E9F2;border-radius:6px;font-size:13px">
    <input type="number" class="ven-item-cant" placeholder="Cant." value="1" min="1" style="flex:1;padding:8px;border:1px solid #E0E9F2;border-radius:6px;font-size:13px" oninput="calcularTotalVenta()">
    <input type="number" class="ven-item-precio" placeholder="Precio" value="0.00" min="0" step="0.01" style="flex:1;padding:8px;border:1px solid #E0E9F2;border-radius:6px;font-size:13px" oninput="calcularTotalVenta()">
    <button type="button" onclick="this.parentElement.remove(); calcularTotalVenta()" style="background:none;border:none;color:#DC2626;cursor:pointer"><i class="ri-delete-bin-line"></i></button>
  `;
  el('ventaItemsContainer').appendChild(div);
}

function calcularTotalVenta() {
  let total = 0;
  document.querySelectorAll('.venta-item').forEach(item => {
    const cant = parseFloat(item.querySelector('.ven-item-cant').value) || 0;
    const precio = parseFloat(item.querySelector('.ven-item-precio').value) || 0;
    total += (cant * precio);
  });
  el('venTotalPreview').textContent = L(total);
}

async function saveVenta() {
  const clienteNombre = el('venClienteNombre').value || 'Consumidor Final';
  const metodoPago = el('venMetodoPago').value;
  
  const items = [];
  document.querySelectorAll('.venta-item').forEach(item => {
    const desc = item.querySelector('.ven-item-desc').value;
    const cant = parseFloat(item.querySelector('.ven-item-cant').value) || 0;
    const precio = parseFloat(item.querySelector('.ven-item-precio').value) || 0;
    if (desc && cant > 0 && precio > 0) {
      items.push({ descripcion: desc, cantidad: cant, precio });
    }
  });

  if (items.length === 0) return toast('Agregue al menos un producto válido', 'err');

  try {
    await req('POST', '/ventas', { clienteNombre, metodoPago, items });
    toast('Venta registrada');
    closeModalVenta();
    loadVentas();
  } catch (err) {
    toast(err.message, 'err');
  }
}

async function cancelarVenta(id) {
  if (!confirm('¿Anular esta venta?')) return;
  try {
    await req('DELETE', '/ventas/' + id);
    toast('Venta anulada');
    loadVentas();
  } catch (err) {
    toast(err.message, 'err');
  }
}
