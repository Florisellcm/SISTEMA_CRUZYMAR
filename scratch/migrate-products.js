const pool = require('../backend/database');

const cleanCatalog = [
  ['inv-001', 'Queso Crema 1lb',       'Queso',       120, 20,  'Libras',   65.00],
  ['inv-002', 'Leche Entera 1L',         'Leche',       350, 50,  'Litros',   28.00],
  ['inv-003', 'Mantequilla 1lb',        'Mantequilla', 85,  15,  'Libras',   50.00],
  ['inv-004', 'Quesillo 1lb',           'Queso',       60,  10,  'Libras',   70.00],
  ['inv-005', 'Queso Semiseco 1lb',     'Queso',       95,  15,  'Libras',   75.00],
  ['inv-006', 'Queso con Chile 1lb',    'Queso',       40,  10,  'Libras',   68.00],
  ['inv-007', 'Requesón 1lb',           'Requesón',    85,  20,  'Libras',   45.00],
  ['inv-008', 'Suero 1L',               'Suero',       30,  10,  'Litros',   10.00],
  ['inv-009', 'Leche Entera 500ml',     'Leche',       100, 15,  'Litros',   15.00],
  ['inv-010', 'Queso Crema 0.5lb',      'Queso',       60,  10,  'Libras',   33.00],
  ['inv-011', 'Queso Frijolero 1lb',    'Queso',       90,  10,  'Libras',   60.00],
  ['inv-012', 'Queso Frijolero 0.5lb',  'Queso',       70,  10,  'Libras',   31.00],
  ['inv-013', 'Queso Semiseco 0.5lb',   'Queso',       85,  10,  'Libras',   38.00],
  ['inv-014', 'Quesillo 0.5lb',         'Queso',       95,  10,  'Libras',   36.00],
  ['inv-015', 'Suero 500ml',            'Suero',       150, 20,  'Litros',   6.00],
  ['inv-016', 'Requesón 0.5lb',         'Requesón',    30,  5,   'Libras',   23.00],
  ['inv-017', 'Mantequilla 0.5lb',      'Mantequilla', 90,  10,  'Libras',   26.00],
  ['inv-018', 'Queso con Chile 0.5lb',  'Queso',       35,  5,   'Libras',   35.00],
  ['inv-019', 'Cuajada 1lb',              'Cuajada',       50,  10,  'Libras',   48.00],
  ['inv-020', 'Cuajada 0.5lb',            'Cuajada',       35,  5,   'Libras',   25.00],
  ['inv-021', 'Crema (Granel)',           'Crema',          0,  0,   'Litros',    0.00],
  ['inv-022', 'Leche Descremada (Granel)', 'Leche descremada',0,  0,  'Litros',    0.00]
];

async function main() {
  try {
    console.log("Starting total catalog standardization...");
    
    // Temporarily disable foreign keys to safely clean up
    await pool.query("SET FOREIGN_KEY_CHECKS = 0");

    // Clear old products entirely
    await pool.query("DELETE FROM inventario_productos");
    console.log("Cleared old product table");

    // Insert clean standardized catalog
    for (const [id, nombre, categoria, stock, stockMinimo, unidad, precio] of cleanCatalog) {
      await pool.query(
        "INSERT INTO inventario_productos (id, nombre, categoria, stock, stock_minimo, unidad, precio, activo) VALUES (?,?,?,?,?,?,?,1)",
        [id, nombre, categoria, stock, stockMinimo, unidad, precio]
      );
      console.log(`Registered product: ${nombre} (${unidad}) - L. ${precio.toFixed(2)}`);
    }

    // Re-enable foreign key checks
    await pool.query("SET FOREIGN_KEY_CHECKS = 1");

    console.log("Database catalog standardized successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Standardization failed:", err.message);
    process.exit(1);
  }
}

main();
