/* ═══════════════════════════════════════════════════════════════
   CRUZYMAR · reportes.js  
   Victoria, Yoro, Honduras
═══════════════════════════════════════════════════════════════ */

/* ── Helpers globales ── */
const _rq = url => fetch('/api' + url, { headers: { Authorization: 'Bearer ' + (localStorage.getItem('token') || '') } }).then(r => r.json());
const _el = id => document.getElementById(id);
const _set = (id, h) => { const e = _el(id); if (e) e.innerHTML = h; };
const _L = n => 'L. ' + Number(n || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const _N = n => Number(n || 0).toLocaleString('es-HN');
const _P = n => Number(n || 0).toFixed(1) + '%';
const _fec = s => { if (!s) return '—'; const [y, m, d] = (s + '').slice(0, 10).split('-'); return `${d}/${m}/${y}`; };

/* ── Paleta empresa (solo tonos navy + verde, variados para distinguir) ── */
const C = { navy: '#003C78', navy2: '#0A6BC4', navy3: '#4DA3E0', verde: '#468C28', verde2: '#6BAE45', verde3: '#9AC97E', red: '#DC2626', amb: '#0A6BC4', slate: '#64748B' };
const COLS = [C.navy, C.verde, C.navy2, C.verde2, C.navy3, C.verde3, '#2C6B10', '#004F9E'];
const gridC = 'rgba(0,0,0,0.04)', tickC = '#94A3B8';

/* ─────────────────────────────────────────────────────────────
   SOLUCIÓN DEFINITIVA (Ingeniería de visualización)
   Para mostrar todos los datos (incluso los menores al 1%) sin que 
   parezca un desastre, se usan conectores sutiles hacia columnas 
   estrictas laterales.
   Garantía de cero cruces: Se ordenan geométricamente.
───────────────────────────────────────────────────────────── */
const leaderLinePlugin = {
  id: 'cruzyLeaderLines',

  beforeLayout(chart) {
    if (chart.config.type !== 'doughnut') return;
    chart.options.layout.padding = { left: 40, right: 40, top: 25, bottom: 25 };
  },

  afterDraw(chart) {
    if (chart.config.type !== 'doughnut') return;
    const { ctx, chartArea } = chart;
    const meta = chart.getDatasetMeta(0);
    if (!meta.data.length) return;
    const vals = chart.data.datasets[0].data.map(Number);
    const total = vals.reduce((a, b) => a + b, 0) || 1;
    const bgColors = chart.data.datasets[0].backgroundColor;

    const cx = meta.data[0].x;
    const cy = meta.data[0].y;
    const outerR = meta.data[0].outerRadius;

    ctx.save();
    ctx.textBaseline = 'middle';

    // Recolectar todos los segmentos visibles (ya vienen ordenados en sentido horario)
    const items = meta.data.map((arc, i) => {
      const pct = vals[i] / total * 100;
      if (pct < 0.1) return null;
      const midAngle = arc.startAngle + (arc.endAngle - arc.startAngle) / 2;
      const col = Array.isArray(bgColors) ? bgColors[i] : bgColors;
      return { pct, midAngle, col, text: pct.toFixed(1) + '%' };
    }).filter(Boolean);

    // Separar por hemisferio y ORDENAR de arriba hacia abajo (Y ascendente)
    // Esto es crucial para que las líneas NUNCA se crucen y la relajación funcione.
    const rightItems = items.filter(d => Math.cos(d.midAngle) >= 0)
      .sort((a, b) => Math.sin(a.midAngle) - Math.sin(b.midAngle));

    const leftItems = items.filter(d => Math.cos(d.midAngle) < 0)
      .sort((a, b) => Math.sin(a.midAngle) - Math.sin(b.midAngle));

    function drawColumn(data, isRight) {
      if (!data.length) return;

      const R = outerR;

      // 1. Asignar la posición natural Y basada en el ángulo
      data.forEach(d => {
        d.y = cy + Math.sin(d.midAngle) * (R + 10);
      });

      // 2. Relajar (empujar) las etiquetas en Y
      const H = 20;
      const minY = 12; // Límite superior
      const maxY = chart.height - 12; // Límite inferior

      for (let iter = 0; iter < 30; iter++) {
        for (let i = 1; i < data.length; i++) {
          const dy = data[i].y - data[i - 1].y;
          if (dy < H) {
            const push = (H - dy) / 2;
            data[i].y += push;
            data[i - 1].y -= push;
          }
        }
        // Force bounds strictly
        if (data[0].y < minY) {
          const offset = minY - data[0].y;
          data.forEach(d => d.y += offset);
        }
        if (data[data.length - 1].y > maxY) {
          const offset = data[data.length - 1].y - maxY;
          data.forEach(d => d.y -= offset);
        }
      }

      // X estático para los textos: acercado un poco más a la dona para garantizar que todo el texto (por ej. "100.0%") quepa dentro del padding del canvas.
      const textFixedX = isRight ? cx + R + 26 : cx - R - 26;

      data.forEach((d) => {
        // 3. Dibujar conector de 3 segmentos (Estilo D3.js / Highcharts)

        // Punto de anclaje en el borde exacto de la dona
        const x0 = cx + Math.cos(d.midAngle) * R;
        const y0 = cy + Math.sin(d.midAngle) * R;

        // A. Tocón radial de salida (garantiza que la línea sale perpendicular y no roza la dona)
        // Hecho más corto (6px) para no gastar el espacio del texto.
        const R_stub = R + 6;
        const x1 = cx + Math.cos(d.midAngle) * R_stub;
        const y1 = cy + Math.sin(d.midAngle) * R_stub;

        // B. Codo (inicio de la línea horizontal hacia el texto, alineada con la Y relajada)
        const x2 = textFixedX + (isRight ? -8 : 8);
        const y2 = d.y;

        ctx.beginPath();
        ctx.moveTo(x0, y0);          // Borde
        ctx.lineTo(x1, y1);          // Tocón radial (hacia afuera)
        ctx.lineTo(x2, y2);          // Diagonal hacia la columna (el abanico)
        ctx.lineTo(textFixedX, y2);  // Línea horizontal final

        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Punto de color
        ctx.beginPath();
        ctx.arc(textFixedX, d.y, 2.5, 0, 2 * Math.PI);
        ctx.fillStyle = d.col;
        ctx.fill();

        // Texto
        ctx.fillStyle = '#334155';
        ctx.font = 'bold 10.5px "Inter",system-ui,sans-serif';
        ctx.textAlign = isRight ? 'left' : 'right';
        ctx.fillText(d.text, isRight ? textFixedX + 6 : textFixedX - 6, d.y);
      });
    }

    drawColumn(rightItems, true);
    drawColumn(leftItems, false);

    ctx.restore();
  }
};

/**
 * Vacío para no romper los gráficos ya configurados.
 */
function _applyDonaLines(chartId) { }

/* _dlPct — desactivado */
function _dlPct() { return { display: false }; }

/* Valores sobre barras */
function _dlVal(prefix = '') {
  return {
    display: true,
    color: '#1E293B', anchor: 'end', align: 'top', offset: 3,
    font: { weight: '700', size: 10 },
    formatter: (v) => v ? prefix + Number(v).toLocaleString('es-HN', { maximumFractionDigits: 0 }) : ''
  };
}

/* Leyenda de dona — solo nombre + color, el % ya va en la línea */
function _legendPct() {
  return {
    generateLabels(chart) {
      const ds = chart.data.datasets[0];
      const total = (ds.data || []).reduce((a, b) => a + Number(b || 0), 0) || 1;
      return chart.data.labels.map((lbl, i) => {
        const pct = (Number(ds.data[i] || 0) / total * 100).toFixed(1);
        return {
          text: lbl + ' ' + pct + '%',
          fillStyle: Array.isArray(ds.backgroundColor) ? ds.backgroundColor[i] : ds.backgroundColor,
          strokeStyle: 'transparent',
          lineWidth: 0,
          index: i,
          hidden: false
        };
      });
    },
    font: { size: 11 }, padding: 10,
    usePointStyle: true, pointStyle: 'circle'
  };
}

/* ── Estado ── */
let _grupo = 'det', _rep = 'd1';
let _filtros = {};

/* ── Chart.js + datalabels lazy ── */
let _cjsOk = false, _cjsCbs = [];
const _charts = {};
function _loadChart(cb) {
  if (_cjsOk) return cb();
  _cjsCbs.push(cb);
  if (_cjsCbs.length > 1) return;
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
  s.onload = () => {
    const s2 = document.createElement('script');
    s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/chartjs-plugin-datalabels/2.2.0/chartjs-plugin-datalabels.min.js';
    s2.onload = () => {
      // Registrar UNA sola vez de forma global; así no hay que pasarlo
      // en el array plugins:[] de cada gráfica individual.
      try {
        if (window.ChartDataLabels && Chart.registry.plugins.get('datalabels') == null) {
          Chart.register(window.ChartDataLabels);
        }
      } catch (e) { }
      _cjsOk = true; _cjsCbs.forEach(f => f()); _cjsCbs = [];
    };
    s2.onerror = () => { _cjsOk = true; _cjsCbs.forEach(f => f()); _cjsCbs = []; }; // continúa sin datalabels si falla CDN
    document.head.appendChild(s2);
  };
  document.head.appendChild(s);
}
function _chart(id, cfg) {
  if (_charts[id]) _charts[id].destroy();
  const ctx = _el(id); if (!ctx) return;
  _charts[id] = new Chart(ctx, cfg);
}

/* ══════════════════════════════════════
   METADATA de reportes
══════════════════════════════════════ */
const META = {
  d1: {
    titulo: 'Reporte de Producción Diaria',
    sub: 'Departamento de Producción — Lotes, leche procesada y rendimiento',
    resp: 'Supervisor de Producción · Jefe de Planta · Gerencia',
    frec: 'Diario', icon: 'ri-flask-line', iconCls: ''
  },
  d2: {
    titulo: 'Reporte de Control de Calidad',
    sub: 'Departamento de Control de Calidad — Inocuidad y estándares',
    resp: 'Jefe de Calidad · Supervisor de Calidad · Gerencia',
    frec: 'Diario', icon: 'ri-drop-line', iconCls: 'verde'
  },
  d3: {
    titulo: 'Reporte de Distribución',
    sub: 'Departamento de Distribución — Productos entregados y clientes',
    resp: 'Encargado de Distribución',
    frec: 'Diario', icon: 'ri-truck-line', iconCls: ''
  },
  d4: {
    titulo: 'Reporte de Inventario',
    sub: 'Supervisor de Almacén — Control de existencias de productos',
    resp: 'Supervisor de Almacén e Inventario',
    frec: 'Semanal', icon: 'ri-archive-line', iconCls: 'verde'
  },
  s1: {
    titulo: 'Desempeño de Proveedores',
    sub: 'Recepción de Leche y Compras — Entregas, volumen suministrado, aceptación y rechazos',
    resp: 'Encargado de Compras · Supervisor de Producción · Gerencia',
    frec: 'Mensual', icon: 'ri-team-line', iconCls: ''
  },
  s2: {
    titulo: 'Estados Financieros ',
    sub: 'Departamento de Contabilidad — Situación económica de la empresa',
    resp: 'Departamento de Contabilidad',
    frec: 'Mensual / Anual', icon: 'ri-bank-line', iconCls: ''
  },
  s3: {
    titulo: 'Reporte de Ventas de Productos Lácteos',
    sub: 'Departamento de Ventas — Ingresos, tendencia y top productos',
    resp: 'Departamento de Ventas · Gerencia',
    frec: 'Mensual', icon: 'ri-shopping-cart-line', iconCls: 'verde'
  },
  s4: {
    titulo: 'Reporte de Producto Comprado por Cliente',
    sub: 'Departamento de Ventas — Análisis de comportamiento de compra',
    resp: 'Departamento de Ventas · Gerencia',
    frec: 'Mensual', icon: 'ri-user-heart-line', iconCls: ''
  },
  e1: {
    titulo: 'Reporte: Leche No Apta para Procesamiento',
    sub: 'Control de Calidad — Alertas y registro de materia prima rechazada',
    resp: 'Analista de Calidad · Proveedor',
    frec: 'Eventual', icon: 'ri-close-circle-line', iconCls: 'rojo'
  },

};

/* ══════════════════════════════════════
   FILTROS por tipo de reporte
══════════════════════════════════════ */
const FILTROS_DEF = {
  d1: [
    { id: 'f_desde', lbl: 'Desde', type: 'date', def: primerDiaMes() },
    { id: 'f_hasta', lbl: 'Hasta', type: 'date', def: hoy() },
    {
      id: 'f_estado', lbl: 'Estado', type: 'select',
      ops: [['', 'Todos'], ['En proceso', 'En proceso'], ['Completada', 'Completada'], ['Cancelada', 'Cancelada']]
    },
  ],
  d2: [
    { id: 'f_desde', lbl: 'Desde', type: 'date', def: primerDiaMes() },
    { id: 'f_hasta', lbl: 'Hasta', type: 'date', def: hoy() },
    {
      id: 'f_resultado', lbl: 'Resultado', type: 'select',
      ops: [['', 'Todos'], ['Aprobado', 'Aprobado'], ['Rechazado', 'Rechazado'], ['Observación', 'Observación']]
    },
  ],
  d3: [
    { id: 'f_desde', lbl: 'Desde', type: 'date', def: primerDiaMes() },
    { id: 'f_hasta', lbl: 'Hasta', type: 'date', def: hoy() },
    {
      id: 'f_estado', lbl: 'Estado', type: 'select',
      ops: [['', 'Todos'], ['Pagada', 'Pagada'], ['Pendiente', 'Pendiente'], ['Cancelada', 'Cancelada']]
    },
  ],
  d4: [],  // sin filtros de fecha (inventario actual)
  s1: [
    {
      id: 'f_mes', lbl: 'Mes', type: 'select',
      ops: [['todos', 'Todo el año'], ['1', 'Enero'], ['2', 'Febrero'], ['3', 'Marzo'], ['4', 'Abril'], ['5', 'Mayo'], ['6', 'Junio'],
      ['7', 'Julio'], ['8', 'Agosto'], ['9', 'Septiembre'], ['10', 'Octubre'], ['11', 'Noviembre'], ['12', 'Diciembre']],
      def: String(new Date().getMonth() + 1)
    },
    {
      id: 'f_anio', lbl: 'Año', type: 'select',
      ops: aniosOps(), def: String(new Date().getFullYear())
    },
  ],
  s2: [
    {
      id: 'f_mes', lbl: 'Mes', type: 'select',
      ops: [['todos', 'Todo el año'], ['1', 'Enero'], ['2', 'Febrero'], ['3', 'Marzo'], ['4', 'Abril'], ['5', 'Mayo'], ['6', 'Junio'],
      ['7', 'Julio'], ['8', 'Agosto'], ['9', 'Septiembre'], ['10', 'Octubre'], ['11', 'Noviembre'], ['12', 'Diciembre']],
      def: String(new Date().getMonth() + 1)
    },
    {
      id: 'f_anio', lbl: 'Año', type: 'select',
      ops: aniosOps(), def: String(new Date().getFullYear())
    },
  ],
  s3: [
    {
      id: 'f_mes', lbl: 'Mes', type: 'select',
      ops: [['todos', 'Todo el año'], ['1', 'Enero'], ['2', 'Febrero'], ['3', 'Marzo'], ['4', 'Abril'], ['5', 'Mayo'], ['6', 'Junio'],
      ['7', 'Julio'], ['8', 'Agosto'], ['9', 'Septiembre'], ['10', 'Octubre'], ['11', 'Noviembre'], ['12', 'Diciembre']],
      def: String(new Date().getMonth() + 1)
    },
    {
      id: 'f_anio', lbl: 'Año', type: 'select',
      ops: aniosOps(), def: String(new Date().getFullYear())
    },
  ],
  s4: [
    {
      id: 'f_mes', lbl: 'Mes', type: 'select',
      ops: [['todos', 'Todo el año'], ['1', 'Enero'], ['2', 'Febrero'], ['3', 'Marzo'], ['4', 'Abril'], ['5', 'Mayo'], ['6', 'Junio'],
      ['7', 'Julio'], ['8', 'Agosto'], ['9', 'Septiembre'], ['10', 'Octubre'], ['11', 'Noviembre'], ['12', 'Diciembre']],
      def: String(new Date().getMonth() + 1)
    },
    {
      id: 'f_anio', lbl: 'Año', type: 'select',
      ops: aniosOps(), def: String(new Date().getFullYear())
    },
  ],
  e1: [
    { id: 'f_desde', lbl: 'Desde', type: 'date', def: primerDiaMes() },
    { id: 'f_hasta', lbl: 'Hasta', type: 'date', def: hoy() },
  ],

};

function hoy() { return new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
function primerDiaMes() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; }
function aniosOps() { const a = new Date().getFullYear(); return [[a, a], [a - 1, a - 1], [a - 2, a - 2]].map(x => [String(x[0]), String(x[1])]); }

/* ══════════════════════════════════════
   NAVEGACIÓN
══════════════════════════════════════ */
function repSwitchGroup(g) {
  _grupo = g;
  ['det', 'sin', 'exc'].forEach(k => {
    const st = _el('rep-subtabs-' + k);
    if (st) st.style.display = k === g ? 'flex' : 'none';
    document.querySelectorAll(`[data-group="${k}"]`).forEach(b => b.classList.toggle('active', k === g));
  });
  const first = document.querySelector(`#rep-subtabs-${g} .rep-sub-btn`);
  if (first) first.click();
}

function repLoad(rep) {
  _rep = rep;
  document.querySelectorAll('.rep-sub-btn').forEach(b => b.classList.toggle('active', b.dataset.rep === rep));
  _renderFiltros(rep);
  _cargarReporte();
}

function _renderFiltros(rep) {
  const wrap = _el('rep-filtros-wrap');
  if (!wrap) return;
  const defs = FILTROS_DEF[rep] || [];
  if (!defs.length) { wrap.innerHTML = '<span style="font-size:12px;color:#94A3B8">Sin filtros para este reporte</span>'; return; }

  wrap.innerHTML = defs.map(f => {
    if (f.type === 'date')
      return `<label>${f.lbl}
        <input type="date" id="${f.id}" value="${f.def || ''}" style="margin-left:4px"
          onchange="_actualizarFiltro('${f.id}',this.value)">
      </label>`;
    if (f.type === 'select')
      return `<label>${f.lbl}
        <select id="${f.id}" style="margin-left:4px" onchange="_actualizarFiltro('${f.id}',this.value)">
          ${(f.ops || []).map(([v, t]) => `<option value="${v}"${(f.def || '') == v ? ' selected' : ''}>${t}</option>`).join('')}
        </select>
      </label>`;
    return '';
  }).join('') +
    `<button class="rep-btn-filtrar" onclick="_cargarReporte()"><i class="ri-search-line"></i> Filtrar</button>`;

  // Inicializar _filtros con defaults
  _filtros = {};
  defs.forEach(f => { _filtros[f.id] = f.def || (_el(f.id)?.value || ''); });
}

function _actualizarFiltro(id, val) { _filtros[id] = val; }

async function _cargarReporte() {
  _set('rep-content', '<div class="rep-loading"><i class="ri-loader-4-line"></i><br>Cargando datos...</div>');
  try {
    await ({
      d1: repD1, d2: repD2, d3: repD3, d4: repD4,
      s1: repS1, s2: repS2, s3: repS3, s4: repS4,
      e1: repE1,
    }[_rep] || (() => { }))();
  } catch (e) {
    _set('rep-content', `<div class="rep-empty"><i class="ri-wifi-off-line"></i><p>Error cargando: ${e.message}</p></div>`);
  }
}

/* ══════════════════════════════════════
   COMPONENTES UI
══════════════════════════════════════ */
function _header(rep) {
  const m = META[rep] || {};
  const chips = [
    { icon: 'ri-time-line', txt: m.frec || '—' },
    { icon: 'ri-folder-line', txt: 'Retención: 5 años' },
    { icon: 'ri-map-pin-line', txt: 'Victoria, Yoro' },
  ].map(c => `<span class="rep-meta-chip"><i class="${c.icon}"></i> ${c.txt}</span>`).join('');
  return `<div class="rep-report-header">
    <div class="rep-rh-title">
      <div class="rep-rh-icon ${m.iconCls || ''}"><i class="${m.icon || 'ri-bar-chart-2-line'}"></i></div>
      <div class="rep-rh-text"><h3>${m.titulo || 'Reporte'}</h3><p>${m.sub || ''}</p></div>
    </div>
    <div class="rep-rh-meta">${chips}</div>
  </div>`;
}

function _krow(cards) {
  return `<div class="rep-krow">${cards.map(c => {
    const kcls = c.cls === 'grn' ? 'k-grn' : c.cls === 'red' ? 'k-red' : c.cls === 'amb' ? 'k-amb' : c.cls === 'blu' ? 'k-blu' : '';
    return `<div class="rep-kcard ${kcls}"><div class="lbl">${c.lbl}</div><div class="val ${c.cls || ''}">${c.val}</div></div>`;
  }).join('')}</div>`;
}

function _card(title, icon, body, extra = '') {
  return `<div class="rep-card" ${extra}><p class="rep-card-title"><i class="${icon}"></i>${title}</p>${body}</div>`;
}

function _badge(txt, cls) { return `<span class="rb ${cls}">${txt || '—'}</span>`; }

function _tbl(cols, rows) {
  if (!rows?.length) return '<p style="text-align:center;padding:20px;color:#94A3B8">Sin registros en el período seleccionado</p>';
  const th = cols.map(c => `<th style="${c.style || ''}">${c.lbl}</th>`).join('');
  const td = rows.map(r => `<tr>${cols.map(c => `<td style="${c.tdStyle || ''}">${typeof c.render === 'function' ? c.render(r) : (r[c.key] ?? '—')}</td>`).join('')}</tr>`).join('');
  return `<table class="rep-tbl"><thead><tr>${th}</tr></thead><tbody>${td}</tbody></table>`;
}

function _bars(rows) {
  const max = Math.max(...rows.map(r => r.val), 1);
  return rows.map(r => `
    <div class="rep-bar-wrap">
      <span class="rep-bar-lbl" title="${r.lbl}">${r.lbl}</span>
      <div class="rep-bar-bg"><div class="rep-bar-fill" style="width:${Math.round(r.val / max * 100)}%;background:${r.color || C.navy}"></div></div>
      <span class="rep-bar-val">${r.txt || _N(r.val)}</span>
    </div>`).join('');
}

function _firma() {
  const ahora = new Date().toLocaleString('es-HN', { dateStyle: 'full', timeStyle: 'medium' });
  return `<div style="display:flex;align-items:center;gap:9px;background:#F4F7FA;border-radius:9px;padding:9px 14px;margin-top:7px;border:1px solid #E0E9F2">
    <img src="/img/logo.png" style="width:24px;height:24px;object-fit:contain">
    <p style="margin:0;font-size:10.5px;color:#94A3B8">Generado por <strong style="color:#003C78">Sistema ERP CRUZYMAR</strong> · ${ahora} · Victoria, Yoro, Honduras</p>
  </div>`;
}

/* ══════════════════════════════════════
   D1 — PRODUCCIÓN DIARIA (solo detalle, sin gráficas)
══════════════════════════════════════ */
async function repD1() {
  const qs = _buildQS({ fecha: _filtros.f_desde, fechaFin: _filtros.f_hasta, estado: _filtros.f_estado });
  const d = await _rq('/reportes/detallado/produccion' + qs);
  const k = d.kpis || {};
 
  const registros = d.registros || [];
  const conSubproducto = registros.filter(r => Number(r.salida_secundaria_cantidad) > 0).length;
 
  const html = _header('d1') +
    _card('Detalle de lotes del período', 'ri-flask-line', _tbl([
      { lbl: 'N° Lote', key: 'numero_lote', style: 'width:13%' },
      { lbl: 'Producto', key: 'producto_nombre', style: 'width:18%' },
      { lbl: 'Leche (L)', key: 'leche_usada', render: r => _N(r.leche_usada) + ' L' },
      { lbl: 'Obtenido', key: 'cantidad_obtenida', render: r => r.cantidad_obtenida > 0 ? _N(r.cantidad_obtenida) + (r.unidad === 'litros' ? ' L' : ' Lbs') : '—' },
      { lbl: 'Rendimiento', key: 'rendimiento', render: r => r.rendimiento > 0 ? _P(r.rendimiento) : '—' },
      {
        lbl: 'Subproducto', key: 'salida_secundaria', tdStyle: 'min-width:110px',
        render: r => Number(r.salida_secundaria_cantidad) > 0
          ? `<span style="color:#0A6BC4">${_N(r.salida_secundaria_cantidad)} ${r.salida_secundaria_unidad === 'litros' ? 'L' : 'Lbs'} ${r.salida_secundaria_nombre || ''}</span>`
          : '<span style="color:#94A3B8">—</span>'
      },
      { lbl: 'Turno', key: 'turno' },
      { lbl: 'Fecha', key: 'fecha_produccion', render: r => _fec(r.fecha_produccion) },
      { lbl: 'Estado', key: 'estado', render: r => r.estado === 'Completada' ? _badge('Completada', 'rb-ok') : r.estado === 'En proceso' ? _badge('En proceso', 'rb-blu') : _badge(r.estado, 'rb-pen') },
    ], registros), 'class="rep-card-detallado"') +
    _krow([
      { lbl: 'Litros procesados', val: _N(k.total_litros) + ' L', cls: 'grn' },
    { lbl: 'Producción total de derivados (libras)', val: _N(k.total_libras) + ' Lbs', cls: 'grn' },
      { lbl: 'Lotes con subproducto', val: conSubproducto, cls: 'blu' },
      { lbl: 'Lotes completados', val: `${k.completados || 0} / ${k.total_lotes || 0}` },
    ]) +
    _firma();
 
  _set('rep-content', html);
}

/* ══════════════════════════════════════
   D2 — CONTROL DE CALIDAD (solo detalle, sin gráficas)
══════════════════════════════════════ */
async function repD2() {
  const qs = _buildQS({ fecha: _filtros.f_desde, fechaFin: _filtros.f_hasta, resultado: _filtros.f_resultado });
  const d = await _rq('/reportes/detallado/calidad' + qs);
  const k = d.kpis || {};
  const registros = d.recepcionLeche || [];

  // Las pruebas de campo tienen 3 resultados posibles: Aprobado, Rechazado u Observación.
  // Se calculan aquí desde los registros para garantizar que los KPI siempre sumen el
  // total real (independiente de lo que devuelva el backend en `kpis`).
  const totalPruebas = registros.length || k.total_pruebas || 0;
  const aprobados = registros.length ? registros.filter(r => r.resultado === 'Aprobado').length : (k.aprobados || 0);
  const rechazados = registros.length ? registros.filter(r => r.resultado === 'Rechazado').length : (k.rechazados || 0);
  const observacion = registros.length ? registros.filter(r => r.resultado === 'Observación').length : (k.observacion || 0);
  const alcoholPositivo = registros.length ? registros.filter(r => r.prueba_alcohol && r.prueba_alcohol !== 'Negativa').length : (k.alcohol_positivo || 0);
  const tasaAprobacion = totalPruebas > 0 ? (aprobados / totalPruebas * 100) : (k.tasa_aprobacion || 0);

  const resBadge = r => r.resultado === 'Aprobado' ? _badge('Aprobado', 'rb-ok') : r.resultado === 'Rechazado' ? _badge('Rechazado', 'rb-rej') : _badge('Observación', 'rb-obs');

  const html = _header('d2') +
    _card('Registros de pruebas de campo', 'ri-test-tube-line', _tbl([
      { lbl: 'Proveedor', key: 'proveedor_nombre', style: 'width:18%' },
      { lbl: 'Litros', key: 'litros_acopio', render: r => _N(r.litros_acopio) + ' L' },
      { lbl: 'Olor', key: 'olor', render: r => r.olor === 'Normal' ? _badge('Normal', 'rb-ok') : _badge('Anormal', 'rb-rej') },
      { lbl: 'Color', key: 'color', render: r => r.color === 'Normal' ? _badge('Normal', 'rb-ok') : _badge('Anormal', 'rb-rej') },
      { lbl: 'Aspecto', key: 'aspecto', render: r => r.aspecto === 'Normal' ? _badge('Normal', 'rb-ok') : _badge('Anormal', 'rb-rej') },
      { lbl: 'Alcohol', key: 'prueba_alcohol', render: r => r.prueba_alcohol === 'Negativa' ? _badge('Negativa', 'rb-ok') : _badge('Positiva', 'rb-rej') },
      { lbl: 'Densidad', key: 'densidad', render: r => r.densidad ? Number(r.densidad).toFixed(3) : '—' },
      { lbl: 'Resultado', key: 'resultado', render: resBadge },
      { lbl: 'Analista', key: 'analista_nombre', style: 'width:13%' },
      { lbl: 'Fecha', key: 'fecha', render: r => _fec(r.fecha) },
    ], registros), 'class="rep-card-detallado"') +
    _krow([
      { lbl: 'Total pruebas', val: totalPruebas },
      { lbl: 'Aprobados', val: aprobados, cls: 'grn' },
      { lbl: 'En observación', val: observacion, cls: observacion > 0 ? 'amb' : '' },
      { lbl: 'Rechazados', val: rechazados, cls: rechazados > 0 ? 'red' : '' },
      { lbl: 'Tasa aprobación', val: _P(tasaAprobacion), cls: tasaAprobacion >= 85 ? 'grn' : 'red' },
      { lbl: 'Alcohol positivo', val: alcoholPositivo, cls: alcoholPositivo > 0 ? 'red' : '' },
    ]) + _firma();

  _set('rep-content', html);
}

/* ══════════════════════════════════════
   D3 — DISTRIBUCIÓN (solo detalle, sin gráficas)
══════════════════════════════════════ */
async function repD3() {
  const qs = _buildQS({ fecha: _filtros.f_desde, fechaFin: _filtros.f_hasta, estado: _filtros.f_estado });
  const d = await _rq('/reportes/detallado/distribucion' + qs);
  const k = d.kpis || {};

  const estBadge = e => e === 'Pagada' ? _badge('Pagada', 'rb-ok') : e === 'Pendiente' ? _badge('Pendiente', 'rb-pen') : _badge(e, 'rb-rej');

  const html = _header('d3') +

    _card('Ventas / despachos del período', 'ri-truck-line', _tbl([
      { lbl: 'N°', key: 'numero', style: 'width:11%' },
      { lbl: 'Fecha', key: 'fecha', render: r => _fec(r.fecha) },
      { lbl: 'Cliente', key: 'cliente_nombre', style: 'width:20%' },
      { lbl: 'Total', key: 'total', render: r => `<strong>${_L(r.total)}</strong>` },
      { lbl: 'Pago', key: 'metodo_pago' },
      { lbl: 'Estado', key: 'estado', render: r => estBadge(r.estado) },
    ], d.registros), 'class="rep-card-detallado"') +
    _krow([
      { lbl: 'Total ventas', val: k.total_facturas || 0 },
      { lbl: 'Total facturado', val: _L(k.total_facturado), cls: 'grn' },
      { lbl: 'Pendiente de cobro', val: _L(k.pendiente_cobro), cls: (k.pendiente_cobro || 0) > 0 ? 'amb' : '' },
      { lbl: 'Clientes atendidos', val: k.clientes_atendidos || 0, cls: 'blu' },
      { lbl: 'Venta promedio', val: _L(k.ticket_promedio) },
    ]) + _firma();

  _set('rep-content', html);
}

/* ══════════════════════════════════════
   D4 — INVENTARIO (solo detalle, sin gráficas)
══════════════════════════════════════ */
async function repD4() {
  const d = await _rq('/reportes/sintetizado/inventario');
  const k = d.kpis || {};

  const stBadge = (p) => Number(p.stock) <= Number(p.stock_minimo) ? _badge('Bajo stock', 'rb-rej') : Number(p.stock) < Number(p.stock_minimo) * 1.2 ? _badge('Alerta', 'rb-pen') : _badge('Normal', 'rb-ok');
  const pct = p => p.stock_minimo > 0 ? Math.min(100, Math.round(p.stock / p.stock_minimo * 100)) : 100;

  const html = _header('d4') +

    _card('Existencias actuales por producto', 'ri-archive-line', _tbl([
      { lbl: 'Producto', key: 'nombre' },
      { lbl: 'Categoría', key: 'categoria' },
      { lbl: 'Existencias', key: 'stock', render: r => `<strong>${_N(r.stock)}</strong> ${r.unidad || 'u.'}` },
      { lbl: 'Mínimo', key: 'stock_minimo', render: r => `${_N(r.stock_minimo)} ${r.unidad || 'u.'}` },
      {
        lbl: 'Cobertura', key: '_cob',
        render: r => {
          const p = pct(r);
          const c = p < 100 ? '#DC2626' : p < 120 ? '#0A6BC4' : '#468C28';
          return `<div style="display:flex;align-items:center;gap:6px">
            <div style="flex:1;height:6px;background:#F1F5F9;border-radius:3px;overflow:hidden">
              <div style="width:${Math.min(p, 100)}%;height:100%;background:${c};border-radius:3px"></div>
            </div>
            <span style="font-size:11px;color:${c};font-weight:700;min-width:35px">${p}%</span>
          </div>`;
        }
      },
      { lbl: 'Estado', key: '_st', render: stBadge },
      { lbl: 'Precio', key: 'precio', render: r => _L(r.precio) },
    ], d.productos || []), 'class="rep-card-detallado"') +
    _krow([
      { lbl: 'Total unidades', val: _N(k.total_unidades), cls: 'grn' },
      { lbl: 'Valor est. inventario', val: _L(k.valor_estimado), cls: 'grn' },
      { lbl: 'Productos activos', val: k.total_productos || 0 },
      { lbl: 'Bajo mínimo', val: k.productos_bajo_stock || 0, cls: (k.productos_bajo_stock || 0) > 0 ? 'red' : '' },
      { lbl: 'Agotados', val: k.productos_agotados || 0, cls: (k.productos_agotados || 0) > 0 ? 'red' : '' },
    ]) + _firma();

  _set('rep-content', html);
}

/* ══════════════════════════════════════
   S1 — DESEMPEÑO DE PROVEEDORES
══════════════════════════════════════ */
async function repS1() {
  const qs = _buildQS({ mes: _filtros.f_mes, anio: _filtros.f_anio });
  const d = await _rq('/reportes/sintetizado/produccion' + qs);
  const k = d.kpis || {};
  const pp = d.porProveedor || [];
  const reg = d.registros || [];

  /* ── Calificación visual por % aceptación ── */
  const _calif = (pct) => {
    const p = Number(pct || 0);
    if (p >= 90) return { lbl: 'Excelente', cls: 'rb-ok' };
    if (p >= 75) return { lbl: 'Regular', cls: 'rb-obs' };
    return { lbl: 'Deficiente', cls: 'rb-rej' };
  };

  /* ── Mini barra de aceptación ── */
  const _minibar = (pct) => {
    const p = Math.min(100, Number(pct || 0));
    const c = p >= 90 ? '#468C28' : p >= 75 ? '#0A6BC4' : '#DC2626';
    return `<div style="display:flex;align-items:center;gap:6px">
      <div style="flex:1;min-width:60px;height:7px;background:#F1F5F9;border-radius:4px;overflow:hidden">
        <div style="width:${p}%;height:100%;background:${c};border-radius:4px"></div>
      </div>
      <span style="font-size:11.5px;font-weight:700;color:${c};min-width:38px">${p.toFixed(1)}%</span>
    </div>`;
  };

  /* ── Badge de estado de entrega ── */
  const _estBadge = (e) =>
    e === 'Aceptada' ? _badge('Aceptada', 'rb-ok')
      : e === 'Rechazada' ? _badge('Rechazada', 'rb-rej')
        : _badge(e || 'Pendiente', 'rb-pen');

  /* ── Etiqueta de período ── */
  const periodoLabel = (() => {
    if (!d.periodo) return '';
    if (d.periodo.mes && String(d.periodo.mes).length === 4) return `Año ${d.periodo.mes}`;
    const meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    if (d.periodo.inicio) {
      const parts = d.periodo.inicio.split('-');
      return `${meses[parseInt(parts[1], 10)] || ''} ${parts[0]}`;
    }
    return '';
  })();

  const html =
    _header('s1') +

    /* ── BANNER período ── */
    `<div style="display:flex;align-items:center;gap:9px;background:var(--navy-soft,#EAF2FB);border:1px solid #D5E5F7;border-radius:9px;padding:9px 14px;margin-bottom:12px">
      <i class="ri-calendar-line" style="color:#003C78;font-size:15px"></i>
      <p style="margin:0;font-size:11.5px;color:#0A4A8F">
        <strong>Período analizado:</strong> ${periodoLabel}
        &nbsp;·&nbsp; Total proveedores: <strong>${k.total_proveedores || 0}</strong>
        &nbsp;·&nbsp; Tasa de aceptación global:
        <strong style="color:${Number(k.pct_aceptacion_global || 0) >= 85 ? '#468C28' : '#DC2626'}">${Number(k.pct_aceptacion_global || 0).toFixed(1)}%</strong>
      </p>
    </div>` +

    /* ── KPI CARDS ── */
    _krow([
      { lbl: 'Total Entregas', val: _N(k.total_entregas), cls: 'blu' },
      { lbl: 'Aceptadas', val: _N(k.total_aceptadas), cls: 'grn' },
      { lbl: 'Rechazadas', val: _N(k.total_rechazadas), cls: Number(k.total_rechazadas || 0) > 0 ? 'red' : '' },
      { lbl: 'Litros Aceptados', val: _N(k.litros_aceptados) + ' L', cls: 'grn' },
      { lbl: 'Litros Rechazados', val: _N(k.litros_rechazados) + ' L', cls: Number(k.litros_rechazados || 0) > 0 ? 'red' : '' },
      { lbl: 'Total Pagado', val: _L(k.total_pagado), cls: 'grn' },
    ]) +

    /* ── FILA: dona + barras ── */
    `<div class="rep-row2">` +
    _card('Entregas por estado (global)', 'ri-pie-chart-line',
      `<div style="display:flex;align-items:center;gap:0">
        <div style="flex:0 0 55%;height:240px;position:relative"><canvas id="cS1Dona"></canvas></div>
        <div id="legS1Dona" style="flex:1;font-size:11px;padding-left:8px"></div>
      </div>`) +
    _card('Top proveedores por litros aceptados', 'ri-bar-chart-2-line',
      `<div class="rep-chart-wrap" style="height:240px"><canvas id="cS1Bars"></canvas></div>`) +
    `</div>` +

    /* ── TABLA MAESTRA por proveedor ── */
    _card('Resumen por proveedor', 'ri-group-line', _tbl([
      { lbl: 'Proveedor', key: 'proveedor', style: 'width:18%' },
      { lbl: 'Teléfono', key: 'telefono', render: r => r.telefono || '—' },
      { lbl: 'Entregas', key: 'total_entregas', style: 'width:7%' },
      { lbl: 'Aceptadas', key: 'aceptadas', render: r => `<span style="color:#468C28;font-weight:700">${_N(r.aceptadas)}</span>` },
      { lbl: 'Rechazadas', key: 'rechazadas', render: r => Number(r.rechazadas) > 0 ? `<span style="color:#DC2626;font-weight:700">${_N(r.rechazadas)}</span>` : `<span style="color:#94A3B8">0</span>` },
      { lbl: 'Litros Acept.', key: 'litros_aceptados', render: r => _N(r.litros_aceptados) + ' L' },
      { lbl: 'Prom. L/entrega', key: 'promedio_litros', render: r => r.promedio_litros ? _N(r.promedio_litros) + ' L' : '—' },
      { lbl: 'Total Pagado', key: 'total_pagado', render: r => _L(r.total_pagado) },
      { lbl: '% Aceptación', key: 'pct_aceptacion', render: r => _minibar(r.pct_aceptacion) },
      { lbl: 'Calificación', key: '_cal', render: r => { const c = _calif(r.pct_aceptacion); return _badge(c.lbl, c.cls); } },
      { lbl: 'Última Entrega', key: 'ultima_entrega', render: r => _fec(r.ultima_entrega) },
    ], pp)) +

    /* ── TABLA DETALLE de entregas individuales ── */
    _card('Detalle de entregas del período', 'ri-list-check', _tbl([
      { lbl: 'Fecha', key: 'fecha', render: r => _fec(r.fecha) },
      { lbl: 'Proveedor', key: 'proveedor_nombre', style: 'width:20%' },
      { lbl: 'Turno', key: 'turno' },
      { lbl: 'Litros', key: 'litros', render: r => `<strong>${_N(r.litros)}</strong> L` },
      { lbl: 'Precio/L', key: 'precio_litro', render: r => _L(r.precio_litro) },
      { lbl: 'Total', key: 'total_pagar', render: r => `<strong>${_L(r.total_pagar)}</strong>` },
      { lbl: 'Estado', key: 'estado', render: r => _estBadge(r.estado) },
      {
        lbl: 'Motivo Rechazo', key: 'motivo_rechazo',
        render: r => r.estado === 'Rechazada' && r.motivo_rechazo
          ? `<span style="color:#DC2626;font-size:11px">${r.motivo_rechazo}</span>`
          : `<span style="color:#94A3B8">—</span>`
      },
    ], reg), 'class="rep-card-detallado"') +

    _firma();

  _set('rep-content', html);

  /* ── CHARTS ── */
  _loadChart(() => {
    /* Dona: Aceptadas vs Rechazadas vs Pendientes */
    const totalAc = Number(k.total_aceptadas || 0);
    const totalRec = Number(k.total_rechazadas || 0);
    const totalPen = Math.max(0, Number(k.total_entregas || 0) - totalAc - totalRec);
    const donaData = [
      { lbl: 'Aceptadas', val: totalAc, col: C.verde },
      { lbl: 'Rechazadas', val: totalRec, col: C.red },
      { lbl: 'Pendientes', val: totalPen, col: C.navy3 },
    ].filter(x => x.val > 0);

    if (donaData.length) {
      _chart('cS1Dona', {
        type: 'doughnut',
        plugins: [leaderLinePlugin],
        data: {
          labels: donaData.map(x => x.lbl),
          datasets: [{ data: donaData.map(x => x.val), backgroundColor: donaData.map(x => x.col), borderWidth: 1.5, borderColor: '#fff' }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          cutout: '52%',
          layout: { padding: 40 },
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: c => c.label + ': ' + _N(c.raw) + ' entregas' } },
            datalabels: { display: false }
          }
        }
      });
      _donaLegend('cS1Dona', 'legS1Dona');
    }

    /* Barras horizontales: top 8 por litros aceptados */
    const top8 = [...pp].sort((a, b) => Number(b.litros_aceptados) - Number(a.litros_aceptados)).slice(0, 8);
    if (top8.length) {
      _chart('cS1Bars', {
        type: 'bar',
        data: {
          labels: top8.map(r => r.proveedor || 'S/N'),
          datasets: [{
            label: 'Litros Aceptados',
            data: top8.map(r => Number(r.litros_aceptados)),
            backgroundColor: top8.map(r => {
              const p = Number(r.pct_aceptacion || 0);
              return p >= 90 ? C.verde : p >= 75 ? C.navy2 : C.red;
            }),
            borderRadius: 5,
            borderSkipped: false
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: c => ' ' + _N(c.raw) + ' L aceptados' } },
            datalabels: {
              display: true, anchor: 'end', align: 'right',
              color: '#1E293B', font: { weight: '700', size: 10 },
              formatter: v => _N(v) + ' L'
            }
          },
          scales: {
            x: { grid: { color: gridC }, ticks: { color: tickC, font: { size: 10 } } },
            y: { grid: { display: false }, ticks: { color: '#334155', font: { size: 11 } } }
          },
          layout: { padding: { right: 55 } }
        }
      });
    }
  });
}



