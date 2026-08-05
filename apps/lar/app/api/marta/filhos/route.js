import { NextResponse } from "next/server";
import { sugerirVirtudes } from "@/lib/marta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch { body = {}; }
  const filhos = (Array.isArray(body?.filhos) ? body.filhos : []).slice(0, 12);
  const r = await sugerirVirtudes({ filhos });
  if (!r.ok) return NextResponse.json({ ok: false, erro: r.erro }, { status: 502 });
  return NextResponse.json(r);
}
