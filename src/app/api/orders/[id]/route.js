import { NextResponse } from "next/server";
import { updateOrderStatus } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (body.role !== "worker" || body.userId !== "ana-torres") return NextResponse.json({ error: "Solo el solicitante puede confirmar sus propios pedidos." }, { status: 403 });
    if (!["pending", "received"].includes(body.status)) return NextResponse.json({ error: "Estado no válido." }, { status: 400 });
    await updateOrderStatus(id, body.status, body.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    if (error?.message === "ORDER_NOT_OWNED") return NextResponse.json({ error: "El pedido no pertenece al solicitante." }, { status: 403 });
    return NextResponse.json({ error: "No se pudo actualizar el estado." }, { status: 500 });
  }
}
