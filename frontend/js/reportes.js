/* ═══════════════════════════════════════════════════════════════
   CRUZYMAR · reportes.js  
   Victoria, Yoro, Honduras
═══════════════════════════════════════════════════════════════ */

/* ── Helpers globales ── */
const _rq  = url => fetch(url,{ headers:{ Authorization:'Bearer '+(localStorage.getItem('crz_token')||'') }}).then(r=>r.json());
const _el  = id  => document.getElementById(id);
const _set = (id,h) => { const e=_el(id); if(e) e.innerHTML=h; };
const _L   = n   => 'L. '+Number(n||0).toLocaleString('es-HN',{minimumFractionDigits:2,maximumFractionDigits:2});
const _N   = n   => Number(n||0).toLocaleString('es-HN');
const _P   = n   => Number(n||0).toFixed(1)+'%';
const _fec = s   => { if(!s) return '—'; const[y,m,d]=(s+'').slice(0,10).split('-'); return `${d}/${m}/${y}`; };

/* ── Paleta empresa ── */
const C = { navy:'#003C78', verde:'#468C28', red:'#DC2626', amb:'#D97706', slate:'#64748B' };
const COLS = [C.navy,C.verde,'#1D4ED8',C.amb,C.red,'#7C3AED','#0891B2','#059669'];
const gridC = 'rgba(0,0,0,0.04)', tickC = '#94A3B8';

/* ── Estado ── */
let _grupo='det', _rep='d1';
let _filtros = {};

/* ── Chart.js lazy ── */
let _cjsOk=false, _cjsCbs=[];
const _charts={};
function _loadChart(cb){
  if(_cjsOk) return cb();
  _cjsCbs.push(cb);
  if(_cjsCbs.length>1) return;
  const s=document.createElement('script');
  s.src='https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
  s.onload=()=>{ _cjsOk=true; _cjsCbs.forEach(f=>f()); _cjsCbs=[]; };
  document.head.appendChild(s);
}
function _chart(id,cfg){
  if(_charts[id]) _charts[id].destroy();
  const ctx=_el(id); if(!ctx) return;
  _charts[id]=new Chart(ctx,cfg);
}

/* ══════════════════════════════════════
   METADATA de reportes
══════════════════════════════════════ */
const META = {
  d1:{ titulo:'Reporte Detallado de Producción Diaria',
       sub:'Departamento de Producción — Lotes, leche procesada y rendimiento',
       resp:'Supervisor de Producción · Jefe de Planta · Gerencia',
       frec:'Diario', icon:'ri-flask-line', iconCls:'' },
  d2:{ titulo:'Reporte Detallado de Control de Calidad',
       sub:'Departamento de Control de Calidad — Inocuidad y estándares',
       resp:'Jefe de Calidad · Supervisor de Calidad · Gerencia',
       frec:'Diario', icon:'ri-drop-line', iconCls:'verde' },
  d3:{ titulo:'Reporte Detallado de Distribución',
       sub:'Departamento de Distribución — Productos entregados y clientes',
       resp:'Encargado de Distribución',
       frec:'Diario', icon:'ri-truck-line', iconCls:'' },
  d4:{ titulo:'Reporte Detallado de Inventario',
       sub:'Supervisor de Almacén — Control de existencias de productos',
       resp:'Supervisor de Almacén e Inventario',
       frec:'Semanal', icon:'ri-archive-line', iconCls:'verde' },
  s1:{ titulo:'Reporte Sintetizado de Mermas y Desperdicios',
       sub:'Producción — Pérdidas de materia prima y productos terminados',
       resp:'Jefe de Producción · Control de Calidad · Gerencia',
       frec:'Diario', icon:'ri-recycle-line', iconCls:'rojo' },
  s2:{ titulo:'Estados Financieros Sintetizados',
       sub:'Departamento de Contabilidad — Situación económica de la empresa',
       resp:'Departamento de Contabilidad',
       frec:'Mensual / Anual', icon:'ri-bank-line', iconCls:'' },
  s3:{ titulo:'Reporte Sintetizado de Ventas de Productos Lácteos',
       sub:'Departamento de Ventas — Ingresos, tendencia y top productos',
       resp:'Departamento de Ventas · Gerencia',
       frec:'Mensual', icon:'ri-shopping-cart-line', iconCls:'verde' },
  s4:{ titulo:'Reporte Sintetizado: Producto Comprado por Cliente',
       sub:'Departamento de Ventas — Análisis de comportamiento de compra',
       resp:'Departamento de Ventas · Gerencia',
       frec:'Mensual', icon:'ri-user-heart-line', iconCls:'' },
  e1:{ titulo:'Reporte por Excepción: Leche No Apta para Procesamiento',
       sub:'Control de Calidad — Alertas y registro de materia prima rechazada',
       resp:'Analista de Calidad · Proveedor',
       frec:'Eventual', icon:'ri-close-circle-line', iconCls:'rojo' },
  e2:{ titulo:'Reporte por Excepción: Stock Bajo / Inventario Crítico',
       sub:'Almacén — Productos por debajo del mínimo requerido',
       resp:'Supervisor de Almacén',
       frec:'Semanal', icon:'ri-error-warning-line', iconCls:'rojo' },
};