/* ══════════════════════════════════════
   S2 — ESTADOS FINANCIEROS
══════════════════════════════════════ */
async function repS2() {
  const qs = _buildQS({ mes: _filtros.f_mes, anio: _filtros.f_anio });
  const d = await _rq('/reportes/sintetizado/financiero' + qs);
  const k = d.kpis || {};

  const html = _header('s2') +
    _card('Ingresos vs Egresos del mes', 'ri-bar-chart-2-line',
      `<div class="rep-chart-wrap" style="height:200px"><canvas id="cS2Cmp"></canvas></div>`) +
    `<div class="rep-row2">` +
    _card('Ventas por semana del mes', 'ri-line-chart-line',
      `<div class="rep-chart-wrap" style="height:200px"><canvas id="cS2Sem"></canvas></div>`) +
    _card('Egresos por categoría', 'ri-pie-chart-line',
      `<div style="display:flex;align-items:center;gap:0"><div style="flex:0 0 55%;height:240px;position:relative"><canvas id="cS2Cat"></canvas></div><div id="legS2Cat" style="flex:1;font-size:11px;padding-left:8px"></div></div>`) +
    `</div>` +
    _card('Detalle de egresos por categoría', 'ri-list-check', _tbl([
      { lbl: 'Categoría', key: 'categoria' },
      { lbl: 'Monto', key: 'total', render: r => `<strong>${_L(r.total)}</strong>` },
    ], d.gastosCategoria || [])) +
    _krow([
      { lbl: 'Ingresos', val: _L(k.ingresos), cls: 'grn' },
      { lbl: 'Egresos', val: _L(k.egresos), cls: 'red' },
      { lbl: 'Ganancia', val: _L(k.utilidad), cls: (k.utilidad || 0) >= 0 ? 'grn' : 'red' },
      { lbl: 'Margen', val: _P(k.margen), cls: (k.margen || 0) >= 15 ? 'grn' : (k.margen || 0) >= 5 ? 'amb' : 'red' },
    ]) +
    _firma();

  _set('rep-content', html);
  _loadChart(() => {
    const sems = d.semanas || [];
    const ingresosMes = Number(k.ingresos || 0);
    const egresosMes = Number(k.egresos || 0);
    const utilidad = ingresosMes - egresosMes;

    // ── Chart 1: Comparativa REAL Ingresos vs Egresos vs Ganancia del mes ──
    _chart('cS2Cmp', {
      type: 'bar',
      data: {
        labels: ['Ingresos', 'Egresos', 'Ganancia'],
        datasets: [{
          label: 'Monto (L.)',
          data: [ingresosMes, egresosMes, Math.max(utilidad, 0)],
          backgroundColor: [C.navy, C.verde, C.navy2],
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => _L(c.raw) } },
          datalabels: {
            display: true,
            color: '#fff',
            anchor: 'center', align: 'center',
            font: { weight: '700', size: 11 },
            formatter: v => _L(v)
          }
        },
        scales: {
          x: { ticks: { color: tickC, font: { size: 12, weight: '600' } }, grid: { display: false } },
          y: { ticks: { color: tickC, callback: v => 'L.' + Math.round(v / 1000) + 'K' }, grid: { color: gridC } }
        }
      }
    });

    // ── Chart 2: Ventas reales por semana (solo ingresos, datos reales) ──
    _chart('cS2Sem', {
      type: 'line',
      data: {
        labels: sems.length ? sems.map(s => s.semana) : ['Sin datos'],
        datasets: [{
          label: 'Ventas',
          data: sems.length ? sems.map(s => Number(s.total)) : [0],
          borderColor: C.navy,
          backgroundColor: 'rgba(0,60,120,.08)',
          fill: true,
          tension: 0.35,
          pointBackgroundColor: C.navy,
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => 'Ventas: ' + _L(c.raw) } },
          datalabels: {
            display: true,
            color: C.navy, anchor: 'top', align: 'top', offset: 4,
            font: { weight: '700', size: 10 },
            formatter: v => v > 0 ? _L(v) : ''
          }
        },
        scales: {
          x: { ticks: { color: tickC }, grid: { display: false } },
          y: { ticks: { color: tickC, callback: v => 'L.' + Math.round(v / 1000) + 'K' }, grid: { color: gridC } }
        }
      }
    });

    const gats = d.gastosCategoria || [];
    if (gats.length) {
      _chart('cS2Cat', {
        type: 'doughnut',
        plugins: [leaderLinePlugin],
        data: {
          labels: gats.map(g => g.categoria),
          datasets: [{ data: gats.map(g => g.total), backgroundColor: COLS, borderWidth: 1.2, borderColor: '#ffffff' }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          cutout: '50%',
          layout: { padding: 40 },
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: c => c.label + ': ' + _L(c.raw) } },
            datalabels: { display: false }
          }
        }
      });
      _applyDonaLines('cS2Cat');
      _donaLegend('cS2Cat', 'legS2Cat');
    }
  });
}

