import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Pré-checkout: o pop-up da landing capta nome + e-mail + WhatsApp ANTES de abrir
 *  a Cakto. Salvamos o lead aqui (marcado como chegou_checkout) pra podermos chamar
 *  no Whats quem começou e não concluiu. Upsert por WhatsApp; nunca trava a UX. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch { body = {}; }

  const dig = String(body?.whatsapp || "").replace(/\D/g, "");
  const email = String(body?.email || "").trim().toLowerCase();
  const nome = String(body?.nome || "").trim().slice(0, 120) || null;

  if (dig.length < 10) return NextResponse.json({ ok: false, erro: "whatsapp inválido" }, { status: 400 });
  if (!email.includes("@")) return NextResponse.json({ ok: false, erro: "e-mail inválido" }, { status: 400 });

  const whatsapp = "+" + (dig.startsWith("55") ? dig : "55" + dig);
  const agora = new Date().toISOString();

  try {
    const admin = supabaseAdmin();
    await admin.from("corte_leads").upsert(
      { whatsapp, email, nome, origem: "checkout", chegou_checkout: true, checkout_em: agora, atualizado_em: agora },
      { onConflict: "whatsapp" }
    );
  } catch (e) {
    console.error("[checkout] falhou:", e?.message);
    // best-effort: se falhar, ainda deixamos ir pra Cakto (não perder a venda)
  }
  return NextResponse.json({ ok: true });
}