/* ══════════════════════════════════════
   FILTROS por tipo de reporte
══════════════════════════════════════ */
const FILTROS_DEF = {
  d1: [
    { id:'f_desde', lbl:'Desde', type:'date', def: hoy() },
    { id:'f_hasta', lbl:'Hasta', type:'date', def: hoy() },
    { id:'f_estado',lbl:'Estado',type:'select',
      ops:[['','Todos'],['En proceso','En proceso'],['Completada','Completada'],['Cancelada','Cancelada']] },
  ],
  d2: [
    { id:'f_desde',   lbl:'Desde',    type:'date',   def: hoy() },
    { id:'f_hasta',   lbl:'Hasta',    type:'date',   def: hoy() },
    { id:'f_resultado',lbl:'Resultado',type:'select',
      ops:[['','Todos'],['Aprobado','Aprobado'],['Rechazado','Rechazado'],['Observación','Observación']] },
  ],
  d3: [
    { id:'f_desde',  lbl:'Desde', type:'date',   def: hoy() },
    { id:'f_hasta',  lbl:'Hasta', type:'date',   def: hoy() },
    { id:'f_estado', lbl:'Estado',type:'select',
      ops:[['','Todos'],['Pagada','Pagada'],['Pendiente','Pendiente'],['Cancelada','Cancelada']] },
  ],
  d4: [],  // sin filtros de fecha (inventario actual)
  s1: [
    { id:'f_desde', lbl:'Desde', type:'date', def: primerDiaMes() },
    { id:'f_hasta', lbl:'Hasta', type:'date', def: hoy() },
  ],
  s2: [
    { id:'f_mes',  lbl:'Mes', type:'select',
      ops:[['todos','Todo el año'],['1','Enero'],['2','Febrero'],['3','Marzo'],['4','Abril'],['5','Mayo'],['6','Junio'],
           ['7','Julio'],['8','Agosto'],['9','Septiembre'],['10','Octubre'],['11','Noviembre'],['12','Diciembre']],
      def: String(new Date().getMonth()+1) },
    { id:'f_anio', lbl:'Año', type:'select',
      ops:aniosOps(), def: String(new Date().getFullYear()) },
  ],
  s3: [
    { id:'f_mes',  lbl:'Mes', type:'select',
      ops:[['todos','Todo el año'],['1','Enero'],['2','Febrero'],['3','Marzo'],['4','Abril'],['5','Mayo'],['6','Junio'],
           ['7','Julio'],['8','Agosto'],['9','Septiembre'],['10','Octubre'],['11','Noviembre'],['12','Diciembre']],
      def: String(new Date().getMonth()+1) },
    { id:'f_anio', lbl:'Año', type:'select',
      ops:aniosOps(), def: String(new Date().getFullYear()) },
  ],
  s4: [
    { id:'f_mes',  lbl:'Mes', type:'select',
      ops:[['todos','Todo el año'],['1','Enero'],['2','Febrero'],['3','Marzo'],['4','Abril'],['5','Mayo'],['6','Junio'],
           ['7','Julio'],['8','Agosto'],['9','Septiembre'],['10','Octubre'],['11','Noviembre'],['12','Diciembre']],
      def: String(new Date().getMonth()+1) },
    { id:'f_anio', lbl:'Año', type:'select',
      ops:aniosOps(), def: String(new Date().getFullYear()) },
  ],
  e1: [
    { id:'f_desde', lbl:'Desde', type:'date', def: primerDiaMes() },
    { id:'f_hasta', lbl:'Hasta', type:'date', def: hoy() },
  ],
  e2: [],
};

