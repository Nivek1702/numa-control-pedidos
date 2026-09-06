import { createClient } from "@libsql/client";

const globalDb = globalThis;
function makeClient() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL || "file:data-canvas.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}

export const db = globalDb.__numaDb || makeClient();
if (process.env.NODE_ENV !== "production") globalDb.__numaDb = db;

let initialized;
export function initDb() {
  if (!initialized) {
    initialized = db.batch([
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('worker', 'admin'))
      )`,
      `CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_number TEXT NOT NULL UNIQUE,
        supplier TEXT NOT NULL,
        product TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        unit_price REAL NOT NULL DEFAULT 0,
        items_json TEXT NOT NULL DEFAULT '[]',
        priority TEXT NOT NULL CHECK(priority IN ('normal', 'high', 'urgent')) DEFAULT 'normal',
        status TEXT NOT NULL CHECK(status IN ('pending', 'received')) DEFAULT 'pending',
        notes TEXT NOT NULL DEFAULT '',
        requested_by TEXT NOT NULL REFERENCES users(id),
        requested_date TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        received_at TEXT
      )`,
      "CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)",
      "CREATE INDEX IF NOT EXISTS idx_orders_requested_by ON orders(requested_by, created_at)",
      "CREATE INDEX IF NOT EXISTS idx_orders_supplier ON orders(supplier)",
    ], "write").then(async () => {
      // Add the line-item column when upgrading an existing local SQLite database.
      try { await db.execute("ALTER TABLE orders ADD COLUMN items_json TEXT NOT NULL DEFAULT '[]'"); } catch (error) {
        if (!String(error?.message || error).toLowerCase().includes("duplicate column")) throw error;
      }
      await db.batch([
        { sql: "INSERT OR IGNORE INTO users (id, name, role) VALUES (?, ?, ?)", args: ["ana-torres", "Ana Torres", "worker"] },
        { sql: "INSERT OR IGNORE INTO users (id, name, role) VALUES (?, ?, ?)", args: ["carlos-mendoza", "Carlos Mendoza", "admin"] },
      ], "write");
      const existing = await db.execute("SELECT COUNT(*) AS total FROM orders");
      if (Number(existing.rows[0]?.total || 0) === 0) await seedDemoOrders();
      return db.execute("PRAGMA optimize");
    });
  }
  return initialized;
}

const rowToOrder = (row) => ({
  id: row.id,
  orderNumber: row.order_number,
  supplier: row.supplier,
  product: row.product,
  quantity: Number(row.quantity),
  unit: row.unit,
  unitPrice: Number(row.unit_price),
  total: Number(row.quantity) * Number(row.unit_price),
  items: (() => { try { return JSON.parse(row.items_json || "[]"); } catch { return []; } })(),
  priority: row.priority,
  status: row.status,
  notes: row.notes,
  requestedBy: row.requested_by,
  requestedByName: row.requested_by_name,
  requestedDate: row.requested_date,
  createdAt: row.created_at,
  receivedAt: row.received_at,
});

const demoOrders = [
  { supplier: "Distribuidora Andina", items: [{ product: "Arroz extra", quantity: 25, unit: "kilos", unitPrice: 4.8 }, { product: "Aceite vegetal", quantity: 12, unit: "botellas", unitPrice: 9.5 }], priority: "normal", status: "received", date: "2026-08-18", notes: "Reposición de abarrotes de alta rotación." },
  { supplier: "Distribuidora Andina", items: [{ product: "Azúcar rubia", quantity: 20, unit: "kilos", unitPrice: 4.2 }, { product: "Sal yodada", quantity: 10, unit: "kilos", unitPrice: 2.2 }], priority: "high", status: "pending", date: "2026-08-21", notes: "Completar exhibición de abarrotes." },
  { supplier: "Bebidas del Pacífico", items: [{ product: "Agua sin gas 625 ml", quantity: 48, unit: "unidades", unitPrice: 1.8 }, { product: "Gaseosa cola 500 ml", quantity: 36, unit: "unidades", unitPrice: 2.5 }], priority: "normal", status: "received", date: "2026-09-02", notes: "Pedido para la zona de bebidas." },
  { supplier: "Bebidas del Pacífico", items: [{ product: "Jugo de naranja", quantity: 24, unit: "unidades", unitPrice: 2.8 }], priority: "urgent", status: "pending", date: "2026-09-04", notes: "Reposición antes del fin de semana." },
  { supplier: "Lácteos Santa Rosa", items: [{ product: "Leche evaporada", quantity: 30, unit: "latas", unitPrice: 4.6 }, { product: "Yogur natural", quantity: 18, unit: "unidades", unitPrice: 3.9 }], priority: "normal", status: "pending", date: "2026-08-25", notes: "Verificar cadena de frío al recibir." },
  { supplier: "Lácteos Santa Rosa", items: [{ product: "Queso fresco", quantity: 8, unit: "kilos", unitPrice: 19.5 }], priority: "high", status: "received", date: "2026-08-16", notes: "Entrega parcial aceptada." },
  { supplier: "Limpieza Total", items: [{ product: "Detergente", quantity: 12, unit: "paquetes", unitPrice: 8.9 }, { product: "Lejía", quantity: 10, unit: "botellas", unitPrice: 5.2 }], priority: "normal", status: "received", date: "2026-08-13", notes: "Insumos para limpieza del local." },
  { supplier: "Limpieza Total", items: [{ product: "Bolsas de basura grandes", quantity: 6, unit: "paquetes", unitPrice: 14.5 }], priority: "high", status: "pending", date: "2026-08-27", notes: "Stock actual por debajo del mínimo." },
  { supplier: "Empaques del Centro", items: [{ product: "Bolsas de papel", quantity: 500, unit: "unidades", unitPrice: 0.22 }, { product: "Vasos descartables", quantity: 200, unit: "unidades", unitPrice: 0.18 }], priority: "normal", status: "received", date: "2026-08-11", notes: "Material para despacho y delivery." },
  { supplier: "Empaques del Centro", items: [{ product: "Film transparente", quantity: 10, unit: "rollos", unitPrice: 7.8 }], priority: "urgent", status: "pending", date: "2026-08-30", notes: "Necesario para preparar productos frescos." },
];

async function seedDemoOrders() {
  const statements = demoOrders.map((order, index) => {
    const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const id = `demo-order-${index + 1}`;
    const orderNumber = `PED-2026-${String(index + 1).padStart(4, "0")}`;
    return { sql: "INSERT OR IGNORE INTO orders (id, order_number, supplier, product, quantity, unit, unit_price, items_json, priority, status, notes, requested_by, requested_date, created_at, received_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", args: [id, orderNumber, order.supplier, order.items.map((item) => item.product).join(", "), totalQuantity, order.items.length === 1 ? order.items[0].unit : "varios", totalQuantity ? totalValue / totalQuantity : 0, JSON.stringify(order.items), order.priority, order.status, order.notes, "ana-torres", order.date, `${order.date} 09:00:00`, order.status === "received" ? `${order.date} 16:00:00` : null] };
  });
  await db.batch(statements, "write");
}

export async function listOrders({ role = "worker", userId = "ana-torres" } = {}) {
  await initDb();
  const query = role === "admin"
    ? "SELECT orders.*, users.name AS requested_by_name FROM orders JOIN users ON users.id = orders.requested_by ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC"
    : "SELECT orders.*, users.name AS requested_by_name FROM orders JOIN users ON users.id = orders.requested_by WHERE requested_by = ? ORDER BY created_at DESC";
  const result = role === "admin" ? await db.execute(query) : await db.execute({ sql: query, args: [userId] });
  return result.rows.map(rowToOrder);
}

export async function getOrderSummary() {
  await initDb();
  const [counts, suppliers] = await Promise.all([
    db.execute("SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending, SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END) AS received, COALESCE(SUM(quantity * unit_price), 0) AS total_value FROM orders"),
    db.execute("SELECT supplier, COUNT(*) AS total, SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending, SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END) AS received FROM orders GROUP BY supplier ORDER BY total DESC, supplier LIMIT 6"),
  ]);
  const row = counts.rows[0];
  return {
    total: Number(row.total || 0),
    pending: Number(row.pending || 0),
    received: Number(row.received || 0),
    totalValue: Number(row.total_value || 0),
    suppliers: suppliers.rows.map((item) => ({ supplier: item.supplier, total: Number(item.total), pending: Number(item.pending || 0), received: Number(item.received || 0) })),
  };
}

export async function getProductAnalytics({ mode = "month", year, month } = {}) {
  await initDb();
  const safeYear = Number(year) || new Date().getFullYear();
  const safeMonth = Math.min(12, Math.max(1, Number(month) || new Date().getMonth() + 1));
  const pattern = mode === "year" ? `${safeYear}-%` : `${safeYear}-${String(safeMonth).padStart(2, "0")}-%`;
  const result = await db.execute({ sql: "SELECT items_json, product, quantity, unit FROM orders WHERE requested_date LIKE ?", args: [pattern] });
  const products = new Map();
  for (const row of result.rows) {
    let items = [];
    try { items = JSON.parse(row.items_json || "[]"); } catch { items = []; }
    if (!items.length) items = [{ product: row.product, quantity: row.quantity, unit: row.unit }];
    for (const item of items) {
      const name = String(item.product || "Producto sin nombre");
      const current = products.get(name) || { product: name, quantity: 0, unit: item.unit || "unidades" };
      current.quantity += Number(item.quantity || 0);
      products.set(name, current);
    }
  }
  return { mode, year: safeYear, month: safeMonth, products: [...products.values()].sort((a, b) => b.quantity - a.quantity || a.product.localeCompare(b.product)) };
}

export async function createOrder({ supplier, product, quantity, unit, unitPrice = 0, items = [], priority = "normal", notes = "", requestedBy, requestedDate }) {
  await initDb();
  const normalizedItems = items.length ? items : [{ product, quantity, unit, unitPrice }];
  const totalQuantity = normalizedItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalValue = normalizedItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
  const id = crypto.randomUUID();
  const orderNumber = `PED-${new Date().getFullYear()}-${String(Date.now()).slice(-7)}`;
  await db.execute({
    sql: "INSERT INTO orders (id, order_number, supplier, product, quantity, unit, unit_price, items_json, priority, notes, requested_by, requested_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    args: [id, orderNumber, supplier, normalizedItems.map((item) => item.product).join(", "), totalQuantity, normalizedItems.length === 1 ? unit : "varios", totalQuantity ? totalValue / totalQuantity : 0, JSON.stringify(normalizedItems), priority, notes, requestedBy, requestedDate],
  });
  return id;
}

export async function updateOrderStatus(id, status, requestedBy) {
  await initDb();
  const result = await db.execute({ sql: "UPDATE orders SET status = ?, received_at = CASE WHEN ? = 'received' THEN CURRENT_TIMESTAMP ELSE NULL END WHERE id = ? AND requested_by = ?", args: [status, status, id, requestedBy] });
  if (!result.rowsAffected) throw new Error("ORDER_NOT_OWNED");
}
