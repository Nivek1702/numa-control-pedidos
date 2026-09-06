import { NextResponse } from "next/server";
import { getProductAnalytics } from "@/lib/db";
import { getAuthenticatedClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    const mode = params.get("mode") === "year" ? "year" : "month";
    const { supabase, user } = await getAuthenticatedClient();
    if (!user) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
    const data = await getProductAnalytics({ supabase, userId: user.id, mode, year: params.get("year"), month: params.get("month") });
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "No se pudo cargar la gráfica de productos." }, { status: 500 });
  }
}