/* ══════════════════════════════════════
   S3 — VENTAS DE PRODUCTOS LÁCTEOS
══════════════════════════════════════ */
async function repS3() {
  const qs = _buildQS({ mes: _filtros.f_mes, anio: _filtros.f_anio });
  const d = await _rq('/reportes/sintetizado/ventas' + qs);
  const k = d.kpis || {};

  const html = _header('s3') +
    `<div class="rep-row2">` +
    _card('Top productos por ingresos', 'ri-bar-chart-2-line',
      `<div class="rep-chart-wrap" style="height:220px"><canvas id="cS3Prod"></canvas></div>`) +
    _card('Top clientes del mes', 'ri-user-star-line',
      _bars((d.topClientes || []).slice(0, 6).map(c => ({ lbl: c.cliente_nombre, val: Number(c.total_comprado), txt: _L(c.total_comprado), color: C.verde })))) +
    `</div>` +
    _card('Detalle de ventas por producto', 'ri-list-check', _tbl([
      { lbl: 'Producto', key: 'producto' },
      { lbl: 'Unidades vendidas', key: 'total_vendido', render: r => _N(r.total_vendido) },
      { lbl: 'Precio prom.', key: 'precio_prom', render: r => _L(r.precio_prom) },
      { lbl: 'Ingresos', key: 'total_ingresos', render: r => `<strong>${_L(r.total_ingresos)}</strong>` },
      { lbl: 'N° Ventas', key: 'num_ventas' },
    ], d.productos || [])) +
    _krow([
      { lbl: 'Total ventas', val: k.total_ventas || 0 },
      { lbl: 'Ingresos totales', val: _L(k.total_ingresos), cls: 'grn' },
      { lbl: 'Venta promedio', val: _L(k.ticket_promedio) },
      { lbl: 'Clientes únicos', val: k.clientes_distintos || 0, cls: 'blu' },
    ]) +
    _firma();

  _set('rep-content', html);
  _loadChart(() => {
    const top = (d.productos || []).slice(0, 7);
    _chart('cS3Prod', {
      type: 'bar',
      data: {
        labels: top.map(p => p.producto),
        datasets: [{ label: 'Ingresos', data: top.map(p => Number(p.total_ingresos)), backgroundColor: COLS, borderRadius: 4 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false }, tooltip: { callbacks: { label: c => _L(c.raw) } },
          datalabels: _dlVal('L.')
        },
        scales: {
          x: { ticks: { color: tickC, font: { size: 10 } }, grid: { display: false } },
          y: { ticks: { color: tickC, callback: v => 'L.' + Math.round(v / 1000) + 'K' }, grid: { color: gridC } }
        }
      }
    });
  });
}

