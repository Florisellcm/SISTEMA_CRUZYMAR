/* ══════════════════════════════════════════════
   CRUZYMAR · acopio.js (Unificado Recepción + Calidad)
   Módulo frontend de Acopio y Calidad de Leche
══════════════════════════════════════════════ */

let acopioData = [];
let calidadData = [];
let proveedoresList = [];
let inventarioList = [];

async function loadAcopio() {
  try {
    proveedoresList = await req('GET', '/proveedores');
    const inputFecha = el('filtroFechaRec');
    if (inputFecha && !inputFecha.value) {
      inputFecha.value = new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    }
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
  let totalLitros = 0, aprobados = 0, rechazados = 0, entregas = acopioData.length;

  acopioData.forEach(a => {
    // Los campos DECIMAL de MySQL llegan como texto (ej: "100.00"),
    // no como número. Sin parseFloat, "+=" concatena texto en vez de
    // sumar y el resultado deja de poder convertirse a número (NaN).
    const litrosNum = parseFloat(a.litros) || 0;
    totalLitros += litrosNum;
    const cal = calidadData.find(c => c.acopio_id === a.id);
    if (cal) {
      if (cal.resultado === 'Aprobado') aprobados += litrosNum;
      if (cal.resultado === 'Rechazado') rechazados += litrosNum;
    } else {
      aprobados += litrosNum;
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
      <td>${cal.densidad || '—'}</td>
      <td><span class="badge ${estadoColor}">${estadoTexto}</span></td>
      <td>
        <button class="btn-accion rojo" onclick="deleteRecepcion('${a.id}')" title="Eliminar"><i class="ri-delete-bin-line"></i></button>
      </td>
    </tr>
    `;
  }).join('');
}

async function openModalRecepcion() {
  el('formRecepcion').reset();

  const sel = el('recProveedor');
  if (sel) {
    sel.innerHTML = '<option value="">— Seleccionar proveedor —</option>' +
                    proveedoresList.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
  }

  // Producto de inventario donde entra la leche. Recepción SOLO debe
  // ver el producto de categoría "Materia Prima" (la leche cruda
  // almacenada) — nunca presentaciones de venta como "Leche Entera 1L".
  try {
    const todos = await req('GET', '/inventario');
    inventarioList = todos.filter(p => (p.categoria || '').trim().toLowerCase() === 'materia prima');
  } catch (e) {
    inventarioList = [];
    toast('No se pudo cargar el inventario: ' + e.message, 'err');
  }

  const wrap = el('recInventarioWrap');
  const selInv = el('recInventarioId');
  const info = el('recInventarioInfo');

  if (inventarioList.length === 1) {
    // Único candidato: se asigna solo, sin pedirle nada al usuario.
    if (selInv) selInv.innerHTML = `<option value="${inventarioList[0].id}" selected>${inventarioList[0].nombre}</option>`;
    if (wrap) wrap.style.display = 'none';
    if (info) {
      info.style.display = 'block';
      info.textContent = `Esta leche entrará a: ${inventarioList[0].nombre} (stock actual: ${N(inventarioList[0].stock)} ${inventarioList[0].unidad})`;
    }
  } else if (inventarioList.length > 1) {
    // Más de un producto de categoría "Leche": sí hay que elegir, pero
    // solo entre esos, nunca entre todo el inventario.
    if (wrap) wrap.style.display = 'block';
    if (info) info.style.display = 'none';
    if (selInv) {
      selInv.innerHTML = '<option value="">— Seleccionar —</option>' +
        inventarioList.map(p => `<option value="${p.id}">${p.nombre} (stock: ${N(p.stock)} ${p.unidad})</option>`).join('');
    }
  } else {
    // No hay ningún producto de categoría "Leche" en el inventario.
    if (wrap) wrap.style.display = 'none';
    if (info) {
      info.style.display = 'block';
      info.style.color = '#DC2626';
      info.textContent = 'No hay ningún producto de inventario con categoría "Materia Prima". Crea uno en el módulo de Inventario antes de registrar recepciones.';
    }
  }

  if (el('recEstado')) colorEstado(el('recEstado'));
  el('modalRecepcion').style.display = 'flex';
}

function closeModalRecepcion() {
  el('modalRecepcion').style.display = 'none';
}

async function saveRecepcionUnificada() {
  const proveedor_id = el('recProveedor').value;
  const litros = parseFloat(el('recLitros').value);
  const inventario_id = el('recInventarioId')?.value;
  const resultado = el('recEstado')?.value || 'Aprobado'; // veredicto de CALIDAD
  const observaciones = el('recObs').value;

  if (!proveedor_id || !litros) {
    return toast('El proveedor y los litros son obligatorios', 'err');
  }
  if (!inventario_id) {
    return toast('Seleccione a qué producto de inventario corresponde esta recepción', 'err');
  }
  if (resultado === 'Rechazado' && !observaciones) {
    return toast('Indique el motivo del rechazo en Observaciones', 'err');
  }

  // El veredicto de calidad (Aprobado/Rechazado) se traduce al estado
  // real de la recepción (Aceptada/Rechazada): si es Aceptada, el
  // backend acredita el inventario; si es Rechazada, registra la
  // merma. Nunca hace las dos cosas.
  const estadoAcopio = resultado === 'Rechazado' ? 'Rechazada' : 'Aceptada';

  const bodyAcopio = {
    proveedor_id,
    litros,
    inventario_id,
    estado: estadoAcopio,
    motivo_rechazo: estadoAcopio === 'Rechazada' ? observaciones : null,
    precio_litro: parseFloat(el('recPrecio')?.value) || 12,
    temperatura: parseFloat(el('recTemp').value) || null,
    turno: el('recTurno')?.value || 'Mañana',
    fecha: el('recFecha')?.value || new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000).toISOString().slice(0, 10),
    observaciones
  };

  try {
    const nuevoAcopio = await req('POST', '/acopio', bodyAcopio);

    // 2. Crear el registro de calidad (solo pruebas de campo: alcohol y densidad)
    const bodyCalidad = {
      acopio_id: nuevoAcopio.id,
      densidad: el('recDensidad').value ? parseFloat(el('recDensidad').value) : null,
      temperatura: bodyAcopio.temperatura,
      olor:    el('recOrgano')?.value === 'Normal' ? 'Normal' : 'Anormal',
      color:   el('recOrgano')?.value === 'Normal' ? 'Normal' : 'Anormal',
      aspecto: el('recOrgano')?.value === 'Normal' ? 'Normal' : 'Anormal',
      prueba_alcohol: el('recAlcohol')?.value || 'Negativa',
      resultado,
      observaciones,
      fecha: bodyAcopio.fecha
    };

    await req('POST', '/calidad', bodyCalidad);

    toast(estadoAcopio === 'Aceptada'
      ? 'Recepción aceptada ✅ — inventario actualizado'
      : 'Recepción rechazada — registrada como merma');
    closeModalRecepcion();
    loadRecepciones();

  } catch(e) {
    toast('Error: ' + e.message, 'err');
  }
}

// Vive aquí (y no en un <script> dentro de recepcion.html) porque los
// fragmentos HTML de este sistema se insertan con innerHTML, y los
// navegadores no ejecutan <script> insertados de esa forma.
function colorEstado(sel) {
  const esRechazo = sel.value !== 'Aprobado';
  if (!esRechazo) { sel.style.color = '#16A34A'; sel.style.borderColor = '#16A34A'; }
  else { sel.style.color = '#DC2626'; sel.style.borderColor = '#DC2626'; }
  const lbl = document.getElementById('lblObsReq');
  if (lbl) lbl.style.display = esRechazo ? 'inline' : 'none';
}

async function deleteRecepcion(id) {
  if (!confirm('¿Eliminar este registro completo? Esto NO revierte el inventario ni la merma asociada.')) return;
  try {
    await req('DELETE', `/acopio/${id}`);
    toast('Registro eliminado');
    loadRecepciones();
  } catch(e) {
    toast('Error: ' + e.message, 'err');
  }
}