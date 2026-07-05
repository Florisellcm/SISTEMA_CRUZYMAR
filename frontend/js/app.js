/* ══════════════════════════════════════════════════════════
   CRUZYMAR · app.js — Núcleo del frontend
   Utilidades globales · Autenticación · Navegación
══════════════════════════════════════════════════════════ */

// ── Configuración ────────────────────────────────────────
const API_BASE = '/api';

// ── Utilidades globales ──────────────────────────────────

/** Alias de document.getElementById */
function el(id) { return document.getElementById(id); }

/** Formato moneda Honduras */
function L(n) {
  return 'L. ' + Number(n || 0).toLocaleString('es-HN', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
}

/** Formato número */
function N(n) {
  return Number(n || 0).toLocaleString('es-HN', {
    minimumFractionDigits: 0, maximumFractionDigits: 2
  });
}

/** Formatear fecha en formato DD/MM/YYYY */
function formatFecha(str) {
  if (!str) return '—';
  const fechaLimpia = (str + '').slice(0, 10);
  const parts = fechaLimpia.split('-');
  if (parts.length !== 3) return str;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

/**
 * Petición HTTP a la API
 * @param {string} method - GET, POST, PUT, DELETE
 * @param {string} endpoint - Ruta relativa, ej: '/produccion'
 * @param {object|null} body - Cuerpo JSON (opcional)
 */
async function req(method, endpoint, body = null) {
  const token = localStorage.getItem('token');
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': 'Bearer ' + token } : {})
    }
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(API_BASE + endpoint, opts);

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showLogin();
    throw new Error('Sesión expirada, por favor ingrese de nuevo.');
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || data.message || `Error ${res.status}`);
  }

  return data;
}

// ── Toast / Notificaciones ───────────────────────────────
function toast(msg, tipo = 'ok') {
  const container = el('toastContainer');
  if (!container) return;

  const t = document.createElement('div');
  t.className = 'toast ' + (tipo === 'err' ? 'toast-err' : 'toast-ok');
  t.innerHTML = (tipo === 'err' ? '⚠ ' : '✓ ') + msg;
  container.appendChild(t);

  setTimeout(() => t.classList.add('toast-show'), 10);
  setTimeout(() => {
    t.classList.remove('toast-show');
    setTimeout(() => t.remove(), 400);
  }, 3500);
}

// ── Autenticación ────────────────────────────────────────
async function login() {
  const email = el('loginEmail')?.value?.trim();
  const pass  = el('loginPass')?.value?.trim();
  const errEl = el('loginErr');

  if (!email || !pass) {
    if (errEl) errEl.textContent = 'Complete todos los campos.';
    return;
  }

  try {
    const data = await req('POST', '/auth/login', { email, password: pass });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user || { email, rol: 'admin' }));
    showApp();
  } catch (e) {
    if (errEl) errEl.textContent = e.message || 'Credenciales incorrectas.';
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  showLogin();
}

// ── Mostrar Login / App ───────────────────────────────────
function showLogin() {
  const appPage   = el('appPage');
  const loginPage = el('loginPage');
  if (appPage)   appPage.style.display   = 'none';
  if (loginPage) loginPage.style.display = 'flex';
}

function showApp() {
  const appPage   = el('appPage');
  const loginPage = el('loginPage');
  if (appPage)   appPage.style.display   = '';
  if (loginPage) loginPage.style.display = 'none';

  // Cargar info del usuario en sidebar
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const nombre = user.nombre || user.name || user.email || 'Administrador';
    const email  = user.email || 'admin@cruzymar.com';
    const inicial = nombre.charAt(0).toUpperCase();
    if (el('sbUserName'))   el('sbUserName').textContent   = nombre;
    if (el('sbUserEmail'))  el('sbUserEmail').textContent  = email;
    if (el('sbUserAvatar')) el('sbUserAvatar').textContent = inicial;
  } catch (_) {}

  navigateTo('dashboard');
}

// ── Navegación dinámica (SPA) ────────────────────────────

