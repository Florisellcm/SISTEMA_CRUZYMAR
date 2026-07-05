/* ══════════════════════════════════════════════
   CRUZYMAR · produccion.js
   Módulo frontend de Producción y Lotes

   Cadena: Descremado → Crema + Leche descremada
           Leche descremada → Queso (+ Suero opcional)
           Crema → Mantequilla
           Suero → Requesón
           Otro → registro manual

   Toda mutación de inventario ocurre en el backend, dentro de una
   transacción (produccionModel.js). Este archivo solo arma el body
   y llama al endpoint correcto (crear / completar / cancelar).
══════════════════════════════════════════════ */

let produccionData = [];
let inventarioProdData = [];

const PRODUCTOS_DEF = {
  //  doble      → produce dos salidas (Crema + Leche Descremada)
  //  suero      → produce un subproducto Suero opcional
  //  parentTipo → tipo_proceso del lote del que proviene la materia prima
  //               null = es el primer paso (sin padre lógico → ocultar trazabilidad)
  //  trazTitulo → título de la sección de trazabilidad
  //  trazLabel  → etiqueta del select de lote origen
  //  trazHelp   → texto de ayuda bajo el select
  //  salidaLabel → etiqueta del campo "Producto que ingresa al stock"
  'Descremado': {
    tipoProceso: 'Descremado', entradaTipo: 'Leche entera',
    entradaLabel: 'Leche entera utilizada (litros) *',
    doble: true, suero: false,
    parentTipo: null,  // ← primer paso, sin lote padre
    trazTitulo: null, trazLabel: null, trazHelp: null,
    salidaLabel: null,
  },
  'Mantequilla Crema': {
    tipoProceso: 'Mantequilla', entradaTipo: 'Crema',
    entradaLabel: 'Crema utilizada (litros) *',
    doble: false, suero: false, salidaUnidad: 'libras',
    parentTipo: 'Descremado',
    trazTitulo: 'Trazabilidad — ¿De qué descremado viene esta crema?',
    trazLabel:  'Lote de Descremado de origen (opcional pero recomendado)',
    trazHelp:   'Seleccione el lote de descremado que generó la crema que va a procesar.',
    salidaLabel: 'Mantequilla obtenida → stock de inventario *',
    salidaCat: 'Mantequilla',   // ← categoría exacta del ítem de salida en inventario
  },
  'Mantequilla Rala': {
    tipoProceso: 'Mantequilla', entradaTipo: 'Crema',
    entradaLabel: 'Crema utilizada (litros) *',
    doble: false, suero: false, salidaUnidad: 'libras',
    parentTipo: 'Descremado',
    trazTitulo: 'Trazabilidad — ¿De qué descremado viene esta crema?',
    trazLabel:  'Lote de Descremado de origen (opcional pero recomendado)',
    trazHelp:   'Seleccione el lote de descremado que generó la crema que va a procesar.',
    salidaLabel: 'Mantequilla obtenida → stock de inventario *',
    salidaCat: 'Mantequilla',
  },
  'Queso Crema': {
    tipoProceso: 'Queso', entradaTipo: 'Leche descremada',
    entradaLabel: 'Leche descremada utilizada (litros) *',
    doble: false, suero: true, salidaUnidad: 'libras',
    parentTipo: 'Descremado',
    trazTitulo: 'Trazabilidad — ¿De qué descremado viene esta leche descremada?',
    trazLabel:  'Lote de Descremado de origen (opcional pero recomendado)',
    trazHelp:   'Seleccione el lote de descremado que generó la leche descremada que va a procesar.',
    salidaLabel: 'Queso Crema obtenido → stock de inventario *',
    salidaCat: 'Queso',         // categoría exacta
    salidaNombreHint: 'Queso Crema', // hint adicional para afinar la búsqueda
  },
  'Queso Semi-Seco': {
    tipoProceso: 'Queso', entradaTipo: 'Leche descremada',
    entradaLabel: 'Leche descremada utilizada (litros) *',
    doble: false, suero: true, salidaUnidad: 'libras',
    parentTipo: 'Descremado',
    trazTitulo: 'Trazabilidad — ¿De qué descremado viene esta leche descremada?',
    trazLabel:  'Lote de Descremado de origen (opcional pero recomendado)',
    trazHelp:   'Seleccione el lote de descremado que generó la leche descremada que va a procesar.',
    salidaLabel: 'Queso Semi-Seco obtenido → stock de inventario *',
    salidaCat: 'Queso',
    salidaNombreHint: 'Semiseco',
  },
  'Requesón': {
    tipoProceso: 'Requeson', entradaTipo: 'Suero',
    entradaLabel: 'Suero utilizado (litros) *',
    doble: false, suero: false, salidaUnidad: 'libras',
    parentTipo: 'Queso',
    trazTitulo: 'Trazabilidad — ¿De qué lote de queso viene este suero?',
    trazLabel:  'Lote de Queso / Quesillo de origen (opcional pero recomendado)',
    trazHelp:   'Seleccione el lote de queso que generó el suero que va a procesar.',
    salidaLabel: 'Requesón obtenido → stock de inventario *',
    salidaCat: 'Requesón',
  },
  'Otro': {
    tipoProceso: 'Manual', entradaTipo: 'Leche entera',
    entradaLabel: 'Leche / insumo utilizado (litros) *',
    doble: false, suero: false, salidaUnidad: 'libras', manual: true,
    parentTipo: 'any',
    trazTitulo: 'Trazabilidad (opcional)',
    trazLabel:  'Lote de origen',
    trazHelp:   'Referencia opcional a un lote anterior.',
    salidaLabel: 'Producto obtenido → stock de inventario *',
  },
};