/* ══════════════════════════════════════
   S4 — PRODUCTO POR CLIENTE
══════════════════════════════════════ */
async function repS4() {
  const qs = _buildQS({ mes: _filtros.f_mes, anio: _filtros.f_anio });
  const d = await _rq('/reportes/sintetizado/producto-cliente' + qs);

  const filas = (d.porCliente || []).map(cli => `
    <tr style="background:#F8FAFC">
      <td colspan="5" style="padding:9px 12px;font-weight:800;color:#003C78;border-bottom:1px solid #E0E9F2">
        <i class="ri-user-line"></i> ${cli.cliente} &nbsp;
        <span style="font-weight:400;font-size:11px;color:#64748B">— ${cli.productos.length} producto(s) · Total: ${_L(cli.total)}</span>
      </td>
    </tr>
    ${cli.productos.map(p => `
    <tr>
      <td style="padding:8px 12px 8px 28px;color:#334155">${p.producto}</td>
      <td style="padding:8px 12px;text-align:right">${_N(p.cantidad_total)}</td>
      <td style="padding:8px 12px;text-align:right"><strong>${_L(p.monto_total)}</strong></td>
      <td style="padding:8px 12px">${p.num_pedidos} compras</td>
      <td style="padding:8px 12px;color:#94A3B8;font-size:11px">${_fec(p.ultima_compra)}</td>
    </tr>`).join('')}
  `).join('');

  const html = _header('s4') +
    _card('Productos comprados por cliente', 'ri-user-heart-line', `
      <table class="rep-tbl">
        <thead><tr>
          <th>Producto</th><th style="text-align:right">Cantidad</th>
          <th style="text-align:right">Monto</th><th>Frecuencia</th><th>Última compra</th>
        </tr></thead>
        <tbody>${filas || '<tr><td colspan="5" style="text-align:center;padding:20px;color:#94A3B8">Sin registros</td></tr>'}</tbody>
      </table>`) +
    _card('Distribución de ingresos por cliente', 'ri-pie-chart-line',
      `<div style="display:flex;align-items:center;gap:0"><div style="flex:0 0 55%;height:240px;position:relative"><canvas id="cS4Dona"></canvas></div><div id="legS4" style="flex:1;font-size:11px;padding-left:8px"></div></div>`) +
    _krow([
      { lbl: 'Clientes analizados', val: (d.porCliente || []).length, cls: 'blu' },
      { lbl: 'Transacciones', val: (d.registros || []).length },
      { lbl: 'Ingreso total', val: _L((d.registros || []).reduce((s, r) => s + Number(r.monto_total || 0), 0)), cls: 'grn' },
    ]) +
    _firma();

  _set('rep-content', html);
  _loadChart(() => {
    const top = (d.porCliente || []).slice(0, 7);
    _chart('cS4Dona', {
      type: 'doughnut',
      plugins: [leaderLinePlugin],
      data: { labels: top.map(c => c.cliente), datasets: [{ data: top.map(c => c.total), backgroundColor: COLS, borderWidth: 1.2, borderColor: '#ffffff' }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '50%',
        layout: { padding: 40 },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => c.label + ': ' + _L(c.raw) } },
          datalabels: { display: false }
        }
      }
    });
    _applyDonaLines('cS4Dona');
    _donaLegend('cS4Dona', 'legS4');
  });
}

