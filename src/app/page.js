"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import {
  Bell, Boxes, CalendarDays, Check, CheckCircle2, ChevronDown, CircleDollarSign, Sparkles, BarChart3,
  Clock3, LoaderCircle, PackageCheck, Plus, Search, ShieldCheck, Truck, UserRound,
} from "lucide-react";

const EMPTY_FORM = { supplier: "", product: "", quantity: "", unit: "unidades", unitPrice: "", priority: "normal", requestedDate: new Date().toISOString().slice(0, 10), notes: "" };

function AuthScreen() {
  const supabase = useMemo(() => createClient(), []);
  const [mode, setMode] = useState("login"); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [name, setName] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event) { event.preventDefault(); setBusy(true); setError(""); const result = mode === "login" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password, options: { data: { name } } }); if (result.error) setError(result.error.message); setBusy(false); }
  return <main className="auth-shell"><div className="auth-card"><div className="brand auth-brand"><span className="brand-mark"><Boxes size={20} /></span><span>Numa</span></div><span className="eyebrow">CONTROL DE PEDIDOS</span><h1>{mode === "login" ? "Inicia sesión" : "Crea tu cuenta"}</h1><p>{mode === "login" ? "Accede a tus pedidos, conversaciones y gráficos." : "Tu correo quedará listo sin confirmación adicional."}</p><form onSubmit={submit}>{mode === "signup" && <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" required />}<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo electrónico" required /><input type="password" minLength="6" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" required />{error && <div className="error">{error}</div>}<button className="primary-button" disabled={busy}>{busy ? "Procesando…" : mode === "login" ? "Entrar" : "Registrarme"}</button></form><button className="auth-toggle" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}>{mode === "login" ? "Crear una cuenta nueva" : "Ya tengo una cuenta"}</button></div></main>;
}

function StatusBadge({ status }) {
  return <span className={`status-badge ${status}`}><span />{status === "pending" ? "Pendiente" : "Recepcionado"}</span>;
}

function PriorityBadge({ priority }) {
  if (priority === "normal") return <span className="priority normal">Normal</span>;
  return <span className={`priority ${priority}`}>{priority === "urgent" ? "Urgente" : "Alta"}</span>;
}

function OrderRow({ order, admin, onStatus }) {
  return (
    <div className="order-row">
      <div className="order-main"><span className="order-number">{order.orderNumber}</span><strong>{order.product}</strong><small>{order.supplier} · {order.quantity.toLocaleString("es-PE")} {order.unit}{order.items?.length > 1 ? ` · ${order.items.length} productos` : ""}</small></div>
      {admin && <div className="order-requester"><UserRound size={14} />{order.requestedByName}</div>}
      <div className="order-date"><CalendarDays size={14} />{new Date(`${order.requestedDate}T12:00:00`).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}</div>
      <PriorityBadge priority={order.priority} />
      <div className="order-state"><StatusBadge status={order.status} />{!admin && order.status === "pending" && <button className="receive-button" onClick={() => onStatus(order.id, "received")}><Check size={14} /> Confirmar recepción</button>}</div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone, detail }) {
  return <div className="metric"><span className={`metric-icon ${tone}`}><Icon size={18} /></span><div><small>{label}</small><strong>{value}</strong>{detail && <em>{detail}</em>}</div></div>;
}

