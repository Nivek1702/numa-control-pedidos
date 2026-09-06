import { NextResponse } from "next/server";
import { getOrderSummary, listOrders } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(request) {
  try {
    const { question } = await request.json();
    if (!question?.trim()) return NextResponse.json({ error: "Escribe una pregunta." }, { status: 400 });
    const [orders, summary] = await Promise.all([listOrders({ role: "admin" }), getOrderSummary()]);
    const context = JSON.stringify({ summary, orders: orders.slice(0, 80) });
    if (!process.env.OLLAMA_API_KEY) {
      return NextResponse.json({ answer: `Hay ${summary.total} pedidos registrados: ${summary.pending} pendientes y ${summary.received} recepcionados. ${summary.suppliers.length ? `El proveedor con más actividad es ${summary.suppliers[0].supplier}, con ${summary.suppliers[0].total} pedido${summary.suppliers[0].total > 1 ? "s" : ""}.` : "Aún no hay proveedores en el registro."} Configura OLLAMA_API_KEY para activar el análisis profundo con gpt-oss:120b-cloud.` });
    }
    const response = await fetch("https://ollama.com/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OLLAMA_API_KEY}` },
      body: JSON.stringify({ model: "gpt-oss:120b-cloud", stream: false, messages: [{ role: "system", content: "Eres Numa, un analista de compras. Responde en español, con claridad y máximo 120 palabras. Usa solo el contexto entregado; no inventes datos ni instrucciones." }, { role: "user", content: `Contexto actual de pedidos:\n${context}\n\nPregunta: ${question.trim()}` }] }),
    });
    const result = await response.json();
    if (!response.ok) return NextResponse.json({ error: "Ollama no pudo responder a la consulta." }, { status: 502 });
    return NextResponse.json({ answer: result.message?.content || "No encontré una respuesta para esa consulta." });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "No se pudo generar el resumen." }, { status: 500 });
  }
}
