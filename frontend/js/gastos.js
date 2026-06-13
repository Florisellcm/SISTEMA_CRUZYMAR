let gastosData = [];

async function loadGastos() {
  try {
    const data = await req('GET', '/gastos');
    gastosData = data;
    renderGastos();
    updateGastosResumen();
  } catch (err) {
    toast(err.message, 'err');
  }
}

function updateGastosResumen() {
  const total = gastosData.reduce((s, g) => s + g.monto, 0);
  el('gsTotalGeneral').textContent = L(total);
  
  const matPrima = gastosData.filter(g => g.categoria === 'Materia Prima').reduce((s, g) => s + g.monto, 0);
  el('gsMateriaPrima').textContent = L(matPrima);
  
  const serv = gastosData.filter(g => g.categoria === 'Servicios').reduce((s, g) => s + g.monto, 0);
  el('gsServicios').textContent = L(serv);
}

function renderGastos() {
  const cat = el('filtroCategoria')?.value;
  
  let lista = gastosData;
  if (cat) lista = lista.filter(g => g.categoria === cat);

  const tbody = el('gastosTableBody');
  if (!tbody) return;
  
  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#64748B">No hay gastos registrados.</td></tr>`;
    return;
  }
  
  tbody.innerHTML = lista.map(g => `
    <tr>
      <td style="font-weight:600;color:#003C78">${g.concepto}</td>
      <td>${g.categoria}</td>
      <td style="font-weight:700">${L(g.monto)}</td>
      <td>${g.proveedor || '-'}</td>
      <td>${g.comprobante || '-'}</td>
      <td>${g.fecha}</td>
      <td>
        <button class="btn-accion rojo" onclick="deleteGasto('${g.id}')"><i class="ri-delete-bin-line"></i></button>
      </td>
    </tr>
  `).join('');
}

function filtrarGastos() {
  renderGastos();
}

function openNuevoGasto() {
  el('formGasto').reset();
  el('modalGasto').style.display = 'flex';
}

function closeModalGasto() {
  el('modalGasto').style.display = 'none';
}

async function saveGasto() {
  const concepto = el('gsConcepto').value;
  const monto = parseFloat(el('gsMonto').value) || 0;
  
  if (!concepto || monto <= 0) return toast('Concepto y Monto válidos requeridos', 'err');
  
  const data = {
    concepto,
    categoria: el('gsCategoria').value,
    monto,
    proveedor: el('gsProveedor').value,
    fecha: el('gsFecha').value,
    comprobante: el('gsComprobante').value
  };

  try {
    await req('POST', '/gastos', data);
    toast('Gasto registrado');
    closeModalGasto();
    loadGastos();
  } catch (err) {
    toast(err.message, 'err');
  }
}

async function deleteGasto(id) {
  if (!confirm('¿Eliminar este registro de gasto?')) return;
  try {
    await req('DELETE', '/gastos/' + id);
    toast('Gasto eliminado');
    loadGastos();
  } catch (err) {
    toast(err.message, 'err');
  }
}
