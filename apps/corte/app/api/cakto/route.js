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
  const url = new URL(req.url);
  const segredo = url.searchParams.get("secret") || req.headers.get("x-cakto-secret");
  if (!process.env.CORTE_CAKTO_SECRET || segredo !== process.env.CORTE_CAKTO_SECRET) {
    return NextResponse.json({ erro: "segredo inválido" }, { status: 401 });
  }

  let body = {};
  try { body = await req.json(); } catch { body = {}; }

  const email = pick(body, ["customer.email", "data.customer.email", "buyer.email", "data.buyer.email", "email", "data.email"]);
  const nome = pick(body, ["customer.name", "data.customer.name", "buyer.name", "name"]);
  const produto = pick(body, ["product.id", "data.product.id", "offer.id", "data.offer.id", "product_id", "offer_id", "product.short_id"]);
  const evento = String(pick(body, ["event", "status", "data.status", "type", "data.event"]) || "").toLowerCase();

  if (!email) {
    console.log("[cakto] sem email:", JSON.stringify(body).slice(0, 300));
    return NextResponse.json({ ok: false, motivo: "sem email" });
  }

  const admin = supabaseAdmin();
  const { data: cfg } = await admin.from("corte_config").select("valor").eq("chave", "planos").maybeSingle();
  const planos = cfg?.valor || {};
  const idAssin = planos?.assinatura?.cakto_produto || "";
  const tipo = produto && idAssin && String(produto) === String(idAssin) ? "assinatura" : "kit";

  const cancela = /(refund|estorn|cancel|chargeback|expired|dispute)/.test(evento);
  const pago = /(approv|paid|aprovad|pago|active|complete|purchase)/.test(evento) && !/(refus|declin|pend)/.test(evento);

  const user = await acharOuCriarUsuario(admin, email, nome);

  if (cancela) {
    await revogarAcesso(admin, user.id, tipo);
    console.log(`[cakto] REVOGADO ${tipo} · ${email} · ${evento}`);
    return NextResponse.json({ ok: true, acao: "revogado", tipo });
  }
  if (pago || evento === "") {
    const expira = tipo === "assinatura" ? new Date(Date.now() + 35 * 24 * 3600 * 1000).toISOString() : null;
    await concederAcesso(admin, user.id, tipo, { origem: "cakto", referencia: String(produto || ""), expira_em: expira });
    console.log(`[cakto] CONCEDIDO ${tipo} · ${email} · ${evento}`);
    return NextResponse.json({ ok: true, acao: "concedido", tipo });
  }
  console.log(`[cakto] ignorado · ${evento} · ${email}`);
  return NextResponse.json({ ok: true, acao: "ignorado", evento });
}

export async function GET() {
  return NextResponse.json({ ok: true, servico: "cakto-webhook" });
}
