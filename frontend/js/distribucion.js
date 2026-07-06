/* ══════════════════════════════════════════
   CRUZYMAR · distribucion.js
   Sub-módulo: Distribución — Hoja de Ruta
   Ahora con pestañas por zona (cada zona = un repartidor distinto)
══════════════════════════════════════════ */

let _distData   = null;
let _zonaActiva = null; // null = todas las zonas juntas

async function loadDistribucion() {
  const fecha = el('distFecha')?.value;
  if (!fecha) return toast('Seleccioná una fecha de reparto', 'err');

  try {
    // Resumen de cuántos clientes/cuánto hay por cobrar en cada zona
    const resumen = await req('GET', `/distribucion/resumen-zonas?fecha=${fecha}`);
    _renderZonaTabs(resumen);

    // Hoja de ruta: si hay zona activa, filtra solo esa; si no, trae todas
    const qs = _zonaActiva
      ? `?fecha=${fecha}&zona=${encodeURIComponent(_zonaActiva)}`
      : `?fecha=${fecha}`;
    _distData = await req('GET', `/distribucion${qs}`);
    _renderDistribucion(_distData);
  } catch(e) {
    toast('Error generando hoja de ruta: ' + e.message, 'err');
  }
}

/* ─── PESTAÑAS DE ZONA ───
   Cada zona representa a un repartidor distinto. El nombre del
   transportista se recuerda por zona (localStorage) para no tener
   que reescribirlo cada vez que cambiás de pestaña. */
function _renderZonaTabs(resumen) {
  const cont = el('distZonaTabs');
  if (!cont) return;

  const zonas = ['Local','Aldea','Yoro','Norte'];
  const totalGeneral = resumen.reduce((s,r) => s + Number(r.total_clientes), 0);

  const chip = (zonaValor, label, count) => {
    const activo = _zonaActiva === zonaValor;
    return `
      <button onclick="_seleccionarZona(${zonaValor === null ? 'null' : `'${zonaValor}'`})"
        style="padding:8px 16px;border-radius:20px;border:2px solid ${activo ? '#003C78' : '#E0E9F2'};
               background:${activo ? '#003C78' : '#fff'};color:${activo ? '#fff' : '#003C78'};
               font-size:12.5px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px">
        ${label}
        <span style="background:${activo ? 'rgba(255,255,255,.25)' : '#EAF2FB'};padding:1px 8px;border-radius:10px;font-size:11px">${count}</span>
      </button>`;
  };

  cont.innerHTML = chip(null, 'Todas las zonas', totalGeneral) +
    zonas.map(z => {
      const r = resumen.find(x => x.zona === z);
      return chip(z, z, r ? r.total_clientes : 0);
    }).join('');
}

function _seleccionarZona(zona) {
  _zonaActiva = zona;

  // Recupera (o sugiere) el nombre del transportista de esa zona
  const key = 'dist_transportista_' + (zona || 'todas');
  const guardado = localStorage.getItem(key);
  if (el('distTransportista')) {
    el('distTransportista').value = guardado || (zona ? `Repartidor ${zona}` : 'Repartidor');
  }

  loadDistribucion();
}

// Guarda el nombre del transportista de la zona activa cada vez que se edita
document.addEventListener('change', (ev) => {
  if (ev.target && ev.target.id === 'distTransportista') {
    const key = 'dist_transportista_' + (_zonaActiva || 'todas');
    localStorage.setItem(key, ev.target.value);
  }
});

