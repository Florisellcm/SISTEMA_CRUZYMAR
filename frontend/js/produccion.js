/* ══════════════════════════════════════════════
   CRUZYMAR · produccion.js
   Módulo frontend de Producción y Lotes
══════════════════════════════════════════════ */

let produccionData = [];
let recetasList = [];

async function loadProduccion() {
  try {
    [produccionData, recetasList] = await Promise.all([
      req('GET', '/produccion'),
      req('GET', '/recetas')
    ]);
    actualizarTarjetasProduccion();
    renderTablaProduccion();
    poblarSelectRecetas();
  } catch(e) {
    toast('Error cargando producción: ' + e.message, 'err');
  }
}

async function loadProduccionList() {
  try {
    const estado = el('filtroEstadoProd')?.value || '';
    const url = estado ? `/produccion?estado=${encodeURIComponent(estado)}` : '/produccion';
    produccionData = await req('GET', url);
    actualizarTarjetasProduccion();
    renderTablaProduccion();
  } catch(e) {
    toast('Error cargando producción: ' + e.message, 'err');
  }
}

function poblarSelectRecetas() {
  const sel = el('prodReceta');
  if (!sel) return;
  // Opción manual (sin receta fija)
  const opcManuales = [
    'Queso Crema','Queso Semi-Seco','Mantequilla Crema','Mantequilla Rala','Requesón'
  ];
  const recetasOps = recetasList.length
    ? recetasList.map(r => `<option value="${r.id}" data-litros="${r.litros_por_unidad||0}" data-rend="${r.rendimiento_esperado||0}">${r.producto}</option>`).join('')
    : opcManuales.map(n => `<option value="${n}">${n}</option>`).join('');
  sel.innerHTML = '<option value="">— Seleccionar producto —</option>' + recetasOps;
}

function actualizarTarjetasProduccion() {
  const hoy = new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  let lotesHoy = 0, lecheHoy = 0, prodHoy = 0;

  produccionData.forEach(p => {
    const fechaProd = (p.fecha_produccion || '').slice(0, 10);
    if (fechaProd === hoy) {
      lotesHoy++;
      lecheHoy += parseFloat(p.leche_usada || 0);
      prodHoy  += parseFloat(p.cantidad_obtenida || 0);
    }
  });

  const rend = lecheHoy > 0 ? ((prodHoy / lecheHoy) * 100).toFixed(1) : 0;
  if (el('prodLotesHoy'))    el('prodLotesHoy').textContent    = lotesHoy;
  if (el('prodLecheHoy'))    el('prodLecheHoy').textContent    = N(lecheHoy) + ' L';
  if (el('prodQuesoHoy'))    el('prodQuesoHoy').textContent    = N(prodHoy) + ' Lbs';
  if (el('prodRendimiento')) el('prodRendimiento').textContent = rend + '%';
}

function renderTablaProduccion() {
  const tbody = el('produccionTableBody');
  if (!tbody) return;

  if (!produccionData.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#64748B">Sin registros de producción</td></tr>`;
    return;
  }

  tbody.innerHTML = produccionData.map(p => {
    const estado = p.estado || 'En proceso';
    const isComp = estado === 'Completada';
    const badgeClass = isComp ? 'b-comp' : estado === 'Cancelada' ? 'b-err' : 'b-proc';
    const leche = parseFloat(p.leche_usada || 0);
    const obt   = parseFloat(p.cantidad_obtenida || 0);
    const rend  = isComp && leche > 0 ? ((obt / leche) * 100).toFixed(1) + '%' : '—';
    const fecha = (p.fecha_produccion || '').slice(0, 10);

    return `
    <tr>
      <td><strong style="color:#003C78">${p.numero_lote || '—'}</strong></td>
      <td>${p.producto_nombre || '—'}</td>
      <td>${N(leche)} L</td>
      <td>${isComp ? N(obt) + ' Lbs' : '—'}</td>
      <td>${rend}</td>
      <td><span class="badge ${badgeClass}">${estado}</span></td>
      <td style="font-size:12px;color:#64748B">${formatFecha(fecha)}</td>
      <td>
        <button class="btn-accion verde" onclick="marcarCompletado('${p.id}')" title="Marcar Completada"
          ${isComp || estado === 'Cancelada' ? 'disabled style="opacity:.3;cursor:not-allowed"' : ''}>
          <i class="ri-check-line"></i>
        </button>
        <button class="btn-accion rojo" onclick="deleteProduccion('${p.id}')" title="Eliminar">
          <i class="ri-delete-bin-line"></i>
        </button>
      </td>
    </tr>`;
  }).join('');
}

function openModalProduccion() {
  el('formProduccion').reset();
  poblarSelectRecetas();
  // Fecha de hoy por defecto
  const fi = el('prodFecha');
  if (fi) fi.value = new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  el('modalProduccion').style.display = 'flex';
}

function closeModalProduccion() {
  el('modalProduccion').style.display = 'none';
}

async function saveProduccionUnificada() {
  const recetaVal = el('prodReceta')?.value;
  const lecheUsada = parseFloat(el('prodLeche')?.value);
  const estado = el('prodEstado')?.value || 'En proceso';
  const cantidadObtenida = parseFloat(el('prodObtenido')?.value) || 0;
  const turno = el('prodTurno')?.value || 'Mañana';
  const fechaProduccion = el('prodFecha')?.value || new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const observaciones = el('prodObs')?.value || '';

  if (!recetaVal) return toast('Seleccione el producto a elaborar', 'err');
  if (!lecheUsada || lecheUsada <= 0) return toast('Ingrese la cantidad de leche utilizada', 'err');
  if (estado === 'Completada' && cantidadObtenida <= 0)
    return toast('Si el lote está completado, ingrese el producto obtenido', 'err');

  // Determinar si recetaVal es UUID (receta de BD) o nombre manual
  const esUUID = /^[0-9a-f-]{36}$/i.test(recetaVal);
  // Buscar nombre del producto
  const receta = recetasList.find(r => r.id === recetaVal);
  const productoNombre = receta ? receta.producto : recetaVal;

  const body = {
    productoNombre,
    receta_id:         esUUID ? recetaVal : null,
    lecheUsada,
    cantidadObtenida,
    unidad:            'libras',
    turno,
    fechaProduccion,
    observaciones,
    estado,
    operario:          'Operario'
  };

  try {
    await req('POST', '/produccion', body);
    toast('Lote de producción registrado ✅');
    closeModalProduccion();
    loadProduccionList();
  } catch(e) {
    toast('Error: ' + e.message, 'err');
  }
}

async function marcarCompletado(id) {
  const obtenido = prompt('¿Cuántas libras se obtuvieron en este lote?');
  if (obtenido === null) return;
  const cant = parseFloat(obtenido);
  if (isNaN(cant) || cant <= 0) return toast('Ingrese una cantidad válida', 'err');
  try {
    await req('PUT', `/produccion/${id}`, {
      cantidadObtenida: cant,
      estado: 'Completada'
    });
    toast('Lote marcado como completado ✅');
    loadProduccionList();
  } catch(e) {
    toast('Error: ' + e.message, 'err');
  }
}

async function deleteProduccion(id) {
  if (!confirm('¿Eliminar este lote de producción?')) return;
  try {
    await req('DELETE', `/produccion/${id}`);
    toast('Lote eliminado');
    loadProduccionList();
  } catch(e) {
    toast('Error: ' + e.message, 'err');
  }
}

function formatFecha(str) {
  if (!str) return '—';
  const [y, m, d] = str.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}