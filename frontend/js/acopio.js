/* ══════════════════════════════════════════════
   CRUZYMAR · acopio.js
   Módulo frontend de Acopio de Leche
══════════════════════════════════════════════ */

let acopioData     = [];
let proveedoresList = [];
let acopioEditId   = null;
let acopioChartObj = null;

// ── CARGAR MÓDULO ─────────────────────────────
async function loadAcopio() {
  try {
    proveedoresList = await req('GET', '/proveedores');
    await cargarResumenAcopio();
    await cargarRegistrosAcopio();
    renderGraficaAcopio();
  } catch(e) {
    toast('Error cargando acopio: ' + e.message, 'err');
  }
}

// ── RESUMEN DEL DÍA ───────────────────────────
async function cargarResumenAcopio() {
  try {
    const fecha = el('filtroFechaAcopio')?.value || new Date().toISOString().slice(0, 10);
    const r = await req('GET', '/acopio/resumen?fecha=' + fecha);
    if (el('acopioTotalLitros'))    el('acopioTotalLitros').textContent    = N(r.total_litros)  + ' L';
    if (el('acopioTotalPagar'))     el('acopioTotalPagar').textContent     = L(r.total_pagar);
    if (el('acopioCantProveedores')) el('acopioCantProveedores').textContent = r.cant_proveedores;
    if (el('acopioRegistros'))      el('acopioRegistros').textContent      = r.registros;
  } catch(e) { /* silencioso */ }
}

// ── CARGAR REGISTROS ──────────────────────────
async function cargarRegistrosAcopio() {
  try {
    const fecha = el('filtroFechaAcopio')?.value || '';
    const url   = fecha ? `/acopio?fecha=${fecha}` : '/acopio';
    acopioData  = await req('GET', url);
    renderAcopioTabla(acopioData);
  } catch(e) {
    toast('Error: ' + e.message, 'err');
  }
}

// ── RENDERIZAR TABLA ──────────────────────────
function renderAcopioTabla(lista) {
  const tbody = el('acopioTableBody');
  if (!tbody) return;

  if (!lista || lista.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="9" style="text-align:center;padding:50px;color:#64748B">
        <div style="font-size:36px;margin-bottom:10px">🥛</div>
        <div style="font-weight:600">Sin registros de acopio</div>
        <div style="font-size:12px;margin-top:4px">Registra la primera entrega del día</div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map(r => {
    const tempColor = r.temperatura !== null
      ? (r.temperatura <= 6 ? '#16A34A' : r.temperatura <= 10 ? '#D97706' : '#DC2626')
      : '#64748B';
    const tempBg = r.temperatura !== null
      ? (r.temperatura <= 6 ? '#F0FDF4' : r.temperatura <= 10 ? '#FFFBEB' : '#FEF2F2')
      : '#F4F7FA';

    return `
    <tr>
      <td><strong>${r.proveedor_nombre || '—'}</strong></td>
      <td>
        <span style="font-size:15px;font-weight:700;color:#003C78">${N(r.litros)}</span>
        <span style="font-size:11px;color:#64748B"> L</span>
      </td>
      <td>
        ${r.temperatura !== null
          ? `<span style="padding:3px 9px;border-radius:20px;font-size:12px;font-weight:700;background:${tempBg};color:${tempColor}">${r.temperatura}°C</span>`
          : '<span style="color:#94A3B8">—</span>'}
      </td>
      <td>${L(r.precio_litro)}</td>
      <td><strong style="color:#003C78">${L(r.total_pagar)}</strong></td>
      <td>
        <span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;
          background:${r.turno==='Mañana'?'#EAF2FB':'#F5F3FF'};
          color:${r.turno==='Mañana'?'#0A4A8F':'#6D28D9'}">
          <i class="ri-${r.turno==='Mañana'?'sun':'moon'}-line"></i> ${r.turno}
        </span>
      </td>
      <td style="font-size:12px;color:#64748B">${formatFecha(r.fecha)}</td>
      <td style="font-size:12px;color:#94A3B8;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
          title="${r.observaciones || ''}">${r.observaciones || '—'}</td>
      <td>
        <div style="display:flex;gap:5px">
          <button class="btn-accion azul" onclick="editAcopio('${r.id}')" title="Editar">
            <i class="ri-pencil-line"></i>
          </button>
          <button class="btn-accion rojo" onclick="deleteAcopio('${r.id}')" title="Eliminar">
            <i class="ri-delete-bin-line"></i>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ── GRÁFICA DE BARRAS ─────────────────────────
function renderGraficaAcopio() {
  const canvas = el('graficaAcopio');
  if (!canvas || typeof Chart === 'undefined') return;

  // Agrupar litros por proveedor
  const agrupado = {};
  acopioData.forEach(r => {
    agrupado[r.proveedor_nombre] = (agrupado[r.proveedor_nombre] || 0) + r.litros;
  });

  const labels = Object.keys(agrupado);
  const data   = Object.values(agrupado);

  if (acopioChartObj) acopioChartObj.destroy();

  acopioChartObj = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Litros',
        data,
        backgroundColor: labels.map((_, i) => `hsl(${210 + i * 25}, 70%, ${55 + i * 5}%)`),
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${N(ctx.raw)} litros`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: '#F0F4F8' },
          ticks: { callback: v => N(v) + ' L', font: { size: 11 } }
        },
        x: {
          grid: { display: false },
          ticks: { font: { size: 11 } }
        }
      }
    }
  });
}

