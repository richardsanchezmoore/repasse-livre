import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { concederAcesso, revogarAcesso } from "@/lib/acessos";
import { enviarEmailAcesso } from "@/lib/emailAcesso";

// Hotmart webhook (Postback 2.0). Autentica pelo HOTTOK (header X-HOTMART-HOTTOK,
// ou `hottok` no corpo em versões antigas) contra HOTMART_HOTTOK. O `sck` do checkout
// (?sck=claim_TOKEN) volta no payload e é a ponte de auto-login — mesma ideia da Cakto.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pick(obj, paths) {
  for (const p of paths) {
    const v = p.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
    if (v != null && v !== "") return v;
  }
  return null;
}

async function acharOuCriarUsuario(admin, email, nome) {
  email = String(email).trim().toLowerCase();
  let pagina = 1, achado = null;
  while (pagina <= 10 && !achado) {
    const { data } = await admin.auth.admin.listUsers({ page: pagina, perPage: 1000 });
    const users = data?.users || [];
    achado = users.find((u) => (u.email || "").toLowerCase() === email);
    if (users.length < 1000) break;
    pagina++;
  }
  if (achado) return achado;
  const { data: novo, error } = await admin.auth.admin.createUser({
    email, email_confirm: true, password: crypto.randomUUID() + "Aa1!", user_metadata: { nome: nome || null },
  });
  if (error) throw new Error(error.message);
  await admin.from("ca_membros").upsert(
    { user_id: novo.user.id, nome: nome || null, setup_pendente: true, setup_expira_em: new Date(Date.now() + 2 * 3600 * 1000).toISOString() },
    { onConflict: "user_id" }
  );
  return novo.user;
}

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch { body = {}; }

  // HOTTOK: header (2.0) ou corpo (1.0). Compara com o token configurado.
  const hottok = String(req.headers.get("x-hotmart-hottok") || body?.hottok || "").trim();
  const esperado = (process.env.HOTMART_HOTTOK || "").trim();
  if (!esperado || !hottok || hottok !== esperado) {
    return NextResponse.json({ erro: "hottok inválido" }, { status: 401 });
  }

  const evento = String(body?.event || "").toUpperCase();
  const d = body?.data || {};
  const email = pick(d, ["buyer.email", "purchase.buyer.email", "subscriber.email"]) || pick(body, ["data.buyer.email"]);
  const nome = pick(d, ["buyer.name", "buyer.checkout_phone_name"]);
  const referencia = String(pick(d, ["purchase.transaction", "purchase.order_ref"]) || pick(body, ["id"]) || "");
  // sck (= claim de auto-login) vem no tracking do checkout
  const sckRaw = String(pick(d, ["purchase.tracking.source_sck", "purchase.sck", "tracking.source_sck"]) || pick(body, ["sck"]) || "").trim();
  const claimToken = sckRaw.startsWith("claim_") ? sckRaw.slice(6) : null;
  const valorRaw = Number(pick(d, ["purchase.price.value", "purchase.original_offer_price.value", "purchase.full_price.value"]) || 0);
  const valor = valorRaw > 0 ? valorRaw : 9;

  if (!email) {
    console.log("[hotmart] sem email:", JSON.stringify(body).slice(0, 300));
    return NextResponse.json({ ok: false, motivo: "sem email" });
  }

  // Só o KIT (one-time). Aprovado/completo → concede; reembolso/chargeback/disputa → revoga.
  // NÃO revogar por "canceled/expired/billet" (podem ser tentativa não paga — lição do BR).
  const tipo = "kit";
  const concede = ["PURCHASE_APPROVED", "PURCHASE_COMPLETE"].includes(evento);
  const cancela = ["PURCHASE_REFUNDED", "PURCHASE_CHARGEBACK", "PURCHASE_PROTEST"].includes(evento);

  const admin = supabaseAdmin();
  const user = await acharOuCriarUsuario(admin, email, nome);

  if (cancela) {
    await revogarAcesso(admin, user.id, tipo);
    console.log(`[hotmart] REVOKED ${tipo} · ${email} · ${evento}`);
    return NextResponse.json({ ok: true, acao: "revogado", tipo });
  }
  if (concede) {
    await concederAcesso(admin, user.id, tipo, { origem: "hotmart", referencia, expira_em: null });

    // TODO(US): Purchase via Meta CAPI com o pixel/dataset PRÓPRIO do mercado US (valor USD).

    if (claimToken) {
      await admin.from("ca_claims").upsert(
        { token: claimToken, user_id: user.id, email, status: "ready", criado_em: new Date().toISOString() },
        { onConflict: "token" }
      );
    }
    // E-mail de acesso — fallback pra quem pagou e não voltou pro /welcome. SÓ pra quem NUNCA
    // logou. AWAIT (serverless mata fire-and-forget). Reabre a janela de senha por 3 dias.
    if (!user.last_sign_in_at) {
      await admin.from("ca_membros")
        .update({ setup_pendente: true, setup_expira_em: new Date(Date.now() + 72 * 3600 * 1000).toISOString() })
        .eq("user_id", user.id);
      try {
        const r = await enviarEmailAcesso({ email, nome, tipo });
        if (!r.ok) console.error("[hotmart] email acesso:", r.erro);
        else console.log("[hotmart] email acesso enviado ·", email);
      } catch (e) { console.error("[hotmart] email acesso:", e?.message); }
    }
    console.log(`[hotmart] GRANTED ${tipo} · ${email} · ${evento}${claimToken ? " [claim]" : ""}`);
    return NextResponse.json({ ok: true, acao: "concedido", tipo });
  }
  console.log(`[hotmart] ignorado · ${evento} · ${email}`);
  return NextResponse.json({ ok: true, acao: "ignorado", evento });
}

export async function GET() {
  return NextResponse.json({ ok: true, servico: "hotmart-webhook" });
}