function ProductChart({ analytics, mode, year, month, onModeChange, onYearChange, onMonthChange }) {
  const maxQuantity = Math.max(1, ...analytics.products.map((item) => item.quantity));
  const monthLabel = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("es-PE", { month: "long" });
  const ticks = [1, .75, .5, .25, 0];
  return <div className="chart-card"><div className="chart-controls"><div className="segmented"><button type="button" className={mode === "month" ? "active" : ""} onClick={() => onModeChange("month")}>Mensual</button><button type="button" className={mode === "year" ? "active" : ""} onClick={() => onModeChange("year")}>Anual</button></div><label>Año<input type="number" min="2020" max="2100" value={year} onChange={(event) => onYearChange(event.target.value)} /></label>{mode === "month" && <label>Mes<select value={month} onChange={(event) => onMonthChange(event.target.value)}>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Date(2020, index, 1).toLocaleDateString("es-PE", { month: "long" })}</option>)}</select></label>}</div><div className="chart-caption">{mode === "month" ? `${monthLabel} de ${year}` : `Año ${year}`} · {analytics.products.length} productos registrados</div>{analytics.products.length ? <div className="vertical-chart"><div className="y-axis">{ticks.map((tick) => <span key={tick}>{Math.round(maxQuantity * tick).toLocaleString("es-PE")}</span>)}</div><div className="bars-area"><div className="grid-lines">{ticks.map((tick) => <i key={tick} style={{ bottom: `${tick * 100}%` }} />)}</div><div className="bars">{analytics.products.map((item) => <div className="bar-column" key={item.product}><div className="bar-value">{item.quantity.toLocaleString("es-PE")}</div><div className="bar" style={{ height: `${item.quantity / maxQuantity * 100}%` }} title={`${item.product}: ${item.quantity} ${item.unit}`} /><span className="bar-label" title={item.product}>{item.product}</span></div>)}</div></div></div> : <div className="empty chart-empty"><BarChart3 size={24} /><strong>Sin pedidos en este periodo</strong><span>Prueba con otro mes o año.</span></div>}</div>;
}