// Texto descriptivo del flujo por cada tipo de proceso
const FLUJO_TEXTO = {
  'Descremado':        'Leche entera → <strong>Descremado</strong> → Crema (Granel) + Leche Descremada (Granel)',
  'Queso Crema':       'Leche Descremada → <strong>Queso Crema</strong> → Queso 1 lb / 0.5 lb + Suero (Granel)',
  'Queso Semi-Seco':   'Leche Descremada → <strong>Queso Semi-Seco</strong> → Queso 1 lb / 0.5 lb + Suero (Granel)',
  'Mantequilla Crema': 'Crema (Granel) → <strong>Mantequilla Crema</strong> → Mantequilla 1 lb / 0.5 lb',
  'Mantequilla Rala':  'Crema (Granel) → <strong>Mantequilla Rala</strong> → Mantequilla 1 lb / 0.5 lb',
  'Requesón':          'Suero (Granel) → <strong>Requesón</strong> → Requesón 1 lb / 0.5 lb',
  'Otro':              'Insumo personalizado → <strong>Producto manual</strong>',
};

/* ── Selecciona un chip de proceso en el modal ── */
function seleccionarChip(btn, valor) {
  document.querySelectorAll('#prodProcesoChips .prod-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  const sel = el('prodTipo');
  if (sel) { sel.value = valor; }
  onProductoChange();
}

/* ── Abre el modal pre-seleccionando un tipo de proceso ──
   Se llama desde los chips del flujo de producción en el HTML */
async function iniciarProcesoDesde(tipo) {
  await openModalProduccion();
  // Activar el chip correcto
  const chips = document.querySelectorAll('#prodProcesoChips .prod-chip');
  chips.forEach(c => {
    c.classList.remove('active');
    if (c.dataset.val === tipo) c.classList.add('active');
  });
  const sel = el('prodTipo');
  if (sel) sel.value = tipo;
  onProductoChange();
}

async function loadProduccion() {
  try {
    produccionData = await req('GET', '/produccion');
    actualizarTarjetasProduccion();
    renderTablaProduccion();
  } catch (e) {
    toast('Error cargando producción: ' + e.message, 'err');
  }
}

async function loadProduccionList() {
  try {
    const estado = el('filtroEstadoProd')?.value || '';
    const tipoProceso = el('filtroTipoProd')?.value || '';
    const params = [];
    if (estado) params.push(`estado=${encodeURIComponent(estado)}`);
    if (tipoProceso) params.push(`tipoProceso=${encodeURIComponent(tipoProceso)}`);
    const url = params.length ? `/produccion?${params.join('&')}` : '/produccion';
    produccionData = await req('GET', url);
    actualizarTarjetasProduccion();
    renderTablaProduccion();
  } catch (e) {
    toast('Error cargando producción: ' + e.message, 'err');
  }
}

/* ── Poblar todos los selects de inventario del modal y auto-detectar coincidencias ── */
function poblarSelectsInventario() {
  // Los selects de salida se pueden poblar globales u ocultos (ya están ocultos en el HTML)
  const opcionesTodas = '<option value="">— Seleccionar —</option>' +
    inventarioProdData.map(p => `<option value="${p.id}">${p.categoria} — ${p.nombre} (stock: ${N(p.stock)} ${p.unidad})</option>`).join('');

  ['prodProductoInv', 'prodCremaInv', 'prodDescremadaInv'].forEach(id => {
    const s = el(id); if (s) s.innerHTML = opcionesTodas;
  });
  const sSuero = el('prodSueroInv');
  if (sSuero) sSuero.innerHTML = '<option value="">— No registrar suero esta vez —</option>' +
    inventarioProdData.map(p => `<option value="${p.id}">${p.categoria} — ${p.nombre} (stock: ${N(p.stock)} ${p.unidad})</option>`).join('');

  // ── Auto-detección inteligente de ítems del inventario ──
  // Si encontramos ítems estándar en la lista, los pre-seleccionamos para evitar clics innecesarios.
  
  // 1. Materia prima por defecto: Leche (puede ser Leche Entera o Leche Descremada)
  const lecheEntera = inventarioProdData.find(p => p.nombre.toLowerCase().includes('leche almacenada') || (p.nombre.toLowerCase().includes('leche entera') && p.nombre.toLowerCase().includes('1l')));
  const lecheDescremada = inventarioProdData.find(p => p.nombre.toLowerCase().includes('leche descremada') || p.nombre.toLowerCase() === 'leche descremada (granel)');
  
  // 2. Crema (Descremado)
  const cremaGranel = inventarioProdData.find(p => p.nombre.toLowerCase().includes('crema (granel)') || p.nombre.toLowerCase().includes('crema de leche'));
  
  // 3. Suero
  const sueroGranel = inventarioProdData.find(p => p.nombre.toLowerCase().includes('suero') && p.nombre.toLowerCase().includes('1l'));

  // Aplicar pre-selección automática en los controles correspondientes:
  if (cremaGranel && el('prodCremaInv')) {
    el('prodCremaInv').value = cremaGranel.id;
  }
  
  // Leche descremada como salida del descremado
  if (lecheDescremada && el('prodDescremadaInv')) {
    el('prodDescremadaInv').value = lecheDescremada.id;
  }
  
  if (sueroGranel && el('prodSueroInv')) {
    el('prodSueroInv').value = sueroGranel.id;
  }
}

/* ── Carga los lotes de origen para el selector de trazabilidad.
   Si se pasa tipoProceso, filtra client-side a solo los lotes de ese tipo,
   mostrando cuánto quedó disponible visualmente. */
let _todosLotesRecientes = [];
async function cargarLotesOrigen(tipoProcesoPadre) {
  const sel = el('prodLoteOrigen');
  if (!sel) return;
  try {
    _todosLotesRecientes = await req('GET', '/produccion/recientes');
  } catch (e) {
    _todosLotesRecientes = [];
  }
  filtrarLotesOrigen(tipoProcesoPadre);
}

function filtrarLotesOrigen(tipoProcesoPadre) {
  const sel = el('prodLoteOrigen');
  if (!sel) return;

  let lista = _todosLotesRecientes;

  // Filtrar por tipo de proceso padre cuando aplica
  if (tipoProcesoPadre && tipoProcesoPadre !== 'any') {
    lista = lista.filter(l => l.tipo_proceso === tipoProcesoPadre);
  }

  const sinRef = '— Sin referencia / no aplica —';
  if (!lista.length) {
    sel.innerHTML = `<option value="">${sinRef}</option><option disabled>— No hay lotes de ${tipoProcesoPadre || ''} completados aún —</option>`;
    return;
  }

  sel.innerHTML = `<option value="">${sinRef}</option>` +
    lista.map(l => `<option value="${l.id}">${l.numero_lote} — ${l.producto_nombre} (${formatFecha(l.fecha_produccion)})</option>`).join('');
}

/* ── Ajusta etiquetas, campos visibles y trazabilidad según el proceso elegido ── */
function onProductoChange() {
  const val = el('prodTipo')?.value || 'Otro';
  const def = PRODUCTOS_DEF[val];
  if (!def) return;

  // Campo nombre manual (solo para "Otro")
  el('campoNombreManual').style.display = def.manual ? 'block' : 'none';

  // Label entrada
  el('lblEntrada').textContent = def.entradaLabel;
  el('lblEntradaInv').textContent = def.manual
    ? 'Materia prima (producto de inventario) *'
    : `Materia prima: ${def.entradaTipo} *`;

  // Filtrar dinámicamente el selector de Materia Prima para que SOLO muestre lo coherente
  const selectMP = el('prodMateriaPrimaInv');
  if (selectMP) {
    let filtrados = [];
    if (def.entradaTipo === 'Leche entera') {
      // Solo Leche Almacenada o Leche Entera
      filtrados = inventarioProdData.filter(p => p.nombre.toLowerCase().includes('leche almacenada') || (p.nombre.toLowerCase().includes('leche entera') && p.nombre.toLowerCase().includes('1l')));
    } else if (def.entradaTipo === 'Leche descremada') {
      // Solo productos intermedios de tipo Leche Descremada
      filtrados = inventarioProdData.filter(p => p.nombre.toLowerCase().includes('leche descremada'));
    } else if (def.entradaTipo === 'Crema') {
      // Solo productos intermedios de tipo Crema
      filtrados = inventarioProdData.filter(p => p.nombre.toLowerCase().includes('crema (granel)') || p.nombre.toLowerCase().includes('crema de leche'));
    } else if (def.entradaTipo === 'Suero') {
      // Solo productos intermedios de tipo Suero
      filtrados = inventarioProdData.filter(p => p.nombre.toLowerCase().includes('suero') && p.nombre.toLowerCase().includes('1l'));
    } else {
      // Manual/Otro: permite materias primas, intermedias o insumos (ej. Cuajo)
      filtrados = inventarioProdData.filter(p => p.categoria === 'Materia Prima' || p.categoria === 'Cuaja' || p.categoria === 'Leche' || p.nombre.toLowerCase().includes('cuajo'));
    }

    if (filtrados.length > 0) {
      selectMP.innerHTML = filtrados.map(p => `<option value="${p.id}">${p.categoria} — ${p.nombre} (stock: ${N(p.stock)} ${p.unidad})</option>`).join('');
      // Auto-seleccionar el primero
      selectMP.value = filtrados[0].id;
    } else {
      selectMP.innerHTML = `<option value="">— Sin existencias de ${def.entradaTipo} —</option>`;
    }
  }

  // Campos de salida
  if (def.doble) {
    el('campoSalidaSimple').style.display = 'none';
    el('campoSalidaDoble').style.display = 'grid';
  } else {
    el('campoSalidaSimple').style.display = 'block';
    el('campoSalidaDoble').style.display = 'none';
    el('lblSalida').textContent = def.manual ? 'Producto obtenido (libras)' : `${val} obtenido (libras)`;

    // Auto-seleccionar producto de salida correspondiente usando salidaCat/salidaNombreHint
    if (!def.manual && el('prodProductoInv')) {
      let prodMatch = null;
      if (def.salidaCat) {
        const hint = (def.salidaNombreHint || '').toLowerCase();
        prodMatch = inventarioProdData.find(p =>
          p.categoria === def.salidaCat &&
          (hint === '' || p.nombre.toLowerCase().includes(hint)) &&
          p.nombre.toLowerCase().includes('1lb')
        ) || inventarioProdData.find(p =>
          p.categoria === def.salidaCat &&
          (hint === '' || p.nombre.toLowerCase().includes(hint))
        );
      }
      if (prodMatch) {
        el('prodProductoInv').value = prodMatch.id;
      }
    }
  }

  // Suero
  const mostrarSuero = !!def.suero;
  el('campoSuero').style.display = mostrarSuero ? 'block' : 'none';

  // Nota específica para proceso doble (Descremado)
  const notaDesc = el('notaDescremado');
  if (notaDesc) notaDesc.style.display = def.doble ? 'block' : 'none';

  // Banner de info contextual según el proceso
  const INV_INFO = {
    'Descremado':
      '⬇️ La leche entera se descuenta del inventario al crear el lote. ' +
      '⬆️ La <strong>Crema</strong> y la <strong>Leche Descremada</strong> se suman al stock automáticamente cuando el lote se marque como <strong>Completado</strong>. ' +
      'Los dos selects de abajo solo indican a qué ítem del catálogo va cada subproducto.',
    'Queso Crema':
      '⬇️ La leche descremada se descuenta del inventario al crear el lote. ' +
      '⬆️ El <strong>Queso</strong> (y el Suero opcional) se suman al stock al marcar el lote como <strong>Completado</strong>.',
    'Queso Semi-Seco':
      '⬇️ La leche descremada se descuenta del inventario al crear el lote. ' +
      '⬆️ El <strong>Queso Semi-Seco</strong> (y el Suero opcional) se suman al stock al marcar el lote como <strong>Completado</strong>.',
    'Mantequilla Crema':
      '⬇️ La crema se descuenta del inventario al crear el lote. ' +
      '⬆️ La <strong>Mantequilla</strong> se suma al stock al marcar el lote como <strong>Completado</strong>.',
    'Mantequilla Rala':
      '⬇️ La crema se descuenta del inventario al crear el lote. ' +
      '⬆️ La <strong>Mantequilla Rala</strong> se suma al stock al marcar el lote como <strong>Completado</strong>.',
    'Requesón':
      '⬇️ El suero se descuenta del inventario al crear el lote. ' +
      '⬆️ El <strong>Requesón</strong> se suma al stock al marcar el lote como <strong>Completado</strong>.',
    'Otro':
      'El sistema descuenta la materia prima al crear el lote y acredita el producto obtenido cuando se marca como <strong>Completado</strong>.',
  };
  const invInfoTexto = el('invInfoTexto');
  if (invInfoTexto) invInfoTexto.innerHTML = INV_INFO[val] || INV_INFO['Otro'];

  // ──────────────────────────────────────────────────────
  // TRAZABILIDAD: visible solo cuando hay un proceso padre
  // ──────────────────────────────────────────────────────
  const secTraz = el('seccionTrazabilidad');
  if (secTraz) {
    if (!def.parentTipo) {
      // Descremado: primer paso del flujo, no tiene padre → ocultar
      secTraz.style.display = 'none';
    } else {
      secTraz.style.display = 'block';
      // Título dinámico
      const tit = el('lblTrazabilidadTitulo');
      if (tit) tit.textContent = def.trazTitulo || 'Trazabilidad (opcional)';
      // Etiqueta del select
      const lbl = el('lblTrazabilidadOrigen');
      if (lbl) lbl.textContent = def.trazLabel || 'Lote de origen';
      // Texto de ayuda
      const hlp = el('lblTrazabilidadHelp');
      if (hlp) hlp.textContent = def.trazHelp || '';
      // Filtrar el dropdown de lotes por tipo de padre
      filtrarLotesOrigen(def.parentTipo);
    }
  }

  // Actualizar indicador de flujo
  const flujoTexto = el('prodFlujoTexto');
  if (flujoTexto) flujoTexto.innerHTML = FLUJO_TEXTO[val] || FLUJO_TEXTO['Otro'];

  // Sincronizar chips
  document.querySelectorAll('#prodProcesoChips .prod-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.val === val);
  });
}

