/* ═══════════════════════════════════════════════════════════════
   CRUZYMAR · routes/pdf.js
   Genera el PDF de un reporte simulando el flujo real de la SPA:
     1. Abre index.html con el token ya inyectado en localStorage
        (para que app.js reconozca la sesión y no muestre el login)
     2. Espera a que TODOS los scripts (app.js, Chart.js, CDN) terminen
        de cargar — no solo el DOM — antes de tocar cualquier función global.
     3. Llama a navigateTo('reportes')  → inyecta reportes.html
     4. Llama a repLoad(tipo)           → carga el reporte pedido
     5. Aplica los filtros (fechas, mes, año, etc.)
     6. Espera window.__reportReady === true
     7. Imprime a PDF
     8. Valida que el buffer sea un PDF real (firma %PDF-) antes de enviarlo
═══════════════════════════════════════════════════════════════ */
const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Ajusta si tu app no corre en este puerto/ruta.
const APP_URL = process.env.APP_URL || 'http://localhost:3001';
const INDEX_PATH = process.env.APP_INDEX_PATH || '/index.html'; // o '/' si index.html es el default

// Si está en true, guarda una copia del último PDF (válido o corrupto) en
// /tmp/cruzymar_debug_pdf para poder inspeccionarlo manualmente. Ponlo en
// false en producción una vez resuelto el problema.
const DEBUG_GUARDAR_COPIA = process.env.PDF_DEBUG === '1';
const DEBUG_DIR = '/tmp/cruzymar_debug_pdf';

