import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Salva um lead do quiz público (/investigar) — e-mail + WhatsApp trocados pelo Veredito.
 *  Upsert por e-mail (se refizer, atualiza). Sempre responde ok pra não travar a UX. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch { body = {}; }

  const email = String(body?.email || "").trim().toLowerCase();
  const whatsapp = String(body?.whatsapp || "").replace(/[^\d+]/g, "").slice(0, 20);
  const total = Number.isFinite(+body?.total) ? Math.trunc(+body.total) : null;
  const faixa = ["green", "amber", "red"].includes(body?.faixa) ? body.faixa : null;

  if (!email.includes("@") || whatsapp.replace(/\D/g, "").length < 10) {
    return NextResponse.json({ ok: false, erro: "dados incompletos" }, { status: 400 });
  }

  try {
    const admin = supabaseAdmin();
    await admin.from("corte_leads").upsert(
      { email, whatsapp, quiz_total: total, quiz_faixa: faixa, origem: "investigar", atualizado_em: new Date().toISOString() },
      { onConflict: "email" }
    );
  } catch (e) {
    console.error("[lead] falhou:", e?.message);
    // não trava a UX — o Veredito é liberado do mesmo jeito
  }
  return NextResponse.json({ ok: true });
}
