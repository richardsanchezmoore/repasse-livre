import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Funil interno do /investigar: registra 'visita' (abriu a página) e 'quiz_fim'
 *  (respondeu tudo e chegou no gate). 'lead' não vem aqui — é o corte_leads.
 *  Best-effort: nunca trava a UX. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch { body = {}; }

  const tipo = String(body?.tipo || "");
  if (!["visita", "quiz_fim"].includes(tipo)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const vid = String(body?.vid || "").slice(0, 40) || null;
  const quiz_slug = String(body?.quiz_slug || "").slice(0, 80) || null;

  try {
    await supabaseAdmin().from("corte_funil").insert({ tipo, vid, quiz_slug });
  } catch (e) {
    console.error("[evento] falhou:", e?.message);
  }
  return NextResponse.json({ ok: true });
}