// Decodifica el payload de un JWT SIN verificar la firma — solo para
// diagnóstico (ver expiración, usuario, etc.). No usar para autenticar.
function _decodeJwtPayload(token) {
  try {
    const partes = token.split('.');
    if (partes.length !== 3) return null;
    const payload = Buffer.from(partes[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return JSON.parse(payload);
  } catch (e) {
    return null;
  }
}

router.get('/reportes/pdf/:tipo', async (req, res) => {
  const { tipo } = req.params;
  const token = (req.headers.authorization || '').replace('Bearer ', '') || req.query.token || '';
  const { token: _omit, ...filtros } = req.query; // no reenviar el token como filtro de reporte

  // ── DIAGNÓSTICO DE TOKEN ──────────────────────────────────────
  // Esto NO afecta el flujo normal, solo imprime info útil en logs.
  const payload = _decodeJwtPayload(token);
  if (!token) {
    console.error('[PDF Puppeteer] ⚠ No llegó ningún token (ni header Authorization ni ?token=).');
  } else if (!payload) {
    console.error('[PDF Puppeteer] ⚠ El token no se pudo decodificar (¿no es un JWT válido?).');
  } else {
    const ahora = Math.floor(Date.now() / 1000);
    const expDate = payload.exp ? new Date(payload.exp * 1000).toISOString() : 'sin exp';
    const yaExpirado = payload.exp && payload.exp < ahora;
    console.log(`[PDF Puppeteer] Token recibido → usuario: ${payload.email || payload.nombre || payload.id || '?'} · expira: ${expDate} · ¿YA EXPIRADO?: ${yaExpirado}`);
    if (yaExpirado) {
      console.error('[PDF Puppeteer] ⚠ EL TOKEN YA ESTABA VENCIDO ANTES DE ABRIR PUPPETEER. Esta es probablemente la causa del 401.');
    }
  }

  // Prueba directa: golpea tu propia API (fuera de Puppeteer) con este token,
  // contra el mismo APP_URL, para descartar que el problema sea de Puppeteer
  // vs. que sea el token/backend en sí. Ajusta el endpoint si tu ruta de
  // "whoami" o similar es distinta.
  try {
    const testResp = await fetch(`${APP_URL}/api/reportes/excepcion/leche-no-apta`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    console.log(`[PDF Puppeteer] Prueba de auth directa (sin Puppeteer) contra ${APP_URL} → HTTP ${testResp.status}`);
    if (testResp.status === 401) {
      console.error('[PDF Puppeteer] ⚠ El 401 ocurre INCLUSO FUERA DE PUPPETEER. El problema es el token o que APP_URL no es el backend correcto (revisa el .env APP_URL vs. el backend real que firma los JWT).');
    }
  } catch (e) {
    console.error('[PDF Puppeteer] No se pudo hacer la prueba de auth directa:', e.message);
  }
  // ── FIN DIAGNÓSTICO ───────────────────────────────────────────

  let browser;
  const logs = []; // guardamos console.log de la página para depurar si algo falla

  try {
    browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: 1 });

    // Reenvía a la terminal del backend cualquier console.log/error que ocurra
    // DENTRO del navegador Puppeteer — esto es clave para depurar sin adivinar.
    page.on('console', msg => logs.push(`[PAGE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => logs.push(`[PAGE ERROR] ${err.message}`));
    page.on('requestfailed', req => logs.push(`[REQUEST FAILED] ${req.url()} — ${req.failure()?.errorText}`));

    // Inyecta el token ANTES de que cargue cualquier script,
    // porque _rq() y app.js leen el token de localStorage al iniciar.
    await page.evaluateOnNewDocument((tok) => {
      localStorage.setItem('token', tok);
      localStorage.setItem('crz_token', tok);
    }, token);

    // IMPORTANTE: 'networkidle0' espera a que terminen TODAS las peticiones
    // de red (incluyendo los <script src="..."> del CDN de Chart.js, xlsx,
    // etc.) antes de seguir. 'domcontentloaded' dispara demasiado pronto y
    // puede dejar navigateTo/repLoad sin definir todavía, generando un PDF
    // a medio renderizar o corrupto.
    await page.goto(`${APP_URL}${INDEX_PATH}`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Espera activa a que app.js haya definido navigateTo globalmente,
    // en vez de asumir que ya existe apenas termina la navegación.
    await page.waitForFunction('typeof navigateTo === "function"', { timeout: 15000 });

    // Navega a la sección de Reportes igual que si el usuario diera clic en el sidebar
    await page.evaluate(() => navigateTo('reportes'));

    // Espera a que reportes.html se haya inyectado
    await page.waitForSelector('#rep-root', { timeout: 15000 });

    // Espera a que repLoad esté definida (reportes.js pudo tardar en inyectarse)
    await page.waitForFunction('typeof repLoad === "function"', { timeout: 15000 });

    // Carga el reporte específico pedido
    await page.evaluate((tipo) => repLoad(tipo), tipo);

    // Deja que _renderFiltros pinte los inputs con sus valores por defecto
    await page.waitForSelector('#rep-filtros-wrap', { timeout: 10000 }).catch(() => { });

    // Aplica los filtros reales que pidió el usuario (fechas, mes, año, estado...)
    // y vuelve a cargar el reporte con ellos.
    const filtrosLimpios = Object.fromEntries(
      Object.entries(filtros).filter(([, v]) => v !== undefined && v !== null && v !== '')
    );
    if (Object.keys(filtrosLimpios).length) {
      await page.evaluate((filtrosLimpios) => {
        Object.entries(filtrosLimpios).forEach(([k, v]) => {
          const el = document.getElementById(k);
          if (el) el.value = v;
          if (typeof _filtros === 'object') _filtros[k] = v;
        });
        if (typeof _cargarReporte === 'function') _cargarReporte();
      }, filtrosLimpios);
    }

    // Espera final: window.__reportReady === true (gráficas ya dibujadas)
    await page.waitForFunction('window.__reportReady === true', { timeout: 20000 });

    // ── SOLUCIÓN: gráficas se renderizaban mal en el PDF porque Chart.js
    // dibuja en canvas de forma asíncrona con animaciones. El doble rAF
    // no era suficiente. Pasos:
    //   1. Desactivar animaciones de Chart.js (evita capturas a medio animar)
    //   2. Forzar resize() + update() en todos los charts (garantiza que el
    //      canvas esté pintado al tamaño correcto del viewport)
    //   3. Esperar 5 rAFs encadenados (suficiente para el flush del compositor)
    //   4. Settle adicional de 300ms para que el GPU termine de volcar el canvas
    await page.evaluate(() => {
      // 1. Desactivar animaciones globalmente en Chart.js si está disponible
      if (window.Chart) {
        window.Chart.defaults.animation = false;
        window.Chart.defaults.animations = {};
        window.Chart.defaults.transitions = {};
      }
      // 2. Forzar resize + update + draw en todas las instancias de Chart activas.
      //    El draw() extra es necesario para las gráficas de línea con área rellena
      //    (fill:true + tension bezier): Chart.js hace un segundo pase de render
      //    para el path relleno y las curvas, y update('none') solo no lo dispara.
      if (window.Chart && window.Chart.instances) {
        Object.values(window.Chart.instances).forEach(c => {
          try { c.resize(); c.update('none'); c.draw(); } catch (e) { /* ignorar */ }
        });
      }
    });

    // 3. Esperar 8 rAFs encadenados para asegurar el flush completo del compositor
    await page.evaluate(() => new Promise(resolve => {
      let frames = 0;
      const tick = () => { if (++frames >= 8) resolve(); else requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }));

    // 4. Settle de 1000ms — las gráficas de línea con área rellena necesitan
    //    este margen extra para que el GPU vuelque el fill bezier al bitmap.
    await new Promise(r => setTimeout(r, 1000));

    // ── CLAVE: evitar que Chrome corte una gráfica/tarjeta a la mitad
    // entre dos páginas del PDF. Por defecto, page.pdf() pagina el
    // contenido a ciegas según la altura de la hoja, sin importarle si
    // hay una gráfica o tabla justo en el borde de corte. Este CSS le
    // dice explícitamente qué elementos deben mandarse completos a la
    // siguiente página en vez de partirse.
    await page.addStyleTag({
      content: `
        /*
         * REGLA DE PAGINACIÓN:
         * ─ .rep-card con tablas largas (rep-card-detallado) PUEDE cortarse
         *   entre páginas — de lo contrario Chrome la empuja entera a la
         *   página siguiente y deja la primera en blanco.
         * ─ Solo los elementos pequeños (KPIs, gráficas, filas dobles) evitan
         *   el corte porque caben enteros en una página.
         */

        /* KPI cards y gráficas: nunca cortar por la mitad */
        .rep-krow,
        .rep-chart-wrap,
        .rep-row2 {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }

        /* Tarjetas con gráfica interna (las que están dentro de rep-row2):
           también evitan el corte y permiten que las leyendas desborden */
        .rep-row2 > .rep-card {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
          overflow: visible !important;
        }

        /* Tarjetas de tabla larga: SÍ pueden paginar.
           Pero cada fila de la tabla se mantiene junta para no cortarse
           a la mitad (nombre / precio a medias). */
        .rep-card {
          break-inside: auto !important;
          page-break-inside: auto !important;
        }
        .rep-card table tr {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }

        /* El canvas nunca desborda su contenedor al imprimirse */
        canvas {
          max-width: 100% !important;
          max-height: 100% !important;
        }
      `
    });


    const pdfRaw = await page.pdf({
      format: 'Letter',
      landscape: true,
      printBackground: true,
      // El contenido está diseñado a 1400px de ancho (viewport de arriba),
      // pero el área imprimible de Letter horizontal con estos márgenes
      // es de ~1050px. Sin este "scale", todo lo que sobra a la derecha
      // (columnas de tablas, parte de las gráficas) se corta en el PDF.
      // Se bajó un poco más de 0.75 a 0.68 para dejar margen extra.
      scale: 0.68,
      margin: { top: '10mm', bottom: '14mm', left: '8mm', right: '8mm' },
      displayHeaderFooter: true,
      footerTemplate: `
        <div style="font-size:8px;color:#94A3B8;width:100%;text-align:center;font-family:Arial">
          Generado por Sistema ERP CRUZYMAR · Las Vegas, Victoria, Yoro, Honduras ·
          Página <span class="pageNumber"></span> de <span class="totalPages"></span>
        </div>`,
      headerTemplate: '<div></div>'
    });

    // Puppeteer v22+ devuelve Uint8Array en vez de Buffer de Node en page.pdf().
    // Convertimos explícitamente para que .slice().toString('latin1') y
    // res.send() se comporten como buffer real (si no, la firma "%PDF-"
    // nunca se detecta aunque el PDF esté perfecto, y res.send de un
    // Uint8Array "crudo" también puede enviarse mal).
    const pdfBuffer = Buffer.isBuffer(pdfRaw) ? pdfRaw : Buffer.from(pdfRaw);

    await browser.close();
    browser = null;

    // ── Validación crítica: un PDF real SIEMPRE empieza con la firma "%PDF-".
    // Si esto falla, es la causa exacta de "No podemos abrir este archivo":
    // le estábamos mandando al navegador algo que no es un PDF.
    const firmaValida = pdfBuffer && pdfBuffer.length > 0 &&

      pdfBuffer.slice(0, 5).toString('latin1') === '%PDF-';

    if (DEBUG_GUARDAR_COPIA) {
      try {
        if (!fs.existsSync(DEBUG_DIR)) fs.mkdirSync(DEBUG_DIR, { recursive: true });
        const destino = path.join(DEBUG_DIR, `ultimo_${tipo}.pdf`);
        fs.writeFileSync(destino, pdfBuffer);
        console.log(`[PDF Puppeteer] Copia de depuración guardada en: ${destino} (${pdfBuffer.length} bytes, firma válida: ${firmaValida})`);
      } catch (e) {
        console.error('[PDF Puppeteer] No se pudo guardar copia de depuración:', e.message);
      }
    }

    if (!firmaValida) {
      console.error(`[PDF Puppeteer] El buffer generado NO es un PDF válido (${pdfBuffer ? pdfBuffer.length : 0} bytes).`);
      if (logs.length) {
        console.error('[PDF Puppeteer] Consola del navegador dentro de Puppeteer:');
        logs.forEach(l => console.error('  ' + l));
      }
      return res.status(500).json({
        error: 'El PDF generado no es válido (posible fallo de Puppeteer al renderizar). Revisa los logs del servidor.'
      });
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdfBuffer.length,
      'Content-Disposition': `attachment; filename="cruzymar_${tipo}_${Date.now()}.pdf"`
    });
    res.send(pdfBuffer);

  } catch (err) {
    if (browser) await browser.close();
    console.error('[PDF Puppeteer] Error:', err.message);
    if (logs.length) {
      console.error('[PDF Puppeteer] Consola del navegador dentro de Puppeteer:');
      logs.forEach(l => console.error('  ' + l));
    }
    res.status(500).json({ error: 'No se pudo generar el PDF: ' + err.message });
  }
});

module.exports = router;