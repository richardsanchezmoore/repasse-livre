import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Webhook da Cakto — libera/corta o acesso ao Repasse Livre PRO (fonte da verdade).
 *
 * Formato (Agrupado, confirmado por evento real): { secret, event, data: [ {
 * offer_type, customer{email,...}, sck, subscription{id,next_payment_date},
 * subscription_period, paidAt, ... } ] }. O `secret` vem NO CORPO → validação =
 * comparação constante-no-tempo com CAKTO_WEBHOOK_SECRET (env).
 *
 * Identidade: `sck` do item main = o nosso `user_id` (injetado no link de
 * checkout como ?sck={user_id}). `perfis` não tem email, então o sck é o
 * mapeamento confiável. Ver project_repasse_livre_gateway_pagamento_woovi (Cakto).
 *
 * Eventos → acesso:
 *  - purchase_approved / subscription_created / subscription_renewed → premium ON
 *    (assinatura_status=active, premium_expira_em = next_payment_date + folga, ou
 *    paidAt + período como fallback).
 *  - refund / chargeback → premium OFF na hora (expira = agora).
 *  - subscription_canceled / subscription_renewal_refused → NÃO corta: o acesso
 *    já pago corre até premium_expira_em e lapsa sozinho (sem renovação).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GRANT = new Set(["purchase_approved", "subscription_created", "subscription_renewed"]);
