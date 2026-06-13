/* ═══════════════════════════════════════════════════
   CRUZYMAR · app.js ACTUALIZADO
  
═══════════════════════════════════════════════════ */

const API = '/api';

const Auth = {
  get token() { return localStorage.getItem('crz_token'); },
  get user()  { return JSON.parse(localStorage.getItem('crz_user') || 'null'); },
  save(token, user) {
    localStorage.setItem('crz_token', token);
    localStorage.setItem('crz_user', JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem('crz_token');
    localStorage.removeItem('crz_user');
  },
  ok() { return !!this.token; }
};

async function req(method, path, body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (Auth.token) opts.headers['Authorization'] = 'Bearer ' + Auth.token;
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(API + path, opts);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Error ' + r.status);
  return d;
}

const el = id => document.getElementById(id);
const L  = n  => 'L. ' + (+n || 0).toLocaleString('es-HN', { minimumFractionDigits: 2 });
const N  = n  => (+n || 0).toLocaleString('es-HN');

function toast(msg, type = 'ok') {
  const c = el('toastContainer');
  if (!c) return;
  const t = document.createElement('div');
  t.className = 'toast' + (type === 'err' ? ' err' : '');
  t.innerHTML = `<span>${type === 'err' ? '❌' : '✅'}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(30px)';
    t.style.transition = '.3s';
    setTimeout(() => t.remove(), 300);
  }, 3500);
}

function iniciarReloj() {
  const actualizar = () => {
    const e = el('topDate');
    if (e) e.textContent = new Date().toLocaleString('es-HN', {
      dateStyle: 'full', timeStyle: 'medium'
    });
  };
  actualizar();
  setInterval(actualizar, 1000);
}

async function login() {
  const email = el('loginEmail')?.value;
  const pass  = el('loginPass')?.value;
  const err   = el('loginErr');
  if (err) err.style.display = 'none';
  if (!email || !pass) {
    if (err) { err.textContent = 'Ingrese email y contraseña'; err.style.display = 'block'; }
    return;
  }
  try {
    const d = await req('POST', '/auth/login', { email, password: pass });
    Auth.save(d.token, d.usuario);
    window.location.href = '/index.html';
  } catch(e) {
    if (err) { err.textContent = e.message; err.style.display = 'block'; }
  }
}

function logout() {
  Auth.clear();
  window.location.href = '/login.html';
}

// ── SIDEBAR ───────────────────────────────────

let sidebarAbierto = true;

function toggleSidebar() {
  const sb   = el('sidebar');
  const main = document.querySelector('.main');
  const icon = el('collapseIcon');

  sidebarAbierto = !sidebarAbierto;
  sb?.classList.toggle('open', sidebarAbierto);

  if (main) {
    main.style.marginLeft = sidebarAbierto ? '240px' : '72px';
  }

  if (icon) {
    icon.className = sidebarAbierto
      ? 'ri-arrow-left-s-line'
      : 'ri-arrow-right-s-line';
  }
}

// ── NAVEGACIÓN ────────────────────────────────
let currentPage         = 'dashboard';
let backupDashboardHTML = '';

const PAGINAS = {
  dashboard: { titulo: 'Panel Principal', subtitulo: 'Bienvenido al sistema', html: null, fn: () => initDashboard() },
  acopio: { titulo: 'Recepción de Leche', subtitulo: 'Registro diario de entregas', html: 'acopio.html', fn: () => loadAcopio() },
  calidad: { titulo: 'Control de Calidad', subtitulo: 'Análisis y pruebas de laboratorio', html: 'calidad.html', fn: () => { if(window.loadCalidad) loadCalidad(); } },
  produccion: { titulo: 'Producción', subtitulo: 'Gestión y control de producción', html: 'produccion.html', fn: () => loadProduccion() },
  lotes: { titulo: 'Gestión de Lotes', subtitulo: 'Trazabilidad de producción', html: 'lotes.html', fn: () => { if(window.loadLotes) loadLotes(); } },
  recetas: { titulo: 'Recetas', subtitulo: 'Fórmulas y estandarización', html: 'recetas.html', fn: () => { if(window.loadRecetas) loadRecetas(); } },
  'inventario-mp': { titulo: 'Inventario', subtitulo: 'Materia Prima', html: 'inventario.html', fn: () => { loadInventario(); if(window.cambiarTabInv) setTimeout(()=>cambiarTabInv('mp'), 50); } },
  'inventario-pt': { titulo: 'Inventario', subtitulo: 'Productos Terminados', html: 'inventario.html', fn: () => { loadInventario(); if(window.cambiarTabInv) setTimeout(()=>cambiarTabInv('pt'), 50); } },
  'inventario-mov': { titulo: 'Inventario', subtitulo: 'Movimientos de Stock', html: 'inventario.html', fn: () => { loadInventario(); if(window.cambiarTabInv) setTimeout(()=>cambiarTabInv('mov'), 50); } },
  'inventario-ven': { titulo: 'Inventario', subtitulo: 'Vencimientos', html: 'inventario.html', fn: () => { loadInventario(); if(window.cambiarTabInv) setTimeout(()=>cambiarTabInv('ven'), 50); } },
  ventas: { titulo: 'Ventas', subtitulo: 'Registro de ventas', html: 'ventas.html', fn: () => loadVentas() },
  clientes: { titulo: 'Clientes', subtitulo: 'Gestión de clientes', html: 'clientes.html', fn: () => loadClientes() },
  facturacion: { titulo: 'Facturación', subtitulo: 'Facturas fiscales', html: 'facturacion.html', fn: () => loadFacturacion() },
  pedidos: { titulo: 'Pedidos', subtitulo: 'Órdenes de clientes', html: 'pedidos.html', fn: () => { if(window.loadPedidos) loadPedidos(); } },
  proveedores: { titulo: 'Proveedores', subtitulo: 'Proveedores de leche e insumos', html: 'proveedores.html', fn: () => loadProveedores() },
  compras: { titulo: 'Compras', subtitulo: 'Órdenes de compra', html: 'compras.html', fn: () => { if(window.loadCompras) loadCompras(); } },
  gastos: { titulo: 'Gastos', subtitulo: 'Control de gastos operativos', html: 'gastos.html', fn: () => loadGastos() },
  'reportes-ven': { titulo: 'Reportes', subtitulo: 'Análisis de Ventas', html: 'reportes.html', fn: () => { loadReportes(); if(window.cambiarTabRep) setTimeout(()=>cambiarTabRep('ven'), 50); } },
  'reportes-prod': { titulo: 'Reportes', subtitulo: 'Análisis de Producción', html: 'reportes.html', fn: () => { loadReportes(); if(window.cambiarTabRep) setTimeout(()=>cambiarTabRep('prod'), 50); } },
  'reportes-cal': { titulo: 'Reportes', subtitulo: 'Análisis de Calidad', html: 'reportes.html', fn: () => { loadReportes(); if(window.cambiarTabRep) setTimeout(()=>cambiarTabRep('cal'), 50); } },
  'reportes-inv': { titulo: 'Reportes', subtitulo: 'Análisis de Inventario', html: 'reportes.html', fn: () => { loadReportes(); if(window.cambiarTabRep) setTimeout(()=>cambiarTabRep('inv'), 50); } },
  'reportes-rent': { titulo: 'Reportes', subtitulo: 'Rentabilidad', html: 'reportes.html', fn: () => { loadReportes(); if(window.cambiarTabRep) setTimeout(()=>cambiarTabRep('rent'), 50); } },
  configuracion: { titulo: 'Configuración', subtitulo: 'Ajustes del sistema', html: 'configuracion.html', fn: () => loadConfiguracion() }
};
async function navigateTo(page) {
  const pagina = PAGINAS[page];
  if (!pagina) return;

  currentPage = page;
  const container = el('dynamicContent');
const title = el('viewTitle');
const subtitle = el('viewSubtitle');
  if (!container || !title) return;

 title.textContent = pagina.titulo;

if (subtitle) {
  subtitle.textContent = pagina.subtitulo || '';
}

  // Sidebar activo
  document.querySelectorAll('.sb-nav .sb-item').forEach(i => i.classList.remove('active'));
  document.querySelector(`.sb-nav .sb-item[data-page="${page}"]`)?.classList.add('active');

  if (page === 'dashboard') {
    if (!backupDashboardHTML) {
      const vista = el('vistaDashboard');
      if (vista) backupDashboardHTML = vista.outerHTML;
    }
    container.innerHTML = backupDashboardHTML;
    setTimeout(() => pagina.fn(), 50);
    return;
  }

  try {
    const res = await fetch(pagina.html);
    if (!res.ok) throw new Error(`No se pudo cargar ${pagina.html}`);
    container.innerHTML = await res.text();
    pagina.fn();
  } catch(err) {
    container.innerHTML = `<div style="padding:30px;color:#E03535;font-weight:600">⚠️ Error: ${err.message}</div>`;
  }
}

function refreshCurrentPage() { navigateTo(currentPage); }

// ── MOSTRAR APP ───────────────────────────────
function showApp() {
  const app = el('appPage');
  if (!app) return;
  app.style.display = 'flex';

  // Sidebar empieza abierto 
  const main = document.querySelector('.main');
  if (main) main.style.marginLeft = '240px';

  const u = Auth.user;
  if (u) {
    const avatar = u.nombre ? u.nombre[0].toUpperCase() : 'U';
    if (el('sbUserAvatar')) el('sbUserAvatar').textContent = avatar;
    if (el('sbUserName'))   el('sbUserName').textContent   = u.nombre || 'Usuario';
    if (el('sbUserEmail'))  el('sbUserEmail').textContent  = u.email  || '';
    if (el('sbUserName')) {
        el('sbUserName').textContent += ` (${u.rol})`;
    }

    // RBAC: Ocultar módulos según el rol
    const roleMap = {
      'produccion': [
        'ventas', 'clientes', 'facturacion', 'pedidos', 
        'proveedores', 'compras', 'gastos', 
        'reportes-ven', 'reportes-prod', 'reportes-cal', 'reportes-inv', 'reportes-rent', 
        'configuracion'
      ],
      'ventas': [
        'acopio', 'calidad', 'produccion', 'lotes', 'recetas', 
        'inventario-mp', 'inventario-mov', 
        'proveedores', 'compras', 'gastos', 
        'reportes-prod', 'reportes-cal', 'reportes-inv', 
        'configuracion'
      ]
    };
    
    const hiddenPages = roleMap[u.rol] || [];
    document.querySelectorAll('.sb-nav .sb-item').forEach(item => {
      const page = item.getAttribute('data-page');
      if (hiddenPages.includes(page)) {
        item.style.display = 'none';
      } else {
        item.style.display = 'flex';
      }
    });

    // Ocultar etiquetas de grupo vacías (opcional visual)
    document.querySelectorAll('.sb-group-label').forEach(label => {
        let next = label.nextElementSibling;
        let hasVisible = false;
        while(next && next.classList.contains('sb-item')) {
            if (next.style.display !== 'none') hasVisible = true;
            next = next.nextElementSibling;
        }
        label.style.display = hasVisible ? 'block' : 'none';
    });
  }

  const vista = el('vistaDashboard');
  if (vista) backupDashboardHTML = vista.outerHTML;
  else {
    const c = el('dynamicContent');
    if (c) backupDashboardHTML = c.innerHTML;
  }

  if (document.readyState === 'complete') {
    if (typeof initDashboard === 'function') initDashboard();
  } else {
    window.addEventListener('load', () => {
      if (typeof initDashboard === 'function') initDashboard();
    });
  }

  iniciarReloj();
}

// ── INIT ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const esLogin = window.location.pathname.includes('login.html');

  ['loginEmail', 'loginPass'].forEach(id => {
    el(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') login();
    });
  });

  if (!Auth.ok()) {
    if (!esLogin) window.location.href = 'login.html';
    return;
  }
  if (esLogin) { window.location.href = 'index.html'; return; }

  showApp();

  // Clicks sidebar — solo items con data-page y sin clase proximamente
  document.querySelectorAll('.sb-nav .sb-item[data-page]:not(.proximamente)').forEach(item => {
    item.addEventListener('click', () => {
      navigateTo(item.getAttribute('data-page'));
    });
  });
});