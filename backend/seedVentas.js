/* ═══════════════════════════════════════════════════════════════
   CRUZYMAR · seedVentas.js
   Siembra las ventas de prueba usando el modelo real del sistema
   (ventasModel.create), NO con INSERT a mano.

   Por qué así y no con SQL directo:
   - El "id" lo genera generarIdSecuencial() (busca max de vta-% + 1,
     3 dígitos). El "numero" lo genera ventasModel.create() aparte
     (COUNT(*)+1, 4 dígitos). Son DOS secuencias independientes.
     Si insertas ambos a mano con un valor "inventado" que no calza
     con lo que el sistema generaría, el próximo INSERT real de la
     app puede duplicar o desincronizar la secuencia.
   - El inventario SOLO se descuenta si pasa por
     Inventario.registrarMovimientoTx, que solo se llama dentro de
     ventasModel.create(). Un INSERT directo a ventas_detalle nunca
     toca el stock.

   Reglas de negocio aplicadas en estos datos:
   - Suero NUNCA se mezcla con otro producto en la misma venta.
     Se corrigieron 2 ventas (antes VTA-0025 y VTA-0034) quitando la
     línea de Suero; el total de esa venta se recalcula solo, no hay
     que tocarlo a mano.
   - No se vende ningún producto "(Granel)" ni "Leche Almacenada"
     (son materia prima, no producto terminado).

   CÓMO USARLO:
   1. Ajusta la ruta de los requires abajo si este archivo no queda
      en la raíz del proyecto (junto a /models y /database).
   2. node seedVentas.js
   3. Revisa la consola: si algo falla (ej. cliente no encontrado,
      producto no encontrado, o stock insuficiente), esa venta
      puntual hace rollback sola y las demás siguen — al final se
      imprime un resumen de qué se creó y qué falló.
═══════════════════════════════════════════════════════════════ */

const pool = require('./database');
const ventasModel = require('./models/ventasModel');

// ─────────────────────────────────────────────
// Datos de las 15 ventas (14 con productos + 1 Suero sola)
// Los nombres de cliente y producto deben coincidir EXACTO con lo
// que ya tienes en las tablas `clientes` e `inventario_productos`.
// ─────────────────────────────────────────────
const VENTAS = [
  // ── 01 de Julio ──
  { fecha: '2026-07-01', cliente: 'Pulpería Don José', metodoPago: 'Efectivo',
    items: [{ producto: 'Queso Crema 1lb', cantidad: 10, precio: 65.00 },
            { producto: 'Requesón 1lb',    cantidad: 6,  precio: 45.00 }] },

  { fecha: '2026-07-01', cliente: 'Restaurante El Buen Sabor', metodoPago: 'Transferencia',
    items: [{ producto: 'Leche Entera 1L', cantidad: 40, precio: 28.00 },
            { producto: 'Mantequilla 1lb',  cantidad: 8,  precio: 50.00 }] },

  { fecha: '2026-07-01', cliente: 'Consumidor Final', metodoPago: 'Efectivo',
    items: [{ producto: 'Quesillo 1lb', cantidad: 2, precio: 70.00 }] },

  { fecha: '2026-07-01', cliente: 'Consumidor Final', metodoPago: 'Efectivo',
    // Suero SOLO — permitido, venta 100% Suero
    items: [{ producto: 'Suero 1L', cantidad: 8, precio: 10.00 }] },

  // ── 02 de Julio ──
  { fecha: '2026-07-02', cliente: 'Minisuper El Precio Justo', metodoPago: 'Efectivo',
    // Suero quitado (mezclaba con Queso Semiseco). Total: 900.00
    items: [{ producto: 'Queso Semiseco 1lb', cantidad: 12, precio: 75.00 }] },

  { fecha: '2026-07-02', cliente: 'Tipicos el Bambú', metodoPago: 'Transferencia',
    // Queso con Chile con stock limitado (20 libras) — se deja igual
    items: [{ producto: 'Queso con Chile 1lb', cantidad: 3,  precio: 68.00 },
            { producto: 'Leche Entera 1L',     cantidad: 20, precio: 28.00 }] },

  { fecha: '2026-07-02', cliente: 'Supermercado Ceci', metodoPago: 'Efectivo',
    items: [{ producto: 'Queso Frijolero 1lb', cantidad: 16, precio: 60.00 }] },

  { fecha: '2026-07-02', cliente: 'Consumidor Final', metodoPago: 'Efectivo',
    // Suero SOLO
    items: [{ producto: 'Suero 1L', cantidad: 6, precio: 10.00 }] },

  // ── 03 de Julio ──
  { fecha: '2026-07-03', cliente: 'Pulpería Las Gemelas', metodoPago: 'Efectivo',
    items: [{ producto: 'Mantequilla 1lb', cantidad: 4, precio: 50.00 },
            { producto: 'Requesón 1lb',    cantidad: 4, precio: 45.00 }] },

  { fecha: '2026-07-03', cliente: 'Restaurante El Buen Sabor', metodoPago: 'Transferencia',
    items: [{ producto: 'Leche Entera 1L', cantidad: 30, precio: 28.00 },
            { producto: 'Queso Crema 1lb', cantidad: 8,  precio: 65.00 }] },

  { fecha: '2026-07-03', cliente: 'Consumidor Final', metodoPago: 'Efectivo',
    // Suero SOLO
    items: [{ producto: 'Suero 1L', cantidad: 5, precio: 10.00 }] },

  // ── 05 de Julio ──
  { fecha: '2026-07-05', cliente: 'Minisuper El Precio Justo', metodoPago: 'Efectivo',
    items: [{ producto: 'Queso Frijolero 1lb', cantidad: 10, precio: 60.00 },
            { producto: 'Quesillo 1lb',        cantidad: 6,  precio: 70.00 }] },

  { fecha: '2026-07-05', cliente: 'Pulpería Don José', metodoPago: 'Transferencia',
    items: [{ producto: 'Leche Entera 1L', cantidad: 24, precio: 28.00 }] },

  { fecha: '2026-07-05', cliente: 'Supermercado Ceci', metodoPago: 'Efectivo',
    items: [{ producto: 'Queso Semiseco 1lb', cantidad: 8, precio: 75.00 },
            { producto: 'Mantequilla 1lb',    cantidad: 6, precio: 50.00 }] },

  { fecha: '2026-07-05', cliente: 'Consumidor Final', metodoPago: 'Efectivo',
    // Suero SOLO
    items: [{ producto: 'Suero 1L', cantidad: 7, precio: 10.00 }] },


  { fecha: '2026-07-06', cliente: 'Restaurante El Buen Sabor', metodoPago: 'Transferencia',
    // Queso con Chile con stock limitado — se deja igual
    items: [{ producto: 'Requesón 1lb',        cantidad: 10, precio: 45.00 },
            { producto: 'Queso con Chile 1lb', cantidad: 2,  precio: 68.00 }] },

  { fecha: '2026-07-06', cliente: 'Pulpería Las Gemelas', metodoPago: 'Efectivo',
    items: [{ producto: 'Leche Entera 1L', cantidad: 16, precio: 28.00 }] },

  { fecha: '2026-07-06', cliente: 'Consumidor Final', metodoPago: 'Efectivo',
    // Suero SOLO
    items: [{ producto: 'Suero 1L', cantidad: 9, precio: 10.00 }] },
];

