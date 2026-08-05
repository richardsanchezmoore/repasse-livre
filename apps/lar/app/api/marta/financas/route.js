import { NextResponse } from "next/server";
import { palavraFinancas } from "@/lib/marta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req) {
  let b = {};
  try { b = await req.json(); } catch { b = {}; }
  const num = (x) => (Number.isFinite(+x) ? Math.round(+x) : 0);
  const r = await palavraFinancas({ renda: num(b.renda), dizimo: num(b.dizimo), gastos: num(b.gastos), sobra: num(b.sobra) });
  return NextResponse.json(r.ok ? r : { ok: false });
}