function actualizarTarjetasProduccion() {
  const hoy = new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  let lotesHoy = 0, lecheHoy = 0, prodHoy = 0;

  produccionData.forEach(p => {
    const fechaProd = (p.fecha_produccion || '').slice(0, 10);
    if (fechaProd !== hoy) return;

    lotesHoy++;

    if (p.entrada_tipo === 'Leche entera' || !p.entrada_tipo) {
      lecheHoy += parseFloat(p.leche_usada || 0);
    }
    if (p.unidad === 'libras') {
      prodHoy += parseFloat(p.cantidad_obtenida || 0);
    }
  });

  const rend = lecheHoy > 0 ? ((prodHoy / lecheHoy) * 100).toFixed(1) : 0;
  if (el('prodLotesHoy')) el('prodLotesHoy').textContent = lotesHoy;
  if (el('prodLecheHoy')) el('prodLecheHoy').textContent = N(lecheHoy) + ' L';
  if (el('prodQuesoHoy')) el('prodQuesoHoy').textContent = N(prodHoy) + ' Lbs';
  if (el('prodRendimiento')) el('prodRendimiento').textContent = rend + '%';
}

const TIPO_BADGE = {
  Descremado: { txt: 'Descremado', bg: '#EAF2FB', col: '#003C78' },
  Queso: { txt: 'Queso', bg: '#F0FDF4', col: '#15803D' },
  Mantequilla: { txt: 'Mantequilla', bg: '#FFF7ED', col: '#C2410C' },
  Requeson: { txt: 'Requesón', bg: '#F5F3FF', col: '#6D28D9' },
  Manual: { txt: 'Manual', bg: '#F4F7FA', col: '#64748B' },
};