/* ══════════════════════════════════════
   E1 — LECHE NO APTA
══════════════════════════════════════ */
async function repE1() {
  const qs = _buildQS({ fecha: _filtros.f_desde, fechaFin: _filtros.f_hasta });
  const d = await _rq('/reportes/excepcion/leche-no-apta' + qs);
  const k = d.kpis || {};

  // Badge excepción
  const badge = _el('rep-badge-exc');
  if (badge) { badge.textContent = '!'; badge.style.display = (k.total_rechazos || 0) > 0 ? 'inline' : 'none'; }

  const filas = (d.registros || []).map(r => `
    <div class="rep-exc-row" style="border-left:3px solid #DC2626">
      <div class="rep-exc-icon red"><i class="ri-close-circle-line"></i></div>
      <div style="flex:1">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:5px">
          <strong style="font-size:13px;color:#1E293B">${r.proveedor_nombre || 'Sin nombre'}</strong>
          ${_badge('RECHAZADA', 'rb-rej')}
        </div>
        <p style="margin:4px 0 0;font-size:12px;color:#64748B">
          <strong>${_N(r.litros)} L</strong> rechazados · Fecha: <strong>${_fec(r.fecha)}</strong> · Turno: <strong>${r.turno || '—'}</strong>
        </p>
        ${r.motivo_rechazo ? `<p style="margin:3px 0 0;font-size:12px;color:#DC2626"><i class="ri-error-warning-line"></i> ${r.motivo_rechazo}</p>` : ''}
        <p style="margin:3px 0 0;font-size:11px;color:#94A3B8">
          Alcohol: <strong>${r.prueba_alcohol || '—'}</strong> · Densidad: <strong>${r.densidad ? Number(r.densidad).toFixed(3) : '—'}</strong>
          · Analista: ${r.analista_nombre || '—'}
        </p>
      </div>
      <div style="text-align:right;font-size:12px;color:#DC2626;font-weight:700">${_L(r.total_pagar)}<br><span style="font-size:10px;color:#94A3B8">pérdida</span></div>
    </div>`).join('');

  const html = _header('e1') +
    ((d.registros || []).length
      ? _card('Detalle de rechazos — acción requerida', 'ri-close-circle-line', filas, 'style="border-left:4px solid #DC2626;border-radius:0 13px 13px 0"')
      : `<div class="rep-empty" style="background:#F0FDF4;border-radius:13px;border:1.5px solid #DCFCE7">
          <i class="ri-checkbox-circle-line" style="color:#15803D"></i>
          <p style="font-weight:700;color:#15803D;margin:8px 0 4px">Sin rechazos en el período</p>
          <p style="font-size:12px;color:#64748B">Toda la leche recibida cumplió los estándares</p>
         </div>`) +
    _card('Rechazos por proveedor', 'ri-pie-chart-line',
      `<div style="display:flex;align-items:center;gap:0"><div style="flex:0 0 55%;height:240px;position:relative"><canvas id="cE1Dona"></canvas></div><div id="legE1" style="flex:1;font-size:11px;padding-left:8px"></div></div>`) +
    _krow([
      { lbl: 'Rechazos', val: k.total_rechazos || 0, cls: (k.total_rechazos || 0) > 0 ? 'red' : '' },
      { lbl: 'Litros rechazados', val: _N(k.litros_rechazados || 0) + ' L', cls: 'red' },
      { lbl: 'Costo perdido', val: _L(k.costo_perdido || 0), cls: 'red' },
      { lbl: 'Proveedores afectados', val: k.proveedores_afectados || 0 },
    ]) +
    _firma();

  _set('rep-content', html);
  _loadChart(() => {
    const pp = d.porProveedor || [];
    if (!pp.length) return;
    _chart('cE1Dona', {
      type: 'doughnut',
      plugins: [leaderLinePlugin],
      data: { labels: pp.map(p => p.proveedor || '?'), datasets: [{ data: pp.map(p => Number(p.litros || 0)), backgroundColor: COLS, borderWidth: 1.2, borderColor: '#ffffff' }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '50%',
        layout: { padding: 40 },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => c.label + ': ' + _N(c.raw) + ' L' } },
          datalabels: { display: false }
        }
      }
    });
    _applyDonaLines('cE1Dona');
    _donaLegend('cE1Dona', 'legE1');
  });
}