const REVOGAR = new Set(["refund", "chargeback"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FOLGA_MS = 3 * 86_400_000; // 3 dias de folga p/ o timing da renovação

interface SubCakto {
  id?: string;
  next_payment_date?: string | null;
}
interface ItemCakto {
  offer_type?: string;
  sck?: string | null;
  subscription?: SubCakto | string | null;
  subscription_period?: number | null;
  paidAt?: string | null;
  customer?: { email?: string | null; name?: string | null; phone?: string | null } | null;
}
interface EventoCakto {
  secret?: string;
  event?: string;
  data?: ItemCakto[];
}

/** Comparação constante-no-tempo (evita timing attack no secret). */
function segredoConfere(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

/** Validade: usa a próxima cobrança da assinatura (+folga); senão paidAt + período (+folga). */
function calcularExpira(main: ItemCakto): string {
  const sub = typeof main.subscription === "object" && main.subscription ? main.subscription : null;
  const prox = sub?.next_payment_date;
  if (prox && !Number.isNaN(Date.parse(prox))) return iso(Date.parse(prox) + FOLGA_MS);
  const base = main.paidAt && !Number.isNaN(Date.parse(main.paidAt)) ? new Date(main.paidAt) : new Date();
  base.setMonth(base.getMonth() + (main.subscription_period && main.subscription_period > 0 ? main.subscription_period : 1));
  return iso(base.getTime() + FOLGA_MS);
}

/** Acha um usuário pelo email (auth). Plataforma nova → 1 página cobre; paginar quando crescer. */
async function acharUsuarioPorEmail(email: string): Promise<string | null> {
  const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const alvo = email.toLowerCase();
  return data.users.find((u) => (u.email ?? "").toLowerCase() === alvo)?.id ?? null;
}

/**
 * Resolve o usuário do pagamento: `sck` (comprador logado, match exato) OU o EMAIL
 * do comprador (checkout sem login → acha a conta; se não existe e `criar`, cria —
 * o trigger on_auth_user_created faz o perfil). Menos fricção: paga sem criar conta
 * antes; acessa depois logando com o email da compra (magic link/Google).
 */
async function resolverUsuario(
  sck: string,
  customer: ItemCakto["customer"],
  criar: boolean
): Promise<{ userId: string; novo: boolean } | null> {
  if (UUID.test(sck)) return { userId: sck, novo: false };
  const email = (customer?.email ?? "").trim();
  if (!email.includes("@")) return null;
  const existente = await acharUsuarioPorEmail(email);
  if (existente) return { userId: existente, novo: false };
  if (!criar) return null;
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true, // email verificado → loga por magic link/Google, sem senha
    user_metadata: { name: customer?.name ?? undefined, phone: customer?.phone ?? undefined },
  });
  if (error || !data.user) {
    console.error(`[cakto webhook] falha ao criar conta ${email}: ${error?.message ?? "?"}`);
    return null;
  }
  return { userId: data.user.id, novo: true };
}

export async function POST(req: Request): Promise<Response> {
  const raw = await req.text();
  const esperado = process.env.CAKTO_WEBHOOK_SECRET ?? "";

  let evento: EventoCakto | null = null;
  try {
    evento = JSON.parse(raw) as EventoCakto;
  } catch {
    /* corpo não-JSON */
  }
  const secretOk = Boolean(esperado) && typeof evento?.secret === "string" && segredoConfere(evento.secret, esperado);

  // Captura de debug (antes de validar) — inclui secret_ok pra confirmar o env sem log da Vercel.
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => (headers[k] = v));
  try {
    await supabaseAdmin.from("worker_config").upsert(
      {
        chave: "CAKTO_DEBUG_ULTIMO_EVENTO",
        valor: JSON.stringify({ recebido_em: new Date().toISOString(), secret_ok: secretOk, event: evento?.event, headers, body: evento ?? raw }).slice(0, 60000),
      },
      { onConflict: "chave" }
    );
  } catch {
    /* debug não pode derrubar o processamento */
  }

  // --- validação ---
  if (!esperado) {
    console.error("[cakto webhook] CAKTO_WEBHOOK_SECRET não configurado — rejeitando.");
    return NextResponse.json({ erro: "secret_nao_configurado" }, { status: 500 });
  }
  if (!secretOk) {
    console.warn("[cakto webhook] secret inválido.");
    return NextResponse.json({ erro: "secret_invalido" }, { status: 401 });
  }

  const tipo = evento?.event ?? "";
  const ehGrant = GRANT.has(tipo);
  const ehRevogar = REVOGAR.has(tipo);
  if (!ehGrant && !ehRevogar) {
    return NextResponse.json({ ok: true, ignorado: tipo }); // canceled/renewal_refused/gerado → lapsa sozinho
  }

  const itens = Array.isArray(evento?.data) ? evento!.data! : [];
  const main = itens.find((i) => i.offer_type === "main") ?? itens[0];
  if (!main) return NextResponse.json({ ok: true, semItem: true });

  // Identidade: sck (logado) OU email do comprador (checkout sem login → acha/cria).
  // Só CRIA conta em evento de grant (não faz sentido criar conta só pra reembolsar).
  const sck = (main.sck ?? "").trim();
  const resolvido = await resolverUsuario(sck, main.customer, ehGrant);
  if (!resolvido) {
    console.warn(`[cakto webhook] ${tipo}: sem sck e sem email/conta (comprador=${main.customer?.email ?? "?"}).`);
    return NextResponse.json({ ok: true, semUsuario: true });
  }
  const { userId, novo } = resolvido;

  const patch: Record<string, unknown> = ehGrant
    ? { assinatura_status: "active", premium_expira_em: calcularExpira(main) }
    : { assinatura_status: "canceled", premium_expira_em: new Date().toISOString() };
  // Conta NOVA (checkout sem login) → já preenche nome/telefone da Cakto no perfil.
  if (novo && main.customer?.name) patch.nome = main.customer.name;
  if (novo && main.customer?.phone) patch.whatsapp = main.customer.phone;

  const { error } = await supabaseAdmin.from("perfis").update(patch).eq("user_id", userId);
  if (error) {
    console.error(`[cakto webhook] falha ao atualizar perfil ${userId}: ${error.message}`);
    return NextResponse.json({ erro: "falha_update" }, { status: 500 });
  }
  console.log(`[cakto webhook] ${tipo} → premium ${ehGrant ? "ON" : "OFF"} p/ ${userId}${novo ? " (conta NOVA)" : ""}.`);
  return NextResponse.json({ ok: true });
}

export async function GET(): Promise<Response> {
  return NextResponse.json({ ok: true, hint: "Cakto webhook. Use POST." });
}
