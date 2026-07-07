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

window.__reportReady = false;

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
    // Padding proporcional al tamaño real del canvas — nunca fijo.
    // Así, si el canvas es angosto (ej. 55% de la tarjeta), el padding
    // se reduce en vez de robarle espacio de más a la dona.
    const w = chart.width || 300;
    const h = chart.height || 240;
    const padX = Math.max(35, Math.min(70, w * 0.20));
    const padY = Math.max(18, Math.min(35, h * 0.12));
    chart.options.layout.padding = { left: padX, right: padX, top: padY, bottom: padY };
  },

  afterDraw(chart) {
    if (chart.config.type !== 'doughnut') return;
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    if (!meta.data.length) return;
    const vals = chart.data.datasets[0].data.map(Number);
    const total = vals.reduce((a, b) => a + b, 0) || 1;
    const bgColors = chart.data.datasets[0].backgroundColor;

    const cx = meta.data[0].x;
    const cy = meta.data[0].y;
    const outerR = meta.data[0].outerRadius;
    const canvasW = chart.width;
    const canvasH = chart.height;

    ctx.save();
    ctx.textBaseline = 'middle';

    const items = meta.data.map((arc, i) => {
      const pct = vals[i] / total * 100;
      if (pct < 0.1) return null;
      const midAngle = arc.startAngle + (arc.endAngle - arc.startAngle) / 2;
      const col = Array.isArray(bgColors) ? bgColors[i] : bgColors;
      return { pct, midAngle, col, text: pct.toFixed(1) + '%' };
    }).filter(Boolean);

    const rightItems = items.filter(d => Math.cos(d.midAngle) >= 0)
      .sort((a, b) => Math.sin(a.midAngle) - Math.sin(b.midAngle));
    const leftItems = items.filter(d => Math.cos(d.midAngle) < 0)
      .sort((a, b) => Math.sin(a.midAngle) - Math.sin(b.midAngle));

    function drawColumn(data, isRight) {
      if (!data.length) return;
      const R = outerR;

      data.forEach(d => { d.y = cy + Math.sin(d.midAngle) * (R + 10); });

      const H = 20;
      const minY = 12;
      const maxY = canvasH - 12;
      for (let iter = 0; iter < 30; iter++) {
        for (let i = 1; i < data.length; i++) {
          const dy = data[i].y - data[i - 1].y;
          if (dy < H) {
            const push = (H - dy) / 2;
            data[i].y += push;
            data[i - 1].y -= push;
          }
        }
        if (data[0].y < minY) { const off = minY - data[0].y; data.forEach(d => d.y += off); }
        if (data[data.length - 1].y > maxY) { const off = data[data.length - 1].y - maxY; data.forEach(d => d.y -= off); }
      }

      // ── CLAVE: nunca dejar que el texto caiga fuera del canvas real ──
      const anchoTexto = 46; // espacio aprox. que ocupa "100.0%"
      let textFixedX = isRight ? cx + R + 26 : cx - R - 26;
      if (isRight) textFixedX = Math.min(textFixedX, canvasW - anchoTexto - 4);
      else textFixedX = Math.max(textFixedX, anchoTexto + 4);

      data.forEach((d) => {
        const x0 = cx + Math.cos(d.midAngle) * R;
        const y0 = cy + Math.sin(d.midAngle) * R;
        const R_stub = R + 6;
        const x1 = cx + Math.cos(d.midAngle) * R_stub;
        const y1 = cy + Math.sin(d.midAngle) * R_stub;
        const x2 = textFixedX + (isRight ? -8 : 8);
        const y2 = d.y;

        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(textFixedX, y2);
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(textFixedX, d.y, 2.5, 0, 2 * Math.PI);
        ctx.fillStyle = d.col;
        ctx.fill();

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
      try {
        if (window.ChartDataLabels && Chart.registry.plugins.get('datalabels') == null) {
          Chart.register(window.ChartDataLabels);
        }
        // Fuerza el devicePixelRatio real de la página en vez de dejar que
        // Chart.js lo detecte automáticamente — esto evita el desfase que
        // provoca que la dona se dibuje cortada (solo un cuarto visible)
        // cuando Puppeteer usa deviceScaleFactor distinto de 1.
        Chart.defaults.devicePixelRatio = window.devicePixelRatio || 1;
      } catch (e) { }
      _cjsOk = true; _cjsCbs.forEach(f => f()); _cjsCbs = [];
    };
    s2.onerror = () => { _cjsOk = true; _cjsCbs.forEach(f => f()); _cjsCbs = []; };
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
    resp: 'Jefe de Planta · Gerencia',
    frec: 'Diario',
    icon: 'ri-flask-line',
    iconCls: ''
  },

  d2: {
    titulo: 'Reporte de Control de Calidad',
    sub: 'Departamento de Control de Calidad — Inocuidad y estándares',
    resp: 'Jefe de Calidad · Gerencia',
    frec: 'Diario',
    icon: 'ri-drop-line',
    iconCls: 'verde'
  },

  d3: {
    titulo: 'Reporte de Distribución',
    sub: 'Departamento de Distribución — Productos entregados y clientes',
    resp: 'Encargado de Distribución · Gerencia',
    frec: 'Diario',
    icon: 'ri-truck-line',
    iconCls: ''
  },

  d4: {
    titulo: 'Reporte de Inventario',
    sub: 'Supervisor de Almacén — Control de existencias de productos',
    resp: 'Supervisor de Almacén e Inventario · Gerencia',
    frec: 'Semanal',
    icon: 'ri-archive-line',
    iconCls: 'verde'
  },

  s1: {
    titulo: 'Desempeño de Proveedores',
    sub: 'Recepción de Leche y Compras — Entregas, volumen suministrado, aceptación y rechazos',
    resp: 'Encargado de Compras · Jefe de Planta · Gerencia',
    frec: 'Mensual',
    icon: 'ri-team-line',
    iconCls: ''
  },

  s2: {
    titulo: 'Estados Financieros',
    sub: 'Departamento de Contabilidad — Situación económica de la empresa',
    resp: 'Contabilidad · Gerencia',
    frec: 'Mensual / Anual',
    icon: 'ri-bank-line',
    iconCls: ''
  },

  s3: {
    titulo: 'Reporte de Ventas de Productos Lácteos',
    sub: 'Departamento de Ventas — Ingresos, tendencia y top productos',
    resp: 'Ventas · Gerencia',
    frec: 'Mensual',
    icon: 'ri-shopping-cart-line',
    iconCls: 'verde'
  },

  s4: {
    titulo: 'Reporte de Producto Comprado por Cliente',
    sub: 'Departamento de Ventas — Análisis de comportamiento de compra',
    resp: 'Ventas · Gerencia',
    frec: 'Mensual',
    icon: 'ri-user-heart-line',
    iconCls: ''
  },

  e1: {
    titulo: 'Reporte: Leche No Apta para Procesamiento',
    sub: 'Control de Calidad — Alertas y registro de materia prima rechazada',
    resp: 'Analista de Calidad · Jefe de Planta · Gerencia',
    frec: 'Eventual',
    icon: 'ri-close-circle-line',
    iconCls: 'rojo'
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

/* Llena el encabezado exclusivo de impresión (#rep-print-header en
   reportes.html). Este bloque estaba en el HTML desde antes con la barra
   azul y los spans #rph-titulo-imp / #rph-resp-imp / #rph-sub-imp /
   #rph-fecha-imp / #rph-usuario-imp, pero nada los llenaba — por eso
   salía vacío en el PDF. */
function _fillPrintHeader(rep) {
  const m = META[rep] || {};
  const ahora = new Date();
  const fecLarga = ahora.toLocaleDateString('es-HN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const hora = ahora.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' });

  let usuario = 'Usuario del sistema';
  try {
    const tok = localStorage.getItem('token') || '';
    if (tok) {
      const p = JSON.parse(atob(tok.split('.')[1]));
      usuario = p.nombre || p.email || usuario;
    }
  } catch (e) { /* si el token no decodifica, se deja el genérico */ }

  _set('rph-titulo-imp', m.titulo || 'Reporte');
  _set('rph-resp-imp', `Responsables: ${m.resp || '—'} · Frecuencia: ${m.frec || '—'}`);
  //_set('rph-sub-imp', m.sub || '');
  _set('rph-fecha-imp', `Fecha de impresión: ${fecLarga} — ${hora}`);
  _set('rph-usuario-imp', `Generado por: ${usuario}`);
}

async function _cargarReporte() {
  window.__reportReady = false;
  _fillPrintHeader(_rep);
  _set('rep-content', '<div class="rep-loading"><i class="ri-loader-4-line"></i><br>Cargando datos...</div>');
  try {
    await ({
      d1: repD1, d2: repD2, d3: repD3, d4: repD4,
      s1: repS1, s2: repS2, s3: repS3, s4: repS4,
      e1: repE1,
    }[_rep] || (() => { }))();
  } catch (e) {
    window.__reportReady = true;
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
    //{ icon: 'ri-map-pin-line', txt: 'Las Vegas,Victoria, Yoro' },
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
  const palette = {
    blue: ['k-blu', 'k-blu2', 'k-blu3'],
    green: ['k-grn', 'k-grn2', 'k-grn3']
  };

  return `
    <div class="rep-krow">
      ${cards.map(c => {

    const val = Number(c.val) || 0;

    // 🔵 tipo automático
    const isInfo =
      /total|valor|pagado|entregas|productos/i.test(c.lbl);

    const type = isInfo ? 'blue' : 'green';

    // 📊 intensidad automática según valor
    let level = 0;
    if (val > 0 && val < 50) level = 0;
    else if (val < 200) level = 1;
    else level = 2;

    const cls = palette[type][level];

    return `
          <div class="rep-kcard ${cls}">
            <div class="lbl">${c.lbl}</div>
            <div class="val">${c.val}</div>
          </div>
        `;
  }).join('')}
    </div>
  `;
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
    <p style="margin:0;font-size:10.5px;color:#94A3B8">Generado por <strong style="color:#003C78">Sistema ERP CRUZYMAR</strong> · ${ahora} · Las Vegas, Victoria, Yoro, Honduras</p>
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
      {
        lbl: 'N° Lote', key: 'numero_lote', style: 'width:13%',
        render: r => `<strong style="color:#003C78">${r.numero_lote || '—'}</strong>` +
          (r.lote_padre_numero
            ? `<div style="font-size:10.5px;color:#94A3B8;margin-top:2px">↳ de <strong>${r.lote_padre_numero}</strong></div>`
            : '')
      },
      { lbl: 'Producto', key: 'producto_nombre', style: 'width:18%' },
      { lbl: 'Leche (L)', key: 'leche_usada', render: r => _N(r.leche_usada) + ' L' },
      { lbl: 'Obtenido', key: 'cantidad_obtenida', render: r => r.cantidad_obtenida > 0 ? _N(r.cantidad_obtenida) + (r.unidad === 'litros' ? ' L' : ' Lbs') : '—' },
      {
        lbl: 'Indicador',
        key: 'indicador',
        render: r => r.indicador || '—'
      },
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
  window.__reportReady = true;
}

/* ══════════════════════════════════════
   D2 — CONTROL DE CALIDAD (recepción + lotes de producción)
══════════════════════════════════════ */
async function repD2() {
  const qs = _buildQS({ fecha: _filtros.f_desde, fechaFin: _filtros.f_hasta, resultado: _filtros.f_resultado });
  const d = await _rq('/reportes/detallado/calidad' + qs);
  const k = d.kpis || {};
  const registros = d.recepcionLeche || [];
  const lotes = d.lotesProduccion || [];

  // Combinar ambas fuentes para que los KPIs reflejen el total real
  // (recepción de leche + control de calidad de lotes terminados)
  const todos = [
    ...registros.map(r => ({ resultado: r.resultado })),
    ...lotes.map(l => ({ resultado: l.resultado }))
  ];

  const totalPruebas = todos.length || k.total_pruebas || 0;
  const aprobados = todos.length ? todos.filter(r => r.resultado === 'Aprobado').length : (k.aprobados || 0);
  const rechazados = todos.length ? todos.filter(r => r.resultado === 'Rechazado').length : (k.rechazados || 0);
  const observacion = todos.length ? todos.filter(r => r.resultado === 'Observación').length : (k.observacion || 0);
  const alcoholPositivo = registros.length ? registros.filter(r => r.prueba_alcohol && r.prueba_alcohol !== 'Negativa').length : (k.alcohol_positivo || 0);
  const tasaAprobacion = totalPruebas > 0 ? (aprobados / totalPruebas * 100) : (k.tasa_aprobacion || 0);

  const resBadge = r => r.resultado === 'Aprobado' ? _badge('Aprobado', 'rb-ok') : r.resultado === 'Rechazado' ? _badge('Rechazado', 'rb-rej') : _badge('Observación', 'rb-obs');

  const html = _header('d2') +

    _card('Pruebas de campo — Recepción de leche', 'ri-test-tube-line', _tbl([
      { lbl: 'Proveedor', key: 'proveedor_nombre', style: 'width:16%' },
      { lbl: 'Litros', key: 'litros_acopio', render: r => _N(r.litros_acopio) + ' L' },
      { lbl: 'Olor', key: 'olor', render: r => r.olor === 'Normal' ? _badge('Normal', 'rb-ok') : _badge('Anormal', 'rb-rej') },
      { lbl: 'Color', key: 'color', render: r => r.color === 'Normal' ? _badge('Normal', 'rb-ok') : _badge('Anormal', 'rb-rej') },
      { lbl: 'Aspecto', key: 'aspecto', render: r => r.aspecto === 'Normal' ? _badge('Normal', 'rb-ok') : _badge('Anormal', 'rb-rej') },
      { lbl: 'Alcohol', key: 'prueba_alcohol', render: r => r.prueba_alcohol === 'Negativa' ? _badge('Negativa', 'rb-ok') : _badge('Positiva', 'rb-rej') },
      { lbl: 'Densidad', key: 'densidad', render: r => r.densidad ? Number(r.densidad).toFixed(3) : '—' },
      { lbl: 'Resultado', key: 'resultado', render: resBadge },
      { lbl: 'Analista', key: 'analista_nombre', style: 'width:12%' },
      { lbl: 'Fecha', key: 'fecha', render: r => _fec(r.fecha) },
    ], registros), 'class="rep-card-detallado"') +

    _card('Control de calidad — Lotes de producción', 'ri-flask-line', _tbl([
      { lbl: 'N° Lote', key: 'numero_lote', style: 'width:13%', render: r => `<strong style="color:#003C78">${r.numero_lote || '—'}</strong>` },
      { lbl: 'Producto', key: 'producto_nombre', style: 'width:18%' },
      { lbl: 'Cantidad', key: 'cantidad_obtenida', render: r => r.cantidad_obtenida ? _N(r.cantidad_obtenida) + (r.unidad === 'litros' ? ' L' : ' Lbs') : '—' },
      { lbl: 'Turno', key: 'turno' },
      { lbl: 'Fecha', key: 'fecha_produccion', render: r => _fec(r.fecha_produccion) },
      { lbl: 'Resultado', key: 'resultado', render: resBadge },
      {
        lbl: 'Observaciones', key: 'observaciones',
        render: r => r.observaciones
          ? `<span style="font-size:11px;color:#64748B">${r.observaciones}</span>`
          : '<span style="color:#94A3B8">—</span>'
      },
    ], lotes), 'class="rep-card-detallado"') +

    _krow([
      { lbl: 'Total pruebas', val: totalPruebas },
      { lbl: 'Recepción leche', val: registros.length, cls: 'blu' },
      { lbl: 'Lotes producción', val: lotes.length, cls: 'blu' },
      { lbl: 'Aprobados', val: aprobados, cls: 'grn' },
      { lbl: 'En observación', val: observacion, cls: observacion > 0 ? 'amb' : '' },
      { lbl: 'Rechazados', val: rechazados, cls: rechazados > 0 ? 'red' : '' },
      { lbl: 'Tasa aprobación', val: _P(tasaAprobacion), cls: tasaAprobacion >= 85 ? 'grn' : 'red' },
      { lbl: 'Alcohol positivo', val: alcoholPositivo, cls: alcoholPositivo > 0 ? 'red' : '' },
    ]) + _firma();

  _set('rep-content', html);
  window.__reportReady = true;
}
/* ══════════════════════════════════════
   D3 — DISTRIBUCIÓN (solo tablas, sin gráficos)
══════════════════════════════════════ */
async function repD3() {
  const qs = _buildQS({ fecha: _filtros.f_desde, fechaFin: _filtros.f_hasta, estado: _filtros.f_estado });
  const d = await _rq('/reportes/detallado/distribucion' + qs);
  const k = d.kpis || {};

  const estBadge = e => e === 'Pagada' ? _badge('Pagada', 'rb-ok') : e === 'Pendiente' ? _badge('Pendiente', 'rb-pen') : _badge(e, 'rb-rej');

  const html = _header('d3') +

    _card('Ventas / despachos del período', 'ri-truck-line', _tbl([
      { lbl: 'N°', key: 'numero', style: 'width:9%' },
      { lbl: 'Fecha', key: 'fecha', render: r => _fec(r.fecha) },
      { lbl: 'Cliente', key: 'cliente_nombre', style: 'width:16%' },
      { lbl: 'Zona', key: 'zona', render: r => r.zona || '<span style="color:#94A3B8">—</span>' },
      { lbl: 'Transportista', key: 'transportista', render: r => r.transportista || '<span style="color:#94A3B8">—</span>' },
      { lbl: 'Total', key: 'total', render: r => `<strong>${_L(r.total)}</strong>` },
      { lbl: 'Pago', key: 'metodo_pago' },
      { lbl: 'Estado', key: 'estado', render: r => estBadge(r.estado) },
    ], d.registros), 'class="rep-card-detallado"') +

    _card('Resumen por zona / ruta', 'ri-map-pin-line', _tbl([
      { lbl: 'Zona', key: 'zona' },
      { lbl: 'Entregas', key: 'entregas' },
      { lbl: 'Facturado', key: 'facturado', render: r => _L(r.facturado) },
      { lbl: 'Pendiente', key: 'pendiente', render: r => Number(r.pendiente) > 0 ? `<span style="color:#003C78;font-weight:700">${_L(r.pendiente)}</span>` : _L(0) },
      { lbl: 'Clientes', key: 'clientes' },
    ], d.porZona || [])) +

    _card('Desempeño por transportista', 'ri-truck-line', _tbl([
      { lbl: 'Transportista', key: 'transportista' },
      { lbl: 'Entregas', key: 'entregas' },
      { lbl: 'Total repartido', key: 'total_repartido', render: r => _L(r.total_repartido) },
      { lbl: 'Pendientes', key: 'pendientes', render: r => Number(r.pendientes) > 0 ? `<span style="color:#0A6BC4;font-weight:700">${r.pendientes}</span>` : '0' },
      { lbl: 'Zonas', key: 'zonas_atendidas' },
    ], d.porTransportista || [])) +

    _krow([
      { lbl: 'Total ventas', val: k.total_facturas || 0 },
      { lbl: 'Total facturado', val: _L(k.total_facturado), cls: 'grn' },
      { lbl: 'Pendiente de cobro', val: _L(k.pendiente_cobro), cls: (k.pendiente_cobro || 0) > 0 ? 'amb' : '' },
      { lbl: 'Clientes atendidos', val: k.clientes_atendidos || 0, cls: 'blu' },
      { lbl: 'Zonas cubiertas', val: k.zonas_cubiertas || 0, cls: 'blu' },
      { lbl: 'Transportistas activos', val: k.transportistas_activos || 0 },
      { lbl: 'Venta promedio', val: _L(k.ticket_promedio) },
    ]) + _firma();

  _set('rep-content', html);
  window.__reportReady = true;
}

/* ══════════════════════════════════════
   D4 — INVENTARIO (solo detalle, sin gráficas)
══════════════════════════════════════ */
async function repD4() {
  const d = await _rq('/reportes/sintetizado/inventario');
  const k = d.kpis || {};
  const color = p => {
    if (p === 0) return '#CBD5E1';      // Gris (sin existencias)
    if (p < 100) return '#0A6BC4';      // Azul (por debajo del mínimo)
    return '#468C28';                   // Verde (stock suficiente)
  };
  const stBadge = (p) => Number(p.stock) <= Number(p.stock_minimo) ? _badge('Bajo stock', 'rb-rej') : Number(p.stock) < Number(p.stock_minimo) * 1.2 ? _badge('Alerta', 'rb-pen') : _badge('Normal', 'rb-ok');

  const html = _header('d4') +

    _card('Existencias actuales por producto', 'ri-archive-line', _tbl([
      { lbl: 'Producto', key: 'nombre' },
      { lbl: 'Categoría', key: 'categoria' },
      { lbl: 'Existencias', key: 'stock', render: r => `<strong>${_N(r.stock)}</strong> ${r.unidad || 'u.'}` },
      { lbl: 'Mínimo', key: 'stock_minimo', render: r => `${_N(r.stock_minimo)} ${r.unidad || 'u.'}` },
      {
        lbl: 'Disponibilidad',
        key: '_disp',
        render: r => {
          const stock = Number(r.stock) || 0;

          const disponible = stock > 0;

          return `
      <div style="display:flex;align-items:center;gap:6px">
        <span style="
          font-weight:700;
          color:${disponible ? '#0A6BC4' : '#CBD5E1'};
        ">
          ${disponible ? 'SI' : 'NO'}
        </span>

      </div>
    `;
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
  window.__reportReady = true;
}

/* ══════════════════════════════════════
   S1 — DESEMPEÑO DE PROVEEDORES
   Incluye: densidad de leche (indicador de calidad), sección
   "Proveedor Destacado" (mejor calidad / mayor volumen) y
   tonalidades de marca (navy + verde) distintas por proveedor
   en la gráfica de barras, para que cada uno se distinga.
══════════════════════════════════════ */
async function repS1() {
  const qs = _buildQS({ mes: _filtros.f_mes, anio: _filtros.f_anio });
  const d = await _rq('/reportes/sintetizado/produccion' + qs);
  const k = d.kpis || {};
  const pp = d.porProveedor || [];
  const reg = d.registros || [];

  /* ── Rango de densidad óptima para leche cruda (g/mL) ──
     Ajustar si el estándar de calidad de la empresa usa otro rango. */
  const DENSIDAD_MIN_OPTIMA = 1.028;
  const DENSIDAD_MAX_OPTIMA = 1.034;
  const DENSIDAD_IDEAL = (DENSIDAD_MIN_OPTIMA + DENSIDAD_MAX_OPTIMA) / 2;

  /* ── Calificación visual por % aceptación ── */
  const _calif = (pct) => {
    const p = Number(pct || 0);
    if (p >= 90) return { lbl: 'Excelente', cls: 'rb-ok' };
    if (p >= 75) return { lbl: 'Regular', cls: 'rb-obs' };
    return { lbl: 'Deficiente', cls: 'rb-rej' };
  };

  /* ── Calificación de calidad de leche por densidad ── */
  const _calidadLeche = (densidad) => {
    const dd = Number(densidad || 0);
    if (!dd) return { lbl: 'Sin dato', cls: 'rb-pen' };
    if (dd >= DENSIDAD_MIN_OPTIMA && dd <= DENSIDAD_MAX_OPTIMA) return { lbl: 'Óptima', cls: 'rb-ok' };
    if (dd >= DENSIDAD_MIN_OPTIMA - 0.004 && dd <= DENSIDAD_MAX_OPTIMA + 0.002) return { lbl: 'Aceptable', cls: 'rb-obs' };
    return { lbl: 'Fuera de rango', cls: 'rb-rej' };
  };

  /* ── Mini barra de aceptación ── */
  const _minibar = (pct) => {
    const p = Math.min(100, Number(pct || 0));
    const c = p >= 90 ? '#468C28' : p >= 75 ? '#0A6BC4' : '#64748B';
    return `<div style="display:flex;align-items:center;gap:6px">
      <div style="flex:1;min-width:60px;height:7px;background:#F1F5F9;border-radius:4px;overflow:hidden">
        <div style="width:${p}%;height:100%;background:${c};border-radius:4px"></div>
      </div>
      <span style="font-size:11.5px;font-weight:700;color:${c};min-width:38px">${p.toFixed(1)}%</span>
    </div>`;
  };

  /* ── Mini indicador de densidad (qué tan cerca está del ideal) ── */
  const _densidadPill = (densidad) => {
    const dd = Number(densidad || 0);
    if (!dd) return `<span style="color:#94A3B8;font-size:12px">—</span>`;
    const cal = _calidadLeche(dd);
    const col = cal.lbl === 'Óptima' ? '#468C28' : cal.lbl === 'Aceptable' ? '#0A6BC4' : '#64748B';
    return `<span style="display:inline-flex;align-items:center;gap:5px">
      <strong style="color:${col}">${dd.toFixed(3)}</strong>
      <span style="font-size:9.5px;color:#94A3B8">g/mL</span>
    </span>`;
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

  /* ── SÍNTESIS: mejor calidad (densidad más cercana al ideal) y mayor volumen ──
     Solo se consideran proveedores con al menos una entrega. */
  const conDatos = pp.filter(r => Number(r.total_entregas || 0) > 0);

  const mejorCalidad = [...conDatos]
    .filter(r => Number(r.densidad_promedio || 0) > 0)
    .sort((a, b) => Math.abs(DENSIDAD_IDEAL - Number(a.densidad_promedio)) - Math.abs(DENSIDAD_IDEAL - Number(b.densidad_promedio)))[0] || null;

  const mayorVolumen = [...conDatos]
    .sort((a, b) => Number(b.litros_aceptados || 0) - Number(a.litros_aceptados || 0))[0] || null;

  const destacadoCard = (mejorCalidad || mayorVolumen) ? `
    <div class="rep-row2" style="margin-bottom:14px">
      ${mejorCalidad ? `
      <div style="background:linear-gradient(135deg,#F0FDF4,#fff);border:1.5px solid #BBF0C7;border-radius:12px;padding:16px 18px;display:flex;align-items:center;gap:14px">
        <div style="width:44px;height:44px;border-radius:10px;background:#468C28;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i class="ri-drop-line" style="color:#fff;font-size:20px"></i>
        </div>
        <div>
          <div style="font-size:10.5px;font-weight:700;color:#2C6B10;text-transform:uppercase;letter-spacing:.4px"> Mejor calidad de leche</div>
          <div style="font-size:16px;font-weight:800;color:#1E293B;margin-top:2px">${mejorCalidad.proveedor || 'S/N'}</div>
          <div style="font-size:11.5px;color:#468C28;margin-top:2px">
            Densidad promedio <strong>${Number(mejorCalidad.densidad_promedio).toFixed(3)} g/mL</strong>
            · la más cercana al estándar óptimo (${DENSIDAD_MIN_OPTIMA}–${DENSIDAD_MAX_OPTIMA} g/mL)
          </div>
        </div>
      </div>` : ''}
      ${mayorVolumen ? `
      <div style="background:linear-gradient(135deg,#EAF2FB,#fff);border:1.5px solid #D5E5F7;border-radius:12px;padding:16px 18px;display:flex;align-items:center;gap:14px">
        <div style="width:44px;height:44px;border-radius:10px;background:#003C78;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i class="ri-truck-line" style="color:#fff;font-size:20px"></i>
        </div>
        <div>
          <div style="font-size:10.5px;font-weight:700;color:#0A4A8F;text-transform:uppercase;letter-spacing:.4px"> Mayor volumen entregado</div>
          <div style="font-size:16px;font-weight:800;color:#1E293B;margin-top:2px">${mayorVolumen.proveedor || 'S/N'}</div>
          <div style="font-size:11.5px;color:#0A6BC4;margin-top:2px">
            <strong>${_N(mayorVolumen.litros_aceptados)} L</strong> aceptados en el período
            · ${Number(mayorVolumen.pct_aceptacion || 0).toFixed(1)}% de aceptación
          </div>
        </div>
      </div>` : ''}
    </div>` : '';

  const html =
    _header('s1') +

    /* ── BANNER período ── */
    `<div style="display:flex;align-items:center;gap:9px;background:var(--navy-soft,#EAF2FB);border:1px solid #D5E5F7;border-radius:9px;padding:9px 14px;margin-bottom:12px">
      <i class="ri-calendar-line" style="color:#003C78;font-size:15px"></i>
      <p style="margin:0;font-size:11.5px;color:#0A4A8F">
        <strong>Período analizado:</strong> ${periodoLabel}
        &nbsp;·&nbsp; Total proveedores: <strong>${k.total_proveedores || 0}</strong>
        &nbsp;·&nbsp; Tasa de aceptación global:
        <strong style="color:${Number(k.pct_aceptacion_global || 0) >= 85 ? '#468C28' : '#0A6BC4'}">${Number(k.pct_aceptacion_global || 0).toFixed(1)}%</strong>
      </p>
    </div>` +

    /* ── SÍNTESIS: proveedor destacado ── */
    destacadoCard +


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
      { lbl: 'Proveedor', key: 'proveedor', style: 'width:16%' },
      { lbl: 'Teléfono', key: 'telefono', render: r => r.telefono || '—' },
      { lbl: 'Entregas', key: 'total_entregas', style: 'width:6%' },
      { lbl: 'Aceptadas', key: 'aceptadas', render: r => `<span style="color:#468C28;font-weight:700">${_N(r.aceptadas)}</span>` },
      { lbl: 'Rechazadas', key: 'rechazadas', render: r => Number(r.rechazadas) > 0 ? `<span style="color:#64748B;font-weight:700">${_N(r.rechazadas)}</span>` : `<span style="color:#94A3B8">0</span>` },
      { lbl: 'Litros Acept.', key: 'litros_aceptados', render: r => _N(r.litros_aceptados) + ' L' },
      { lbl: 'Densidad Prom.', key: 'densidad_promedio', render: r => _densidadPill(r.densidad_promedio) },
      { lbl: 'Calidad Leche', key: '_cal_leche', render: r => { const c = _calidadLeche(r.densidad_promedio); return _badge(c.lbl, c.cls); } },
      { lbl: 'Total Pagado', key: 'total_pagado', render: r => _L(r.total_pagado) },
      { lbl: '% Aceptación', key: 'pct_aceptacion', render: r => _minibar(r.pct_aceptacion) },
      { lbl: 'Calificación', key: '_cal', render: r => { const c = _calif(r.pct_aceptacion); return _badge(c.lbl, c.cls); } },
      { lbl: 'Última Entrega', key: 'ultima_entrega', render: r => _fec(r.ultima_entrega) },
    ], pp)) +

    /* ── TABLA DETALLE de entregas individuales ── */
    _card('Detalle de entregas del período', 'ri-list-check', _tbl([
      { lbl: 'Fecha', key: 'fecha', render: r => _fec(r.fecha) },
      { lbl: 'Proveedor', key: 'proveedor_nombre', style: 'width:17%' },
      { lbl: 'Turno', key: 'turno' },
      { lbl: 'Litros', key: 'litros', render: r => `<strong>${_N(r.litros)}</strong> L` },
      { lbl: 'Densidad', key: 'densidad', render: r => _densidadPill(r.densidad) },
      { lbl: 'Precio/L', key: 'precio_litro', render: r => _L(r.precio_litro) },
      { lbl: 'Total', key: 'total_pagar', render: r => `<strong>${_L(r.total_pagar)}</strong>` },
      { lbl: 'Estado', key: 'estado', render: r => _estBadge(r.estado) },
      {
        lbl: 'Motivo Rechazo', key: 'motivo_rechazo',
        render: r => r.estado === 'Rechazada' && r.motivo_rechazo
          ? `<span style="color:#64748B;font-size:11px">${r.motivo_rechazo}</span>`
          : `<span style="color:#94A3B8">—</span>`
      },
    ], reg), 'class="rep-card-detallado"') +

    /* ── KPI CARDS ── */
    _krow([
      { lbl: 'Total Entregas', val: _N(k.total_entregas), cls: 'blu' },
      { lbl: 'Aceptadas', val: _N(k.total_aceptadas), cls: 'grn' },
      { lbl: 'Rechazadas', val: _N(k.total_rechazadas), cls: Number(k.total_rechazadas || 0) > 0 ? 'red' : '' },
      { lbl: 'Litros Aceptados', val: _N(k.litros_aceptados) + ' L', cls: 'grn' },
      { lbl: 'Litros Rechazados', val: _N(k.litros_rechazados) + ' L', cls: Number(k.litros_rechazados || 0) > 0 ? 'red' : '' },
      { lbl: 'Total Pagado', val: _L(k.total_pagado), cls: 'grn' },
    ]) +
    _firma();


  _set('rep-content', html);

  /* ── CHARTS — tonalidades de marca (navy + verde), un color distinto por proveedor ── */
  _loadChart(() => {
    /* Dona: Aceptadas vs Rechazadas vs Pendientes (categorías, no proveedores) */
    const totalAc = Number(k.total_aceptadas || 0);
    const totalRec = Number(k.total_rechazadas || 0);
    const totalPen = Math.max(0, Number(k.total_entregas || 0) - totalAc - totalRec);
    const donaData = [
      { lbl: 'Aceptadas', val: totalAc, col: C.verde },
      { lbl: 'Rechazadas', val: totalRec, col: '#B9D3EA' },
      { lbl: 'Pendientes', val: totalPen, col: C.navy2 },
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

    /* Barras horizontales: top 8 por litros aceptados.
       Cada proveedor tiene su propia tonalidad (de la paleta COLS,
       navy + verde) para que se distingan entre sí — la calidad de
       la leche (densidad) se muestra aparte, en el tooltip. */
    const top8 = [...pp].sort((a, b) => Number(b.litros_aceptados) - Number(a.litros_aceptados)).slice(0, 8);
    if (top8.length) {
      _chart('cS1Bars', {
        type: 'bar',
        data: {
          labels: top8.map(r => r.proveedor || 'S/N'),
          datasets: [{
            label: 'Litros Aceptados',
            data: top8.map(r => Number(r.litros_aceptados)),
            backgroundColor: top8.map((r, i) => COLS[i % COLS.length]),
            borderRadius: 5,
            borderSkipped: false
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: c => {
                  const r = top8[c.dataIndex];
                  const dd = Number(r.densidad_promedio || 0);
                  const base = ' ' + _N(c.raw) + ' L aceptados';
                  return dd ? base + ' · densidad ' + dd.toFixed(3) + ' g/mL' : base;
                }
              }
            },
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

    window.__reportReady = true;
  });
}

/* ══════════════════════════════════════
   S2 — ESTADOS FINANCIEROS
══════════════════════════════════════ */
async function repS2() {
  const qs = _buildQS({ mes: _filtros.f_mes, anio: _filtros.f_anio });
  const d = await _rq('/reportes/sintetizado/financiero' + qs);
  const k = d.kpis || {};
  const serie = d.serie || [];
  const esAnual = d.granularidad === 'mes';
  const tituloTendencia = esAnual ? 'Ingresos y egresos por mes' : 'Ingresos y egresos por semana';

  // Insight de variación vs periodo anterior (ya lo calcula el backend, solo faltaba usarlo)
  let evalPeriodo;
  if (k.variacionUtilidad === null || k.variacionUtilidad === undefined) {
    evalPeriodo = 'Sin datos del periodo anterior para comparar.';
  } else {
    const v = k.variacionUtilidad;
    const vTxt = (v >= 0 ? '+' : '') + v.toFixed(1) + '%';
    if (v > 10) evalPeriodo = `Buen periodo: la ganancia subió ${vTxt} respecto al mes anterior.`;
    else if (v < -10) evalPeriodo = `Periodo flojo: la ganancia bajó ${vTxt} respecto al mes anterior.`;
    else evalPeriodo = `Periodo estable: variación de ${vTxt} en la ganancia respecto al mes anterior.`;
  }
  const vIngTxt = (k.variacionIngresos === null || k.variacionIngresos === undefined)
    ? 'sin dato comparativo'
    : (k.variacionIngresos >= 0 ? '+' : '') + k.variacionIngresos.toFixed(1) + '% vs. mes anterior';

  const topProd = (d.topProductos || [])[0];

  const html = _header('s2') +
    _card('Ingresos vs Egresos del periodo', 'ri-bar-chart-2-line',
      `<div class="rep-chart-wrap" style="height:200px"><canvas id="cS2Cmp"></canvas></div>`) +
    `<div class="rep-row2">` +
    _card(tituloTendencia, 'ri-line-chart-line',
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
      { lbl: 'Egresos', val: _L(k.egresos), cls: 'blu' },
      { lbl: 'Ganancia', val: _L(k.utilidad), cls: (k.utilidad || 0) >= 0 ? 'grn' : 'blu' },
      { lbl: 'Margen', val: _P(k.margen), cls: (k.margen || 0) >= 15 ? 'grn' : (k.margen || 0) >= 5 ? 'blu' : 'blu' },
    ]) +
    _firma();

  _set('rep-content', html);
  _loadChart(() => {
    const ingresosMes = Number(k.ingresos || 0);
    const egresosMes = Number(k.egresos || 0);
    const utilidad = ingresosMes - egresosMes;

    // ── Chart 1: Comparativa Ingresos vs Egresos vs Ganancia del periodo ──
    // Colorimetría de la empresa: solo tonos navy + verde, nunca rojo.
    _chart('cS2Cmp', {
      type: 'bar',
      data: {
        labels: ['Ingresos', 'Egresos', 'Ganancia'],
        datasets: [{
          label: 'Monto (L.)',
          data: [ingresosMes, egresosMes, utilidad],
          backgroundColor: [C.navy, C.navy2, utilidad >= 0 ? C.verde : C.navy3],
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

    // ── Chart 2: Tendencia real de ingresos vs egresos (usa d.serie) ──
    // Ingresos = navy (arriba), Egresos = verde (abajo) — misma paleta de marca,
    // sin rojo. Ambas líneas llevan su datalabel, separados (uno arriba, uno abajo)
    // para no encimarse.
    const maxSerie = Math.max(...serie.map(s => Math.max(Number(s.ingresos) || 0, Number(s.egresos) || 0)), 0);
    _chart('cS2Sem', {
      type: 'line',
      data: {
        labels: serie.length ? serie.map(s => s.label) : ['Sin datos'],
        datasets: [
          {
            label: 'Ingresos',
            data: serie.length ? serie.map(s => Number(s.ingresos)) : [0],
            borderColor: C.navy,
            backgroundColor: 'rgba(0,60,120,.08)',
            fill: true,
            tension: 0.35,
            pointBackgroundColor: C.navy,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 2
          },
          {
            label: 'Egresos',
            data: serie.length ? serie.map(s => Number(s.egresos)) : [0],
            borderColor: C.verde,
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.35,
            pointBackgroundColor: C.verde,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 2,
            borderDash: [5, 3]
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        layout: { padding: { top: 24, bottom: 20 } },
        plugins: {
          legend: { display: true, position: 'bottom', labels: { color: '#334155', font: { size: 11 }, boxWidth: 10, usePointStyle: true } },
          tooltip: { callbacks: { label: c => c.dataset.label + ': ' + _L(c.raw) } },
          datalabels: {
            display: true,
            color: (ctx) => ctx.datasetIndex === 0 ? C.navy : C.verde,
            anchor: (ctx) => ctx.datasetIndex === 0 ? 'top' : 'bottom',
            align: (ctx) => ctx.datasetIndex === 0 ? 'top' : 'bottom',
            offset: 4,
            font: { weight: '700', size: 10 },
            formatter: v => v > 0 ? _L(v) : ''
          }
        },
        scales: {
          x: { ticks: { color: tickC }, grid: { display: false } },
          y: { suggestedMax: maxSerie * 1.2, ticks: { color: tickC, callback: v => 'L.' + Math.round(v / 1000) + 'K' }, grid: { color: gridC } }
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

    window.__reportReady = true;
  });
}
/* ══════════════════════════════════════
   S3 — VENTAS DE PRODUCTOS LÁCTEOS
══════════════════════════════════════ */
async function repS3() {
  const qs = _buildQS({ mes: _filtros.f_mes, anio: _filtros.f_anio });
  const d = await _rq('/reportes/sintetizado/ventas' + qs);
  const k = d.kpis || {};
  const productos = d.productos || [];
  const topClientes = d.topClientes || [];
  const tendencia = d.tendencia || [];
  const comp = d.comparacion || {};

  const html = _header('s3') +
    `<div class="rep-row2">` +
    _card('Distribución de ventas por producto', 'ri-donut-chart-line',
      `<div style="display:flex;align-items:center;gap:0"><div style="flex:0 0 55%;height:220px;position:relative"><canvas id="cS3Dona"></canvas></div><div id="legS3" style="flex:1;font-size:11px;padding-left:8px"></div></div>`) +
    _card('Top 5 productos', 'ri-medal-line', _tbl([
      { lbl: 'Producto', key: 'producto' },
      { lbl: 'Ingresos', key: 'total_ingresos', render: r => `<strong>${_L(r.total_ingresos)}</strong>` },
    ], productos.slice(0, 5))) +
    `</div>` +
    `<div class="rep-row2">` +
    _card('Top 5 clientes', 'ri-user-star-line', _tbl([
      { lbl: 'Cliente', key: 'cliente_nombre' },
      { lbl: 'Total comprado', key: 'total_comprado', render: r => `<strong>${_L(r.total_comprado)}</strong>` },
    ], topClientes.slice(0, 5))) +
    _card('Tendencia de ventas', 'ri-line-chart-line',
      `<div class="rep-chart-wrap" style="height:200px"><canvas id="cS3Tend"></canvas></div>`) +
    `</div>` +
    _krow([
      { lbl: 'Ingresos totales', val: _L(k.total_ingresos), cls: 'grn' },
      { lbl: 'Total ventas', val: k.total_ventas || 0 },
      { lbl: 'Clientes únicos', val: k.clientes_distintos || 0, cls: 'blu' },
      { lbl: 'Venta promedio', val: _L(k.ticket_promedio) },
    ]) +
    _firma();
  _set('rep-content', html);

  _loadChart(() => {
    const topDona = productos.slice(0, 7);
    _chart('cS3Dona', {
      type: 'doughnut',
      plugins: [leaderLinePlugin],
      data: { labels: topDona.map(p => p.producto), datasets: [{ data: topDona.map(p => Number(p.total_ingresos)), backgroundColor: COLS, borderWidth: 1.2, borderColor: '#ffffff' }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '50%',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => c.label + ': ' + _L(c.raw) } },
          datalabels: { display: false }
        }
      }
    });
    _applyDonaLines('cS3Dona');
    _donaLegend('cS3Dona', 'legS3');

    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    _chart('cS3Tend', {
      type: 'line',
      data: {
        labels: tendencia.map(t => {
          if (typeof t.periodo === 'string' && t.periodo.length === 7) {
            const [yy, mm] = t.periodo.split('-');
            return meses[parseInt(mm, 10) - 1] + ' ' + yy;
          }
          return _fec ? _fec(t.periodo) : t.periodo;
        }),
        datasets: [{
          label: 'Ingresos',
          data: tendencia.map(t => Number(t.total)),
          borderColor: C.verde,
          backgroundColor: 'rgba(70,140,40,.08)',
          tension: 0.3,
          fill: true,
          pointBackgroundColor: C.verde,
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        layout: { padding: { top: 24 } },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => _L(c.raw) } },
          datalabels: {
            display: true,
            color: C.verde, anchor: 'top', align: 'top', offset: 4,
            font: { weight: '700', size: 10 },
            formatter: v => v > 0 ? _L(v) : ''
          }
        },
        scales: {
          x: { ticks: { color: tickC, font: { size: 10 } }, grid: { display: false } },
          y: { ticks: { color: tickC, callback: v => 'L.' + Math.round(v / 1000) + 'K' }, grid: { color: gridC } }
        }
      }
    });

    window.__reportReady = true;
  });
}
/* ══════════════════════════════════════
   S4 — PRODUCTO POR CLIENTE
══════════════════════════════════════ */
async function repS4() {
  const qs = _buildQS({ mes: _filtros.f_mes, anio: _filtros.f_anio });
  const d = await _rq('/reportes/sintetizado/producto-cliente' + qs);

  const filas = (d.porCliente || []).map(cli => `
    <tr class="rep-s4-grupo-cliente" data-cliente="${cli.cliente.toLowerCase()}" style="background:#F8FAFC">
      <td colspan="5" style="padding:9px 12px;font-weight:800;color:#003C78;border-bottom:1px solid #E0E9F2">
        <i class="ri-user-line"></i> ${cli.cliente} &nbsp;
        <span style="font-weight:400;font-size:11px;color:#64748B">— ${cli.productos.length} producto(s) · Total: ${_L(cli.total)}</span>
      </td>
    </tr>
    ${cli.productos.map(p => `
    <tr class="rep-s4-fila-cliente" data-cliente="${cli.cliente.toLowerCase()}">
      <td style="padding:8px 12px 8px 28px;color:#334155">${p.producto}</td>
      <td style="padding:8px 12px;text-align:right">${_N(p.cantidad_total)}</td>
      <td style="padding:8px 12px;text-align:right"><strong>${_L(p.monto_total)}</strong></td>
      <td style="padding:8px 12px">${p.num_pedidos} compras</td>
      <td style="padding:8px 12px;color:#94A3B8;font-size:11px">${_fec(p.ultima_compra)}</td>
    </tr>`).join('')}
  `).join('');

  const html = _header('s4') +
    _card('Productos comprados por cliente', 'ri-user-heart-line', `
      <div style="margin-bottom:10px">
        <input type="text" id="rep-s4-buscar" placeholder="Buscar por cliente..."
          style="width:100%;padding:8px 12px;border:1px solid #CBD5E1;border-radius:7px;font-size:13px;font-family:inherit;box-sizing:border-box">
      </div>
      <table class="rep-tbl">
        <thead><tr>
          <th>Producto</th><th style="text-align:right">Cantidad</th>
          <th style="text-align:right">Monto</th><th>Frecuencia</th><th>Última compra</th>
        </tr></thead>
        <tbody id="rep-s4-tbody">${filas || '<tr><td colspan="5" style="text-align:center;padding:20px;color:#94A3B8">Sin registros</td></tr>'}</tbody>
      </table>
      <p id="rep-s4-sin-resultados" style="display:none;text-align:center;padding:20px;color:#94A3B8;margin:0">Ningún cliente coincide con la búsqueda</p>
    `) +
    _card('Distribución de ingresos por cliente', 'ri-pie-chart-line',
      `<div style="display:flex;align-items:center;gap:0"><div style="flex:0 0 55%;height:240px;position:relative"><canvas id="cS4Dona"></canvas></div><div id="legS4" style="flex:1;font-size:11px;padding-left:8px"></div></div>`) +
    _krow([
      { lbl: 'Clientes analizados', val: (d.porCliente || []).length, cls: 'blu' },
      { lbl: 'Transacciones', val: (d.registros || []).length },
      { lbl: 'Ingreso total', val: _L((d.registros || []).reduce((s, r) => s + Number(r.monto_total || 0), 0)), cls: 'grn' },
    ]) +
    _firma();

  _set('rep-content', html);

  // Filtro de búsqueda por cliente (en vivo, sin recargar)
  const inputBuscar = document.getElementById('rep-s4-buscar');
  if (inputBuscar) {
    if (_filtros.f_cliente) {
      inputBuscar.value = _filtros.f_cliente;
    }

    const aplicarFiltro = () => {
      const texto = inputBuscar.value.trim().toLowerCase();
      const filasGrupo = document.querySelectorAll('#rep-s4-tbody .rep-s4-grupo-cliente');
      const filasDato = document.querySelectorAll('#rep-s4-tbody .rep-s4-fila-cliente');
      let algunoVisible = false;

      filasGrupo.forEach(fila => {
        const coincide = fila.dataset.cliente.includes(texto);
        fila.style.display = coincide ? '' : 'none';
        if (coincide) algunoVisible = true;
      });
      filasDato.forEach(fila => {
        const coincide = fila.dataset.cliente.includes(texto);
        fila.style.display = coincide ? '' : 'none';
      });

      const sinResultados = document.getElementById('rep-s4-sin-resultados');
      if (sinResultados) sinResultados.style.display = algunoVisible ? 'none' : 'block';
    };

    inputBuscar.addEventListener('input', aplicarFiltro);

    if (inputBuscar.value.trim()) {
      aplicarFiltro();
    }
  }

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

    window.__reportReady = true;
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
    <div class="rep-exc-row" style="border-left:3px solid #003C78">
      <div class="rep-exc-icon red"><i class="ri-close-circle-line"></i></div>
      <div style="flex:1">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:5px">
          <strong style="font-size:13px;color:#1E293B">${r.proveedor_nombre || 'Sin nombre'}</strong>
          ${_badge('RECHAZADA', 'rb-rej')}
        </div>
        <p style="margin:4px 0 0;font-size:12px;color:#64748B">
          <strong>${_N(r.litros)} L</strong> rechazados · Fecha: <strong>${_fec(r.fecha)}</strong> · Turno: <strong>${r.turno || '—'}</strong>
        </p>
        ${r.motivo_rechazo ? `<p style="margin:3px 0 0;font-size:12px;color:#003C78"><i class="ri-error-warning-line"></i> ${r.motivo_rechazo}</p>` : ''}
        <p style="margin:3px 0 0;font-size:11px;color:#94A3B8">
          Alcohol: <strong>${r.prueba_alcohol || '—'}</strong> · Densidad: <strong>${r.densidad ? Number(r.densidad).toFixed(3) : '—'}</strong>
          · Analista: ${r.analista_nombre || '—'}
        </p>
      </div>
      <div style="text-align:right;font-size:12px;color:#003C78;font-weight:700">${_L(r.total_pagar)}<br><span style="font-size:10px;color:#94A3B8">pérdida</span></div>
    </div>`).join('');

  const html = _header('e1') +
    ((d.registros || []).length
      ? _card('Detalle de rechazos — acción requerida', 'ri-close-circle-line', filas, 'style="border-left:4px solid #003C78;border-radius:0 13px 13px 0"')
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
    if (!pp.length) { window.__reportReady = true; return; }
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

    window.__reportReady = true;
  });
}

/* ══════════════════════════════════════
   IMPRIMIR / GUARDAR PDF — vía Puppeteer en el backend
   El servidor abre la propia página de reportes con un Chrome
   headless, espera a que window.__reportReady sea true, y
   devuelve un PDF idéntico a lo que se ve en pantalla.
══════════════════════════════════════ */
let _generandoPDF = false;

function repImprimir() {
  if (_generandoPDF) return;
  _generandoPDF = true;
  _mostrarOverlayGenerando(true);

  // NOTA: se quitó 'crz_token' — era una clave de una versión anterior de
  // app.js que ya no se actualiza en el login actual (solo escribe 'token'),
  // así que siempre quedaba pegado un token viejo/vencido.
  const token = localStorage.getItem('token') || '';
  const filtrosAdicionales = { ..._filtros };
  if (_rep === 's4') {
    const inputBuscar = document.getElementById('rep-s4-buscar');
    if (inputBuscar && inputBuscar.value.trim()) {
      filtrosAdicionales['f_cliente'] = inputBuscar.value.trim();
    }
  }
  const qs = new URLSearchParams(filtrosAdicionales).toString();
  const filename = `cruzymar_${_rep}_${new Date().toISOString().slice(0, 10)}.pdf`;

  fetch(`/api/reportes/pdf/${_rep}?${qs}`, {
    headers: { Authorization: 'Bearer ' + token }
  })
    .then(async r => {
      const contentType = r.headers.get('content-type') || '';

      // Si el servidor respondió con error (JSON) en vez de un PDF,
      // lo detectamos ANTES de intentar abrirlo, para no mostrar
      // "no se pudo abrir el archivo" sin explicación.
      if (!r.ok || !contentType.includes('application/pdf')) {
        let mensaje = 'El servidor no pudo generar el PDF (HTTP ' + r.status + ')';
        try {
          const data = await r.json();
          if (data && data.error) mensaje = data.error;
        } catch (_) { /* no era JSON, dejamos el mensaje genérico */ }
        throw new Error(mensaje);
      }

      const blob = await r.blob();

      // Verificación extra: un PDF real nunca pesa 0 bytes.
      if (!blob || blob.size === 0) {
        throw new Error('El servidor devolvió un archivo vacío.');
      }

      return blob;
    })
    .then(blob => {
      const url = URL.createObjectURL(blob);
      _mostrarModalExito(url, filename);
    })
    .catch(e => {
      _mostrarOverlayGenerando(false);
      _generandoPDF = false;
      alert('No se pudo generar el PDF: ' + e.message);
    });
}
/* ──────────────────────────────────────
   MODAL "Reporte generado con éxito"
   Flujo: Guardar → se elige carpeta → pregunta si desea abrirlo
────────────────────────────────────── */
function _mostrarModalExito(url, filename) {
  _mostrarOverlayGenerando(false);
  _generandoPDF = false;

  let modal = document.getElementById('rep-modal-exito');
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'rep-modal-exito';
  modal.innerHTML = `
    <div class="rep-og-box rep-me-box">
      <div class="rep-me-check">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="11" stroke="#0A7A3D" stroke-width="1.5"/>
          <path d="M7 12.5l3 3 7-7" stroke="#0A7A3D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <p class="rep-me-titulo">Reporte generado con éxito</p>
      <p class="rep-me-sub">¿Qué desea hacer con el archivo?</p>
      <div class="rep-me-btns">
        <button class="rep-me-btn rep-me-guardar" id="rep-me-btn-guardar">Guardar</button>
        <button class="rep-me-btn rep-me-cerrar" id="rep-me-btn-cerrar">Cerrar</button>
      </div>
    </div>`;
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;z-index:999999;';
  document.body.appendChild(modal);

  if (!document.getElementById('rep-me-style')) {
    const style = document.createElement('style');
    style.id = 'rep-me-style';
    style.textContent = `
      .rep-me-box{min-width:300px;max-width:360px}
      .rep-me-check{margin-bottom:8px}
      .rep-me-titulo{font-size:15px;color:#003C78;font-weight:700;margin:0 0 4px}
      .rep-me-sub{font-size:12.5px;color:#5B6B7A;margin:0 0 16px}
      .rep-me-btns{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
      .rep-me-btn{border:none;border-radius:7px;padding:9px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:opacity .15s}
      .rep-me-btn:hover{opacity:.85}
      .rep-me-abrir{background:#003C78;color:#fff}
      .rep-me-guardar{background:#003C78;color:#fff}
      .rep-me-cerrar{background:transparent;color:#94A3B8}
    `;
    document.head.appendChild(style);
  }

  const limpiar = (revocarUrl) => {
    modal.remove();
    if (revocarUrl) setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  document.getElementById('rep-me-btn-guardar').onclick = async () => {
    if ('showSaveFilePicker' in window) {
      try {
        const resp = await fetch(url);
        const blob = await resp.blob();
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: 'Archivo PDF', accept: { 'application/pdf': ['.pdf'] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        _mostrarModalPreguntaAbrir(url);
      } catch (err) {
        if (err.name === 'AbortError') {
          // El usuario canceló el diálogo de guardado; no hacemos nada más
          return;
        }
        console.error('Error guardando archivo:', err);
        // Fallback si algo falla que no sea "usuario canceló"
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        _mostrarModalPreguntaAbrir(url);
      }
    } else {
      // Navegadores sin soporte (Firefox, Safari): comportamiento anterior
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      _mostrarModalPreguntaAbrir(url);
    }
  };

  document.getElementById('rep-me-btn-cerrar').onclick = () => limpiar(true);
}

/* ──────────────────────────────────────
   MODAL "¿Desea abrir el reporte ahora?"
   Aparece justo después de que el archivo ya se guardó.
────────────────────────────────────── */
function _mostrarModalPreguntaAbrir(url) {
  let modal = document.getElementById('rep-modal-exito');
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'rep-modal-exito';
  modal.innerHTML = `
    <div class="rep-og-box rep-me-box">
      <div class="rep-me-check">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="11" stroke="#0A7A3D" stroke-width="1.5"/>
          <path d="M7 12.5l3 3 7-7" stroke="#0A7A3D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <p class="rep-me-titulo">Reporte guardado con éxito</p>
      <p class="rep-me-sub">¿Desea abrir el reporte ahora?</p>
      <div class="rep-me-btns">
        <button class="rep-me-btn rep-me-abrir" id="rep-me-btn-abrir2">Abrir ahora</button>
        <button class="rep-me-btn rep-me-cerrar" id="rep-me-btn-cerrar2">Cerrar</button>
      </div>
    </div>`;
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;z-index:999999;';
  document.body.appendChild(modal);

  const limpiar = () => {
    modal.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  document.getElementById('rep-me-btn-abrir2').onclick = () => {
    window.open(url, '_blank');
    limpiar();
  };

  document.getElementById('rep-me-btn-cerrar2').onclick = () => limpiar();
}
/* ──────────────────────────────────────
   OVERLAY "Generando..." mientras se procesa
────────────────────────────────────── */
function _mostrarOverlayGenerando(mostrar) {
  let ov = document.getElementById('rep-overlay-generando');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'rep-overlay-generando';
    ov.innerHTML = `<div class="rep-og-box"><div class="rep-og-spinner"></div><p>Generando reporte...</p></div>`;
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(255,255,255,.7);display:flex;align-items:center;justify-content:center;z-index:999999;';
    const style = document.createElement('style');
    style.textContent = `
      .rep-og-box{background:#fff;border-radius:10px;padding:22px 30px;box-shadow:0 8px 24px rgba(0,0,0,.15);text-align:center;font-family:inherit}
      .rep-og-spinner{width:32px;height:32px;border:3px solid #E0E9F2;border-top-color:#003C78;border-radius:50%;margin:0 auto 10px;animation:rep-spin .8s linear infinite}
      @keyframes rep-spin{to{transform:rotate(360deg)}}
      .rep-og-box p{margin:0;font-size:13px;color:#003C78;font-weight:600}
    `;
    document.head.appendChild(style);
    document.body.appendChild(ov);
  }
  ov.style.display = mostrar ? 'flex' : 'none';
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
  try { const tok = localStorage.getItem('token') || ''; if (tok) { const p = JSON.parse(atob(tok.split('.')[1])); usuario = p.nombre || p.email || usuario; } } catch (e) { }

  // Recopilar filas de la tabla visible
  const tabla = document.querySelector('#rep-content .rep-tbl');
  let rows = [];
  // Cabecera empresa
  rows.push(['CRUZYMAR Productos Lácteos']);
  rows.push(['Las Vegas, Victoria, Yoro, Honduras — Sistema ERP de Gestión Lechera']);
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
  //rows.push([`— Documento generado por Sistema ERP CRUZYMAR — ${fecLarga} — Confidencial —`]);

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
  // Pre-check excepciones (mismo fix de /api duplicado)
  _rq('/reportes/excepcion/leche-no-apta').then(d => {
    const b = _el('rep-badge-exc');
    if (b && (d.kpis?.total_rechazos || 0) > 0) { b.textContent = '!'; b.style.display = 'inline'; }
  }).catch(() => { });
}

if (document.getElementById('rep-root')) initReportes();