function renderTablaProduccion() {
  const tbody = el('produccionTableBody');
  if (!tbody) return;

  if (!produccionData.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:#64748B">Sin registros de producción</td></tr>`;
    return;
  }

  tbody.innerHTML = produccionData.map(p => {
    const estado = p.estado || 'En proceso';
    const isComp = estado === 'Completada';
    const isCanc = estado === 'Cancelada';
    const badgeClass = isComp ? 'b-comp' : isCanc ? 'b-err' : 'b-proc';
    const entrada = parseFloat(p.leche_usada || 0);
    const obt = parseFloat(p.cantidad_obtenida || 0);
    const unidadPrincipal = p.unidad === 'litros' ? 'L' : 'Lbs';
    const rend = isComp ? (parseFloat(p.rendimiento) || 0).toFixed(1) + '%' : '—';
    const fecha = (p.fecha_produccion || '').slice(0, 10);
    const tb = TIPO_BADGE[p.tipo_proceso] || TIPO_BADGE.Manual;

    const origen = p.lote_padre_numero
      ? `<div style="font-size:11px;color:#94A3B8;margin-top:2px">↳ de <strong>${p.lote_padre_numero}</strong></div>`
      : '';
    const secundaria = p.salida_secundaria_cantidad
      ? `<div style="font-size:11px;color:#0A6BC4;margin-top:2px">+ ${N(p.salida_secundaria_cantidad)} ${p.salida_secundaria_unidad === 'litros' ? 'L' : 'Lbs'} ${p.salida_secundaria_nombre || ''}</div>`
      : '';

    return `
    <tr>
      <td><strong style="color:#003C78">${p.numero_lote || '—'}</strong>${origen}</td>
      <td><span style="background:${tb.bg};color:${tb.col};padding:3px 9px;border-radius:20px;font-size:10.5px;font-weight:700">${tb.txt}</span></td>
      <td>${p.producto_nombre || '—'}${secundaria}</td>
      <td>${N(entrada)} L</td>
      <td>${isComp ? N(obt) + ' ' + unidadPrincipal : '—'}</td>
      <td>${rend}</td>
      <td><span class="badge ${badgeClass}">${estado}</span></td>
      <td style="font-size:12px;color:#64748B">${formatFecha(fecha)}</td>
      <td>
        <button class="btn-accion verde" onclick="marcarCompletado('${p.id}')" title="Completar lote"
          ${isComp || isCanc ? 'disabled style="opacity:.3;cursor:not-allowed"' : ''}>
          <i class="ri-check-line"></i>
        </button>
        <button class="btn-accion gris" onclick="cancelarLote('${p.id}')" title="Cancelar lote"
          ${isCanc ? 'disabled style="opacity:.3;cursor:not-allowed"' : ''}>
          <i class="ri-close-circle-line"></i>
        </button>
        <button class="btn-accion rojo" onclick="deleteProduccion('${p.id}')" title="Eliminar">
          <i class="ri-delete-bin-line"></i>
        </button>
      </td>
    </tr>`;
  }).join('');
}

