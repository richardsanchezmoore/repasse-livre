import { NextResponse } from "next/server";
import { planejarRotinaCasa } from "@/lib/marta";
import { contexto } from "@/lib/membro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch { body = {}; }
  const { familia } = await contexto(); // usa o perfil salvo pra saber os filhos

  const r = await planejarRotinaCasa({
    familia,
    comodos: String(body?.comodos || "").slice(0, 400),
    ajudaMarido: !!body?.ajudaMarido,
    tempo: body?.tempo === "pouco" ? "pouco" : "normal",
  });
  if (!r.ok) return NextResponse.json({ ok: false, erro: r.erro }, { status: 502 });
  return NextResponse.json(r);
}
