import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { concederAcesso, revogarAcesso } from "@/lib/acessos";

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
  await admin.from("corte_membros").upsert({ user_id: novo.user.id, nome: nome || null }, { onConflict: "user_id" });
  return novo.user;
}

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch { body = {}; }

  // A Cakto envia o segredo NO CORPO ("secret"). Fallbacks: query/header.
  const url = new URL(req.url);
  const segredo = body?.secret || url.searchParams.get("secret") || req.headers.get("x-cakto-secret");
  if (!process.env.CORTE_CAKTO_SECRET || segredo !== process.env.CORTE_CAKTO_SECRET) {
    return NextResponse.json({ erro: "segredo inválido" }, { status: 401 });
  }

  // "data" vem como ARRAY no disparo Agrupado; pode vir objeto em outros modos.
  const d0 = Array.isArray(body.data) ? (body.data[0] || {}) : (body.data || body);
  const email = pick(d0, ["customer.email", "buyer.email", "email"]) || pick(body, ["customer.email", "email"]);
  const nome = pick(d0, ["customer.name", "buyer.name", "name"]);
  const produto = pick(d0, ["product.id", "product.short_id", "product.name", "offer.id", "offer.name", "offer.short_id", "refId", "product_id"]);
  const evento = String(body.event || pick(body, ["status", "type"]) || pick(d0, ["status"]) || "").toLowerCase();

  if (!email) {
    console.log("[cakto] sem email:", JSON.stringify(body).slice(0, 400));
    return NextResponse.json({ ok: false, motivo: "sem email" });
  }

  const admin = supabaseAdmin();
  const { data: cfg } = await admin.from("corte_config").select("valor").eq("chave", "planos").maybeSingle();
  const planos = cfg?.valor || {};
  const idAssin = planos?.assinatura?.cakto_produto || "";
  const tipo = produto && idAssin && String(produto) === String(idAssin) ? "assinatura" : "kit";

  // aprovado/renovação → concede · reembolso/cancelamento → revoga · resto → ignora
  const cancela = /(refund|estorn|reembol|cancel|chargeback|expired|dispute|revok|inadimpl|overdue|atras)/.test(evento);
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
    console.log(`[cakto] CONCEDIDO/RENOVADO ${tipo} · ${email} · ${evento}`);
    return NextResponse.json({ ok: true, acao: "concedido", tipo });
  }
  console.log(`[cakto] ignorado · ${evento} · ${email}`);
  return NextResponse.json({ ok: true, acao: "ignorado", evento });
}

export async function GET() {
  return NextResponse.json({ ok: true, servico: "cakto-webhook" });
}
