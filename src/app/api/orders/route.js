import { NextResponse } from "next/server";
import { createOrder, getOrderSummary, listOrders } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requestRole(request) {
  const role = new URL(request.url).searchParams.get("role");
  return role === "admin" ? "admin" : "worker";
}

export async function GET(request) {
  try {
    const role = requestRole(request);
    const userId = new URL(request.url).searchParams.get("userId") || "ana-torres";
    const [orders, summary] = await Promise.all([listOrders({ role, userId }), getOrderSummary()]);
    return NextResponse.json({ orders, summary });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "No se pudieron cargar los pedidos." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const supplier = String(body.supplier || "").trim();
    const product = String(body.product || "").trim();
    const quantity = Number(body.quantity);
    const unit = String(body.unit || "unidad").trim();
    const requestedBy = String(body.requestedBy || "ana-torres");
    const requestedDate = String(body.requestedDate || new Date().toISOString().slice(0, 10));
    const items = Array.isArray(body.items) ? body.items.map((item) => ({ product: String(item.product || "").trim(), quantity: Number(item.quantity), unit: String(item.unit || "unidades").trim(), unitPrice: Math.max(0, Number(item.unitPrice) || 0) })).filter((item) => item.product && Number.isFinite(item.quantity) && item.quantity > 0) : [];
    if (!supplier || (!product && !items.length) || (!items.length && (!Number.isFinite(quantity) || quantity <= 0)) || (items.length && items.some((item) => item.quantity <= 0))) return NextResponse.json({ error: "Proveedor y al menos un producto con cantidad válida son obligatorios." }, { status: 400 });
    if (!["ana-torres"].includes(requestedBy)) return NextResponse.json({ error: "El solicitante no es válido." }, { status: 403 });
    const id = await createOrder({ supplier, product, quantity, unit, items, unitPrice: Math.max(0, Number(body.unitPrice) || 0), priority: ["normal", "high", "urgent"].includes(body.priority) ? body.priority : "normal", notes: String(body.notes || "").trim().slice(0, 500), requestedBy, requestedDate });
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "No se pudo registrar el pedido." }, { status: 500 });
  }
}
