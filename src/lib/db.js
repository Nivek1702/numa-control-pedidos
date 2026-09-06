const rowToOrder = (row) => ({
  id: row.id, orderNumber: row.order_number, supplier: row.supplier, product: row.product,
  quantity: Number(row.quantity), unit: row.unit, unitPrice: Number(row.unit_price || 0),
  total: Number(row.quantity || 0) * Number(row.unit_price || 0), items: Array.isArray(row.items) ? row.items : [],
  priority: row.priority, status: row.status, notes: row.notes, requestedBy: row.user_id,
  requestedByName: row.profiles?.name || row.requested_by_name || "", requestedDate: row.requested_date,
  createdAt: row.created_at, receivedAt: row.received_at,
});

function ensureUser(userId) { if (!userId) throw new Error("UNAUTHENTICATED"); }

export async function listOrders({ supabase, userId }) {
  ensureUser(userId);
  const { data, error } = await supabase.from("orders").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  const { data: profile } = await supabase.from("profiles").select("name").eq("id", userId).maybeSingle();
  return (data || []).map((row) => rowToOrder({ ...row, requested_by_name: profile?.name || "" }));
}

export async function getOrderSummary({ supabase, userId }) {
  const orders = await listOrders({ supabase, userId });
  const suppliers = new Map();
  for (const order of orders) {
    const current = suppliers.get(order.supplier) || { supplier: order.supplier, total: 0, pending: 0, received: 0 };
    current.total += 1; current[order.status === "pending" ? "pending" : "received"] += 1; suppliers.set(order.supplier, current);
  }
  return { total: orders.length, pending: orders.filter((o) => o.status === "pending").length, received: orders.filter((o) => o.status === "received").length, totalValue: orders.reduce((s, o) => s + o.total, 0), suppliers: [...suppliers.values()].sort((a, b) => b.total - a.total || a.supplier.localeCompare(b.supplier)).slice(0, 6) };
}

export async function getProductAnalytics({ supabase, userId, mode = "month", year, month }) {
  ensureUser(userId);
  const safeYear = Number(year) || new Date().getFullYear();
  const safeMonth = Math.min(12, Math.max(1, Number(month) || new Date().getMonth() + 1));
  const from = mode === "year" ? `${safeYear}-01-01` : `${safeYear}-${String(safeMonth).padStart(2, "0")}-01`;
  const to = (mode === "year" ? new Date(safeYear + 1, 0, 1) : new Date(safeYear, safeMonth, 1)).toISOString().slice(0, 10);
  const { data, error } = await supabase.from("orders").select("items,product,quantity,unit").eq("user_id", userId).gte("requested_date", from).lt("requested_date", to);
  if (error) throw error;
  const products = new Map();
  for (const row of data || []) {
    const items = Array.isArray(row.items) && row.items.length ? row.items : [{ product: row.product, quantity: row.quantity, unit: row.unit }];
    for (const item of items) { const name = String(item.product || "Producto sin nombre"); const current = products.get(name) || { product: name, quantity: 0, unit: item.unit || "unidades" }; current.quantity += Number(item.quantity || 0); products.set(name, current); }
  }
  return { mode, year: safeYear, month: safeMonth, products: [...products.values()].sort((a, b) => b.quantity - a.quantity || a.product.localeCompare(b.product)) };
}

export async function createOrder({ supabase, userId, supplier, product, quantity, unit, unitPrice = 0, items = [], priority = "normal", notes = "", requestedDate }) {
  ensureUser(userId);
  const normalizedItems = items.length ? items : [{ product, quantity, unit, unitPrice }];
  const totalQuantity = normalizedItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalValue = normalizedItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
  const { data, error } = await supabase.from("orders").insert({ order_number: `PED-${new Date().getFullYear()}-${String(Date.now()).slice(-7)}`, supplier, product: normalizedItems.map((item) => item.product).join(", "), quantity: totalQuantity, unit: normalizedItems.length === 1 ? unit : "varios", unit_price: totalQuantity ? totalValue / totalQuantity : 0, items: normalizedItems, priority, notes, user_id: userId, requested_date: requestedDate }).select("id").single();
  if (error) throw error; return data.id;
}

export async function updateOrderStatus({ supabase, id, status, userId }) {
  ensureUser(userId);
  const { data, error } = await supabase.from("orders").update({ status, received_at: status === "received" ? new Date().toISOString() : null }).eq("id", id).eq("user_id", userId).select("id").maybeSingle();
  if (error) throw error; if (!data) throw new Error("ORDER_NOT_OWNED");
}
