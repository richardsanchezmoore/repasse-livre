import { NextResponse } from "next/server";
import { planejarCardapio } from "@/lib/marta";

// A Marta monta o cardápio. Público (o "aha" vem antes da conta) — sem persistir.
// Salvar/histórico virá com login. runtime nodejs (usa o SDK da Anthropic).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch { body = {}; }

  const familia = {
    tamanho: Number(body?.tamanho) || null,
    filhos: Array.isArray(body?.filhos) ? body.filhos : [],
    restricoes: String(body?.restricoes || "").slice(0, 300),
  };
  const ingredientes = String(body?.ingredientes || "").slice(0, 600);
  const dias = Array.isArray(body?.dias) ? body.dias.slice(0, 7) : [];
  const tempo = body?.tempo === "elaborado" ? "elaborado" : "rapido";

  const r = await planejarCardapio({ familia, ingredientes, dias, tempo });
  if (!r.ok) return NextResponse.json({ ok: false, erro: r.erro }, { status: 502 });
  return NextResponse.json(r);
}
