/* ──────────────────────────────────────────────────────────
   CRUZYMAR · dashboard.js
   Chart.js — Gráficas profesionales
────────────────────────────────────────────────────────── */

let chartBalance = null;
let chartDona    = null;

async function initDashboard() {
  try {
    if (el('dashFechaActual')) {
      el('dashFechaActual').textContent = new Date().toLocaleString('es-HN');
    }

    let datosVentas     = { totalHoy: 14850.00 };
    let datosProduccion = [];

    try { datosVentas     = await req('GET', '/dashboard/ventas-hoy'); } catch(e) {}
    try { datosProduccion = await req('GET', '/produccion');           } catch(e) {}

    // Variables de planta
    const lecheRecibidaHoy   = 1250;
    const proveedoresActivos = 8;
    let lecheProcesadaHoy    = 0;
    let cantidadObtenida     = 0;

    if (datosProduccion?.length > 0) {
      const hoyISO = new Date().toISOString().split('T')[0];
      datosProduccion
        .filter(p => p.fechaProduccion === hoyISO)
        .forEach(p => {
          lecheProcesadaHoy += parseFloat(p.lecheUsada)       || 0;
          cantidadObtenida  += parseFloat(p.cantidadObtenida) || 0;
        });
    }

    if (lecheProcesadaHoy === 0) { lecheProcesadaHoy = 980; cantidadObtenida = 182; }

    const stockReserva      = lecheRecibidaHoy - lecheProcesadaHoy;
    const rendimientoGlobal = ((cantidadObtenida / lecheProcesadaHoy) * 100).toFixed(1);

    // Inyectar KPIs
    if (el('kpiVentasHoy'))         el('kpiVentasHoy').textContent         = L(datosVentas.totalHoy ?? datosVentas);
    if (el('kpiLecheRecibida'))     el('kpiLecheRecibida').textContent     = `${lecheRecibidaHoy} L`;
    if (el('kpiProveedoresHoy'))    el('kpiProveedoresHoy').textContent    = `${proveedoresActivos} Provs.`;
    if (el('kpiLecheProcesada'))    el('kpiLecheProcesada').textContent    = `${lecheProcesadaHoy} L`;
    if (el('kpiRendimientoGlobal')) el('kpiRendimientoGlobal').textContent = `${rendimientoGlobal}% Rend`;
    if (el('kpiLecheReserva'))      el('kpiLecheReserva').textContent      = `${stockReserva} L`;

    if (el('lastUpdate')) el('lastUpdate').textContent = 'Última actualización: ' + new Date().toLocaleString('es-HN');

    renderGraficoBalance();
    renderGraficoDona();
    renderLotesRecientes(datosProduccion);

  } catch(e) {
    console.error('Error dashboard:', e);
  }
}

// ── Gráfica líneas: Balance leche ─────
function renderGraficoBalance() {
  const ctx = el('graficoBalance');
  if (!ctx) return;

  const labels   = ['28/05','29/05','30/05','31/05','01/06','02/06','Hoy'];
  const recibida = [1100,  1300,  1050,  1400,  1250,  1180,  1250];
  const procesada= [950,   1200,  1050,  1100,  980,   1050,  980];

  if (chartBalance) chartBalance.destroy();

  chartBalance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Leche Recibida (L)',
          data: recibida,
          borderColor: '#38BDF8',
          backgroundColor: 'rgba(56,189,248,.08)',
          borderWidth: 2.5,
          pointBackgroundColor: '#38BDF8',
          pointRadius: 4,
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Leche Procesada (L)',
          data: procesada,
          borderColor: '#468C28',
          backgroundColor: 'rgba(70,140,40,.08)',
          borderWidth: 2.5,
          pointBackgroundColor: '#468C28',
          pointRadius: 4,
          tension: 0.4,
          fill: true,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { size: 12 }, usePointStyle: true, pointStyleWidth: 10 }
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} L`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          min: 800,
          grid: { color: '#F1F5F9' },
          ticks: { font: { size: 11 }, callback: v => v + ' L' }
        },
        x: {
          grid: { display: false },
          ticks: { font: { size: 11 } }
        }
      }
    }
  });
}

// ── Gráfica dona: Top productos ───────
function renderGraficoDona() {
  const ctx = el('graficoDona');
  if (!ctx) return;

  if (chartDona) chartDona.destroy();

  chartDona = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Queso Fresco', 'Quesillo', 'Mantequilla'],
      datasets: [{
        data: [55, 30, 15],
        backgroundColor: ['#003C78', '#468C28', '#38BDF8'],
        borderWidth: 2,
        borderColor: '#fff',
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { size: 11 }, usePointStyle: true, pointStyleWidth: 8, padding: 12 }
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.parsed}%`
          }
        }
      }
    }
  });
}

// ── Tabla lotes recientes ─────────────
function renderLotesRecientes(lista) {
  const contenedor = el('tablaLotesRecientes');
  if (!contenedor) return;

  if (!lista || lista.length === 0) {
    contenedor.innerHTML = `<div style="padding:30px;text-align:center;color:#64748B;font-size:13px">No hay lotes registrados hoy</div>`;
    return;
  }

  const recientes = [...lista]
    .sort((a, b) => new Date(b.creadoEn) - new Date(a.creadoEn))
    .slice(0, 5);

  const badgeColor = {
    'Completada': 'background:#EAF4E3;color:#2D6B18',
    'En proceso': 'background:#EAF2FB;color:#0A4A8F',
    'Pendiente':  'background:#FEF3C7;color:#9A6100',
    'Cancelada':  'background:#FEF2F2;color:#991B1B',
  };

  contenedor.innerHTML = `
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#F8FAFC">
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase">Lote</th>
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase">Producto</th>
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase">Leche</th>
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase">Obtenido</th>
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase">Rendimiento</th>
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase">Estado</th>
        </tr>
      </thead>
      <tbody>
        ${recientes.map(p => `
          <tr style="border-bottom:1px solid #F0F4F8">
            <td style="padding:11px 16px;font-family:monospace;font-size:11px;font-weight:700;color:#003C78;background:#EAF2FB;border-radius:4px">${p.numeroLote || '—'}</td>
            <td style="padding:11px 16px;font-size:13px;font-weight:600">${p.productoNombre}</td>
            <td style="padding:11px 16px;font-size:13px;color:#0369A1;font-weight:600">${p.lecheUsada} L</td>
            <td style="padding:11px 16px;font-size:13px;color:#468C28;font-weight:600">${p.cantidadObtenida} ${p.unidad || ''}</td>
            <td style="padding:11px 16px;font-size:13px;font-weight:700;color:${p.rendimiento >= 18 ? '#468C28' : p.rendimiento >= 12 ? '#D97706' : '#E03535'}">${p.rendimiento}%</td>
            <td style="padding:11px 16px"><span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;${badgeColor[p.estado] || 'background:#F1F5F9;color:#64748B'}">${p.estado}</span></td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}