function _renderDistribucion(d) {
  const cont = el('distContenido');
  if (!cont) return;

  if (!d.entregas?.length) {
    const msgZona = d.zona ? ` en la zona "${d.zona}"` : '';
    cont.innerHTML = `
      <div style="text-align:center;padding:60px;background:#fff;border-radius:13px;border:1.5px solid #E0E9F2">
        <i class="ri-truck-line" style="font-size:36px;color:#94A3B8;display:block;margin-bottom:10px"></i>
        <p style="font-size:14px;font-weight:700;color:#64748B">Sin ventas registradas${msgZona} para el ${_fecCorta(d.fecha)}</p>
        <p style="font-size:12px;color:#94A3B8;margin-top:4px">Registrá ventas en el módulo Comercial para generar la hoja de ruta.</p>
      </div>`;
    return;
  }

  /* ── KPIs del día ── */
  const kpis = `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">
      ${[
        { lbl:'Clientes', val: d.totalClientes, icon:'ri-group-line', c:'#003C78' },
        { lbl:'Total a cobrar', val: L(d.totalCobrar), icon:'ri-money-dollar-circle-line', c:'#2C6B10' },
        { lbl:'Efectivo', val: L(d.totalEfectivo), icon:'ri-cash-line', c:'#0A6BC4' },
        { lbl:'Crédito', val: L(d.totalCredito), icon:'ri-bank-card-line', c:'#DC2626' },
      ].map(k => `
        <div style="background:#fff;border-radius:12px;padding:14px 16px;border:1.5px solid #E0E9F2;border-left:3px solid ${k.c}">
          <div style="font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;margin-bottom:4px">${k.lbl}</div>
          <div style="font-size:20px;font-weight:800;color:${k.c}">${k.val}</div>
        </div>`).join('')}
    </div>`;

  /* ── Resumen de carga ── */
  const cargaRows = d.carga.map(c => `
    <tr>
      <td style="font-weight:700;color:#1E293B">${c.producto}</td>
      <td style="font-weight:800;color:#003C78;font-size:15px">${N(c.total_cantidad)}</td>
      <td style="color:#64748B">${c.unidad || 'u.'}</td>
      <td style="text-align:center">
        <div style="width:100px;height:22px;border-bottom:1px solid #94A3B8"></div>
      </td>
    </tr>`).join('');

  const cargaCard = `
    <div class="dist-card">
      <div class="dist-card-header"><i class="ri-archive-line"></i> 1. Resumen de Carga para Bodega${d.zona ? ` — Zona ${d.zona}` : ''}</div>
      <table class="dist-table">
        <thead><tr>
          <th>Producto</th><th>Cantidad a cargar</th><th>Unidad</th><th style="text-align:center">✓ Verificado</th>
        </tr></thead>
        <tbody>${cargaRows}</tbody>
      </table>
    </div>`;

  /* ── Hoja de ruta (detalle por cliente) ── */
  const rutaRows = d.entregas.map(e => `
    <tr>
      <td style="font-weight:800;color:#003C78;font-size:15px">${e.secuencia}</td>
      <td>
        <strong>${e.cliente_nombre || 'Consumidor final'}</strong><br>
        <span style="font-size:11px;color:#64748B">${e.cliente_dir || 'Victoria, Yoro'}</span>
        ${e.cliente_tel ? `<br><span style="font-size:11px;color:#64748B"><i class="ri-phone-line"></i> ${e.cliente_tel}</span>` : ''}
      </td>
      <td style="font-size:12px;color:#0A6BC4;font-weight:600">${e.numero || '—'}</td>
      <td style="font-size:12px">${e.productos_texto || '—'}</td>
      <td>
        <strong>${L(e.total)}</strong><br>
        <span style="font-size:10.5px;background:${e.metodo_pago==='Efectivo'?'#DCFCE7':'#EAF2FB'};color:${e.metodo_pago==='Efectivo'?'#15803D':'#003C78'};padding:2px 7px;border-radius:10px;font-weight:700">${e.metodo_pago || '—'}</span>
      </td>
      <td style="text-align:center">
        <div class="firma-box"></div>
      </td>
    </tr>`).join('');

  const rutaCard = `
    <div class="dist-card">
      <div class="dist-card-header"><i class="ri-route-line"></i> 2. Hoja de Ruta para el Repartidor${d.zona ? ` — Zona ${d.zona}` : ''} — ${_fecCorta(d.fecha)}</div>
      <div style="overflow-x:auto">
        <table class="dist-table" style="min-width:900px">
          <thead><tr>
            <th style="width:5%">N°</th>
            <th style="width:22%">Cliente / Dirección</th>
            <th style="width:12%">N° Factura</th>
            <th>Productos</th>
            <th style="width:14%">Total / Pago</th>
            <th style="width:12%;text-align:center">Firma recibido</th>
          </tr></thead>
          <tbody>${rutaRows}</tbody>
        </table>
      </div>
    </div>`;

  cont.innerHTML = kpis + cargaCard + rutaCard;
}

