import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { emailDoCliente } from "@/lib/asaas";

/**
 * Webhook do Asaas — libera/corta o acesso ao Repasse Livre PRO (fonte da verdade).
 *
 * Auth: o Asaas manda o token que você configurou no header `asaas-access-token`
 * (NÃO vem no corpo, diferente da Cakto). Validação = comparação constante-no-tempo
 * com ASAAS_WEBHOOK_TOKEN (env).
 *
 * Identidade: `payment.externalReference` = nosso user_id (marcado na assinatura/
 * cliente — ver lib/asaas). Fallback: email do cliente (GET /customers/{id}).
 *
 * Eventos → acesso (ver docs.asaas.com/docs/webhook-para-cobrancas):
 *  - PAYMENT_CONFIRMED / PAYMENT_RECEIVED → premium ON (paidAt + 1 mês + folga).
 *  - PAYMENT_REFUNDED / PAYMENT_PARTIALLY_REFUNDED / PAYMENT_CHARGEBACK_REQUESTED /
 *    PAYMENT_DELETED → premium OFF na hora.
 *  - PAYMENT_OVERDUE etc. → NÃO corta: o acesso pago corre até premium_expira_em e
 *    lapsa sozinho (sem renovação), igual à Cakto.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GRANT = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
const REVOGAR = new Set(["PAYMENT_REFUNDED", "PAYMENT_PARTIALLY_REFUNDED", "PAYMENT_CHARGEBACK_REQUESTED", "PAYMENT_DELETED"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FOLGA_MS = 3 * 86_400_000;

interface PaymentAsaas {
  id?: string;
  customer?: string | null;
  subscription?: string | null;
  externalReference?: string | null;
  value?: number | null;
  status?: string | null;
  billingType?: string | null;
  paymentDate?: string | null;
}
interface EventoAsaas {
  event?: string;
  payment?: PaymentAsaas;
}

function segredoConfere(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
}

/** Validade: paidAt (ou agora) + 1 mês + folga. */
function calcularExpira(pay: PaymentAsaas): string {
  const base = pay.paymentDate && !Number.isNaN(Date.parse(pay.paymentDate)) ? new Date(pay.paymentDate) : new Date();
  base.setMonth(base.getMonth() + 1);
  return new Date(base.getTime() + FOLGA_MS).toISOString();
}

async function acharUsuarioPorEmail(email: string): Promise<string | null> {
  const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const alvo = email.toLowerCase();
  return data.users.find((u) => (u.email ?? "").toLowerCase() === alvo)?.id ?? null;
}

/** externalReference (user_id direto) OU email do cliente Asaas. */
async function resolverUsuario(pay: PaymentAsaas): Promise<string | null> {
  const ref = (pay.externalReference ?? "").trim();
  if (UUID.test(ref)) return ref;
  if (!pay.customer) return null;
  const email = await emailDoCliente(pay.customer);
  if (!email || !email.includes("@")) return null;
  return acharUsuarioPorEmail(email);
}

export async function POST(req: Request): Promise<Response> {
  const raw = await req.text();
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN ?? "";
  const recebido = req.headers.get("asaas-access-token") ?? "";
  const tokenOk = Boolean(esperado) && segredoConfere(recebido, esperado);

  let evento: EventoAsaas | null = null;
  try {
    evento = JSON.parse(raw) as EventoAsaas;
  } catch {
    /* corpo não-JSON */
  }

  // Debug (antes de validar) — confirma o token/env sem log da Vercel.
  try {
    await supabaseAdmin.from("worker_config").upsert(
      { chave: "ASAAS_DEBUG_ULTIMO_EVENTO", valor: JSON.stringify({ recebido_em: new Date().toISOString(), token_ok: tokenOk, event: evento?.event, body: evento ?? raw }).slice(0, 60000) },
      { onConflict: "chave" }
    );
  } catch {
    /* debug não derruba o processamento */
  }

  if (!esperado) {
    console.error("[asaas webhook] ASAAS_WEBHOOK_TOKEN não configurado — rejeitando.");
    return NextResponse.json({ erro: "token_nao_configurado" }, { status: 500 });
  }
  if (!tokenOk) {
    console.warn("[asaas webhook] token inválido.");
    return NextResponse.json({ erro: "token_invalido" }, { status: 401 });
  }

  const tipo = evento?.event ?? "";
  const ehGrant = GRANT.has(tipo);
  const ehRevogar = REVOGAR.has(tipo);
  if (!ehGrant && !ehRevogar) return NextResponse.json({ ok: true, ignorado: tipo });

  const pay = evento?.payment;
  if (!pay) return NextResponse.json({ ok: true, semPayment: true });

  const userId = await resolverUsuario(pay);
  if (!userId) {
    console.warn(`[asaas webhook] ${tipo}: sem externalReference válido nem email (customer=${pay.customer ?? "?"}).`);
    return NextResponse.json({ ok: true, semUsuario: true });
  }

  const patch = ehGrant
    ? { assinatura_status: "active", premium_expira_em: calcularExpira(pay) }
    : { assinatura_status: "canceled", premium_expira_em: new Date().toISOString() };

  const { error } = await supabaseAdmin.from("perfis").update(patch).eq("user_id", userId);
  if (error) {
    console.error(`[asaas webhook] falha ao atualizar perfil ${userId}: ${error.message}`);
    return NextResponse.json({ erro: "falha_update" }, { status: 500 });
  }
  console.log(`[asaas webhook] ${tipo} → premium ${ehGrant ? "ON" : "OFF"} p/ ${userId}.`);
  return NextResponse.json({ ok: true });
}

export async function GET(): Promise<Response> {
  return NextResponse.json({ ok: true, hint: "Asaas webhook. Use POST." });
}
