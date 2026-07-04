/* ══════════════════════════════════════════
   CRUZYMAR · calidadLotes.js
   Sub-módulo: Control de Calidad de Lotes
   — NO hay código auto-ejecutable al cargar —
══════════════════════════════════════════ */

let _cqLotes = [];

async function loadCalidadLotes() {
  try {
    const estado = el('cqFiltroEstado')?.value || 'Todos';
    const desde  = el('cqFechaDesde')?.value  || '';
    const hasta  = el('cqFechaHasta')?.value  || '';

    const qs = [
      estado !== 'Todos' ? `estado=${encodeURIComponent(estado)}` : '',
      desde ? `fecha=${desde}` : '',
      hasta ? `fechaFin=${hasta}` : ''
    ].filter(Boolean).join('&');

    const [lotes, kpis] = await Promise.all([
      req('GET', `/calidad-lotes${qs ? '?' + qs : ''}`),
      req('GET', '/calidad-lotes/kpis')
    ]);

    _cqLotes = lotes;
    _renderCQKpis(kpis);
    _renderCQTabla(lotes);
  } catch(e) {
    toast('Error cargando calidad de lotes: ' + e.message, 'err');
  }
}

function _initCQFechas() {
  const hoy      = new Date().toISOString().slice(0, 10);
  const primerMes = hoy.slice(0, 8) + '01';
  const desde = el('cqFechaDesde');
  const hasta  = el('cqFechaHasta');
  if (desde && !desde.value) desde.value = primerMes;
  if (hasta  && !hasta.value)  hasta.value  = hoy;
}

function _renderCQKpis(k) {
  if (!k) return;
  if (el('cqKpiTotal')) el('cqKpiTotal').textContent = k.total || 0;
  if (el('cqKpiApro'))  el('cqKpiApro').textContent  = k.aprobados || 0;
  if (el('cqKpiRech'))  el('cqKpiRech').textContent  = k.rechazados || 0;
  if (el('cqKpiTasa'))  el('cqKpiTasa').textContent  = (k.tasa_aprobacion || 0) + '%';
}

function _renderCQTabla(lotes) {
  const tbody = el('cqTablaBody');
  if (!tbody) return;

  if (!lotes || !lotes.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#94A3B8">
      Sin lotes completados en el período seleccionado</td></tr>`;
    return;
  }

  tbody.innerHTML = lotes.map(l => {
    const badge =
      l.estado_calidad === 'Aprobado'
        ? '<span style="background:#DCFCE7;color:#15803D;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">✅ Aprobado</span>'
        : l.estado_calidad === 'Rechazado'
        ? '<span style="background:#FEE2E2;color:#DC2626;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">❌ Rechazado</span>'
        : '<span style="background:#EAF2FB;color:#003C78;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700">⏳ Pendiente</span>';

    const accion = l.estado_calidad === 'Pendiente'
      ? `<button onclick="openCQModal('${l.id}','${l.numero_lote}','${(l.producto_nombre||'').replace(/'/g,"\\'")}')"
          style="background:#003C78;color:#fff;border:none;border-radius:7px;padding:6px 12px;font-size:11px;font-weight:700;cursor:pointer">
          <i class="ri-shield-check-line"></i> Inspeccionar
        </button>`
      : `<span style="font-size:11px;color:#94A3B8">${l.inspector || '—'}</span>`;

    const fecha = (l.fecha_produccion || '').slice(0, 10).split('-').reverse().join('/');

    return `<tr>
      <td><strong style="color:#003C78">${l.numero_lote || '—'}</strong></td>
      <td>${l.producto_nombre || '—'}</td>
      <td>${N(l.cantidad_obtenida)} ${l.unidad || 'Lbs'}</td>
      <td style="font-size:12px;color:#64748B">${fecha}</td>
      <td style="font-size:12px;color:#64748B">${l.inspector || '—'}</td>
      <td>${badge}</td>
      <td style="text-align:center">${accion}</td>
    </tr>`;
  }).join('');
}

function openCQModal(loteId, numLote, producto) {
  const loteIdEl = el('cqLoteId');
  if (loteIdEl) loteIdEl.value = loteId;
  const sub = el('cqModalSubtitulo');
  if (sub) sub.textContent = `Lote ${numLote} — ${producto}`;
  
  const obs = el('cqObservaciones');
  if (obs) obs.value = '';

  const radioApro = el('cqRadioAprobado');
  if (radioApro) radioApro.checked = true;

  if (el('cqSal')) el('cqSal').value = 'Normal';
  if (el('cqConsistencia')) el('cqConsistencia').value = 'Adecuada';
  if (el('cqColorOlor')) el('cqColorOlor').value = 'Normal';

  toggleCQResultado('Aprobado');

  const modal = el('cqModal');
  if (modal) modal.style.display = 'flex';
}

function closeCQModal() {
  const modal = el('cqModal');
  if (modal) modal.style.display = 'none';
}

function toggleCQResultado(estado) {
  const lblApro = el('lblAprobado');
  const lblRech = el('lblRechazado');
  const labelObs = el('cqLabelObs');
  const obsTextarea = el('cqObservaciones');

  if (estado === 'Aprobado') {
    if (lblApro) {
      lblApro.style.border = '2.5px solid #22C55E';
      lblApro.style.background = '#F0FDF4';
      lblApro.style.color = '#16A34A';
    }
    if (lblRech) {
      lblRech.style.border = '2.5px solid #E2E8F0';
      lblRech.style.background = '#fff';
      lblRech.style.color = '#64748B';
    }
    if (labelObs) labelObs.innerHTML = 'Observaciones (Opcional)';
    if (obsTextarea) obsTextarea.placeholder = 'Añada comentarios o notas sobre el lote...';
  } else {
    if (lblApro) {
      lblApro.style.border = '2.5px solid #E2E8F0';
      lblApro.style.background = '#fff';
      lblApro.style.color = '#64748B';
    }
    if (lblRech) {
      lblRech.style.border = '2.5px solid #EF4444';
      lblRech.style.background = '#FEF2F2';
      lblRech.style.color = '#DC2626';
    }
    if (labelObs) labelObs.innerHTML = 'Motivo del Rechazo <span style="color:#DC2626">*</span>';
    if (obsTextarea) obsTextarea.placeholder = 'Describa detalladamente por qué no pasa el control de calidad...';
  }
}

async function guardarInspeccionSimple() {
  const loteId = el('cqLoteId')?.value;
  if (!loteId) return;

  const esAprobado = el('cqRadioAprobado')?.checked;
  const estado = esAprobado ? 'Aprobado' : 'Rechazado';
  const obs = el('cqObservaciones')?.value.trim();
  const sal = el('cqSal')?.value || 'Normal';
  const consistencia = el('cqConsistencia')?.value || 'Adecuada';
  const colorOlor = el('cqColorOlor')?.value || 'Normal';

  if (estado === 'Rechazado' && !obs) {
    return toast('Debe indicar el motivo del rechazo en el campo de texto', 'err');
  }

  try {
    await req('POST', '/calidad-lotes/inspeccionar', {
      lote_id: loteId,
      estado: estado,
      observaciones: estado === 'Aprobado' ? obs : null,
      motivo_rechazo: estado === 'Rechazado' ? obs : null,
      sal_nivel: sal,
      consistencia: consistencia,
      color_olor: colorOlor
    });

    toast(estado === 'Aprobado'
      ? '✅ Lote aprobado y liberado al inventario'
      : '❌ Lote rechazado y bloqueado');
      
    closeCQModal();
    _initCQFechas();
    loadCalidadLotes();
  } catch(e) {
    toast('Error: ' + e.message, 'err');
  }
}
