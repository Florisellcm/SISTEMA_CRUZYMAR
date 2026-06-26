/* ═══════════════════════════════════════════════════
   CRUZYMAR · app.js ACTUALIZADO (Tabs)

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

function toggleGroup(labelEl) {
  const group = labelEl.parentElement; // .sb-group
  if (!group || !group.classList.contains('sb-group')) return;

  const isOpen = group.classList.contains('open');

  document.querySelectorAll('.sb-group').forEach(g => g.classList.remove('open'));

  if (!isOpen) group.classList.add('open');
}

function abrirGrupoActivo() {
  const activeItem = document.querySelector('.sb-nav .sb-item.active');
  if (!activeItem) return;

  const parentGroup = activeItem.closest('.sb-group');
  if (!parentGroup) return;

  document.querySelectorAll('.sb-group').forEach(g => g.classList.remove('open'));
  parentGroup.classList.add('open');
}

// ── NAVEGACIÓN ────────────────────────────────
let currentPage         = 'dashboard';
let backupDashboardHTML = '';

// Rutas actualizadas para módulos consolidados con tabs
const PAGINAS = {
  dashboard: { titulo: 'Panel Principal', subtitulo: 'Bienvenido al sistema', html: null, fn: () => initDashboard() },
  recepcion: { titulo: 'Recepción y Calidad', subtitulo: 'Registro de entregas y pruebas', html: 'recepcion.html', fn: () => { loadAcopio(); } },
  produccion: { titulo: 'Producción', subtitulo: 'Gestión de Lotes y Fórmulas', html: 'produccion.html', fn: () => { loadProduccion(); } },
  inventario: { titulo: 'Gestión de Inventario', subtitulo: 'Stock, Movimientos y Vencimientos', html: 'inventario.html', fn: () => { loadInventario(); } },
  comercial: { titulo: 'Comercial', subtitulo: 'Ventas, Clientes, Facturas y Pedidos', html: 'comercial.html', fn: () => { loadVentas(); } },
  compras: { titulo: 'Compras y Gastos', subtitulo: 'Proveedores, Compras y Egresos', html: 'compras.html', fn: () => { loadGastos(); } },
  reportes: { titulo: 'Reportes y Analítica', subtitulo: 'Indicadores clave de rendimiento', html: 'reportes.html', fn: () => { if(window.loadReportes) loadReportes(); } },
  configuracion: { titulo: 'Configuración', subtitulo: 'Ajustes del sistema', html: 'configuracion.html', fn: () => loadConfiguracion() }
};

// Aliases para navegaciones cruzadas antiguas
const ALIASES = {
  'calidad': 'recepcion',
  'lotes': 'produccion',
  'ventas': 'comercial',
  'clientes': 'comercial',
  'pedidos': 'comercial',
  'facturacion': 'comercial',
  'proveedores': 'compras',
  'gastos': 'compras'
};

async function navigateTo(page) {
  // Manejo de alias si navegan con el viejo id
  const targetPage = ALIASES[page] || page;
  
  const pagina = PAGINAS[targetPage];
  if (!pagina) return;

  currentPage = targetPage;
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
  document.querySelector(`.sb-nav .sb-item[data-page="${targetPage}"]`)?.classList.add('active');

  // Abre el grupo del acordeón que corresponde al item activo
  abrirGrupoActivo();

  if (targetPage === 'dashboard') {
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

    // RBAC: Ocultar módulos según el rol (Adaptado a módulos consolidados)
    const roleMap = {
      'produccion': [
        'comercial', 'compras', 'reportes', 'configuracion'
      ],
      'ventas': [
        'recepcion', 'produccion', 'compras', 'configuracion'
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

    // Ocultar grupos completos del acordeón si no les queda ningún item visible
    document.querySelectorAll('.sb-nav .sb-group').forEach(group => {
      const items = group.querySelectorAll('.sb-item');
      const hayVisibles = Array.from(items).some(i => i.style.display !== 'none');
      group.style.display = hayVisibles ? '' : 'none';
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
  abrirGrupoActivo();
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