// Mapa: clave de página → { titulo, subtitulo, htmlFile?, loaderFn? }
const PAGES = {
  dashboard:    { titulo: 'Panel Principal',         subtitulo: 'Resumen del sistema',              htmlFile: null,                loader: () => typeof initDashboard === 'function' && initDashboard() },
  recepcion:    { titulo: 'Recepción y Calidad',     subtitulo: 'Control de ingreso de leche',      htmlFile: 'recepcion.html',    loader: () => typeof loadAcopio === 'function' && loadAcopio() },
  produccion:   { titulo: 'Lotes y Recetas',         subtitulo: 'Gestión de producción',            htmlFile: 'produccion.html',   loader: () => typeof loadProduccionList === 'function' && loadProduccionList() },
  calidadLotes: { titulo: 'Control de Calidad',      subtitulo: 'Inspección de lotes producidos',   htmlFile: 'calidadlotes.html', loader: () => { if (typeof _initCQFechas === 'function') _initCQFechas(); if (typeof loadCalidadLotes === 'function') loadCalidadLotes(); } },
  inventario:   { titulo: 'Gestión de Inventario',   subtitulo: 'Stock de productos y materias',    htmlFile: 'inventario.html',   loader: () => typeof loadInventario === 'function' && loadInventario() },
  comercial:    { titulo: 'Ventas y Facturas',        subtitulo: 'Gestión comercial',                htmlFile: 'comercial.html',    loader: () => typeof loadVentas === 'function' && loadVentas() },
  distribucion: { titulo: 'Distribución',             subtitulo: 'Hoja de ruta del día',             htmlFile: 'distribucion.html', loader: null },
  clientes:     { titulo: 'Clientes',                 subtitulo: 'Directorio de clientes',           htmlFile: 'clientes.html',     loader: () => typeof loadClientesStandalone === 'function' && loadClientesStandalone() },
  compras:      { titulo: 'Compras y Gastos',         subtitulo: 'Registro de gastos',               htmlFile: 'compras.html',      loader: () => typeof loadGastos === 'function' && loadGastos() },
  proveedores:  { titulo: 'Proveedores',              subtitulo: 'Directorio de proveedores',        htmlFile: 'proveedores.html',  loader: () => typeof loadProveedoresStandalone === 'function' && loadProveedoresStandalone() },
  reportes:     { titulo: 'Reportes Consolidados',    subtitulo: 'Analítica y estadísticas',         htmlFile: 'reportes.html',     loader: () => typeof initReportes === 'function' && initReportes() },
  configuracion:{ titulo: 'Configuración',            subtitulo: 'Ajustes del sistema',              htmlFile: 'configuracion.html',loader: () => typeof loadConfiguracion === 'function' && loadConfiguracion() },
};

let _currentPage = null;

// Cache de fragmentos HTML ya cargados
const _pageCache = {};

async function navigateTo(page) {
  const cfg = PAGES[page];
  if (!cfg) { console.warn('Página no registrada:', page); return; }

  _currentPage = page;

  // Actualizar sidebar activo
  document.querySelectorAll('.sb-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // Actualizar header
  if (el('viewTitle'))    el('viewTitle').textContent    = cfg.titulo;
  if (el('viewSubtitle')) el('viewSubtitle').textContent = cfg.subtitulo;

  const content = el('dynamicContent');
  if (!content) return;

  if (!cfg.htmlFile) {
    // Sección embebida en index.html (solo dashboard)
    document.querySelectorAll('.seccion-dinamica').forEach(s => s.style.display = 'none');
    const dynPanel = el('dynamicPageContent');
    if (dynPanel) dynPanel.style.display = 'none';

    const vistaId = 'vista' + page.charAt(0).toUpperCase() + page.slice(1);
    const vista = el(vistaId);
    if (vista) {
      vista.style.display = 'block';
      vista.style.animation = 'none';
      void vista.offsetHeight;
      vista.style.animation = 'fadeIn .22s ease';
    }
  } else {
    // Ocultar secciones embebidas
    document.querySelectorAll('.seccion-dinamica').forEach(s => s.style.display = 'none');

    // Mostrar el contenedor dinámico
    const dynPanel = el('dynamicPageContent');

    if (!dynPanel) {
      console.error('No se encontró #dynamicPageContent en el HTML');
      return;
    }

    // Cargar fragmento si no está en caché
    if (!_pageCache[page]) {
      try {
        const res = await fetch(cfg.htmlFile);
        if (!res.ok) throw new Error(`No se pudo cargar ${cfg.htmlFile}`);
        _pageCache[page] = await res.text();
      } catch(e) {
        dynPanel.innerHTML = `<div style="padding:40px;text-align:center;color:#DC2626">⚠ Error cargando página: ${e.message}</div>`;
        dynPanel.style.display = 'block';
        return;
      }
    }

    dynPanel.innerHTML = _pageCache[page];
    dynPanel.style.display = 'block';
    dynPanel.style.animation = 'none';
    void dynPanel.offsetHeight;
    dynPanel.style.animation = 'fadeIn .22s ease';
  }

  // Ejecutar loader de datos
  if (typeof cfg.loader === 'function') {
    try { cfg.loader(); } catch(e) { console.error('Error al cargar', page, e); }
  }
}



function refreshCurrentPage() {
  if (_currentPage) navigateTo(_currentPage);
}

// ── Sidebar toggle ───────────────────────────────────────
function toggleSidebar() {
  const sidebar     = el('sidebar');
  const icon        = el('collapseIcon');
  if (!sidebar) return;
  sidebar.classList.toggle('open');
  if (icon) {
    icon.className = sidebar.classList.contains('open')
      ? 'ri-arrow-left-s-line'
      : 'ri-arrow-right-s-line';
  }
}

// ── Clicks del sidebar ───────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.sb-item[data-page]').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.page));
  });

  // Verificar autenticación al cargar
  const token = localStorage.getItem('token');
  if (token) {
    showApp();
  } else {
    showLogin();
  }

  // Soporte Enter en el login
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && el('loginPage')?.style.display !== 'none') {
      login();
    }
  });
});