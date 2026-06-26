-- ═══════════════════════════════════════════════════════════════
-- CRUZYMAR · Productos Lácteos
-- init.sql — Esquema completo + datos semilla para pruebas
-- Victoria, Yoro, Honduras
-- ═══════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ─── BASE DE DATOS ────────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS cruzymar
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE cruzymar;

-- ════════════════════════════════════════════════════════════════
-- TABLA: usuarios
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS usuarios (
  id          CHAR(36)      NOT NULL PRIMARY KEY,
  nombre      VARCHAR(100)  NOT NULL,
  email       VARCHAR(150)  NOT NULL UNIQUE,
  password    VARCHAR(255)  NOT NULL,
  rol         ENUM('admin','produccion','ventas','calidad','bodega') NOT NULL DEFAULT 'produccion',
  activo      TINYINT(1)    NOT NULL DEFAULT 1,
  creado_en   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME   ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ════════════════════════════════════════════════════════════════
-- TABLA: proveedores (de leche cruda)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS proveedores (
  id          CHAR(36)      NOT NULL PRIMARY KEY,
  nombre      VARCHAR(150)  NOT NULL,
  telefono    VARCHAR(20)   DEFAULT '',
  email       VARCHAR(150)  DEFAULT '',
  direccion   VARCHAR(255)  DEFAULT '',
  tipo        VARCHAR(50)   DEFAULT 'Local',
  rtn         VARCHAR(20)   DEFAULT '',
  activo      TINYINT(1)    NOT NULL DEFAULT 1,
  creado_en   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME   ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ════════════════════════════════════════════════════════════════
-- TABLA: clientes
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS clientes (
  id          CHAR(36)      NOT NULL PRIMARY KEY,
  nombre      VARCHAR(150)  NOT NULL,
  telefono    VARCHAR(20)   DEFAULT '',
  email       VARCHAR(150)  DEFAULT '',
  direccion   VARCHAR(255)  DEFAULT '',
  tipo        VARCHAR(50)   DEFAULT 'Particular',
  rtn         VARCHAR(20)   DEFAULT '',
  activo      TINYINT(1)    NOT NULL DEFAULT 1,
  creado_en   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME   ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ════════════════════════════════════════════════════════════════
-- TABLA: recetas (catálogo de productos fabricados)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS recetas (
  id                    CHAR(36)      NOT NULL PRIMARY KEY,
  producto              VARCHAR(150)  NOT NULL,
  unidad_producto       VARCHAR(30)   DEFAULT 'kg',
  litros_por_unidad     DECIMAL(8,4)  DEFAULT NULL,
  rendimiento_esperado  DECIMAL(5,2)  DEFAULT NULL,
  tiempo_estimado       VARCHAR(50)   DEFAULT '',
  descripcion           TEXT          DEFAULT NULL,
  activo                TINYINT(1)    NOT NULL DEFAULT 1,
  creado_en             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en        DATETIME      ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ════════════════════════════════════════════════════════════════
-- TABLA: acopio_leche (recepción diaria de materia prima)
-- Soporta: Reporte Recepción Diaria + Excepción Leche No Apta
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS acopio_leche (
  id              CHAR(36)      NOT NULL PRIMARY KEY,
  proveedor_id    CHAR(36)      DEFAULT NULL,
  litros          DECIMAL(10,2) NOT NULL,
  temperatura     DECIMAL(5,2)  DEFAULT NULL,
  precio_litro    DECIMAL(8,4)  NOT NULL,
  total_pagar     DECIMAL(12,2) NOT NULL,
  turno           ENUM('Mañana','Tarde','Noche') NOT NULL DEFAULT 'Mañana',
  fecha           DATE          NOT NULL,
  estado          ENUM('Aceptada','Rechazada','Pendiente') NOT NULL DEFAULT 'Pendiente',
  motivo_rechazo  TEXT          DEFAULT NULL,
  observaciones   TEXT          DEFAULT NULL,
  creado_en       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME      ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_acopio_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ════════════════════════════════════════════════════════════════
-- TABLA: calidad_pruebas (control de calidad por acopio)
-- Soporta: Reporte Control de Calidad + Excepción Leche No Apta
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS calidad_pruebas (
  id              CHAR(36)      NOT NULL PRIMARY KEY,
  acopio_id       CHAR(36)      DEFAULT NULL,
  olor            ENUM('Normal','Anormal') NOT NULL DEFAULT 'Normal',
  color           ENUM('Normal','Anormal') NOT NULL DEFAULT 'Normal',
  aspecto         ENUM('Normal','Anormal') NOT NULL DEFAULT 'Normal',
  prueba_alcohol  ENUM('Negativa','Positiva') NOT NULL DEFAULT 'Negativa',
  densidad        DECIMAL(8,4)  DEFAULT NULL,
  acidez          DECIMAL(5,2)  DEFAULT NULL,
  temperatura     DECIMAL(5,2)  DEFAULT NULL,
  resultado       ENUM('Aprobado','Rechazado','Observación') NOT NULL DEFAULT 'Aprobado',
  motivo_rechazo  TEXT          DEFAULT NULL,
  analista_id     CHAR(36)      DEFAULT NULL,
  fecha           DATE          NOT NULL,
  observaciones   TEXT          DEFAULT NULL,
  creado_en       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME      ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_calidad_acopio   FOREIGN KEY (acopio_id)   REFERENCES acopio_leche(id) ON DELETE SET NULL,
  CONSTRAINT fk_calidad_analista FOREIGN KEY (analista_id) REFERENCES usuarios(id)     ON DELETE SET NULL
) ENGINE=InnoDB;

-- ════════════════════════════════════════════════════════════════
-- TABLA: produccion_lotes
-- Soporta: Reporte Producción Diario + Mermas y Desperdicios
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS produccion_lotes (
  id                  CHAR(36)      NOT NULL PRIMARY KEY,
  numero_lote         VARCHAR(50)   NOT NULL UNIQUE,
  receta_id           CHAR(36)      DEFAULT NULL,
  producto_nombre     VARCHAR(150)  NOT NULL,
  leche_usada         DECIMAL(10,2) NOT NULL DEFAULT 0,
  cantidad_obtenida   DECIMAL(10,2) NOT NULL DEFAULT 0,
  unidad              VARCHAR(30)   DEFAULT 'libras',
  rendimiento         DECIMAL(6,2)  DEFAULT 0,
  merma               DECIMAL(10,2) DEFAULT 0,
  fecha_produccion    DATE          NOT NULL,
  turno               ENUM('Mañana','Tarde','Noche') NOT NULL DEFAULT 'Mañana',
  operario            VARCHAR(100)  DEFAULT '',
  operario_id         CHAR(36)      DEFAULT NULL,
  insumos             TEXT          DEFAULT NULL,
  observaciones       TEXT          DEFAULT NULL,
  estado              ENUM('En proceso','Completada','Cancelada','Pendiente') NOT NULL DEFAULT 'En proceso',
  calidad             ENUM('Aprobado','Rechazado','Pendiente') NOT NULL DEFAULT 'Pendiente',
  creado_en           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en      DATETIME      ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_prod_receta   FOREIGN KEY (receta_id)   REFERENCES recetas(id)   ON DELETE SET NULL,
  CONSTRAINT fk_prod_operario FOREIGN KEY (operario_id) REFERENCES usuarios(id)  ON DELETE SET NULL
) ENGINE=InnoDB;

-- ════════════════════════════════════════════════════════════════
-- TABLA: mermas (desperdicios por lote o acopio)
-- Soporta: Reporte Mermas y Desperdicios
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS mermas (
  id              CHAR(36)      NOT NULL PRIMARY KEY,
  lote_id         CHAR(36)      DEFAULT NULL,
  acopio_id       CHAR(36)      DEFAULT NULL,
  tipo            ENUM('Producción','Acopio','Almacén','Distribución') NOT NULL DEFAULT 'Producción',
  producto        VARCHAR(150)  NOT NULL,
  cantidad        DECIMAL(10,2) NOT NULL DEFAULT 0,
  unidad          VARCHAR(30)   DEFAULT 'kg',
  causa           VARCHAR(255)  DEFAULT '',
  fecha           DATE          NOT NULL,
  responsable_id  CHAR(36)      DEFAULT NULL,
  observaciones   TEXT          DEFAULT NULL,
  creado_en       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_merma_lote      FOREIGN KEY (lote_id)       REFERENCES produccion_lotes(id) ON DELETE SET NULL,
  CONSTRAINT fk_merma_acopio    FOREIGN KEY (acopio_id)     REFERENCES acopio_leche(id)     ON DELETE SET NULL,
  CONSTRAINT fk_merma_resp      FOREIGN KEY (responsable_id)REFERENCES usuarios(id)         ON DELETE SET NULL
) ENGINE=InnoDB;

-- ════════════════════════════════════════════════════════════════
-- TABLA: inventario_productos
-- Soporta: Reporte de Inventario
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS inventario_productos (
  id            CHAR(36)      NOT NULL PRIMARY KEY,
  nombre        VARCHAR(150)  NOT NULL,
  categoria     VARCHAR(80)   DEFAULT 'General',
  stock         DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock_minimo  DECIMAL(10,2) NOT NULL DEFAULT 0,
  unidad        VARCHAR(30)   DEFAULT 'Unidades',
  precio        DECIMAL(10,2) DEFAULT 0,
  vencimiento   DATE          DEFAULT NULL,
  activo        TINYINT(1)    NOT NULL DEFAULT 1,
  creado_en     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME     ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ════════════════════════════════════════════════════════════════
-- TABLA: inventario_movimientos
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS inventario_movimientos (
  id                CHAR(36)      NOT NULL PRIMARY KEY,
  producto_id       CHAR(36)      NOT NULL,
  tipo              ENUM('Entrada','Salida','Ajuste') NOT NULL,
  cantidad          DECIMAL(10,2) NOT NULL,
  stock_resultante  DECIMAL(10,2) NOT NULL DEFAULT 0,
  motivo            VARCHAR(255)  DEFAULT '',
  usuario           VARCHAR(100)  DEFAULT 'Sistema',
  usuario_id        CHAR(36)      DEFAULT NULL,
  fecha             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mov_producto FOREIGN KEY (producto_id) REFERENCES inventario_productos(id) ON DELETE CASCADE,
  CONSTRAINT fk_mov_usuario  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)             ON DELETE SET NULL
) ENGINE=InnoDB;

-- ════════════════════════════════════════════════════════════════
-- TABLA: ventas (cabecera — distribución)
-- Soporta: Reporte Distribución + Ventas + Producto x Cliente
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ventas (
  id              CHAR(36)      NOT NULL PRIMARY KEY,
  numero          VARCHAR(20)   NOT NULL UNIQUE,
  cliente_id      CHAR(36)      DEFAULT NULL,
  cliente_nombre  VARCHAR(150)  NOT NULL DEFAULT 'Consumidor final',
  total           DECIMAL(12,2) NOT NULL DEFAULT 0,
  metodo_pago     VARCHAR(50)   DEFAULT 'Efectivo',
  estado          ENUM('Pagada','Pendiente','Cancelada') NOT NULL DEFAULT 'Pagada',
  observaciones   TEXT          DEFAULT NULL,
  fecha           DATE          NOT NULL,
  vendedor_id     CHAR(36)      DEFAULT NULL,
  creado_en       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME      ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_venta_cliente  FOREIGN KEY (cliente_id)  REFERENCES clientes(id)  ON DELETE SET NULL,
  CONSTRAINT fk_venta_vendedor FOREIGN KEY (vendedor_id) REFERENCES usuarios(id)  ON DELETE SET NULL
) ENGINE=InnoDB;

-- ════════════════════════════════════════════════════════════════
-- TABLA: ventas_detalle (líneas por venta)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ventas_detalle (
  id          CHAR(36)      NOT NULL PRIMARY KEY,
  venta_id    CHAR(36)      NOT NULL,
  producto_id CHAR(36)      DEFAULT NULL,
  nombre      VARCHAR(150)  NOT NULL,
  cantidad    DECIMAL(10,2) NOT NULL DEFAULT 1,
  precio      DECIMAL(10,2) NOT NULL DEFAULT 0,
  subtotal    DECIMAL(12,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_detalle_venta    FOREIGN KEY (venta_id)    REFERENCES ventas(id)                 ON DELETE CASCADE,
  CONSTRAINT fk_detalle_producto FOREIGN KEY (producto_id) REFERENCES inventario_productos(id)   ON DELETE SET NULL
) ENGINE=InnoDB;

-- ════════════════════════════════════════════════════════════════
-- TABLA: gastos
-- Soporta: Estados Financieros
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS gastos (
  id          CHAR(36)      NOT NULL PRIMARY KEY,
  concepto    VARCHAR(255)  NOT NULL,
  categoria   VARCHAR(80)   DEFAULT 'Otros',
  monto       DECIMAL(12,2) NOT NULL DEFAULT 0,
  fecha       DATE          NOT NULL,
  proveedor   VARCHAR(150)  DEFAULT '',
  comprobante VARCHAR(100)  DEFAULT '',
  usuario_id  CHAR(36)      DEFAULT NULL,
  creado_en   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME   ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_gasto_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ════════════════════════════════════════════════════════════════
-- TABLA: compras (órdenes de compra)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS compras (
  id               CHAR(36)      NOT NULL PRIMARY KEY,
  numero           VARCHAR(20)   NOT NULL UNIQUE,
  proveedor_id     CHAR(36)      DEFAULT NULL,
  proveedor_nombre VARCHAR(150)  DEFAULT '',
  concepto         VARCHAR(255)  DEFAULT '',
  monto            DECIMAL(12,2) NOT NULL DEFAULT 0,
  estado           ENUM('Pendiente','Recibida','Cancelada') NOT NULL DEFAULT 'Pendiente',
  fecha            DATE          NOT NULL,
  notas            TEXT          DEFAULT NULL,
  creado_en        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en   DATETIME      ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_compra_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ════════════════════════════════════════════════════════════════
-- TABLA: pedidos
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS pedidos (
  id            CHAR(36)      NOT NULL PRIMARY KEY,
  cliente_id    CHAR(36)      DEFAULT NULL,
  cliente_nombre VARCHAR(150) NOT NULL DEFAULT '',
  total         DECIMAL(12,2) NOT NULL DEFAULT 0,
  estado        ENUM('Pendiente','Preparando','Listo','Entregado','Cancelado') NOT NULL DEFAULT 'Pendiente',
  fecha         DATE          NOT NULL,
  observaciones TEXT          DEFAULT NULL,
  creado_en     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pedido_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ════════════════════════════════════════════════════════════════
-- TABLA: facturacion
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS facturacion (
  id          CHAR(36)      NOT NULL PRIMARY KEY,
  numero      VARCHAR(20)   NOT NULL UNIQUE,
  cliente_id  CHAR(36)      DEFAULT NULL,
  venta_id    CHAR(36)      DEFAULT NULL,
  total       DECIMAL(12,2) NOT NULL DEFAULT 0,
  estado      ENUM('Emitida','Pagada','Anulada') NOT NULL DEFAULT 'Emitida',
  fecha       DATE          NOT NULL,
  creado_en   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_factura_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
  CONSTRAINT fk_factura_venta   FOREIGN KEY (venta_id)   REFERENCES ventas(id)   ON DELETE SET NULL
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- ════════════════════════════════════════════════════════════════
-- DATOS SEMILLA (SEEDS)
-- ════════════════════════════════════════════════════════════════

-- ── Usuarios ─────────────────────────────────────────────────
-- Contraseñas hasheadas con bcrypt (cost=10):
-- admin123  → $2b$10$ybfj41QGGBv9cdlJdGIAgOPvnF.yM.Fb1IkZnjsqfz1KaDn5HBPyu
-- planta123 → $2a$10$XgXfyJFHl/Lr5/i.VxvNVO0lnX7HFbpysDijEQ6VPQhVB/PGFabFa
-- ventas123 → $2a$10$YvVTXQjT/1l5rvxzCq.jI.xFPBRkd9quvYqiI8HPPVMVtXhLUuPP6
-- calidad123 = bodega123 → $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh.8
-- ──────────────────────────────────────────────────────────────────
-- CREDENCIALES DE ACCESO (para pruebas):
--   admin@cruzymar.com    / admin123
--   planta@cruzymar.com   / planta123
--   ventas@cruzymar.com   / ventas123
--   calidad@cruzymar.com  / calidad123
--   bodega@cruzymar.com   / bodega123
-- ──────────────────────────────────────────────────────────────────
INSERT IGNORE INTO usuarios (id, nombre, email, password, rol) VALUES
('usr-001','Administrador','admin@cruzymar.com','$2b$10$ybfj41QGGBv9cdlJdGIAgOPvnF.yM.Fb1IkZnjsqfz1KaDn5HBPyu','admin'),
('usr-002','Carlos Mejía','planta@cruzymar.com','$2a$10$XgXfyJFHl/Lr5/i.VxvNVO0lnX7HFbpysDijEQ6VPQhVB/PGFabFa','produccion'),
('usr-003','María López','ventas@cruzymar.com','$2a$10$YvVTXQjT/1l5rvxzCq.jI.xFPBRkd9quvYqiI8HPPVMVtXhLUuPP6','ventas'),
('usr-004','Pedro Reyes','calidad@cruzymar.com','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh.8','calidad'),
('usr-005','Ana Flores','bodega@cruzymar.com','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh.8','bodega');

-- ── Proveedores ───────────────────────────────────────────────
INSERT IGNORE INTO proveedores (id, nombre, telefono, email, direccion, tipo, rtn) VALUES
('prov-001','Granja El Paraíso',      '9954-1234','paraiso@mail.com',  'Aldea El Paraíso, Victoria, Yoro',    'Ganadería','0801-1990-12345'),
('prov-002','Finca Don Roberto',      '9867-5678','donroberto@mail.com','Colonia La Ceiba, Victoria, Yoro',    'Ganadería','0801-1985-23456'),
('prov-003','Cooperativa La Unión',   '9741-9012','launion@mail.com',  'Victoria, Yoro',                       'Cooperativa','0801-2000-34567'),
('prov-004','Ganadería Los Pinos',    '9635-3456','lospinos@mail.com', 'Barrio El Centro, Victoria, Yoro',    'Ganadería','0801-1995-45678');

-- ── Clientes ─────────────────────────────────────────────────
INSERT IGNORE INTO clientes (id, nombre, telefono, email, direccion, tipo, rtn) VALUES
('cli-001','Supermercado La Colonia','2234-5678','pedidos@lacolonia.hn','Av. Principal, Yoro',            'Mayorista', '0801-1980-11111'),
('cli-002','Pulpería Don José',      '9912-3456','',                   'Barrio Abajo, Victoria, Yoro',    'Minorista',  ''),
('cli-003','Restaurante El Buen Sabor','9723-4567','buensabor@mail.com','Parque Central, Victoria, Yoro','Restaurante','0801-1992-22222'),
('cli-004','Distribuidora Norte',    '2234-9876','distribnorte@mail.com','San Pedro Sula',               'Distribuidor','0801-1988-33333'),
('cli-005','Mini Super Las Brisas',  '9811-2222','',                   'Col. Las Brisas, Yoro',          'Minorista',  ''),
('cli-006','Consumidor Final',       '',         '',                   '',                                'Particular', '');

-- ── Recetas ───────────────────────────────────────────────────
INSERT IGNORE INTO recetas (id, producto, unidad_producto, litros_por_unidad, rendimiento_esperado, tiempo_estimado, descripcion) VALUES
('rec-001','Queso Fresco 500g',  'unidades', 8.00, 12.50, '180 min', 'Queso fresco tradicional hondureño, 500g por unidad'),
('rec-002','Leche Entera 1L',    'litros',   1.00, 98.00, '60 min',  'Leche pasteurizada entera, presentación de 1 litro'),
('rec-003','Yogur Natural 500g', 'unidades', 1.10, 90.00, '120 min', 'Yogur natural sin saborizantes, fermentación controlada'),
('rec-004','Mantequilla 250g',   'unidades', 3.00, 33.00, '150 min', 'Mantequilla sin sal, 250g por unidad'),
('rec-005','Crema de Leche',     'litros',   2.00, 50.00, '90 min',  'Crema de leche natural, 30% de grasa'),
('rec-006','Quesillo Especial 1lb','unidades',5.00, 20.00, '200 min','Quesillo artesanal especial, 1 libra');

-- ── Inventario Inicial ────────────────────────────────────────
INSERT IGNORE INTO inventario_productos (id, nombre, categoria, stock, stock_minimo, unidad, precio) VALUES
('inv-001','Queso Fresco 500g',    'Queso',       120, 20,  'Unidades', 65.00),
('inv-002','Leche Entera 1L',      'Leche',       350, 50,  'Litros',   28.00),
('inv-003','Mantequilla 250g',     'Mantequilla', 8,   15,  'Unidades', 55.00),
('inv-004','Quesillo Especial 1lb','Queso',       60,  10,  'Unidades', 80.00),
('inv-005','Cuajo Líquido',        'Insumo',      5,   2,   'Litros',   120.00),
('inv-006','Sal Fina',             'Insumo',      40,  10,  'Kg',       18.00),
('inv-007','Yogur Natural 500g',   'Yogur',       85,  20,  'Unidades', 42.00),
('inv-008','Crema de Leche',       'Crema',       30,  10,  'Litros',   35.00);

-- ── Acopio de leche (últimos días) ────────────────────────────
INSERT IGNORE INTO acopio_leche (id, proveedor_id, litros, temperatura, precio_litro, total_pagar, turno, fecha, estado, observaciones) VALUES
('aco-001','prov-001', 420, 4.2, 8.50, 3570.00, 'Mañana', CURDATE(), 'Aceptada', 'Calidad óptima'),
('aco-002','prov-002', 280, 4.5, 8.20, 2296.00, 'Mañana', CURDATE(), 'Aceptada', ''),
('aco-003','prov-003', 510, 4.1, 8.60, 4386.00, 'Mañana', DATE_SUB(CURDATE(),INTERVAL 1 DAY), 'Aceptada', 'Temperatura adecuada'),
('aco-004','prov-001', 390, 6.8, 8.50, 3315.00, 'Tarde',  DATE_SUB(CURDATE(),INTERVAL 1 DAY), 'Rechazada', 'Acidez fuera de rango'),
('aco-005','prov-002', 310, 4.3, 8.20, 2542.00, 'Mañana', DATE_SUB(CURDATE(),INTERVAL 2 DAY), 'Aceptada', ''),
('aco-006','prov-003', 480, 4.0, 8.60, 4128.00, 'Mañana', DATE_SUB(CURDATE(),INTERVAL 2 DAY), 'Aceptada', 'Lote prioritario'),
('aco-007','prov-001', 400, 7.5, 8.50, 3400.00, 'Tarde',  DATE_SUB(CURDATE(),INTERVAL 3 DAY), 'Rechazada', 'Presencia de antibióticos'),
('aco-008','prov-004', 350, 4.4, 8.30, 2905.00, 'Mañana', DATE_SUB(CURDATE(),INTERVAL 4 DAY), 'Aceptada', '');

-- ── Calidad (pruebas por acopio) ──────────────────────────────
INSERT IGNORE INTO calidad_pruebas (id, acopio_id, olor, color, aspecto, prueba_alcohol, densidad, acidez, resultado, analista_id, fecha) VALUES
('cal-001','aco-001','Normal','Normal','Normal','Negativa',1.030, 16.5,'Aprobado', 'usr-004', CURDATE()),
('cal-002','aco-002','Normal','Normal','Normal','Negativa',1.029, 17.0,'Aprobado', 'usr-004', CURDATE()),
('cal-003','aco-003','Normal','Normal','Normal','Negativa',1.031, 16.0,'Aprobado', 'usr-004', DATE_SUB(CURDATE(),INTERVAL 1 DAY)),
('cal-004','aco-004','Normal','Normal','Normal','Positiva',1.025, 22.0,'Rechazado','usr-004', DATE_SUB(CURDATE(),INTERVAL 1 DAY)),
('cal-005','aco-005','Normal','Normal','Normal','Negativa',1.030, 16.8,'Aprobado', 'usr-004', DATE_SUB(CURDATE(),INTERVAL 2 DAY)),
('cal-006','aco-006','Normal','Normal','Normal','Negativa',1.032, 15.5,'Aprobado', 'usr-004', DATE_SUB(CURDATE(),INTERVAL 2 DAY)),
('cal-007','aco-007','Anormal','Normal','Anormal','Positiva',1.022,25.0,'Rechazado','usr-004',DATE_SUB(CURDATE(),INTERVAL 3 DAY));

-- ── Lotes de producción ───────────────────────────────────────
INSERT IGNORE INTO produccion_lotes (id, numero_lote, receta_id, producto_nombre, leche_usada, cantidad_obtenida, unidad, rendimiento, merma, fecha_produccion, turno, operario, operario_id, estado, calidad) VALUES
('lot-001', CONCAT(DATE_FORMAT(CURDATE(),'%Y%m%d'),'-M-001'),'rec-001','Queso Fresco 500g',   640, 80,  'unidades',12.5,12, CURDATE(),'Mañana','Carlos Mejía','usr-002','Completada','Aprobado'),
('lot-002', CONCAT(DATE_FORMAT(CURDATE(),'%Y%m%d'),'-M-002'),'rec-002','Leche Entera 1L',    200,200,  'litros',  98.0, 4, CURDATE(),'Mañana','Carlos Mejía','usr-002','Completada','Aprobado'),
('lot-003', CONCAT(DATE_FORMAT(CURDATE(),'%Y%m%d'),'-T-003'),'rec-003','Yogur Natural 500g', 110,100,  'unidades',90.9, 8, CURDATE(),'Tarde', 'Pedro Reyes', 'usr-004','En proceso','Pendiente'),
('lot-004', CONCAT(DATE_FORMAT(CURDATE(),'%Y%m%d'),'-T-004'),'rec-005','Crema de Leche',     200,100,  'litros',  50.0, 6, CURDATE(),'Tarde', 'Pedro Reyes', 'usr-004','Pendiente', 'Pendiente'),
('lot-005', CONCAT(DATE_FORMAT(DATE_SUB(CURDATE(),INTERVAL 1 DAY),'%Y%m%d'),'-M-001'),'rec-001','Queso Fresco 500g',720,90,'unidades',12.5,15,DATE_SUB(CURDATE(),INTERVAL 1 DAY),'Mañana','Carlos Mejía','usr-002','Completada','Aprobado'),
('lot-006', CONCAT(DATE_FORMAT(DATE_SUB(CURDATE(),INTERVAL 1 DAY),'%Y%m%d'),'-M-002'),'rec-004','Mantequilla 250g', 180,60,'unidades',33.3, 5,DATE_SUB(CURDATE(),INTERVAL 1 DAY),'Mañana','Pedro Reyes', 'usr-004','Completada','Aprobado'),
('lot-007', CONCAT(DATE_FORMAT(DATE_SUB(CURDATE(),INTERVAL 2 DAY),'%Y%m%d'),'-M-001'),'rec-002','Leche Entera 1L',  220,220,'litros',  98.0, 3,DATE_SUB(CURDATE(),INTERVAL 2 DAY),'Mañana','María López', 'usr-003','Completada','Aprobado'),
('lot-008', CONCAT(DATE_FORMAT(DATE_SUB(CURDATE(),INTERVAL 2 DAY),'%Y%m%d'),'-T-002'),'rec-003','Yogur Natural 500g',105,95,'unidades',90.5, 7,DATE_SUB(CURDATE(),INTERVAL 2 DAY),'Tarde', 'Carlos Mejía','usr-002','Completada','Aprobado');

-- ── Mermas ────────────────────────────────────────────────────
INSERT IGNORE INTO mermas (id, lote_id, tipo, producto, cantidad, unidad, causa, fecha, responsable_id) VALUES
('mer-001','lot-001','Producción','Queso Fresco 500g',   12,'kg',  'Suero residual del prensado', CURDATE(), 'usr-002'),
('mer-002','lot-002','Producción','Leche Entera 1L',      4,'litros','Residuo en tanque de pasteurización', CURDATE(), 'usr-002'),
('mer-003','lot-003','Producción','Yogur Natural 500g',   8,'kg',  'Fermentación incompleta', CURDATE(), 'usr-004'),
('mer-004','lot-005','Producción','Queso Fresco 500g',   15,'kg',  'Rotura de moldes durante prensado', DATE_SUB(CURDATE(),INTERVAL 1 DAY), 'usr-002'),
('mer-005',NULL,     'Acopio',   'Leche cruda rechazada',390,'litros','Acidez fuera de rango — Granja El Paraíso', DATE_SUB(CURDATE(),INTERVAL 1 DAY), 'usr-004');

-- ── Ventas ────────────────────────────────────────────────────
INSERT IGNORE INTO ventas (id, numero, cliente_id, cliente_nombre, total, metodo_pago, estado, fecha, vendedor_id) VALUES
('vta-001','VTA-0047','cli-001','Supermercado La Colonia',4200.00,'Crédito',  'Pagada',   CURDATE(),                          'usr-003'),
('vta-002','VTA-0046','cli-002','Pulpería Don José',       780.00,'Efectivo', 'Pagada',   CURDATE(),                          'usr-003'),
('vta-003','VTA-0045','cli-003','Restaurante El Buen Sabor',2650.00,'Efectivo','Pagada',  CURDATE(),                          'usr-003'),
('vta-004','VTA-0044','cli-001','Supermercado La Colonia',5490.00,'Crédito',  'Pagada',   DATE_SUB(CURDATE(),INTERVAL 1 DAY), 'usr-003'),
('vta-005','VTA-0043','cli-004','Distribuidora Norte',     2900.00,'Crédito',  'Pendiente',DATE_SUB(CURDATE(),INTERVAL 1 DAY),'usr-003'),
('vta-006','VTA-0042','cli-005','Mini Super Las Brisas',   2380.00,'Efectivo', 'Pagada',   DATE_SUB(CURDATE(),INTERVAL 2 DAY),'usr-003'),
('vta-007','VTA-0041','cli-001','Supermercado La Colonia',6200.00,'Crédito',  'Pagada',   DATE_SUB(CURDATE(),INTERVAL 3 DAY),'usr-003'),
('vta-008','VTA-0040','cli-003','Restaurante El Buen Sabor',1850.00,'Efectivo','Pagada',  DATE_SUB(CURDATE(),INTERVAL 4 DAY),'usr-003');

-- ── Detalle de ventas ─────────────────────────────────────────
INSERT IGNORE INTO ventas_detalle (id, venta_id, producto_id, nombre, cantidad, precio, subtotal) VALUES
('dtl-001','vta-001','inv-001','Queso Fresco 500g',  30, 65.00, 1950.00),
('dtl-002','vta-001','inv-002','Leche Entera 1L',    60, 28.00, 1680.00),
('dtl-003','vta-001','inv-008','Crema de Leche',     16, 35.00,  570.00),
('dtl-004','vta-002','inv-002','Leche Entera 1L',    20, 28.00,  560.00),
('dtl-005','vta-002','inv-007','Yogur Natural 500g',  5, 42.00,  210.00),
('dtl-006','vta-003','inv-008','Crema de Leche',     30, 35.00, 1050.00),
('dtl-007','vta-003','inv-003','Mantequilla 250g',   20, 55.00, 1100.00),
('dtl-008','vta-003','inv-001','Queso Fresco 500g',   7, 65.00,  455.00),
('dtl-009','vta-003','inv-007','Yogur Natural 500g',  1, 42.00,   45.00),
('dtl-010','vta-004','inv-002','Leche Entera 1L',    80, 28.00, 2240.00),
('dtl-011','vta-004','inv-001','Queso Fresco 500g',  50, 65.00, 3250.00),
('dtl-012','vta-005','inv-003','Mantequilla 250g',   40, 55.00, 2200.00),
('dtl-013','vta-005','inv-008','Crema de Leche',     20, 35.00,  700.00),
('dtl-014','vta-006','inv-007','Yogur Natural 500g', 30, 42.00, 1260.00),
('dtl-015','vta-006','inv-002','Leche Entera 1L',    40, 28.00, 1120.00),
('dtl-016','vta-007','inv-001','Queso Fresco 500g',  60, 65.00, 3900.00),
('dtl-017','vta-007','inv-002','Leche Entera 1L',    50, 28.00, 1400.00),
('dtl-018','vta-007','inv-007','Yogur Natural 500g', 20, 42.00,  840.00),
('dtl-019','vta-007','inv-003','Mantequilla 250g',    1, 55.00,   60.00),
('dtl-020','vta-008','inv-001','Queso Fresco 500g',  15, 65.00,  975.00),
('dtl-021','vta-008','inv-008','Crema de Leche',     25, 35.00,  875.00);

-- ── Gastos ────────────────────────────────────────────────────
INSERT IGNORE INTO gastos (id, concepto, categoria, monto, fecha, proveedor, usuario_id) VALUES
('gas-001','Compra leche cruda — Ganadería Los Pinos', 'Materia Prima', 8500.00, CURDATE(),                          'Ganadería Los Pinos','usr-001'),
('gas-002','Pago energía eléctrica ENEE',              'Servicios',     1200.00, CURDATE(),                          'ENEE',               'usr-001'),
('gas-003','Sal y cuajo mensual',                      'Insumos',        450.00, DATE_SUB(CURDATE(),INTERVAL 2 DAY), 'Distribuidora Yoro', 'usr-001'),
('gas-004','Mantenimiento refrigerador industrial',    'Mantenimiento', 2800.00, DATE_SUB(CURDATE(),INTERVAL 5 DAY), 'Taller El Frío',     'usr-001'),
('gas-005','Pago planilla semanal',                    'Planilla',      9600.00, DATE_SUB(CURDATE(),INTERVAL 7 DAY), '',                   'usr-001'),
('gas-006','Combustible distribución',                 'Transporte',     800.00, DATE_SUB(CURDATE(),INTERVAL 3 DAY), 'Gasolinera Victoria','usr-001');

-- ── Compras ───────────────────────────────────────────────────
INSERT IGNORE INTO compras (id, numero, proveedor_id, proveedor_nombre, concepto, monto, estado, fecha) VALUES
('com-001','OC-0001','prov-001','Granja El Paraíso','Leche cruda semanal',  7350.00,'Recibida', DATE_SUB(CURDATE(),INTERVAL 7 DAY)),
('com-002','OC-0002','prov-003','Cooperativa La Unión','Leche cruda',        8600.00,'Recibida', DATE_SUB(CURDATE(),INTERVAL 5 DAY)),
('com-003','OC-0003','prov-002','Finca Don Roberto','Leche cruda',           5740.00,'Recibida', DATE_SUB(CURDATE(),INTERVAL 3 DAY)),
('com-004','OC-0004','prov-004','Ganadería Los Pinos','Leche cruda semana',  7200.00,'Pendiente',CURDATE());