/* ══════════════════════════════════════
   IMPRIMIR
══════════════════════════════════════ */
function repImprimir() {
  const m = META[_rep] || {};
  const ahora = new Date();
  const fecStr = ahora.toLocaleDateString('es-HN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const horStr = ahora.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' });

  let usuario = 'Usuario del sistema';
  try {
    const tok = localStorage.getItem('crz_token') || '';
    if (tok) { const p = JSON.parse(atob(tok.split('.')[1])); usuario = p.nombre || p.email || usuario; }
  } catch (e) { }

  const f = _el('rph-fecha-imp'); if (f) f.textContent = `Fecha impresión: ${fecStr} — ${horStr}`;
  const u = _el('rph-usuario-imp'); if (u) u.textContent = `Generado por: ${usuario}`;
  const t = _el('rph-titulo-imp'); if (t) t.textContent = m.titulo || 'Reporte CRUZYMAR';
  const r = _el('rph-resp-imp'); if (r) r.textContent = `Responsables: ${m.resp || '—'} · Frecuencia: ${m.frec || '—'} · Retención: 5 años`;
  const s = _el('rph-sub-imp'); if (s) s.textContent = m.sub || '';

  // Mostrar header para el print
  const ph = _el('rep-print-header');
  if (ph) ph.style.display = 'block';

  window.print();

  setTimeout(() => { if (ph) ph.style.display = 'none'; }, 800);
}

