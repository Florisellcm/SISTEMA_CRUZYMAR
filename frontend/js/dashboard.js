/* ──────────────────────────────────────────────────────────
   CRUZYMAR · dashboard.js — Datos reales desde MySQL
────────────────────────────────────────────────────────── */

let _chartBalance = null;
let _chartDona    = null;

async function initDashboard() {
  try {
    const data = await req('GET', '/dashboard');
    const k    = data.kpis || {};

    // ── KPIs ──────────────────────────────────────────────
    if (el('kpiVentasMes'))           el('kpiVentasMes').textContent           = L(k.ventasMes || 0);
    if (el('kpiLecheProcesada'))      el('kpiLecheProcesada').textContent      = N(k.produccionHoy || 0) + ' Lbs hoy';
    if (el('kpiRendimientoGlobal'))   el('kpiRendimientoGlobal').textContent   = '↑ Rendimiento: ' + (k.rendimiento || 0) + '%';
    if (el('kpiVencimientosProximos'))el('kpiVencimientosProximos').textContent = k.productosStockBajo || 0;
    if (el('kpiPedidosBadge'))        el('kpiPedidosBadge').textContent        = (k.clientesActivos || 0) + ' activos';

    if (el('lastUpdate'))
      el('lastUpdate').textContent = '✓ ' + new Date().toLocaleTimeString('es-HN', { hour:'2-digit', minute:'2-digit' });

    // ── Gráficas ──────────────────────────────────────────
    renderGraficoBalance(data.ventasSemana || []);
    renderGraficoDona(data.topProductos   || []);
    renderLotesRecientes(data.produccionHoy || []);
    renderAlertasStock(k.productosStockBajo || 0);

  } catch(e) {
    console.error('Dashboard error:', e);
  }
}

/* Gráfica barras ventas semana */
function renderGraficoBalance(ventas) {
  const canvas = el('graficoBalance');
  if (!canvas || !window.Chart) return;
  if (_chartBalance) { _chartBalance.destroy(); _chartBalance = null; }

  _chartBalance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: ventas.map(v => v.dia),
      datasets: [{
        label: 'Ventas',
        data: ventas.map(v => v.total),
        backgroundColor: 'rgba(0,60,120,.75)',
        borderRadius: 5
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => 'L. ' + Number(c.raw).toLocaleString('es-HN', {minimumFractionDigits:2}) }}
      },
      scales: {
        x: { ticks: { color:'#94A3B8', font:{size:11} }, grid: { display:false } },
        y: { ticks: { color:'#94A3B8', callback: v => 'L.' + Math.round(v/1000) + 'K' }, grid: { color:'rgba(0,0,0,.04)' } }
      }
    }
  });
}

/* Gráfica dona top productos */
function renderGraficoDona(productos) {
  const canvas = el('graficoDona');
  if (!canvas || !window.Chart) return;
  if (_chartDona) { _chartDona.destroy(); _chartDona = null; }

  if (!productos.length) return;

  _chartDona = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: productos.map(p => p.nombre),
      datasets: [{
        data: productos.map(p => p.ingresos),
        backgroundColor: ['#003C78','#468C28','#1D4ED8','#D97706','#DC2626'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position:'bottom', labels:{ font:{size:11}, padding:8, boxWidth:10 } },
        tooltip: { callbacks: { label: c => c.label + ': L.' + Number(c.raw).toLocaleString('es-HN') } }
      }
    }
  });
}

/* Tabla lotes recientes */
function renderLotesRecientes(lotes) {
  const cont = el('tablaLotesRecientes');
  if (!cont) return;

  if (!lotes.length) {
    cont.innerHTML = '<div style="padding:30px;text-align:center;color:#64748B;font-size:13px">Sin lotes registrados hoy</div>';
    return;
  }

  const filas = lotes.map(l => {
    const isComp = l.estado === 'Completada';
    const badge  = isComp
      ? '<span style="background:#DCFCE7;color:#15803D;font-size:10px;font-weight:700;padding:3px 8px;border-radius:10px">Completada</span>'
      : '<span style="background:#DBEAFE;color:#1D4ED8;font-size:10px;font-weight:700;padding:3px 8px;border-radius:10px">En proceso</span>';
    return `
    <tr style="border-bottom:1px solid #F1F5F9">
      <td style="padding:12px 20px;font-size:13px;font-weight:700;color:#003C78">${l.producto_nombre}</td>
      <td style="padding:12px 20px;font-size:13px;color:#64748B">${l.turno}</td>
      <td style="padding:12px 20px;font-size:13px;font-weight:700;color:#1E293B">${N(l.cantidad_obtenida || 0)} Lbs</td>
      <td style="padding:12px 20px">${badge}</td>
    </tr>`;
  }).join('');

  cont.innerHTML = `
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#F4F7FA;border-bottom:2px solid #E0E9F2">
          <th style="padding:10px 20px;text-align:left;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase">Producto</th>
          <th style="padding:10px 20px;text-align:left;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase">Turno</th>
          <th style="padding:10px 20px;text-align:left;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase">Cantidad</th>
          <th style="padding:10px 20px;text-align:left;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase">Estado</th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>`;
}

/* Alerta stock bajo */
function renderAlertasStock(stockBajo) {
  const cont = el('alertasStockContainer');
  if (!cont) return;
  if (stockBajo === 0) {
    cont.innerHTML = `<h4 style="margin:0;font-size:13px;color:#15803D;font-weight:700;display:flex;align-items:center;gap:6px">
      <i class="ri-checkbox-circle-line"></i> Stock en niveles normales
    </h4>`;
  } else {
    cont.querySelector?.('div')?.firstChild;  // dejar el HTML por defecto si ya tiene alertas
  }
}

/* Inicializar cuando ya está Chart.js en la página */
async function _dashboardInit() {
  if (window.Chart) return initDashboard();
  // Chart.js ya está cargado en index.html (línea 7)
  await initDashboard();
}

if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', _dashboardInit);
else
  _dashboardInit();