function hoy(){ return new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
function primerDiaMes(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; }
function aniosOps(){ const a=new Date().getFullYear(); return [[a,a],[a-1,a-1],[a-2,a-2]].map(x=>[String(x[0]),String(x[1])]); }

/* ══════════════════════════════════════
   NAVEGACIÓN
══════════════════════════════════════ */
function repSwitchGroup(g){
  _grupo=g;
  ['det','sin','exc'].forEach(k=>{
    const st=_el('rep-subtabs-'+k);
    if(st) st.style.display=k===g?'flex':'none';
    document.querySelectorAll(`[data-group="${k}"]`).forEach(b=>b.classList.toggle('active',k===g));
  });
  const first=document.querySelector(`#rep-subtabs-${g} .rep-sub-btn`);
  if(first) first.click();
}

function repLoad(rep){
  _rep=rep;
  document.querySelectorAll('.rep-sub-btn').forEach(b=>b.classList.toggle('active',b.dataset.rep===rep));
  _renderFiltros(rep);
  _cargarReporte();
}

function _renderFiltros(rep){
  const wrap=_el('rep-filtros-wrap');
  if(!wrap) return;
  const defs=FILTROS_DEF[rep]||[];
  if(!defs.length){ wrap.innerHTML='<span style="font-size:12px;color:#94A3B8">Sin filtros para este reporte</span>'; return; }

  wrap.innerHTML = defs.map(f=>{
    if(f.type==='date')
      return `<label>${f.lbl}
        <input type="date" id="${f.id}" value="${f.def||''}" style="margin-left:4px"
          onchange="_actualizarFiltro('${f.id}',this.value)">
      </label>`;
    if(f.type==='select')
      return `<label>${f.lbl}
        <select id="${f.id}" style="margin-left:4px" onchange="_actualizarFiltro('${f.id}',this.value)">
          ${(f.ops||[]).map(([v,t])=>`<option value="${v}"${(f.def||'')==v?' selected':''}>${t}</option>`).join('')}
        </select>
      </label>`;
    return '';
  }).join('') +
  `<button class="rep-btn-filtrar" onclick="_cargarReporte()"><i class="ri-search-line"></i> Filtrar</button>`;

  // Inicializar _filtros con defaults
  _filtros={};
  defs.forEach(f=>{ _filtros[f.id]=f.def||(_el(f.id)?.value||''); });
}

function _actualizarFiltro(id,val){ _filtros[id]=val; }

async function _cargarReporte(){
  _set('rep-content','<div class="rep-loading"><i class="ri-loader-4-line"></i><br>Cargando datos...</div>');
  try{
    await ({ d1:repD1, d2:repD2, d3:repD3, d4:repD4,
             s1:repS1, s2:repS2, s3:repS3, s4:repS4,
             e1:repE1, e2:repE2 }[_rep] || (()=>{}))();
  }catch(e){
    _set('rep-content',`<div class="rep-empty"><i class="ri-wifi-off-line"></i><p>Error cargando: ${e.message}</p></div>`);
  }
}

/* ══════════════════════════════════════
   COMPONENTES UI
══════════════════════════════════════ */
function _header(rep){
  const m=META[rep]||{};
  const chips=[
    { icon:'ri-time-line',    txt:m.frec||'—' },
    { icon:'ri-folder-line',  txt:'Retención: 5 años' },
    { icon:'ri-map-pin-line', txt:'Victoria, Yoro' },
  ].map(c=>`<span class="rep-meta-chip"><i class="${c.icon}"></i> ${c.txt}</span>`).join('');
  return `<div class="rep-report-header">
    <div class="rep-rh-title">
      <div class="rep-rh-icon ${m.iconCls||''}"><i class="${m.icon||'ri-bar-chart-2-line'}"></i></div>
      <div class="rep-rh-text"><h3>${m.titulo||'Reporte'}</h3><p>${m.sub||''}</p></div>
    </div>
    <div class="rep-rh-meta">${chips}</div>
  </div>`;
}

function _krow(cards){
  return `<div class="rep-krow">${cards.map(c=>
    `<div class="rep-kcard"><div class="lbl">${c.lbl}</div><div class="val ${c.cls||''}">${c.val}</div></div>`
  ).join('')}</div>`;
}

function _card(title, icon, body, extra=''){
  return `<div class="rep-card" ${extra}><p class="rep-card-title"><i class="${icon}"></i>${title}</p>${body}</div>`;
}

function _badge(txt,cls){ return `<span class="rb ${cls}">${txt||'—'}</span>`; }

function _tbl(cols, rows){
  if(!rows?.length) return '<p style="text-align:center;padding:20px;color:#94A3B8">Sin registros en el período seleccionado</p>';
  const th=cols.map(c=>`<th style="${c.style||''}">${c.lbl}</th>`).join('');
  const td=rows.map(r=>`<tr>${cols.map(c=>`<td style="${c.tdStyle||''}">${typeof c.render==='function'?c.render(r):(r[c.key]??'—')}</td>`).join('')}</tr>`).join('');
  return `<table class="rep-tbl"><thead><tr>${th}</tr></thead><tbody>${td}</tbody></table>`;
}

function _bars(rows){
  const max=Math.max(...rows.map(r=>r.val),1);
  return rows.map(r=>`
    <div class="rep-bar-wrap">
      <span class="rep-bar-lbl" title="${r.lbl}">${r.lbl}</span>
      <div class="rep-bar-bg"><div class="rep-bar-fill" style="width:${Math.round(r.val/max*100)}%;background:${r.color||C.navy}"></div></div>
      <span class="rep-bar-val">${r.txt||_N(r.val)}</span>
    </div>`).join('');
}

function _firma(){
  const ahora=new Date().toLocaleString('es-HN',{dateStyle:'full',timeStyle:'medium'});
  return `<div style="display:flex;align-items:center;gap:9px;background:#F4F7FA;border-radius:9px;padding:9px 14px;margin-top:7px;border:1px solid #E0E9F2">
    <img src="/img/logo.png" style="width:24px;height:24px;object-fit:contain">
    <p style="margin:0;font-size:10.5px;color:#94A3B8">Generado por <strong style="color:#003C78">Sistema ERP CRUZYMAR</strong> · ${ahora} · Victoria, Yoro, Honduras</p>
  </div>`;
}

/* ══════════════════════════════════════
   D1 — PRODUCCIÓN DIARIA
══════════════════════════════════════ */
async function repD1(){
  const qs = _buildQS({ fecha:_filtros.f_desde, fechaFin:_filtros.f_hasta, estado:_filtros.f_estado });
  const d  = await _rq('/api/reportes/detallado/produccion' + qs);
  const k  = d.kpis||{};

  const html = _header('d1') +
    _krow([
      { lbl:'Litros procesados',  val:_N(k.total_litros)+' L',  cls:'grn' },
      { lbl:'Producto obtenido',  val:_N(k.total_unidades)+' Lbs', cls:'grn' },
      { lbl:'Merma total',        val:_N(k.total_merma)+' Lbs',   cls:'red' },
      { lbl:'Lotes completados',  val:`${k.completados||0} / ${k.total_lotes||0}` },
    ]) +
    _card('Detalle de lotes del período','ri-flask-line', _tbl([
      { lbl:'N° Lote',    key:'numero_lote',       style:'width:13%' },
      { lbl:'Producto',   key:'producto_nombre',    style:'width:20%' },
      { lbl:'Leche (L)',  key:'leche_usada',        render:r=>_N(r.leche_usada)+' L' },
      { lbl:'Obtenido',   key:'cantidad_obtenida',  render:r=>r.cantidad_obtenida>0?_N(r.cantidad_obtenida)+' Lbs':'—' },
      { lbl:'Rendimiento',key:'rendimiento',        render:r=>r.rendimiento>0?_P(r.rendimiento):'—' },
      { lbl:'Merma',      key:'merma',              render:r=>`<span style="color:#DC2626">${_N(r.merma)} Lbs</span>`,tdStyle:'min-width:70px' },
      { lbl:'Turno',      key:'turno' },
      { lbl:'Fecha',      key:'fecha_produccion',   render:r=>_fec(r.fecha_produccion) },
      { lbl:'Estado',     key:'estado',             render:r=>r.estado==='Completada'?_badge('Completada','rb-ok'):r.estado==='En proceso'?_badge('En proceso','rb-blu'):_badge(r.estado,'rb-pen') },
    ], d.registros)) +
    _card('Litros procesados por día','ri-drop-line',
      `<div class="rep-chart-wrap" style="height:200px"><canvas id="cD1Bar"></canvas></div>`
    ) + _firma();

  _set('rep-content',html);
  _loadChart(()=>{
    // Agrupar por fecha
    const por={};
    (d.registros||[]).forEach(r=>{ const f=r.fecha_produccion?.slice(0,10)||'?'; por[f]=(por[f]||0)+Number(r.leche_usada||0); });
    const labs=Object.keys(por).sort(), vals=labs.map(k=>por[k]);
    _chart('cD1Bar',{ type:'bar',
      data:{ labels:labs.map(_fec), datasets:[{ label:'Litros',data:vals,backgroundColor:C.navy,borderRadius:4 }]},
      options:{ responsive:true,maintainAspectRatio:false,
        plugins:{ legend:{display:false},tooltip:{callbacks:{label:c=>c.raw+' L'}} },
        scales:{ x:{ticks:{color:tickC,font:{size:10}},grid:{display:false}},
                 y:{ticks:{color:tickC,callback:v=>v+' L'},grid:{color:gridC}} } }});
  });
}

/* ══════════════════════════════════════
   D2 — CONTROL DE CALIDAD
══════════════════════════════════════ */
async function repD2(){
  const qs = _buildQS({ fecha:_filtros.f_desde, fechaFin:_filtros.f_hasta, resultado:_filtros.f_resultado });
  const d  = await _rq('/api/reportes/detallado/calidad' + qs);
  const k  = d.kpis||{};

  const resBadge=r=>r.resultado==='Aprobado'?_badge('Aprobado','rb-ok'):r.resultado==='Rechazado'?_badge('Rechazado','rb-rej'):_badge('Observación','rb-obs');

  const html = _header('d2') +
    _krow([
      { lbl:'Total pruebas',      val:k.total_pruebas||0 },
      { lbl:'Aprobados',          val:k.aprobados||0,      cls:'grn' },
      { lbl:'Rechazados',         val:k.rechazados||0,      cls:'red' },
      { lbl:'Tasa aprobación',    val:_P(k.tasa_aprobacion), cls:(k.tasa_aprobacion||0)>=85?'grn':'red' },
      { lbl:'Alcohol positivo',   val:k.alcohol_positivo||0, cls:(k.alcohol_positivo||0)>0?'red':'' },
    ]) +
    `<div class="rep-row2">` +
      _card('Resultados del período','ri-pie-chart-line',
        `<div class="rep-chart-wrap" style="height:200px"><canvas id="cD2Dona"></canvas></div>`) +
      _card('Resumen por tipo de falla','ri-list-check',
        _bars([
          { lbl:'Aprobados',     val:Number(k.aprobados||0),   txt:_N(k.aprobados)+ ' muestras', color:C.verde },
          { lbl:'Rechazados',    val:Number(k.rechazados||0),  txt:_N(k.rechazados)+' muestras', color:C.red   },
          { lbl:'Observaciones', val:Number(k.observacion||0), txt:_N(k.observacion)+'m.',       color:C.amb   },
          { lbl:'Alcohol(+)',    val:Number(k.alcohol_positivo||0), txt:_N(k.alcohol_positivo)+'m.', color:'#7C3AED' },
        ])) +
    `</div>` +
    _card('Registros de pruebas de campo','ri-test-tube-line', _tbl([
      { lbl:'Proveedor',      key:'proveedor_nombre', style:'width:18%' },
      { lbl:'Litros',         key:'litros_acopio',    render:r=>_N(r.litros_acopio)+' L' },
      { lbl:'Olor',           key:'olor',    render:r=>r.olor==='Normal'?_badge('Normal','rb-ok'):_badge('Anormal','rb-rej') },
      { lbl:'Color',          key:'color',   render:r=>r.color==='Normal'?_badge('Normal','rb-ok'):_badge('Anormal','rb-rej') },
      { lbl:'Aspecto',        key:'aspecto', render:r=>r.aspecto==='Normal'?_badge('Normal','rb-ok'):_badge('Anormal','rb-rej') },
      { lbl:'Alcohol',        key:'prueba_alcohol', render:r=>r.prueba_alcohol==='Negativa'?_badge('Negativa','rb-ok'):_badge('Positiva','rb-rej') },
      { lbl:'Densidad',       key:'densidad', render:r=>r.densidad?Number(r.densidad).toFixed(3):'—' },
      { lbl:'Resultado',      key:'resultado', render:resBadge },
      { lbl:'Analista',       key:'analista_nombre', style:'width:13%' },
      { lbl:'Fecha',          key:'fecha', render:r=>_fec(r.fecha) },
    ], d.registros)) + _firma();

  _set('rep-content',html);
  _loadChart(()=>{
    const k2=d.kpis||{};
    _chart('cD2Dona',{ type:'doughnut',
      data:{ labels:['Aprobados','Rechazados','Observaciones'],
        datasets:[{ data:[k2.aprobados||0,k2.rechazados||0,k2.observacion||0],
          backgroundColor:[C.verde,C.red,C.amb],borderWidth:0 }]},
      options:{ responsive:true,maintainAspectRatio:false,
        plugins:{ legend:{position:'bottom',labels:{font:{size:11},padding:12}},
          tooltip:{callbacks:{label:c=>c.label+': '+c.raw+' muestras'}} } }});
  });
}

/* ══════════════════════════════════════
   D3 — DISTRIBUCIÓN
══════════════════════════════════════ */
async function repD3(){
  const qs=_buildQS({ fecha:_filtros.f_desde, fechaFin:_filtros.f_hasta, estado:_filtros.f_estado });
  const d =await _rq('/api/reportes/detallado/distribucion'+qs);
  const k =d.kpis||{};

  const estBadge=e=>e==='Pagada'?_badge('Pagada','rb-ok'):e==='Pendiente'?_badge('Pendiente','rb-pen'):_badge(e,'rb-rej');

  const html = _header('d3') +
    _krow([
      { lbl:'Total ventas',        val:k.total_facturas||0 },
      { lbl:'Total facturado',     val:_L(k.total_facturado), cls:'grn' },
      { lbl:'Pendiente de cobro',  val:_L(k.pendiente_cobro), cls:(k.pendiente_cobro||0)>0?'amb':'' },
      { lbl:'Clientes atendidos',  val:k.clientes_atendidos||0, cls:'blu' },
      { lbl:'Venta promedio',     val:_L(k.ticket_promedio) },
    ]) +
    _card('Ventas / despachos del período','ri-truck-line', _tbl([
      { lbl:'N°',      key:'numero',         style:'width:11%' },
      { lbl:'Fecha',   key:'fecha',          render:r=>_fec(r.fecha) },
      { lbl:'Cliente', key:'cliente_nombre', style:'width:20%' },
      { lbl:'Total',   key:'total',          render:r=>`<strong>${_L(r.total)}</strong>` },
      { lbl:'Pago',    key:'metodo_pago' },
      { lbl:'Estado',  key:'estado',         render:r=>estBadge(r.estado) },
    ], d.registros)) +
    `<div class="rep-row2">` +
      _card('Distribución por estado de pago','ri-pie-chart-line',
        `<div class="rep-chart-wrap" style="height:200px"><canvas id="cD3Est"></canvas></div>`) +
      _card('Top clientes del período','ri-user-star-line',
        `<div class="rep-chart-wrap" style="height:200px"><canvas id="cD3Cli"></canvas></div>`) +
    `</div>` + _firma();

  _set('rep-content',html);
  _loadChart(()=>{
    // Pagadas vs pendientes
    const pag=(d.registros||[]).filter(r=>r.estado==='Pagada').length;
    const pen=(d.registros||[]).filter(r=>r.estado==='Pendiente').length;
    const can=(d.registros||[]).filter(r=>r.estado==='Cancelada').length;
    _chart('cD3Est',{ type:'doughnut',
      data:{ labels:['Pagadas','Pendientes','Canceladas'],
        datasets:[{ data:[pag,pen,can],backgroundColor:[C.verde,C.amb,C.red],borderWidth:0 }]},
      options:{ responsive:true,maintainAspectRatio:false,
        plugins:{ legend:{position:'bottom',labels:{font:{size:11},padding:10}} } }});

    // Top clientes
    const cli={};
    (d.registros||[]).forEach(r=>{ cli[r.cliente_nombre||'Consumidor']=(cli[r.cliente_nombre||'Consumidor']||0)+Number(r.total); });
    const top=Object.entries(cli).sort((a,b)=>b[1]-a[1]).slice(0,6);
    _chart('cD3Cli',{ type:'bar',
      data:{ labels:top.map(c=>c[0]), datasets:[{ label:'Total L.',data:top.map(c=>c[1]),backgroundColor:C.navy,borderRadius:4 }]},
      options:{ responsive:true,maintainAspectRatio:false,indexAxis:'y',
        plugins:{ legend:{display:false},tooltip:{callbacks:{label:c=>_L(c.raw)}} },
        scales:{ x:{ticks:{color:tickC,callback:v=>'L.'+Math.round(v/1000)+'K'},grid:{color:gridC}},
                 y:{ticks:{color:tickC,font:{size:10}},grid:{display:false}} } }});
  });
}

/* ══════════════════════════════════════
   D4 — INVENTARIO
══════════════════════════════════════ */
async function repD4(){
  const d=await _rq('/api/reportes/sintetizado/inventario');
  const k=d.kpis||{};

  const stBadge=(p)=>Number(p.stock)<=Number(p.stock_minimo)?_badge('Bajo stock','rb-rej'):Number(p.stock)<Number(p.stock_minimo)*1.2?_badge('Alerta','rb-pen'):_badge('Normal','rb-ok');
  const pct=p=>p.stock_minimo>0?Math.min(100,Math.round(p.stock/p.stock_minimo*100)):100;

  const html = _header('d4') +
    _krow([
      { lbl:'Total unidades',      val:_N(k.total_unidades),    cls:'grn' },
      { lbl:'Valor est. inventario',val:_L(k.valor_estimado),   cls:'grn' },
      { lbl:'Productos activos',   val:k.total_productos||0 },
      { lbl:'Bajo mínimo',         val:k.productos_bajo_stock||0, cls:(k.productos_bajo_stock||0)>0?'red':'' },
      { lbl:'Agotados',            val:k.productos_agotados||0,   cls:(k.productos_agotados||0)>0?'red':'' },
    ]) +
    _card('Existencias actuales por producto','ri-archive-line', _tbl([
      { lbl:'Producto',    key:'nombre' },
      { lbl:'Categoría',  key:'categoria' },
      { lbl:'Existencias',key:'stock',       render:r=>`<strong>${_N(r.stock)}</strong> ${r.unidad||'u.'}` },
      { lbl:'Mínimo',     key:'stock_minimo',render:r=>`${_N(r.stock_minimo)} ${r.unidad||'u.'}` },
      { lbl:'Cobertura',  key:'_cob',
        render:r=>{
          const p=pct(r);
          const c=p<100?'#DC2626':p<120?'#D97706':'#468C28';
          return `<div style="display:flex;align-items:center;gap:6px">
            <div style="flex:1;height:6px;background:#F1F5F9;border-radius:3px;overflow:hidden">
              <div style="width:${Math.min(p,100)}%;height:100%;background:${c};border-radius:3px"></div>
            </div>
            <span style="font-size:11px;color:${c};font-weight:700;min-width:35px">${p}%</span>
          </div>`;
        }},
      { lbl:'Estado',   key:'_st', render:stBadge },
      { lbl:'Precio',   key:'precio', render:r=>_L(r.precio) },
    ], d.productos||[])) +
    _card('Stock por producto','ri-bar-chart-line',
      `<div class="rep-chart-wrap" style="height:220px"><canvas id="cD4Bar"></canvas></div>`
    ) + _firma();

  _set('rep-content',html);
  _loadChart(()=>{
    const prods=(d.productos||[]).slice(0,10);
    _chart('cD4Bar',{ type:'bar',
      data:{ labels:prods.map(p=>p.nombre),
        datasets:[
          { label:'Stock actual', data:prods.map(p=>p.stock),     backgroundColor:C.navy,  borderRadius:3 },
          { label:'Stock mínimo', data:prods.map(p=>p.stock_minimo),backgroundColor:C.red+'44',borderRadius:3 },
        ]},
      options:{ responsive:true,maintainAspectRatio:false,
        plugins:{ legend:{position:'top',labels:{font:{size:11},padding:10}} },
        scales:{ x:{ticks:{color:tickC,font:{size:10}},grid:{display:false}},
                 y:{ticks:{color:tickC},grid:{color:gridC}} } }});
  });
}

/* ══════════════════════════════════════
   S1 — MERMAS Y DESPERDICIOS
══════════════════════════════════════ */
async function repS1(){
  const qs=_buildQS({ fecha:_filtros.f_desde, fechaFin:_filtros.f_hasta });
  const d =await _rq('/api/reportes/sintetizado/produccion'+qs);
  const k =d.kpis||{};

  const html = _header('s1') +
    _krow([
      { lbl:'Merma producción', val:_N(k.merma_produccion||0)+' Lbs', cls:'red' },
      { lbl:'Merma acopio',    val:_N(k.merma_acopio||0)+' L',     cls:'red' },
      { lbl:'Total merma',     val:_N(k.merma_total||0),             cls:'red' },
      { lbl:'N° registros',    val:k.total_registros||0 },
    ]) +
    `<div class="rep-row2">` +
      _card('Merma por causa','ri-pie-chart-line',
        `<div class="rep-chart-wrap" style="height:200px"><canvas id="cS1Dona"></canvas></div>`) +
      _card('Detalle por causa','ri-list-check',
        _tbl([
          { lbl:'Causa',       key:'causa' },
          { lbl:'Total (kg)',  key:'total',       render:r=>`<strong style="color:#DC2626">${_N(r.total)}</strong>` },
          { lbl:'Ocurrencias', key:'ocurrencias' },
        ], d.porCausa||[])) +
    `</div>` +
    _card('Registros de merma del período','ri-recycle-line', _tbl([
      { lbl:'Fecha',      key:'fecha',             render:r=>_fec(r.fecha) },
      { lbl:'Tipo',       key:'tipo' },
      { lbl:'Causa',      key:'causa' },
      { lbl:'Cantidad',   key:'cantidad',          render:r=>`<strong style="color:#DC2626">${_N(r.cantidad)}</strong>` },
      { lbl:'Lote',       key:'numero_lote' },
      { lbl:'Responsable',key:'responsable_nombre' },
    ], d.registros||[])) +
    _firma();

  _set('rep-content',html);
  _loadChart(()=>{
    const causas=d.porCausa||[];
    if(!causas.length) return;
    _chart('cS1Dona',{ type:'doughnut',
      data:{ labels:causas.map(c=>c.causa||'Sin causa'), datasets:[{ data:causas.map(c=>c.total),backgroundColor:COLS,borderWidth:0 }]},
      options:{ responsive:true,maintainAspectRatio:false,
        plugins:{ legend:{position:'bottom',labels:{font:{size:11},padding:10}},
          tooltip:{callbacks:{label:c=>c.label+': '+_N(c.raw)+' Lbs'}} } }});
  });
}

/* ══════════════════════════════════════
   S2 — ESTADOS FINANCIEROS
══════════════════════════════════════ */
async function repS2(){
  const qs=_buildQS({ mes:_filtros.f_mes, anio:_filtros.f_anio });
  const d =await _rq('/api/reportes/sintetizado/financiero'+qs);
  const k =d.kpis||{};

  const html = _header('s2') +
    _krow([
      { lbl:'Ingresos',       val:_L(k.ingresos),  cls:'grn' },
      { lbl:'Egresos',        val:_L(k.egresos),   cls:'red' },
      { lbl:'Ganancia',       val:_L(k.utilidad),  cls:(k.utilidad||0)>=0?'grn':'red' },
      { lbl:'Margen',         val:_P(k.margen),    cls:(k.margen||0)>=15?'grn':(k.margen||0)>=5?'amb':'red' },
    ]) +
    _card('Ingresos vs Egresos por semana del mes','ri-line-chart-line',
      `<div class="rep-chart-wrap" style="height:220px"><canvas id="cS2Sem"></canvas></div>`) +
    `<div class="rep-row2">` +
      _card('Egresos por categoría','ri-pie-chart-line',
        `<div class="rep-chart-wrap" style="height:200px"><canvas id="cS2Cat"></canvas></div>`) +
      _card('Top productos del mes','ri-trophy-line',
        _bars((d.topProductos||[]).map(p=>({ lbl:p.nombre, val:Number(p.ingresos), txt:_L(p.ingresos), color:C.navy })))) +
    `</div>` +
    _card('Detalle de egresos por categoría','ri-list-check', _tbl([
      { lbl:'Categoría', key:'categoria' },
      { lbl:'Monto',     key:'total', render:r=>`<strong>${_L(r.total)}</strong>` },
    ], d.gastosCategoria||[])) +
    _firma();

  _set('rep-content',html);
  _loadChart(()=>{
    const sems=d.semanas||[];
    _chart('cS2Sem',{ type:'bar',
      data:{ labels:sems.map(s=>s.semana),
        datasets:[{ label:'Ingresos',data:sems.map(s=>s.total),backgroundColor:C.verde,borderRadius:4 }]},
      options:{ responsive:true,maintainAspectRatio:false,
        plugins:{ legend:{display:false},tooltip:{callbacks:{label:c=>_L(c.raw)}} },
        scales:{ x:{ticks:{color:tickC},grid:{display:false}},
                 y:{ticks:{color:tickC,callback:v=>'L.'+Math.round(v/1000)+'K'},grid:{color:gridC}} } }});

    const gats=d.gastosCategoria||[];
    if(gats.length){
      _chart('cS2Cat',{ type:'doughnut',
        data:{ labels:gats.map(g=>g.categoria), datasets:[{ data:gats.map(g=>g.total),backgroundColor:COLS,borderWidth:0 }]},
        options:{ responsive:true,maintainAspectRatio:false,
          plugins:{ legend:{position:'bottom',labels:{font:{size:10},padding:8}},
            tooltip:{callbacks:{label:c=>c.label+': '+_L(c.raw)}} } }});
    }
  });
}

/* ══════════════════════════════════════
   S3 — VENTAS DE PRODUCTOS LÁCTEOS
══════════════════════════════════════ */
async function repS3(){
  const qs=_buildQS({ mes:_filtros.f_mes, anio:_filtros.f_anio });
  const d =await _rq('/api/reportes/sintetizado/ventas'+qs);
  const k =d.kpis||{};

  const html = _header('s3') +
    _krow([
      { lbl:'Total ventas',    val:k.total_ventas||0 },
      { lbl:'Ingresos totales',val:_L(k.total_ingresos), cls:'grn' },
      { lbl:'Venta promedio',  val:_L(k.ticket_promedio) },
      { lbl:'Clientes únicos', val:k.clientes_distintos||0, cls:'blu' },
    ]) +
    `<div class="rep-row2">` +
      _card('Top productos por ingresos','ri-bar-chart-2-line',
        `<div class="rep-chart-wrap" style="height:220px"><canvas id="cS3Prod"></canvas></div>`) +
      _card('Top clientes del mes','ri-user-star-line',
        _bars((d.topClientes||[]).slice(0,6).map(c=>({ lbl:c.cliente_nombre, val:Number(c.total_comprado), txt:_L(c.total_comprado), color:C.verde })))) +
    `</div>` +
    _card('Detalle de ventas por producto','ri-list-check', _tbl([
      { lbl:'Producto',     key:'producto' },
      { lbl:'Unidades vendidas',key:'total_vendido',  render:r=>_N(r.total_vendido) },
      { lbl:'Precio prom.',   key:'precio_prom',     render:r=>_L(r.precio_prom) },
      { lbl:'Ingresos',       key:'total_ingresos',  render:r=>`<strong>${_L(r.total_ingresos)}</strong>` },
      { lbl:'N° Ventas',      key:'num_ventas' },
    ], d.productos||[])) +
    _firma();

  _set('rep-content',html);
  _loadChart(()=>{
    const top=(d.productos||[]).slice(0,7);
    _chart('cS3Prod',{ type:'bar',
      data:{ labels:top.map(p=>p.producto),
        datasets:[{ label:'Ingresos',data:top.map(p=>Number(p.total_ingresos)),backgroundColor:COLS,borderRadius:4 }]},
      options:{ responsive:true,maintainAspectRatio:false,
        plugins:{ legend:{display:false},tooltip:{callbacks:{label:c=>_L(c.raw)}} },
        scales:{ x:{ticks:{color:tickC,font:{size:10}},grid:{display:false}},
                 y:{ticks:{color:tickC,callback:v=>'L.'+Math.round(v/1000)+'K'},grid:{color:gridC}} } }});
  });
}

/* ══════════════════════════════════════
   S4 — PRODUCTO POR CLIENTE
══════════════════════════════════════ */
async function repS4(){
  const qs=_buildQS({ mes:_filtros.f_mes, anio:_filtros.f_anio });
  const d =await _rq('/api/reportes/sintetizado/producto-cliente'+qs);

  const filas=(d.porCliente||[]).map(cli=>`
    <tr style="background:#F8FAFC">
      <td colspan="5" style="padding:9px 12px;font-weight:800;color:#003C78;border-bottom:1px solid #E0E9F2">
        <i class="ri-user-line"></i> ${cli.cliente} &nbsp;
        <span style="font-weight:400;font-size:11px;color:#64748B">— ${cli.productos.length} producto(s) · Total: ${_L(cli.total)}</span>
      </td>
    </tr>
    ${cli.productos.map(p=>`
    <tr>
      <td style="padding:8px 12px 8px 28px;color:#334155">${p.producto}</td>
      <td style="padding:8px 12px;text-align:right">${_N(p.cantidad_total)}</td>
      <td style="padding:8px 12px;text-align:right"><strong>${_L(p.monto_total)}</strong></td>
      <td style="padding:8px 12px">${p.num_pedidos} compras</td>
      <td style="padding:8px 12px;color:#94A3B8;font-size:11px">${_fec(p.ultima_compra)}</td>
    </tr>`).join('')}
  `).join('');

  const html = _header('s4') +
    _krow([
      { lbl:'Clientes analizados', val:(d.porCliente||[]).length, cls:'blu' },
      { lbl:'Transacciones',       val:(d.registros||[]).length },
      { lbl:'Ingreso total',       val:_L((d.registros||[]).reduce((s,r)=>s+Number(r.monto_total||0),0)), cls:'grn' },
    ]) +
    _card('Productos comprados por cliente','ri-user-heart-line',`
      <table class="rep-tbl">
        <thead><tr>
          <th>Producto</th><th style="text-align:right">Cantidad</th>
          <th style="text-align:right">Monto</th><th>Frecuencia</th><th>Última compra</th>
        </tr></thead>
        <tbody>${filas||'<tr><td colspan="5" style="text-align:center;padding:20px;color:#94A3B8">Sin registros</td></tr>'}</tbody>
      </table>`) +
    _card('Distribución de ingresos por cliente','ri-pie-chart-line',
      `<div class="rep-chart-wrap" style="height:220px"><canvas id="cS4Dona"></canvas></div>`) +
    _firma();

  _set('rep-content',html);
  _loadChart(()=>{
    const top=(d.porCliente||[]).slice(0,7);
    _chart('cS4Dona',{ type:'doughnut',
      data:{ labels:top.map(c=>c.cliente), datasets:[{ data:top.map(c=>c.total),backgroundColor:COLS,borderWidth:0 }]},
      options:{ responsive:true,maintainAspectRatio:false,
        plugins:{ legend:{position:'right',labels:{font:{size:11},padding:10}},
          tooltip:{callbacks:{label:c=>c.label+': '+_L(c.raw)}} } }});
  });
}

/* ══════════════════════════════════════
   E1 — LECHE NO APTA
══════════════════════════════════════ */
async function repE1(){
  const qs=_buildQS({ fecha:_filtros.f_desde, fechaFin:_filtros.f_hasta });
  const d =await _rq('/api/reportes/excepcion/leche-no-apta'+qs);
  const k =d.kpis||{};

  // Badge excepción
  const badge=_el('rep-badge-exc');
  if(badge){ badge.textContent='!'; badge.style.display=(k.total_rechazos||0)>0?'inline':'none'; }

  const filas=(d.registros||[]).map(r=>`
    <div class="rep-exc-row" style="border-left:3px solid #DC2626">
      <div class="rep-exc-icon red"><i class="ri-close-circle-line"></i></div>
      <div style="flex:1">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:5px">
          <strong style="font-size:13px;color:#1E293B">${r.proveedor_nombre||'Sin nombre'}</strong>
          ${_badge('RECHAZADA','rb-rej')}
        </div>
        <p style="margin:4px 0 0;font-size:12px;color:#64748B">
          <strong>${_N(r.litros)} L</strong> rechazados · Fecha: <strong>${_fec(r.fecha)}</strong> · Turno: <strong>${r.turno||'—'}</strong>
        </p>
        ${r.motivo_rechazo?`<p style="margin:3px 0 0;font-size:12px;color:#DC2626"><i class="ri-error-warning-line"></i> ${r.motivo_rechazo}</p>`:''}
        <p style="margin:3px 0 0;font-size:11px;color:#94A3B8">
          Alcohol: <strong>${r.prueba_alcohol||'—'}</strong> · Densidad: <strong>${r.densidad?Number(r.densidad).toFixed(3):'—'}</strong>
          · Analista: ${r.analista_nombre||'—'}
        </p>
      </div>
      <div style="text-align:right;font-size:12px;color:#DC2626;font-weight:700">${_L(r.total_pagar)}<br><span style="font-size:10px;color:#94A3B8">pérdida</span></div>
    </div>`).join('');

  const html = _header('e1') +
    _krow([
      { lbl:'Rechazos',              val:k.total_rechazos||0,    cls:(k.total_rechazos||0)>0?'red':'' },
      { lbl:'Litros rechazados',     val:_N(k.litros_rechazados||0)+' L', cls:'red' },
      { lbl:'Costo perdido',         val:_L(k.costo_perdido||0), cls:'red' },
      { lbl:'Proveedores afectados', val:k.proveedores_afectados||0 },
    ]) +
    ((d.registros||[]).length
      ? _card('Detalle de rechazos — acción requerida','ri-close-circle-line', filas, 'style="border-left:4px solid #DC2626;border-radius:0 13px 13px 0"')
      : `<div class="rep-empty" style="background:#F0FDF4;border-radius:13px;border:1.5px solid #DCFCE7">
          <i class="ri-checkbox-circle-line" style="color:#15803D"></i>
          <p style="font-weight:700;color:#15803D;margin:8px 0 4px">Sin rechazos en el período</p>
          <p style="font-size:12px;color:#64748B">Toda la leche recibida cumplió los estándares</p>
         </div>`) +
    _card('Rechazos por proveedor','ri-pie-chart-line',
      `<div class="rep-chart-wrap" style="height:200px"><canvas id="cE1Dona"></canvas></div>`) +
    _firma();

  _set('rep-content',html);
  _loadChart(()=>{
    const pp=d.porProveedor||[];
    if(!pp.length) return;
    _chart('cE1Dona',{ type:'doughnut',
      data:{ labels:pp.map(p=>p.proveedor||'?'), datasets:[{ data:pp.map(p=>Number(p.litros||0)),backgroundColor:COLS,borderWidth:0 }]},
      options:{ responsive:true,maintainAspectRatio:false,
        plugins:{ legend:{position:'bottom',labels:{font:{size:11},padding:10}},
          tooltip:{callbacks:{label:c=>c.label+': '+_N(c.raw)+' L'}} } }});
  });
}

/* ══════════════════════════════════════
   E2 — STOCK BAJO
══════════════════════════════════════ */
async function repE2(){
  const d=await _rq('/api/reportes/excepcion/stock');
  const k=d.kpis||{};

  const badge=_el('rep-badge-exc');
  if(badge){ badge.textContent='!'; badge.style.display=(k.criticos||0)>0?'inline':'none'; }

  const html = _header('e2') +
    _krow([
      { lbl:'Productos críticos', val:k.criticos||0, cls:(k.criticos||0)>0?'red':'' },
      { lbl:'Total productos',    val:k.totalProductos||0 },
      { lbl:'En niveles OK',      val:k.ok||0, cls:'grn' },
    ]) +
    ((d.criticos||[]).length
      ? _card('Productos bajo el stock mínimo — requieren abastecimiento','ri-error-warning-line',
          _tbl([
            { lbl:'Producto',    key:'nombre' },
            { lbl:'Categoría',  key:'categoria' },
            { lbl:'Stock actual',key:'stock',       render:r=>`<strong style="color:#DC2626">${_N(r.stock)}</strong> ${r.unidad||'u.'}` },
            { lbl:'Stock mínimo',key:'stock_minimo',render:r=>`${_N(r.stock_minimo)} ${r.unidad||'u.'}` },
            { lbl:'Déficit',     key:'deficit',     render:r=>`<strong style="color:#DC2626">${_N(r.deficit)}</strong> ${r.unidad||'u.'}` },
            { lbl:'Cobertura',   key:'pct_stock',   render:r=>{
              const p=Number(r.pct_stock||0);
              const c=p<50?C.red:p<80?C.amb:C.verde;
              return `<span style="font-weight:700;color:${c}">${p}%</span>`;
            }},
          ], d.criticos), 'style="border-left:4px solid #DC2626;border-radius:0 13px 13px 0"')
      : `<div class="rep-empty" style="background:#F0FDF4;border-radius:13px;border:1.5px solid #DCFCE7">
          <i class="ri-checkbox-circle-line" style="color:#15803D"></i>
          <p style="font-weight:700;color:#15803D;margin:8px 0 4px">Todo el stock en niveles normales</p>
         </div>`) +
    _bars((d.todos||[]).slice(0,10).map(p=>({
      lbl:p.nombre, val:Number(p.pct_stock||0), txt:_N(p.stock)+' '+( p.unidad||'u.'),
      color:Number(p.stock)<Number(p.stock_minimo)?C.red:C.navy
    }))) + _firma();

  _set('rep-content',html);
}

/* ══════════════════════════════════════
   IMPRIMIR
══════════════════════════════════════ */
function repImprimir(){
  const m=META[_rep]||{};
  const ahora=new Date();
  const fecStr=ahora.toLocaleDateString('es-HN',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const horStr=ahora.toLocaleTimeString('es-HN',{hour:'2-digit',minute:'2-digit'});

  let usuario='Usuario del sistema';
  try{
    const tok=localStorage.getItem('crz_token')||'';
    if(tok){ const p=JSON.parse(atob(tok.split('.')[1])); usuario=p.nombre||p.email||usuario; }
  }catch(e){}

  const f=_el('rph-fecha-imp');   if(f) f.textContent=`Fecha impresión: ${fecStr} — ${horStr}`;
  const u=_el('rph-usuario-imp'); if(u) u.textContent=`Generado por: ${usuario}`;
  const t=_el('rph-titulo-imp');  if(t) t.textContent=m.titulo||'Reporte CRUZYMAR';
  const r=_el('rph-resp-imp');    if(r) r.textContent=`Responsables: ${m.resp||'—'} · Frecuencia: ${m.frec||'—'} · Retención: 5 años`;
  const s=_el('rph-sub-imp');     if(s) s.textContent=m.sub||'';

  // Mostrar header para el print
  const ph=_el('rep-print-header');
  if(ph) ph.style.display='block';

  window.print();

  setTimeout(()=>{ if(ph) ph.style.display='none'; },800);
}

/* ══════════════════════════════════════
   EXPORTAR EXCEL (.xlsx real con SheetJS)
══════════════════════════════════════ */
function repExportExcel(){
  const m=META[_rep]||{};
  const ahora=new Date();
  const fechaStr=ahora.toLocaleDateString('es-HN').replace(/\//g,'-');
  const fecLarga=ahora.toLocaleDateString('es-HN',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const hora=ahora.toLocaleTimeString('es-HN',{hour:'2-digit',minute:'2-digit'});
  let usuario='Usuario del sistema';
  try{ const tok=localStorage.getItem('crz_token')||''; if(tok){ const p=JSON.parse(atob(tok.split('.')[1])); usuario=p.nombre||p.email||usuario; } }catch(e){}

  // Recopilar filas de la tabla visible
  const tabla=document.querySelector('#rep-content .rep-tbl');
  let rows=[];
  // Cabecera empresa
  rows.push(['CRUZYMAR Productos Lácteos']);
  rows.push(['Victoria, Yoro, Honduras — Sistema ERP de Gestión Lechera']);
  rows.push([m.titulo||'Reporte']);
  rows.push([`Fecha de impresión: ${fecLarga} — ${hora}`]);
  rows.push([`Generado por: ${usuario}`]);
  rows.push([`Responsables: ${m.resp||'—'} · Frecuencia: ${m.frec||'—'} · Retención: 5 años`]);
  rows.push([]); // espacio

  if(tabla){
    const ths=Array.from(tabla.querySelectorAll('thead th')).map(th=>th.innerText.trim());
    rows.push(ths);
    tabla.querySelectorAll('tbody tr').forEach(tr=>{
      const celdas=Array.from(tr.querySelectorAll('td')).map(td=>td.innerText.trim().replace(/\n+/g,' '));
      rows.push(celdas);
    });
  } else {
    // Si no hay tabla, exportar KPIs
    document.querySelectorAll('#rep-content .rep-kcard').forEach(k=>{
      rows.push([k.querySelector('.lbl')?.innerText||'', k.querySelector('.val')?.innerText||'']);
    });
  }
  rows.push([]);
  rows.push([`— Documento generado por Sistema ERP CRUZYMAR — ${fecLarga} — Confidencial —`]);

  // Usar SheetJS si disponible, si no CSV con BOM
  if(window.XLSX){
    const ws=XLSX.utils.aoa_to_sheet(rows);
    // Estilos básicos: ancho de columnas
    ws['!cols']=[{wch:30},{wch:20},{wch:20},{wch:15},{wch:15},{wch:15},{wch:15},{wch:15}];
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'Reporte');
    const nombre=(m.titulo||'reporte').toLowerCase().replace(/[^a-z0-9]/g,'_').replace(/_+/g,'_').slice(0,35);
    XLSX.writeFile(wb,`cruzymar_${nombre}_${fechaStr}.xlsx`);
  } else {
    // Cargar SheetJS y reintentar
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload=()=>repExportExcel();
    document.head.appendChild(s);
  }
}

/* ══════════════════════════════════════
   UTILIDADES
══════════════════════════════════════ */
function _buildQS(params){
  const p=Object.entries(params).filter(([,v])=>v!==undefined&&v!==null&&v!=='');
  return p.length?'?'+p.map(([k,v])=>`${k}=${encodeURIComponent(v)}`).join('&'):'';
}

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
function initReportes(){
  const chip=_el('rep-fecha-hoy');
  if(chip) chip.textContent=new Date().toLocaleDateString('es-HN',{weekday:'short',year:'numeric',month:'short',day:'numeric'});
  repLoad('d1');
  // Pre-check excepciones
  _rq('/api/reportes/excepcion/leche-no-apta').then(d=>{
    const b=_el('rep-badge-exc');
    if(b&&(d.kpis?.total_rechazos||0)>0){ b.textContent='!'; b.style.display='inline'; }
  }).catch(()=>{});
}

if(document.getElementById('rep-root')) initReportes();
JSEOF