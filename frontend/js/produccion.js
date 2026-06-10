/* ═══════════════════════════════════════
   CRUZYMAR · produccion.js
   Módulo frontend de Producción Láctea
═══════════════════════════════════════ */

let produccionData   = [];
let produccionEditId = null;

// ── CARGAR ────────────────────────────
async function loadProduccion() {
  try {
    produccionData = await req('GET', '/produccion');
    renderProduccion(produccionData);
  } catch(e) {
    toast('Error cargando producción: ' + e.message, 'err');
  }
}

// ── RENDERIZAR TABLA ──────────────────
function renderProduccion(lista) {
  const tbody = el('produccionTableBody');
  if (!tbody) return;

  if (lista.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="10" style="text-align:center;padding:50px;color:#64748B">
        <div style="font-size:40px;margin-bottom:12px">🏭</div>
        <div style="font-weight:600">No hay lotes registrados</div>
        <div style="font-size:12px;margin-top:4px">Crea un nuevo lote de producción</div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map(p => `
    <tr>
      <td><span style="font-family:monospace;font-size:11px;font-weight:700;background:#EAF2FB;color:#003C78;padding:3px 8px;border-radius:6px">${p.numeroLote}</span></td>
      <td><strong>${p.productoNombre}</strong></td>
      <td style="color:#0369A1;font-weight:600">${p.lecheUsada} L</td>
      <td style="color:#468C28;font-weight:600">${p.cantidadObtenida} ${p.unidad}</td>
      <td>${rendimientoBadge(p.rendimiento)}</td>
      <td style="color:#E03535;font-size:12px">${p.merma} ${p.unidad}</td>
      <td>${formatFecha(p.fechaProduccion)}</td>
      <td>${p.turno}</td>
      <td>${badgeProd(p.estado)}</td>
      <td>
        <div style="display:flex;gap:5px">
          ${p.estado !== 'Completada' ? `
            <button class="btn-accion verde" onclick="completarLote('${p.id}')" title="Completar">✓</button>
          ` : ''}
          <button class="btn-accion azul" onclick="editProduccion('${p.id}')" title="Editar">✏️</button>
          <button class="btn-accion rojo"  onclick="deleteProduccion('${p.id}')" title="Eliminar">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ── ABRIR MODAL NUEVO ─────────────────
function openNuevaProduccion() {
  produccionEditId = null;
  el('modalProdTitulo').textContent = '🏭 Nuevo Lote de Producción';
  el('formProduccion').reset();
  el('prodFecha').value   = hoy();
  el('prodTurno').value   = 'Mañana';
  el('prodEstado').value  = 'En proceso';
  if (Auth?.user) el('prodOperario').value = Auth.user.nombre || '';
  generarLoteAutomatico();
  openModalProd();
}

// ── ABRIR MODAL EDITAR ────────────────
function editProduccion(id) {
  const p = produccionData.find(x => x.id === id);
  if (!p) return;
  produccionEditId = id;
  el('modalProdTitulo').textContent  = '✏️ Editar Lote';
  el('prodProductoNombre').value     = p.productoNombre;
  el('prodLecheUsada').value         = p.lecheUsada;
  el('prodCantidadObtenida').value   = p.cantidadObtenida;
  el('prodUnidad').value             = p.unidad;
  el('prodFecha').value              = p.fechaProduccion;
  el('prodTurno').value              = p.turno;
  el('prodEstado').value             = p.estado;
  el('prodOperario').value           = p.operario || '';
  el('prodLote').value               = p.numeroLote;
  el('prodInsumos').value            = p.insumos || '';
  el('prodObservaciones').value      = p.observaciones || '';
  actualizarRendimientoPreview();
  openModalProd();
}

// ── GUARDAR ───────────────────────────
async function saveProduccion() {
  const body = {
    productoNombre:   el('prodProductoNombre').value.trim(),
    lecheUsada:       el('prodLecheUsada').value,
    cantidadObtenida: el('prodCantidadObtenida').value,
    unidad:           el('prodUnidad').value,
    fechaProduccion:  el('prodFecha').value,
    turno:            el('prodTurno').value,
    operario:         el('prodOperario').value,
    insumos:          el('prodInsumos').value,
    observaciones:    el('prodObservaciones').value,
    estado:           el('prodEstado').value,
  };

  if (!body.productoNombre)  return toast('Ingrese el nombre del producto', 'err');
  if (!body.lecheUsada)      return toast('Ingrese los litros de leche usados', 'err');
  if (!body.fechaProduccion) return toast('Ingrese la fecha', 'err');

  try {
    if (produccionEditId) {
      await req('PUT', `/produccion/${produccionEditId}`, body);
      toast('Lote actualizado ✅');
    } else {
      await req('POST', '/produccion', body);
      toast('Lote registrado ✅');
    }
    closeModalProd();
    loadProduccion();
  } catch(e) {
    toast(e.message, 'err');
  }
}

// ── COMPLETAR LOTE ────────────────────
async function completarLote(id) {
  if (!confirm('¿Marcar este lote como Completado?')) return;
  try {
    await req('PUT', `/produccion/${id}`, { estado: 'Completada' });
    toast('Lote completado ✅');
    loadProduccion();
  } catch(e) {
    toast(e.message, 'err');
  }
}

// ── ELIMINAR ──────────────────────────
async function deleteProduccion(id) {
  if (!confirm('¿Eliminar este lote de producción?')) return;
  try {
    await req('DELETE', `/produccion/${id}`);
    toast('Lote eliminado');
    loadProduccion();
  } catch(e) {
    toast(e.message, 'err');
  }
}

// ── FILTRAR ───────────────────────────
function filtrarProduccion() {
  const estado = el('filtroEstadoProd')?.value || '';
  const buscar = el('buscarProd')?.value.toLowerCase() || '';
  renderProduccion(produccionData.filter(p => {
    const matchEstado = !estado || p.estado === estado;
    const matchBuscar = !buscar || p.productoNombre.toLowerCase().includes(buscar);
    return matchEstado && matchBuscar;
  }));
}

// ── PREVIEW RENDIMIENTO ───────────────
function actualizarRendimientoPreview() {
  const leche    = parseFloat(el('prodLecheUsada')?.value)         || 0;
  const cantidad = parseFloat(el('prodCantidadObtenida')?.value)   || 0;
  const prev     = el('rendimientoPreview');
  if (!prev) return;
  if (leche > 0 && cantidad > 0) {
    const rend  = ((cantidad / leche) * 100).toFixed(1);
    const merma = (leche - cantidad).toFixed(2);
    prev.innerHTML = `
      <span style="color:#468C28;font-weight:700">Rendimiento: ${rend}%</span>
      &nbsp;·&nbsp;
      <span style="color:#E03535;font-weight:600">Merma: ${merma} L</span>`;
  } else {
    prev.innerHTML = '<span style="color:#94A3B8">Ingrese leche y cantidad para ver rendimiento</span>';
  }
}

// ── LOTE AUTOMÁTICO ───────────────────
function generarLoteAutomatico() {
  if (produccionEditId) return;
  const fecha   = (el('prodFecha')?.value  || hoy()).replace(/-/g, '');
  const inicial = (el('prodTurno')?.value || 'M').charAt(0).toUpperCase();
  el('prodLote').value = `${fecha}-${inicial}`;
}

// ── MODAL ─────────────────────────────
function openModalProd()  { el('modalProduccion').style.display = 'flex'; }
function closeModalProd() { el('modalProduccion').style.display = 'none'; }

// ── HELPERS ───────────────────────────
function badgeProd(estado) {
  const map = {
    'Completada': 'background:#EAF4E3;color:#2D6B18',
    'En proceso': 'background:#EAF2FB;color:#0A4A8F',
    'Pendiente':  'background:#FEF3C7;color:#9A6100',
    'Cancelada':  'background:#FEF2F2;color:#991B1B',
  };
  const s = map[estado] || 'background:#F1F5F9;color:#64748B';
  return `<span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;${s}">${estado}</span>`;
}

function rendimientoBadge(rend) {
  const color = rend >= 18 ? '#468C28' : rend >= 12 ? '#D97706' : '#E03535';
  return `<span style="font-weight:700;color:${color}">${rend}%</span>`;
}

function formatFecha(f) {
  if (!f) return '—';
  return new Date(f + 'T12:00:00').toLocaleDateString('es-HN', { day:'2-digit', month:'2-digit', year:'numeric' });
}

function hoy() { return new Date().toISOString().split('T')[0]; }