export default function Home() {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileRefresh, setProfileRefresh] = useState(0);
  const [role, setRole] = useState("worker");
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({ total: 0, pending: 0, received: 0, totalValue: 0, suppliers: [] });
  const [form, setForm] = useState(EMPTY_FORM);
  const [extraItems, setExtraItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [requesterFilter, setRequesterFilter] = useState("all");
  const [adminView, setAdminView] = useState("orders");
  const [insightQuestion, setInsightQuestion] = useState("");
  const [insight, setInsight] = useState("");
  const [insightLoading, setInsightLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const today = new Date();
  const sessionUserId = session?.user?.id;
  const [chartMode, setChartMode] = useState("month");
  const [chartYear, setChartYear] = useState(String(today.getFullYear()));
  const [chartMonth, setChartMonth] = useState(String(today.getMonth() + 1));
  const [analytics, setAnalytics] = useState({ products: [], year: today.getFullYear(), month: today.getMonth() + 1 });
  const readCachedProfile = useCallback((userId) => {
    try { return JSON.parse(window.localStorage.getItem(`numa-profile-${userId}`) || "null"); } catch { return null; }
  }, []);

  useEffect(() => {
    let active = true;
    const withTimeout = (promise, milliseconds) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), milliseconds))]);
    withTimeout(supabase.auth.getSession(), 3000).then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      const cached = data.session?.user ? readCachedProfile(data.session.user.id) : null;
      setProfile(cached); setRole(cached?.role || "worker"); setProfileLoading(Boolean(data.session && !cached));
      setAuthLoading(false);
    }).catch(() => {
      if (!active) return;
      setSession(null); setProfile(null); setRole("worker"); setProfileLoading(false); setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        const cached = nextSession?.user ? readCachedProfile(nextSession.user.id) : null;
        if (cached) { setProfile(cached); setRole(cached.role || "worker"); }
        setProfileLoading(Boolean(nextSession && !cached));
        setProfileRefresh((value) => value + 1);
      } else if (event === "SIGNED_OUT") {
        setProfile(null); setRole("worker"); setProfileLoading(false);
      }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [supabase, readCachedProfile]);

  useEffect(() => {
    let active = true;
    if (!sessionUserId) {
      return () => { active = false; };
    }
    const profileRequest = supabase.from("profiles").select("name,role").eq("id", sessionUserId).maybeSingle();
    Promise.race([profileRequest, new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000))]).then(({ data }) => {
      if (!active) return;
      setProfile(data); setRole(data?.role || "worker"); setProfileLoading(false);
      try { window.localStorage.setItem(`numa-profile-${sessionUserId}`, JSON.stringify(data)); } catch { /* almacenamiento opcional */ }
    }).catch(() => { if (active) { setProfile(null); setRole("worker"); setProfileLoading(false); } });
    return () => { active = false; };
  }, [supabase, sessionUserId, profileRefresh]);

  const loadOrders = useCallback(async () => {
    if (!sessionUserId) return;
    setLoading(true);
    try {
      const response = await fetch("/api/orders", { cache: "no-store", headers: { "ngrok-skip-browser-warning": "true" } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudieron cargar los pedidos.");
      setOrders(result.orders); setSummary(result.summary);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [sessionUserId]);

  useEffect(() => { const timer = setTimeout(loadOrders, 0); return () => clearTimeout(timer); }, [loadOrders]);
  useEffect(() => { if (!sessionUserId) return undefined; let active = true; fetch("/api/insights", { headers: { "ngrok-skip-browser-warning": "true" } }).then((response) => response.json()).then((result) => { if (active && Array.isArray(result.conversations)) setConversationHistory(result.conversations); }).catch(() => {}); return () => { active = false; }; }, [sessionUserId]);

  useEffect(() => {
    if (role !== "admin" || adminView !== "products") return;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/analytics?mode=${chartMode}&year=${chartYear}&month=${chartMonth}`, { cache: "no-store", headers: { "ngrok-skip-browser-warning": "true" } });
        const result = await response.json();
        if (response.ok) setAnalytics(result);
      } catch { /* La gráfica conserva el último resultado válido. */ }
    }, 120);
    return () => clearTimeout(timer);
  }, [role, adminView, chartMode, chartYear, chartMonth]);

  async function submitOrder(event) {
    event.preventDefault();
    if (!form.supplier.trim() || !form.product.trim() || !Number(form.quantity) || extraItems.some((item) => !item.product.trim() || !Number(item.quantity))) return setError("Completa proveedor, producto y cantidades válidas.");
    setSaving(true); setError(""); setNotice("");
    try {
      const items = [{ product: form.product, quantity: Number(form.quantity), unit: form.unit, unitPrice: Number(form.unitPrice) || 0 }, ...extraItems.map((item) => ({ ...item, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) || 0 }))];
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" }, body: JSON.stringify({ ...form, items }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo registrar el pedido.");
      setForm({ ...EMPTY_FORM, requestedDate: form.requestedDate }); setExtraItems([]); setNotice(`Pedido ${result.id ? "registrado" : "guardado"} correctamente.`); await loadOrders();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function changeStatus(id, status) {
    setUpdating(id); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" }, body: JSON.stringify({ status }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo actualizar el pedido.");
      setNotice("Pedido marcado como recepcionado."); await loadOrders();
    } catch (err) { setError(err.message); }
    finally { setUpdating(""); }
  }

  async function askInsight(event) {
    event.preventDefault();
    if (!insightQuestion.trim() || insightLoading) return;
    setInsightLoading(true); setError("");
    try {
      const response = await fetch("/api/insights", { method: "POST", headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" }, body: JSON.stringify({ question: insightQuestion }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo generar el resumen.");
      setInsight(result.answer); setConversationHistory((current) => [{ question: insightQuestion.trim(), answer: result.answer, created_at: new Date().toISOString() }, ...current].slice(0, 20));
    } catch (err) { setError(err.message); }
    finally { setInsightLoading(false); }
  }

  const requesters = useMemo(() => [...new Map(orders.map((order) => [order.requestedBy, order.requestedByName])).entries()].map(([id, name]) => ({ id, name })), [orders]);
  const filteredOrders = useMemo(() => orders.filter((order) => (requesterFilter === "all" || order.requestedBy === requesterFilter) && `${order.orderNumber} ${order.product} ${order.supplier} ${order.requestedByName}`.toLowerCase().includes(query.toLowerCase())), [orders, query, requesterFilter]);
  const maxSupplierOrders = Math.max(1, ...summary.suppliers.map((supplier) => supplier.total));
  const isAdmin = role === "admin";

  if (authLoading) return <main className="auth-shell"><LoaderCircle className="spin" /></main>;
  if (!session) return <AuthScreen />;

  return (
    <main className="app-shell">
      <header className="topbar"><div className="brand"><span className="brand-mark"><Boxes size={20} /></span><span>Numa</span><span className="brand-rule" /><span className="workspace-name">Control de pedidos</span></div><div className="top-actions"><span className="db-status"><i /> Supabase conectado</span><button className="icon-button" aria-label="Notificaciones"><Bell size={17} /></button><span className="role-switch"><UserRound size={14} /> {profile?.name || session.user.email} · {isAdmin ? "Administrador" : "Solicitante"}</span><button className="auth-logout" onClick={() => supabase.auth.signOut()}>Salir</button></div></header>

      <section className="page-wrap">
        <div className="page-intro"><div><span className="eyebrow">{isAdmin ? "VISTA ADMINISTRADOR" : "VISTA SOLICITANTE"}</span><h1>{isAdmin ? "Resumen de pedidos" : "Mis pedidos"}</h1><p>{isAdmin ? "Supervisa el flujo de compras y analiza las cantidades solicitadas." : "Registra una solicitud y confirma su recepción cuando llegue."}</p></div><div className="date-chip"><CalendarDays size={15} /> {new Date().toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })}</div></div>

        {isAdmin && <div className="metrics"><Metric icon={Boxes} label="Pedidos totales" value={summary.total} tone="teal" detail="en el registro" /><Metric icon={Clock3} label="Pendientes" value={summary.pending} tone="amber" detail="requieren seguimiento" /><Metric icon={PackageCheck} label="Recepcionados" value={summary.received} tone="blue" detail={`${summary.total ? Math.round(summary.received / summary.total * 100) : 0}% del total`} /><Metric icon={CircleDollarSign} label="Valor estimado" value={`S/ ${summary.totalValue.toLocaleString("es-PE", { maximumFractionDigits: 0 })}`} tone="coral" detail="de todos los pedidos" /></div>}

        {notice && <div className="notice"><CheckCircle2 size={16} /> {notice}</div>}{error && <div className="error"><span>{error}</span></div>}

        {isAdmin ? (
          <><div className="admin-layout"><section className="orders-card operation-card"><div className="card-head operation-head"><div><span className="eyebrow">PEDIDOS Y PRODUCTOS</span><h2>{adminView === "orders" ? "Todos los pedidos" : "Análisis de productos"} <span>{summary.total}</span></h2></div><div className="view-tabs" role="tablist" aria-label="Pedidos y productos"><button type="button" className={adminView === "orders" ? "active" : ""} onClick={() => setAdminView("orders")}>Pedidos</button><button type="button" className={adminView === "products" ? "active" : ""} onClick={() => setAdminView("products")}>Productos</button></div></div>{adminView === "orders" ? <><div className="operation-filters"><select className="requester-filter" value={requesterFilter} onChange={(event) => setRequesterFilter(event.target.value)}><option value="all">Todos los solicitantes</option>{requesters.map((requester) => <option key={requester.id} value={requester.id}>{requester.name}</option>)}</select><div className="search-box"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar pedido…" /></div></div><div className="order-list">{loading ? <div className="empty"><LoaderCircle className="spin" size={22} /> Cargando pedidos…</div> : filteredOrders.length ? filteredOrders.map((order) => <OrderRow key={order.id} order={order} admin onStatus={changeStatus} />) : <div className="empty"><PackageCheck size={24} /><strong>No hay pedidos todavía</strong><span>Los nuevos registros aparecerán aquí.</span></div>}</div></> : <ProductChart analytics={analytics} mode={chartMode} year={chartYear} month={chartMonth} onModeChange={setChartMode} onYearChange={setChartYear} onMonthChange={setChartMonth} />}</section><aside className="suppliers-card"><div className="card-head"><div><span className="eyebrow">PROVEEDORES</span><h2>Actividad reciente</h2></div><Truck size={19} className="head-icon" /></div>{summary.suppliers.length ? <div className="supplier-list">{summary.suppliers.map((supplier) => <div className="supplier-row" key={supplier.supplier}><div className="supplier-label"><strong>{supplier.supplier}</strong><span>{supplier.pending ? `${supplier.pending} pendiente${supplier.pending > 1 ? "s" : ""}` : "Al día"}</span></div><div className="supplier-bar"><i style={{ width: `${supplier.total / maxSupplierOrders * 100}%` }} /></div><small>{supplier.total} pedido{supplier.total > 1 ? "s" : ""}</small></div>)}</div> : <div className="empty compact"><Truck size={22} /><span>Sin actividad registrada.</span></div>}<div className="legend"><span><i className="dot pending" /> Pendiente</span><span><i className="dot received" /> Recepcionado</span></div></aside></div><section className="assistant-card"><div className="card-head"><div><span className="eyebrow">ASISTENTE NUMA</span><h2>Pregúntale a tus pedidos</h2></div><Sparkles size={18} className="head-icon" /></div><div className="assistant-body"><p>Obtén una lectura rápida del estado general, prioridades o actividad de proveedores.</p><form className="assistant-form" onSubmit={askInsight}><input value={insightQuestion} onChange={(event) => setInsightQuestion(event.target.value)} placeholder="Ej. ¿Qué debería revisar hoy?" /><button disabled={insightLoading}>{insightLoading ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />} Preguntar</button></form>{insight && <div className="assistant-answer"><Sparkles size={15} /><span>{insight}</span></div>}</div></section></>
        ) : (
          <div className="worker-layout"><section className="form-card"><div className="card-head"><div><span className="eyebrow">NUEVA SOLICITUD</span><h2>Registrar pedido</h2></div><span className="form-step">01</span></div><form onSubmit={submitOrder}><div className="field"><label>Proveedor <b>*</b></label><input value={form.supplier} onChange={(event) => setForm({ ...form, supplier: event.target.value })} placeholder="Ej. Distribuidora Andina" /></div><div className="field"><label>Producto o insumo <b>*</b></label><input value={form.product} onChange={(event) => setForm({ ...form, product: event.target.value })} placeholder="Ej. Guantes de nitrilo" /></div><div className="field-grid"><div className="field"><label>Cantidad <b>*</b></label><input type="number" min="1" step="any" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} placeholder="0" /></div><div className="field"><label>Unidad</label><select value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })}><option>unidades</option><option>cajas</option><option>paquetes</option><option>litros</option><option>kilos</option></select></div></div><div className="field-grid"><div className="field"><label>Precio unitario <small>(opcional)</small></label><div className="input-prefix"><span>S/</span><input type="number" min="0" step="0.01" value={form.unitPrice} onChange={(event) => setForm({ ...form, unitPrice: event.target.value })} placeholder="0.00" /></div></div><div className="field"><label>Prioridad</label><select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></div></div><div className="line-items"><div className="line-items-head"><label>Más productos <small>(opcional)</small></label><button type="button" className="link-button" onClick={() => setExtraItems([...extraItems, { product: "", quantity: "", unit: "unidades", unitPrice: "" }])}><Plus size={14} /> Agregar producto</button></div>{extraItems.map((item, index) => <div className="line-item" key={index}><input value={item.product} onChange={(event) => setExtraItems(extraItems.map((current, itemIndex) => itemIndex === index ? { ...current, product: event.target.value } : current))} placeholder="Producto adicional" /><input type="number" min="1" value={item.quantity} onChange={(event) => setExtraItems(extraItems.map((current, itemIndex) => itemIndex === index ? { ...current, quantity: event.target.value } : current))} placeholder="Cantidad" /><select value={item.unit} onChange={(event) => setExtraItems(extraItems.map((current, itemIndex) => itemIndex === index ? { ...current, unit: event.target.value } : current))}><option>unidades</option><option>cajas</option><option>paquetes</option><option>litros</option><option>kilos</option></select><button type="button" className="remove-line" onClick={() => setExtraItems(extraItems.filter((_, itemIndex) => itemIndex !== index))} aria-label="Quitar producto">×</button></div>)}</div><div className="field"><label>Fecha requerida</label><input type="date" value={form.requestedDate} onChange={(event) => setForm({ ...form, requestedDate: event.target.value })} /></div><div className="field"><label>Nota para el administrador <small>(opcional)</small></label><textarea rows="3" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Agrega contexto o especificaciones…" /></div><button className="primary-button" disabled={saving}>{saving ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />}{saving ? "Guardando pedido…" : "Registrar pedido"}</button></form></section><section className="orders-card"><div className="card-head"><div><span className="eyebrow">HISTORIAL</span><h2>Mis solicitudes <span>{orders.length}</span></h2></div><div className="mini-status"><span className="dot pending" /> {orders.filter((order) => order.status === "pending").length} pendientes</div></div><div className="order-list">{loading ? <div className="empty"><LoaderCircle className="spin" size={22} /> Cargando pedidos…</div> : filteredOrders.length ? filteredOrders.map((order) => <OrderRow key={order.id} order={order} onStatus={changeStatus} />) : <div className="empty"><PackageCheck size={24} /><strong>Aún no tienes pedidos</strong><span>Completa el formulario para registrar el primero.</span></div>}</div></section></div>
        )}
        <footer className="page-footer"><ShieldCheck size={14} /> Los cambios se guardan automáticamente en la base de datos central.</footer>
      </section>
    </main>
  );
}
