import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { concederAcesso, revogarAcesso } from "@/lib/acessos";
import { enviarPurchaseCapi } from "@/lib/metaCapi";

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
  // Marca setup_pendente: a compradora define a senha em /bem-vinda (sem link mágico),
  // válido por 2h. Fora disso, usa o login normal / link mágico.
  await admin.from("corte_membros").upsert(
    { user_id: novo.user.id, nome: nome || null, setup_pendente: true, setup_expira_em: new Date(Date.now() + 2 * 3600 * 1000).toISOString() },
    { onConflict: "user_id" }
  );
  return novo.user;
}

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch { body = {}; }

  // A Cakto envia o segredo NO CORPO ("secret"). Fallbacks: query/header.
  // Segredo do KIT em CORTE_CAKTO_SECRET, da ASSINATURA em CORTE_CAKTO_SECRET_ASSINATURA
  // (cada um pode ter vários por vírgula). O webhook sabe o produto PELO segredo —
  // resolve a Cakto não expor um "ID de produto" copiável.
  const url = new URL(req.url);
  const segredo = String(body?.secret || url.searchParams.get("secret") || req.headers.get("x-cakto-secret") || "").trim();
  const lista = (v) => (v || "").split(",").map((s) => s.trim()).filter(Boolean);
  const secretsKit = lista(process.env.CORTE_CAKTO_SECRET);
  const secretsAssin = lista(process.env.CORTE_CAKTO_SECRET_ASSINATURA);
  const validos = [...secretsKit, ...secretsAssin];
  if (!validos.length || !segredo || !validos.includes(segredo)) {
    return NextResponse.json({ erro: "segredo inválido" }, { status: 401 });
  }

  // "data" vem como ARRAY no disparo Agrupado; pode vir objeto em outros modos.
  const d0 = Array.isArray(body.data) ? (body.data[0] || {}) : (body.data || body);
  const email = pick(d0, ["customer.email", "buyer.email", "email"]) || pick(body, ["customer.email", "email"]);
  const nome = pick(d0, ["customer.name", "buyer.name", "name"]);
  const produto = pick(d0, ["product.id", "product.short_id", "product.name", "offer.id", "offer.name", "offer.short_id", "refId", "product_id"]);
  // sck = ponte de auto-login: o BotaoCompra injeta ?sck=claim_{token} no checkout.
  const sckRaw = String(pick(d0, ["sck"]) || pick(body, ["sck"]) || "").trim();
  const claimToken = sckRaw.startsWith("claim_") ? sckRaw.slice(6) : null;
  const evento = String(body.event || pick(body, ["status", "type"]) || pick(d0, ["status"]) || "").toLowerCase();

  if (!email) {
    console.log("[cakto] sem email:", JSON.stringify(body).slice(0, 400));
    return NextResponse.json({ ok: false, motivo: "sem email" });
  }

  const admin = supabaseAdmin();
  const { data: cfg } = await admin.from("corte_config").select("valor").eq("chave", "planos").maybeSingle();
  const planos = cfg?.valor || {};
  // Tipo pelo SEGREDO (cada produto tem o seu) — fallback: ID de produto se preenchido.
  const idAssin = planos?.assinatura?.cakto_produto || "";
  const tipo = secretsAssin.includes(segredo) || (produto && idAssin && String(produto) === String(idAssin)) ? "assinatura" : "kit";

  // aprovado/renovação → concede · reembolso/cancelamento → revoga · resto → ignora
  // ⚠️ NÃO revogar kit pago por evento de tentativa não-paga: um PIX/boleto que EXPIRA
  // (ou "cancel"/"overdue"/"atras") de uma tentativa da MESMA pessoa NÃO pode derrubar a
  // compra que foi aprovada. Estorno/contestação revoga sempre; fim-de-ciclo revoga só assinatura.
  const revogaSempre = /(refund|estorn|reembol|chargeback|charge_back|dispute|disputa|\bmed\b|revok)/.test(evento);
  const revogaAssinatura = /(cancel|expir|overdue|atras|inadimpl|suspend|unpaid|delinq)/.test(evento);
  const cancela = revogaSempre || (tipo === "assinatura" && revogaAssinatura);
  const concede = /(approv|aprovad|paid|pago|purchase_approved|complete|active|renov|renew|recur|recorren)/.test(evento);

  const user = await acharOuCriarUsuario(admin, email, nome);

  if (cancela) {
    await revogarAcesso(admin, user.id, tipo);
    console.log(`[cakto] REVOGADO ${tipo} · ${email} · ${evento}`);
    return NextResponse.json({ ok: true, acao: "revogado", tipo });
  }
  if (concede) {
    const expira = tipo === "assinatura" ? new Date(Date.now() + 35 * 24 * 3600 * 1000).toISOString() : null;
    await concederAcesso(admin, user.id, tipo, { origem: "cakto", referencia: String(produto || ""), expira_em: expira });

    // Purchase → Meta CAPI (server-side). Valor: do payload, senão do preço do plano.
    const precoPlano = tipo === "assinatura" ? planos?.assinatura?.preco : planos?.kit?.preco;
    const valorPayload = Number(String(pick(d0, ["amount", "total", "offer.price", "price", "value"]) || "").toString().replace(/[^\d,.-]/g, "").replace(",", "."));
    const valorPlano = Number(String(precoPlano || "").replace(/[^\d,.-]/g, "").replace(",", "."));
    const valor = valorPayload > 0 ? valorPayload : (valorPlano > 0 ? valorPlano : (tipo === "assinatura" ? 19.9 : 27.9));
    // não bloqueia a resposta do webhook se o CAPI demorar/falhar
    enviarPurchaseCapi({ email, valor, nomeConteudo: tipo === "assinatura" ? "Damas Virtuosas · assinatura" : "Panfleto + Kit" })
      .catch((e) => console.error("[cakto] capi falhou:", e?.message));
    // Auto-login: amarra o token de claim à conta pra a /bem-vinda trocar por sessão
    // (sem digitar e-mail). Só em concessão — a compradora acabou de pagar e vai cair lá.
    if (claimToken) {
      await admin.from("corte_claims").upsert(
        { token: claimToken, user_id: user.id, email, status: "ready", criado_em: new Date().toISOString() },
        { onConflict: "token" }
      );
    }
    console.log(`[cakto] CONCEDIDO/RENOVADO ${tipo} · ${email} · ${evento}${claimToken ? " [claim]" : ""}`);
    return NextResponse.json({ ok: true, acao: "concedido", tipo });
  }
  console.log(`[cakto] ignorado · ${evento} · ${email}`);
  return NextResponse.json({ ok: true, acao: "ignorado", evento });
}

export async function GET() {
  return NextResponse.json({ ok: true, servico: "cakto-webhook" });
}