// ── ABRIR MODAL NUEVO ─────────────────────────
function openNuevoAcopio() {
  acopioEditId = null;
  el('modalAcopioTitulo').textContent = 'Registrar Entrega';
  el('formAcopio').reset();
  // Fecha por defecto: hoy
  el('acopioFecha').value = new Date().toISOString().slice(0, 10);
  // Poblar select proveedores
  poblarSelectProveedor();
  // Calcular total al inicio
  calcularTotalAcopio();
  el('modalAcopio').style.display = 'flex';
}

// ── POBLAR SELECT PROVEEDORES ─────────────────
function poblarSelectProveedor() {
  const sel = el('acopioProveedorId');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Seleccionar proveedor —</option>' +
    proveedoresList.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
}

// ── CALCULAR TOTAL ────────────────────────────
function calcularTotalAcopio() {
  const litros = parseFloat(el('acopioLitros')?.value) || 0;
  const precio = parseFloat(el('acopioPrecio')?.value) || 0;
  const total  = litros * precio;
  if (el('acopioTotalPreview')) {
    el('acopioTotalPreview').textContent = L(total);
  }
}

// ── CERRAR MODAL ──────────────────────────────
function closeModalAcopio() {
  el('modalAcopio').style.display = 'none';
}

// ── EDITAR ────────────────────────────────────
function editAcopio(id) {
  const r = acopioData.find(x => x.id === id);
  if (!r) return;
  acopioEditId = id;
  poblarSelectProveedor();
  el('modalAcopioTitulo').textContent     = 'Editar Entrega';
  el('acopioProveedorId').value           = r.proveedor_id;
  el('acopioLitros').value                = r.litros;
  el('acopioTemperatura').value           = r.temperatura ?? '';
  el('acopioPrecio').value                = r.precio_litro;
  el('acopioTurno').value                 = r.turno;
  el('acopioFecha').value                 = r.fecha;
  el('acopioObservaciones').value         = r.observaciones || '';
  calcularTotalAcopio();
  el('modalAcopio').style.display = 'flex';
}

// ── GUARDAR ───────────────────────────────────
async function saveAcopio() {
  const body = {
    proveedor_id:  el('acopioProveedorId').value,
    litros:        parseFloat(el('acopioLitros').value),
    temperatura:   el('acopioTemperatura').value ? parseFloat(el('acopioTemperatura').value) : null,
    precio_litro:  parseFloat(el('acopioPrecio').value),
    turno:         el('acopioTurno').value,
    fecha:         el('acopioFecha').value,
    observaciones: el('acopioObservaciones').value.trim()
  };

  if (!body.proveedor_id)        return toast('Selecciona un proveedor', 'err');
  if (!body.litros || body.litros <= 0) return toast('Los litros deben ser mayores a 0', 'err');
  if (!body.precio_litro || body.precio_litro <= 0) return toast('El precio por litro es obligatorio', 'err');

  try {
    if (acopioEditId) {
      await req('PUT', `/acopio/${acopioEditId}`, body);
      toast('Entrega actualizada ✅');
    } else {
      await req('POST', '/acopio', body);
      toast('Entrega registrada ✅');
    }
    closeModalAcopio();
    await cargarResumenAcopio();
    await cargarRegistrosAcopio();
    renderGraficaAcopio();
  } catch(e) {
    toast(e.message, 'err');
  }
}

// ── ELIMINAR ──────────────────────────────────
async function deleteAcopio(id) {
  if (!confirm('¿Eliminar este registro de acopio?')) return;
  try {
    await req('DELETE', `/acopio/${id}`);
    toast('Registro eliminado');
    await cargarResumenAcopio();
    await cargarRegistrosAcopio();
    renderGraficaAcopio();
  } catch(e) {
    toast(e.message, 'err');
  }
}

// ── FILTRAR POR FECHA ─────────────────────────
async function filtrarAcopio() {
  await cargarResumenAcopio();
  await cargarRegistrosAcopio();
  renderGraficaAcopio();
}

// ── HELPERS ───────────────────────────────────
function formatFecha(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}