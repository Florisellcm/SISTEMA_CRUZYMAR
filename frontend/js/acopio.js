/* ══════════════════════════════════════════════
   CRUZYMAR · acopio.js (Unificado Recepción + Calidad)
   Módulo frontend de Acopio y Calidad de Leche
══════════════════════════════════════════════ */

let acopioData = [];
let calidadData = [];
let proveedoresList = [];

async function loadAcopio() {
  try {
    proveedoresList = await req('GET', '/proveedores');
    await loadRecepciones();
  } catch(e) {
    toast('Error cargando datos: ' + e.message, 'err');
  }
}

async function loadRecepciones() {
  try {
    const fecha = el('filtroFechaRec')?.value || '';
    const urlAcopio = fecha ? `/acopio?fecha=${fecha}` : '/acopio';
    const urlCalidad = fecha ? `/calidad?fecha=${fecha}` : '/calidad';
    
    [acopioData, calidadData] = await Promise.all([
      req('GET', urlAcopio),
      req('GET', urlCalidad)
    ]);
    
    actualizarTarjetas();
    renderTablaUnificada();
  } catch(e) {
    toast('Error cargando recepciones: ' + e.message, 'err');
  }
}

function actualizarTarjetas() {
  // Solo contamos lo de la fecha actual mostrada o la data filtrada
  let totalLitros = 0, aprobados = 0, rechazados = 0, entregas = acopioData.length;
  
  acopioData.forEach(a => {
    totalLitros += (a.litros || 0);
    // Buscar la calidad asociada
    const cal = calidadData.find(c => c.acopio_id === a.id);
    if (cal) {
      if (cal.resultado === 'Aprobado') aprobados += a.litros;
      if (cal.resultado === 'Rechazado') rechazados += a.litros;
    } else {
      // Si no tiene prueba, se asume aprobado para litros básicos o pendiente
      aprobados += a.litros;
    }
  });

  if (el('recTotal')) el('recTotal').textContent = N(totalLitros) + ' L';
  if (el('recAprobados')) el('recAprobados').textContent = N(aprobados) + ' L';
  if (el('recRechazados')) el('recRechazados').textContent = N(rechazados) + ' L';
  if (el('recEntregas')) el('recEntregas').textContent = entregas;
}

function renderTablaUnificada() {
  const tbody = el('recepcionesTableBody');
  if (!tbody) return;

  if (acopioData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#64748B">Sin registros en esta fecha</td></tr>`;
    return;
  }

  tbody.innerHTML = acopioData.map(a => {
    const cal = calidadData.find(c => c.acopio_id === a.id) || {};
    
    const isOk = cal.resultado !== 'Rechazado';
    const estadoColor = isOk ? 'b-ok' : 'b-err';
    const estadoTexto = cal.resultado || 'Aprobado (Sin prueba)';
    
    return `
    <tr>
      <td>${formatFecha(a.fecha)}</td>
      <td><strong>${a.proveedor_nombre}</strong></td>
      <td><span style="font-size:14px;font-weight:700;color:#003C78">${N(a.litros)} L</span></td>
      <td>${cal.temperatura || a.temperatura || '—'} °C</td>
      <td>${cal.prueba_alcohol || '—'}</td>
      <td>${cal.acidez || '—'}</td>
      <td><span class="badge ${estadoColor}">${estadoTexto}</span></td>
      <td>
        <button class="btn-accion rojo" onclick="deleteRecepcion('${a.id}')" title="Eliminar"><i class="ri-delete-bin-line"></i></button>
      </td>
    </tr>
    `;
  }).join('');
}

function openModalRecepcion() {
  el('formRecepcion').reset();
  
  const sel = el('recProveedor');
  if (sel) {
    sel.innerHTML = '<option value="">— Seleccionar proveedor —</option>' + 
                    proveedoresList.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
  }
  
  el('modalRecepcion').style.display = 'flex';
}

function closeModalRecepcion() {
  el('modalRecepcion').style.display = 'none';
}

async function saveRecepcionUnificada() {
  const proveedor_id = el('recProveedor').value;
  const litros = parseFloat(el('recLitros').value);
  
  if (!proveedor_id || !litros) {
    return toast('El proveedor y los litros son obligatorios', 'err');
  }

  // 1. Crear el acopio
  const bodyAcopio = {
    proveedor_id,
    litros,
    precio_litro: parseFloat(el('recPrecio')?.value) || 12,
    temperatura: parseFloat(el('recTemp').value) || null,
    turno: el('recTurno')?.value || 'Mañana',
    fecha: el('recFecha')?.value || new Date().toISOString().slice(0, 10),
    observaciones: el('recObs').value
  };

  try {
    const nuevoAcopio = await req('POST', '/acopio', bodyAcopio);
    
    // 2. Crear el registro de calidad
    const bodyCalidad = {
      acopio_id: nuevoAcopio.id,
      densidad: el('recDensidad').value ? parseFloat(el('recDensidad').value) : null,
      acidez: el('recAcidez').value ? parseFloat(el('recAcidez').value) : null,
      temperatura: bodyAcopio.temperatura,
      olor:    el('recOrgano')?.value === 'Normal' ? 'Normal' : 'Anormal',
      color:   el('recOrgano')?.value === 'Normal' ? 'Normal' : 'Anormal',
      aspecto: el('recOrgano')?.value === 'Normal' ? 'Normal' : 'Anormal',
      prueba_alcohol: el('recAlcohol')?.value || 'Negativa',
      resultado: el('recEstado')?.value || 'Aprobado',
      observaciones: el('recObs').value,
      fecha: bodyAcopio.fecha
    };
    
    // En el prototipo el modelo de calidad actual no tiene campo 'acidez', pero si lo enviamos no romperá.
    await req('POST', '/calidad', bodyCalidad);
    
    toast('Recepción registrada con éxito ✅');
    closeModalRecepcion();
    loadRecepciones(); // recargar
    
  } catch(e) {
    toast('Error: ' + e.message, 'err');
  }
}

async function deleteRecepcion(id) {
  if (!confirm('¿Eliminar este registro completo?')) return;
  try {
    await req('DELETE', `/acopio/${id}`);
    toast('Registro eliminado');
    loadRecepciones();
  } catch(e) {
    toast('Error: ' + e.message, 'err');
  }
}

function formatFecha(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}