import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { concederAcesso, revogarAcesso } from "@/lib/acessos";
import { enviarPurchaseCapi } from "@/lib/metaCapi";
import { lerTracking } from "@/lib/tracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
//  Webhook do HOTMART (mercado MÉXICO) — API 2.0. Espelha o /api/cakto do BR:
//  compra aprovada → cria/acha usuária + concede acesso 'kit' + Purchase no CAPI
//  (pixel MX). Reembolso/chargeback/cancelamento → revoga.
//
//  ⚠️ ESQUELETO: os caminhos do payload 2.0 estão com FALLBACKS defensivos (pick).
//  Na 1ª compra de teste, o console loga o corpo cru → ajusta 1-2 campos se preciso.
//
//  Config (Vercel env):
//    HOTMART_HOTTOK           token do webhook (valida autenticidade)
//    META_PIXEL_ID_MX         pixel Meta da conta MX
//    META_CAPI_TOKEN_MX       token CAPI da conta MX
//  Configurar no Hotmart: Ferramentas → Webhook (API 2.0) → URL:
//    https://damasvirtuosas.com/api/hotmart  · eventos: aprovada/reembolso/chargeback/cancelada
// ─────────────────────────────────────────────────────────────────────────────

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
    email, email_confirm: true, password: crypto.randomUUID() + "Aa1!", user_metadata: { nome: nome || null, mercado: "mx" },
  });
  if (error) throw new Error(error.message);
  // setup_pendente: a compradora define a senha em /es/bienvenida (válido 72h).
  await admin.from("corte_membros").upsert(
    { user_id: novo.user.id, nome: nome || null, setup_pendente: true, setup_expira_em: new Date(Date.now() + 72 * 3600 * 1000).toISOString() },
    { onConflict: "user_id" }
  );
  return novo.user;
}

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch { body = {}; }

  // Validação: Hotmart manda o hottok no header (X-HOTMART-HOTTOK) ou no corpo.
  const hottokEsperado = String(process.env.HOTMART_HOTTOK || "").trim();
  const hottokRecebido = String(req.headers.get("x-hotmart-hottok") || body?.hottok || pick(body, ["data.hottok"]) || "").trim();
  if (!hottokEsperado || hottokRecebido !== hottokEsperado) {
    return NextResponse.json({ erro: "hottok inválido" }, { status: 401 });
  }

  const d = body?.data || body;
  const evento = String(body?.event || pick(body, ["event", "status", "data.purchase.status"]) || "").toUpperCase();

  const email = pick(d, ["buyer.email", "customer.email", "contact.email", "email"]) || pick(body, ["buyer.email", "email"]);
  const nome = pick(d, ["buyer.name", "customer.name", "contact.name", "name"]);
  const transacao = pick(d, ["purchase.transaction", "transaction", "purchase.order.transaction"]);
  const valor = Number(pick(d, ["purchase.price.value", "purchase.full_price.value", "price.value", "purchase.original_offer_price.value"]) || 0);
  const moeda = String(pick(d, ["purchase.price.currency_value", "purchase.price.currency_code", "price.currency_value"]) || "MXN").toUpperCase();
  const telefone = pick(d, ["buyer.checkout_phone", "buyer.phone", "customer.phone"]);
  // sck = a NOSSA referência (gerada no HotmartCheckout) → recupera o tracking.
  const sck = String(pick(d, ["purchase.tracking.source_sck", "purchase.sck", "tracking.source_sck", "sck"]) || "").trim();

  if (!email) {
    console.log("[hotmart] sem email · payload:", JSON.stringify(body).slice(0, 500));
    return NextResponse.json({ ok: false, motivo: "sem email" });
  }

  // Classificação do evento (Hotmart 2.0 usa nomes tipo PURCHASE_APPROVED etc.).
  const concede = /(APPROVED|COMPLETE|APROVAD|PROTEST|COMPLETO|ACTIVE|BILLING)/.test(evento);
  const cancela = /(REFUND|CHARGEBACK|CANCEL|EXPIRED|DELAYED|DISPUTE|PROTESTED_REVERSED|OVERDUE)/.test(evento);

  const admin = supabaseAdmin();
  const user = await acharOuCriarUsuario(admin, email, nome);
  const tipo = "kit"; // MX vende o Kit (âncora + extras)

  if (cancela) {
    await revogarAcesso(admin, user.id, tipo);
    console.log(`[hotmart] REVOGADO ${tipo} · ${email} · ${evento}`);
    return NextResponse.json({ ok: true, acao: "revogado" });
  }

  if (concede) {
    await concederAcesso(admin, user.id, tipo, { origem: "hotmart", referencia: String(transacao || ""), expira_em: null });

    // Marca lead comprador (best-effort) — mesma tabela do BR, filtrada por mercado no painel.
    try {
      await admin.from("corte_leads").update({ virou_membro: true, atualizado_em: new Date().toISOString() }).eq("email", email);
    } catch (e) { console.error("[hotmart] marcar lead:", e?.message); }

    // Purchase → Meta CAPI no pixel MX (enriquecido com o tracking guardado por sck).
    try {
      const trk = sck ? await lerTracking(sck) : null;
      await enviarPurchaseCapi({
        email,
        valor: valor || 299,
        moeda: moeda || "MXN",
        nomeConteudo: "El Mapa + la Colección Completa",
        eventId: transacao || sck || undefined,
        telefone,
        externalId: user.id,
        fbp: trk?.fbp,
        fbc: trk?.fbc,
        fbclid: trk?.fbclid,
        pixelId: process.env.META_PIXEL_ID_MX || process.env.NEXT_PUBLIC_META_PIXEL_ID_MX,
        token: process.env.META_CAPI_TOKEN_MX,
        ddi: "52",
      });
    } catch (e) { console.error("[hotmart] capi:", e?.message); }

    // TODO (Fase 3): e-mail de acesso em espanhol (Resend). Por ora o Hotmart já
    // manda o e-mail de acesso do produto e a compradora cai em /es/bienvenida.
    console.log(`[hotmart] CONCEDIDO ${tipo} · ${email} · ${evento} · ${moeda} ${valor}`);
    return NextResponse.json({ ok: true, acao: "concedido" });
  }

  console.log(`[hotmart] ignorado · ${evento} · ${email}`);
  return NextResponse.json({ ok: true, acao: "ignorado", evento });
}

export async function GET() {
  return NextResponse.json({ ok: true, servico: "hotmart-webhook" });
}
