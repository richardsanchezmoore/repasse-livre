import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Webhook da Cakto — libera/corta o acesso ao Clube BIA (fonte da verdade).
 *
 * Formato (Agrupado): { secret, event, data: [ {offer_type, customer, sck,
 * subscription, subscription_period, paidAt, ...}, ... ] }. O `secret` vem NO
 * CORPO → validação = comparação constante-no-tempo com CAKTO_WEBHOOK_SECRET (env).
 *
 * Identidade: `sck` do item main = o nosso `user_id` (injetado no link de
 * checkout como ?sck={user_id}). Sem coluna de email em `perfis`, o sck é o
 * mapeamento confiável. Ver project_repasse_livre_gateway_pagamento_woovi (Cakto).
 *
 * Eventos → acesso:
 *  - purchase_approved / subscription_created / subscription_renewed → premium ON
 *    (assinatura_status=active, premium_expira_em = pago + período + folga).
 *  - refund / chargeback → premium OFF na hora (expira_em = agora).
 *  - subscription_canceled / subscription_renewal_refused → NÃO corta na hora:
 *    o acesso já pago corre até premium_expira_em e lapsa sozinho (sem renovação).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GRANT = new Set(["purchase_approved", "subscription_created", "subscription_renewed"]);
const REVOGAR = new Set(["refund", "chargeback"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ItemCakto {
  offer_type?: string;
  sck?: string | null;
  subscription?: unknown;
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

/** Validade = pago (ou agora) + período (meses) + 3 dias de folga p/ o timing da renovação. */
function calcularExpira(paidAt: string | null | undefined, periodo: number | null | undefined): string {
  const base = paidAt && !Number.isNaN(Date.parse(paidAt)) ? new Date(paidAt) : new Date();
  base.setMonth(base.getMonth() + (periodo && periodo > 0 ? periodo : 1));
  base.setDate(base.getDate() + 3);
  return base.toISOString();
}

export async function POST(req: Request): Promise<Response> {
  const raw = await req.text();

  // Captura de debug (ajuda a inspecionar formatos novos sem depender de log da Vercel).
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => (headers[k] = v));
  let evento: EventoCakto | null = null;
  try {
    evento = JSON.parse(raw) as EventoCakto;
  } catch {
    /* corpo não-JSON */
  }
  try {
    await supabaseAdmin
      .from("worker_config")
      .upsert(
        { chave: "CAKTO_DEBUG_ULTIMO_EVENTO", valor: JSON.stringify({ recebido_em: new Date().toISOString(), headers, body: evento ?? raw }).slice(0, 60000) },
        { onConflict: "chave" }
      );
  } catch {
    /* debug não pode derrubar o processamento */
  }

  // --- validação do secret ---
  const esperado = process.env.CAKTO_WEBHOOK_SECRET ?? "";
  if (!esperado) {
    console.error("[cakto webhook] CAKTO_WEBHOOK_SECRET não configurado — rejeitando.");
    return NextResponse.json({ erro: "secret_nao_configurado" }, { status: 500 });
  }
  if (!evento || typeof evento.secret !== "string" || !segredoConfere(evento.secret, esperado)) {
    console.warn("[cakto webhook] secret inválido.");
    return NextResponse.json({ erro: "secret_invalido" }, { status: 401 });
  }

  const tipo = evento.event ?? "";
  const ehGrant = GRANT.has(tipo);
  const ehRevogar = REVOGAR.has(tipo);
  if (!ehGrant && !ehRevogar) {
    // canceled/renewal_refused/gerado/etc → sem mudança de acesso (lapsa sozinho).
    return NextResponse.json({ ok: true, ignorado: tipo });
  }

  // Item principal (ignora order bumps).
  const itens = Array.isArray(evento.data) ? evento.data : [];
  const main = itens.find((i) => i.offer_type === "main") ?? itens[0];
  if (!main) return NextResponse.json({ ok: true, semItem: true });

  // Identidade: sck = nosso user_id.
  const sck = (main.sck ?? "").trim();
  if (!UUID.test(sck)) {
    console.warn(`[cakto webhook] ${tipo} sem sck válido (comprador=${main.customer?.email ?? "?"}). Não dá pra casar com o usuário.`);
    return NextResponse.json({ ok: true, semSck: true });
  }

  const patch = ehGrant
    ? { assinatura_status: "active", premium_expira_em: calcularExpira(main.paidAt, main.subscription_period) }
    : { assinatura_status: "canceled", premium_expira_em: new Date().toISOString() };

  const { data, error } = await supabaseAdmin
    .from("perfis")
    .update(patch)
    .eq("user_id", sck)
    .select("user_id");
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