async function openModalProduccion() {
  el('formProduccion').reset();
  const fi = el('prodFecha');
  if (fi) fi.value = new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  if (el('prodTipo')) el('prodTipo').value = 'Descremado';

  // Resetear chips al abrir el modal desde cero (Descremado activo por defecto)
  document.querySelectorAll('#prodProcesoChips .prod-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.val === 'Descremado');
  });

  try {
    inventarioProdData = await req('GET', '/inventario');
  } catch (e) {
    inventarioProdData = [];
    toast('No se pudo cargar el inventario: ' + e.message, 'err');
  }
  poblarSelectsInventario();
  await cargarLotesOrigen();
  onProductoChange();
  el('modalProduccion').style.display = 'flex';
}

function closeModalProduccion() {
  el('modalProduccion').style.display = 'none';
}

async function saveProduccionUnificada() {
  const seleccion = el('prodTipo')?.value || 'Otro';
  const def = PRODUCTOS_DEF[seleccion];
  const estado = el('prodEstado')?.value || 'En proceso';
  const turno = el('prodTurno')?.value || 'Mañana';
  const fechaProduccion = el('prodFecha')?.value || new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const observaciones = el('prodObs')?.value || '';
  const lotePadreId = el('prodLoteOrigen')?.value || null;

  const entrada = parseFloat(el('prodEntrada')?.value);
  const materiaPrimaInventarioId = el('prodMateriaPrimaInv')?.value;

  if (!materiaPrimaInventarioId) return toast('Seleccione de qué producto de inventario sale la materia prima', 'err');
  if (!entrada || entrada <= 0) return toast('Ingrese la cantidad de materia prima utilizada', 'err');

  let body = {
    tipoProceso: def.tipoProceso,
    entradaTipo: def.entradaTipo,
    lecheUsada: entrada,
    materiaPrimaInventarioId,
    lotePadreId,
    turno, estado, fechaProduccion, observaciones,
    operario: 'Operario'
  };

  if (def.doble) {
    const cremaInv = el('prodCremaInv')?.value;
    const descremadaInv = el('prodDescremadaInv')?.value;
    const crema = parseFloat(el('prodCrema')?.value) || 0;
    const descremada = parseFloat(el('prodDescremada')?.value) || 0;

    if (!cremaInv || !descremadaInv) return toast('Seleccione el producto de inventario para crema y para leche descremada', 'err');
    if (estado === 'Completada' && (crema <= 0 || descremada <= 0))
      return toast('Si el lote está completado, ingrese la crema y la leche descremada obtenidas', 'err');

    Object.assign(body, {
  productoNombre: 'Leche descremada',
  productoInventarioId: descremadaInv,
  cantidadObtenida: descremada,
  unidad: 'litros',

  salidaSecundariaNombre: 'Crema',
  salidaSecundariaInventarioId: cremaInv,
  salidaSecundariaCantidad: crema,
  salidaSecundariaUnidad: 'litros',
});

  } else {
    const nombreProducto = def.manual ? (el('prodNombreManual')?.value || '').trim() : seleccion;
    if (def.manual && !nombreProducto) return toast('Ingrese el nombre del producto', 'err');

    const productoInv = el('prodProductoInv')?.value;
    if (!productoInv) return toast('Seleccione a qué producto de inventario corresponde la salida', 'err');

    const obtenido = parseFloat(el('prodSalida')?.value) || 0;
    if (estado === 'Completada' && obtenido <= 0) return toast('Ingrese la cantidad obtenida', 'err');

    Object.assign(body, {
      productoNombre: nombreProducto,
      productoInventarioId: productoInv,
      cantidadObtenida: obtenido,
      unidad: 'libras'
    });

    if (def.suero) {
      const sueroInv = el('prodSueroInv')?.value;
      const suero = parseFloat(el('prodSuero')?.value) || 0;
      if (suero > 0 && sueroInv) {
        Object.assign(body, {
          salidaSecundariaNombre: 'Suero',
          salidaSecundariaInventarioId: sueroInv,
          salidaSecundariaCantidad: suero,
          salidaSecundariaUnidad: 'litros'
        });
      }
    }
  }

  try {
    await req('POST', '/produccion', body);
    toast('Lote de producción registrado ✅');
    closeModalProduccion();
    loadProduccionList();
  } catch (e) {
    toast('Error: ' + e.message, 'err');
  }
}

