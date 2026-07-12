import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Webhook da Cakto — libera/corta o acesso ao Clube BIA (fonte da verdade).
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
  customer?: { email?: string | null } | null;
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

  const sck = (main.sck ?? "").trim();
  if (!UUID.test(sck)) {
    console.warn(`[cakto webhook] ${tipo} sem sck válido (comprador=${main.customer?.email ?? "?"}).`);
    return NextResponse.json({ ok: true, semSck: true });
  }

  const patch = ehGrant
    ? { assinatura_status: "active", premium_expira_em: calcularExpira(main) }
    : { assinatura_status: "canceled", premium_expira_em: new Date().toISOString() };

  const { data, error } = await supabaseAdmin.from("perfis").update(patch).eq("user_id", sck).select("user_id");
  if (error) {
    console.error(`[cakto webhook] falha ao atualizar perfil ${sck}: ${error.message}`);
    return NextResponse.json({ erro: "falha_update" }, { status: 500 });
  }
  if (!data || data.length === 0) {
    console.warn(`[cakto webhook] ${tipo}: nenhum perfil com user_id=${sck}.`);
  } else {
    console.log(`[cakto webhook] ${tipo} → premium ${ehGrant ? "ON" : "OFF"} p/ ${sck}.`);
  }
  return NextResponse.json({ ok: true });
}

export async function GET(): Promise<Response> {
  return NextResponse.json({ ok: true, hint: "Cakto webhook. Use POST." });
}
