let facturacionData = [];

async function loadFacturacion() {
  try {
    const data = await req('GET', '/facturacion');
    facturacionData = data;
    renderFacturacion();
    updateFacResumen();
  } catch (err) {
    toast(err.message, 'err');
  }
}

function updateFacResumen() {
  el('facTotal').textContent = facturacionData.length;
  const monto = facturacionData.reduce((s, f) => s + f.monto, 0);
  el('facMonto').textContent = L(monto);
}

function renderFacturacion() {
  const tbody = el('facturacionTableBody');
  if (!tbody) return;
  
  if (facturacionData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:#64748B">No hay facturas emitidas.</td></tr>`;
    return;
  }
  
  tbody.innerHTML = facturacionData.map(f => `
    <tr>
      <td style="font-weight:600;color:#003C78">${f.numero}</td>
      <td>${f.cliente} <br><small style="color:#64748B">${f.rtn || 'S/N'}</small></td>
      <td style="font-weight:700">${L(f.monto)}</td>
      <td>${f.creadoEn.split('T')[0]}</td>
      <td>
        <button class="btn-accion rojo" onclick="deleteFacturacion('${f.id}')"><i class="ri-delete-bin-line"></i></button>
      </td>
    </tr>
  `).join('');
}

function openNuevaFactura() {
  el('formFacturacion').reset();
  el('modalFacturacion').style.display = 'flex';
}

function closeModalFacturacion() {
  el('modalFacturacion').style.display = 'none';
}

async function saveFacturacion() {
  const cliente = el('facCliente').value;
  const rtn = el('facRtn').value;
  const monto = parseFloat(el('facMontoInput').value) || 0;
  
  if (!cliente || monto <= 0) return toast('Cliente y Monto válidos requeridos', 'err');
  
  const data = { cliente, rtn, monto };

  try {
    await req('POST', '/facturacion', data);
    toast('Factura emitida');
    closeModalFacturacion();
    loadFacturacion();
  } catch (err) {
    toast(err.message, 'err');
  }
}

async function deleteFacturacion(id) {
  if (!confirm('¿Anular esta factura?')) return;
  try {
    await req('DELETE', '/facturacion/' + id);
    toast('Factura anulada');
    loadFacturacion();
  } catch (err) {
    toast(err.message, 'err');
  }
}
