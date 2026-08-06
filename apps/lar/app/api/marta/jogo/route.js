import { NextResponse } from "next/server";
import { jogoBiblico } from "@/lib/marta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch { body = {}; }

  const r = await jogoBiblico({
    tema: String(body?.tema || "").slice(0, 60),
    nivel: String(body?.nivel || "medio"),
    faixa: String(body?.faixa || "familia"),
    n: body?.n,
  });
  if (!r.ok) return NextResponse.json({ ok: false, erro: r.erro }, { status: 502 });
  return NextResponse.json(r);
}