async function marcarCompletado(id) {
  const lote = produccionData.find(p => p.id === id);
  if (!lote) return;

  if (lote.tipo_proceso === 'Descremado') {
    const crema = prompt('¿Cuántos litros de CREMA se obtuvieron?');
    if (crema === null) return;
    const descremada = prompt('¿Cuántos litros de LECHE DESCREMADA se obtuvieron?');
    if (descremada === null) return;
    const c = parseFloat(crema), d = parseFloat(descremada);
    if (isNaN(c) || c <= 0 || isNaN(d) || d <= 0) return toast('Ingrese cantidades válidas para ambas salidas', 'err');
    try {
      await req('PUT', `/produccion/${id}/completar`, { cantidadObtenida: c, salidaSecundariaCantidad: d });
      toast('Lote de descremado completado ✅ — inventario actualizado');
      loadProduccionList();
    } catch (e) { toast('Error: ' + e.message, 'err'); }
    return;
  }

  const unidad = lote.unidad === 'litros' ? 'litros' : 'libras';
  const obtenido = prompt(`¿Cuántas ${unidad} de ${lote.producto_nombre || 'producto'} se obtuvieron?`);
  if (obtenido === null) return;
  const cant = parseFloat(obtenido);
  if (isNaN(cant) || cant <= 0) return toast('Ingrese una cantidad válida', 'err');

  let salidaSecundariaCantidad;
  if (lote.tipo_proceso === 'Queso') {
    const suero = prompt('¿Cuántos litros de SUERO se obtuvieron? (dejar vacío si no aplica)');
    if (suero !== null && suero.trim() !== '') salidaSecundariaCantidad = parseFloat(suero) || 0;
  }

  try {
    await req('PUT', `/produccion/${id}/completar`, { cantidadObtenida: cant, salidaSecundariaCantidad });
    toast('Lote marcado como completado ✅ — inventario actualizado');
    loadProduccionList();
  } catch (e) {
    toast('Error: ' + e.message, 'err');
  }
}

async function cancelarLote(id) {
  if (!confirm('¿Cancelar este lote? La materia prima consumida (y la salida, si ya estaba completado) se devuelven al inventario.')) return;
  try {
    await req('PUT', `/produccion/${id}/cancelar`, {});
    toast('Lote cancelado — inventario revertido');
    loadProduccionList();
  } catch (e) {
    toast('Error: ' + e.message, 'err');
  }
}

async function deleteProduccion(id) {
  if (!confirm('¿Eliminar este lote de producción? Se revertirá cualquier movimiento de inventario que haya generado. Si otro lote lo usa como origen, esa referencia quedará vacía.')) return;
  try {
    await req('DELETE', `/produccion/${id}`);
    toast('Lote eliminado — inventario revertido');
    loadProduccionList();
  } catch (e) {
    toast('Error: ' + e.message, 'err');
  }
}