/* ══════════════════════════════════════
   EXPORTAR EXCEL (.xlsx real con SheetJS)
══════════════════════════════════════ */
function repExportExcel() {
  const m = META[_rep] || {};
  const ahora = new Date();
  const fechaStr = ahora.toLocaleDateString('es-HN').replace(/\//g, '-');
  const fecLarga = ahora.toLocaleDateString('es-HN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const hora = ahora.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' });
  let usuario = 'Usuario del sistema';
  try { const tok = localStorage.getItem('crz_token') || ''; if (tok) { const p = JSON.parse(atob(tok.split('.')[1])); usuario = p.nombre || p.email || usuario; } } catch (e) { }

  // Recopilar filas de la tabla visible
  const tabla = document.querySelector('#rep-content .rep-tbl');
  let rows = [];
  // Cabecera empresa
  rows.push(['CRUZYMAR Productos Lácteos']);
  rows.push(['Victoria, Yoro, Honduras — Sistema ERP de Gestión Lechera']);
  rows.push([m.titulo || 'Reporte']);
  rows.push([`Fecha de impresión: ${fecLarga} — ${hora}`]);
  rows.push([`Generado por: ${usuario}`]);
  rows.push([`Responsables: ${m.resp || '—'} · Frecuencia: ${m.frec || '—'} · Retención: 5 años`]);
  rows.push([]); // espacio

  if (tabla) {
    const ths = Array.from(tabla.querySelectorAll('thead th')).map(th => th.innerText.trim());
    rows.push(ths);
    tabla.querySelectorAll('tbody tr').forEach(tr => {
      const celdas = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim().replace(/\n+/g, ' '));
      rows.push(celdas);
    });
  } else {
    // Si no hay tabla, exportar KPIs
    document.querySelectorAll('#rep-content .rep-kcard').forEach(k => {
      rows.push([k.querySelector('.lbl')?.innerText || '', k.querySelector('.val')?.innerText || '']);
    });
  }
  rows.push([]);
  rows.push([`— Documento generado por Sistema ERP CRUZYMAR — ${fecLarga} — Confidencial —`]);

  // Usar SheetJS si disponible, si no CSV con BOM
  if (window.XLSX) {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    // Estilos básicos: ancho de columnas
    ws['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
    const nombre = (m.titulo || 'reporte').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 35);
    XLSX.writeFile(wb, `cruzymar_${nombre}_${fechaStr}.xlsx`);
  } else {
    // Cargar SheetJS y reintentar
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = () => repExportExcel();
    document.head.appendChild(s);
  }
}