function distImprimir() {
  if (!_distData) return toast('Primero generá la hoja de ruta', 'err');
  const d = _distData;
  const fecha = el('distFecha')?.value || '';
  const transp = el('distTransportista')?.value || 'Repartidor';
  const ahora  = new Date().toLocaleString('es-HN', { dateStyle:'short', timeStyle:'short' });
  const zonaTxt = d.zona ? ` · Zona: ${d.zona}` : ' · Todas las zonas';

  if (el('distPrintFecha')) el('distPrintFecha').textContent = `Fecha: ${_fecCorta(fecha)}${zonaTxt}`;
  if (el('distPrintTransp')) el('distPrintTransp').textContent = `Transportista: ${transp} · Generado: ${ahora}`;

  /* Carga */
  const cargaHtml = `
    <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:10px">
      <thead><tr style="background:#EAF2FB">
        <th style="padding:6px 10px;text-align:left;border:1px solid #D5E5F7">Producto</th>
        <th style="padding:6px 10px;text-align:left;border:1px solid #D5E5F7">Cant. a cargar</th>
        <th style="padding:6px 10px;text-align:left;border:1px solid #D5E5F7">Unidad</th>
        <th style="padding:6px 10px;text-align:center;border:1px solid #D5E5F7">Verificado ✓</th>
      </tr></thead>
      <tbody>${d.carga.map(c=>`<tr>
        <td style="padding:6px 10px;border:1px solid #E8EFF8;font-weight:700">${c.producto}</td>
        <td style="padding:6px 10px;border:1px solid #E8EFF8;font-weight:800;color:#003C78">${N(c.total_cantidad)}</td>
        <td style="padding:6px 10px;border:1px solid #E8EFF8">${c.unidad||'u.'}</td>
        <td style="padding:6px 10px;border:1px solid #E8EFF8"></td>
      </tr>`).join('')}</tbody>
    </table>`;
  if (el('distPrintCarga')) el('distPrintCarga').innerHTML = cargaHtml;

  /* Ruta */
  const rutaHtml = `
    <table style="width:100%;border-collapse:collapse;font-size:10.5px">
      <thead><tr style="background:#EAF2FB">
        <th style="padding:6px 8px;border:1px solid #D5E5F7;text-align:center">N°</th>
        <th style="padding:6px 8px;border:1px solid #D5E5F7">Cliente / Dirección</th>
        <th style="padding:6px 8px;border:1px solid #D5E5F7">Factura</th>
        <th style="padding:6px 8px;border:1px solid #D5E5F7">Productos</th>
        <th style="padding:6px 8px;border:1px solid #D5E5F7">Total</th>
        <th style="padding:6px 8px;border:1px solid #D5E5F7">Pago</th>
        <th style="padding:6px 8px;border:1px solid #D5E5F7;text-align:center">Firma</th>
      </tr></thead>
      <tbody>${d.entregas.map(e=>`<tr>
        <td style="padding:6px 8px;border:1px solid #E8EFF8;text-align:center;font-weight:800">${e.secuencia}</td>
        <td style="padding:6px 8px;border:1px solid #E8EFF8"><strong>${e.cliente_nombre||'Consumidor'}</strong><br>${e.cliente_dir||'Victoria, Yoro'}</td>
        <td style="padding:6px 8px;border:1px solid #E8EFF8">${e.numero||'—'}</td>
        <td style="padding:6px 8px;border:1px solid #E8EFF8">${e.productos_texto||'—'}</td>
        <td style="padding:6px 8px;border:1px solid #E8EFF8;font-weight:700">${L(e.total)}</td>
        <td style="padding:6px 8px;border:1px solid #E8EFF8">${e.metodo_pago||'—'}</td>
        <td style="padding:6px 8px;border:1px solid #E8EFF8;min-width:80px"></td>
      </tr>`).join('')}</tbody>
    </table>`;
  if (el('distPrintRuta')) el('distPrintRuta').innerHTML = rutaHtml;

  if (el('distPrintTotales')) el('distPrintTotales').innerHTML = `
    <p style="margin:0;font-size:12px"><strong>Total clientes:</strong> ${d.totalClientes} &nbsp;|&nbsp;
    <strong>Total a cobrar:</strong> ${L(d.totalCobrar)} &nbsp;|&nbsp;
    <strong>Efectivo:</strong> ${L(d.totalEfectivo)} &nbsp;|&nbsp;
    <strong>Crédito:</strong> ${L(d.totalCredito)}</p>`;

  window.print();
}

function _fecCorta(str) {
  if (!str) return '—';
  const [y,m,d] = (str+'').slice(0,10).split('-');
  return `${d}/${m}/${y}`;
}

// Auto-init: poner fecha de hoy
if (document.getElementById('distFecha')) {
  el('distFecha').value = new Date().toISOString().slice(0, 10);
}