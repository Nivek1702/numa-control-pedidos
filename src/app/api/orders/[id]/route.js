import { NextResponse } from "next/server";
import { updateOrderStatus } from "@/lib/db";
import { getAuthenticatedClient } from "@/lib/supabase/server";
export const runtime = "nodejs";
export async function PATCH(request, { params }) { try { const body = await request.json(); if (body.status !== "received") return NextResponse.json({ error: "Estado no válido." }, { status: 400 }); const { supabase, user } = await getAuthenticatedClient(); if (!user) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 }); const { id } = await params; await updateOrderStatus({ supabase, id, status: body.status, userId: user.id }); return NextResponse.json({ ok: true }); } catch (error) { console.error(error); return NextResponse.json({ error: error.message === "ORDER_NOT_OWNED" ? "No puedes actualizar este pedido." : "No se pudo actualizar el pedido." }, { status: error.message === "ORDER_NOT_OWNED" ? 403 : 500 }); } }
