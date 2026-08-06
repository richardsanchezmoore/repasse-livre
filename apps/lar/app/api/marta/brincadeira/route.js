import { NextResponse } from "next/server";
import { brincadeiraFamilia } from "@/lib/marta";
import { contexto } from "@/lib/membro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch { body = {}; }
  const { familia } = await contexto(); // usa as idades dos filhos pra adequar a brincadeira

  const r = await brincadeiraFamilia({
    familia,
    tempo: body?.tempo === "rapido" ? "rapido" : "normal",
  });
  if (!r.ok) return NextResponse.json({ ok: false, erro: r.erro }, { status: 502 });
  return NextResponse.json(r);
}