// ─────────────────────────────────────────────
// Helpers: buscar cliente_id y producto_id por nombre exacto
// ─────────────────────────────────────────────
async function buscarClienteId(nombre) {
  const [rows] = await pool.query('SELECT id FROM clientes WHERE nombre = ? LIMIT 1', [nombre]);
  return rows[0] ? rows[0].id : null;
}

async function buscarProductoId(nombre) {
  const [rows] = await pool.query('SELECT id FROM inventario_productos WHERE nombre = ? LIMIT 1', [nombre]);
  return rows[0] ? rows[0].id : null;
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
async function main() {
  const resumen = { ok: [], error: [] };

  for (const v of VENTAS) {
    try {
      const clienteId = await buscarClienteId(v.cliente);
      if (!clienteId && v.cliente !== 'Consumidor Final') {
        throw new Error(`Cliente no encontrado: "${v.cliente}"`);
      }

      const items = [];
      for (const it of v.items) {
        const productoId = await buscarProductoId(it.producto);
        if (!productoId) {
          throw new Error(`Producto no encontrado: "${it.producto}"`);
        }
        items.push({
          producto_id: productoId,
          nombre: it.producto,
          cantidad: it.cantidad,
          precio: it.precio,
        });
      }

      const venta = await ventasModel.create({
        clienteId,
        clienteNombre: v.cliente,
        items,
        metodoPago: v.metodoPago,
        estado: 'Pagada',
        tipoEntrega: 'Local',
        observaciones: '',
        generarFactura: false,
        vendedor_id: null,
      });

      // Nota: ventasModel.create() usa la fecha de HOY (hoy()) para el
      // campo `fecha`, no la fecha histórica que quieres (01-06 julio).
      // Si necesitas la fecha exacta, hay que actualizarla después:
      if (v.fecha) {
        await pool.query('UPDATE ventas SET fecha = ? WHERE id = ?', [v.fecha, venta.id]);
      }

      resumen.ok.push({ id: venta.id, numero: venta.numero, cliente: v.cliente, fecha: v.fecha });
      console.log(`✔ Creada: ${venta.id} / ${venta.numero} — ${v.cliente} (${v.fecha})`);
    } catch (err) {
      resumen.error.push({ cliente: v.cliente, fecha: v.fecha, error: err.message });
      console.error(`✘ Falló: ${v.cliente} (${v.fecha}) — ${err.message}`);
    }
  }

  console.log('\n── Resumen ──');
  console.log(`Creadas: ${resumen.ok.length}`);
  console.log(`Fallidas: ${resumen.error.length}`);
  if (resumen.error.length) console.table(resumen.error);

  await pool.end();
}

main();