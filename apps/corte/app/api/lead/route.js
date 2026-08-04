import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Salva um lead do quiz público (/investigar) — só WhatsApp é trocado pelo Veredito
 *  (menos fricção; contato p/ comunidade/transmissão). Upsert por WhatsApp (se refizer,
 *  atualiza). E-mail é opcional. Sempre responde ok pra não travar a UX. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch { body = {}; }

  const whatsapp = String(body?.whatsapp || "").replace(/[^\d+]/g, "").slice(0, 20);
  const email = String(body?.email || "").trim().toLowerCase();
  const total = Number.isFinite(+body?.total) ? Math.trunc(+body.total) : null;
  const faixa = ["green", "amber", "red"].includes(body?.faixa) ? body.faixa : null;
  const quiz_slug = String(body?.quiz_slug || "").slice(0, 80) || null;

  if (whatsapp.replace(/\D/g, "").length < 10) {
    return NextResponse.json({ ok: false, erro: "whatsapp inválido" }, { status: 400 });
  }

  try {
    const admin = supabaseAdmin();
    const row = { whatsapp, quiz_total: total, quiz_faixa: faixa, quiz_slug, origem: "investigar", atualizado_em: new Date().toISOString() };
    if (email.includes("@")) row.email = email; // e-mail é opcional (só grava se vier)
    await admin.from("corte_leads").upsert(row, { onConflict: "whatsapp" });
  } catch (e) {
    console.error("[lead] falhou:", e?.message);
    // não trava a UX — o Veredito é liberado do mesmo jeito
  }
  return NextResponse.json({ ok: true });
}