/* ══════════════════════════════════════
   UTILIDADES
══════════════════════════════════════ */
function _buildQS(params) {
  const p = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return p.length ? '?' + p.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&') : '';
}


/* Genera HTML de leyenda lista vertical estilo imagen — nombre + % bold coloreado + separador */
function _donaLegend(chartId, legendDivId) {
  const ch = _charts[chartId];
  if (!ch) return;
  const div = document.getElementById(legendDivId);
  if (!div) return;
  const ds = ch.data.datasets[0];
  const vals = ds.data.map(Number);
  const total = vals.reduce((a, b) => a + b, 0) || 1;
  const labels = ch.data.labels;
  const colors = ds.backgroundColor;

  div.style.cssText = 'display:flex;flex-direction:column;justify-content:center;gap:0;padding-left:12px';

  div.innerHTML = labels.map((lbl, i) => {
    const pct = (vals[i] / total * 100).toFixed(1);
    const col = Array.isArray(colors) ? colors[i] : colors;
    const isLast = i === labels.length - 1;
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;
                  padding:7px 0;${isLast ? '' : 'border-bottom:1px solid #EEF2F7;'}">
        <div style="display:flex;align-items:center;gap:8px;min-width:0">
          <span style="flex-shrink:0;width:11px;height:11px;border-radius:50%;
                       background:${col};display:inline-block"></span>
          <span style="font-size:11.5px;color:#334155;white-space:nowrap;
                       overflow:hidden;text-overflow:ellipsis;font-weight:500">${lbl}</span>
        </div>
        <strong style="font-size:12px;color:${col};white-space:nowrap;flex-shrink:0">${pct}%</strong>
      </div>`;
  }).join('');
}

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
function initReportes() {
  const chip = _el('rep-fecha-hoy');
  if (chip) chip.textContent = new Date().toLocaleDateString('es-HN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  repLoad('d1');
  // Pre-check excepciones
  _rq('/reportes/excepcion/leche-no-apta').then(d => {
    const b = _el('rep-badge-exc');
    if (b && (d.kpis?.total_rechazos || 0) > 0) { b.textContent = '!'; b.style.display = 'inline'; }
  }).catch(() => { });
}

if (document.getElementById('rep-root')) initReportes();