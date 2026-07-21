import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { enviarEventoCapi } from "@/lib/metaCapi";
import { buscarPrecoExibicao } from "@/lib/assinatura";
import { URL_BASE_SITE } from "@/lib/site";

/**
 * Webhook da Ticto (v2.0) — libera/corta o acesso ao Repasse Livre PRO (fonte da
 * verdade). Espelha a Cakto: checkout hospedado + `sck` no tracking + token no corpo.
 *
 * Auth: campo `token` NO CORPO (não header) → comparação constante-no-tempo com
 * TICTO_WEBHOOK_TOKEN (env).
 *
 * Identidade: `tracking.sck` = nosso user_id (ou `claim_{token}` p/ guest checkout,
 * igual à Cakto) OU email do comprador (`customer.email`).
 *
 * Eventos (campo `status`, doc webhook.ticto.dev/docs/v2):
 *  - `authorized` → premium ON (cada cobrança paga, INCLUINDO renovação da assinatura).
 *    premium_expira_em = subscriptions[].next_charge + folga, ou agora + 1 mês + folga.
 *  - `refunded` / `chargeback` → premium OFF na hora.
 *  - subscription_canceled / subscription_delayed / all_charges_paid → NÃO corta:
 *    o acesso pago corre até premium_expira_em e lapsa sozinho.
 *
 * ⚠️ 1º teste real: conferir os CAMINHOS dos campos (status, tracking.sck,
 * subscriptions[0].next_charge, customer.email) no TICTO_DEBUG_ULTIMO_EVENTO e ajustar.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// authorized = venda paga (1ª + cada cobrança). extended/uncanceled = renovação/
// retomada da assinatura (garante estender mesmo se a renovação não vier como authorized).
const GRANT = new Set(["authorized", "extended", "uncanceled"]);
const REVOGAR = new Set(["refunded", "chargeback"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FOLGA_MS = 3 * 86_400_000;

interface SubTicto {
  next_charge?: string | null;
}
interface EventoTicto {
  token?: string;
  status?: string;
  customer?: { email?: string | null; name?: string | null; phone?: { ddi?: string | null; ddd?: string | null; number?: string | null } | string | null } | null;
  subscriptions?: SubTicto[] | null;
  tracking?: { sck?: string | null } | null;
}

function segredoConfere(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

/** Validade: próxima cobrança da assinatura (+folga); senão agora + 1 mês (+folga). */
function calcularExpira(ev: EventoTicto): string {
  const prox = ev.subscriptions?.[0]?.next_charge;
  if (prox && !Number.isNaN(Date.parse(prox))) return iso(Date.parse(prox) + FOLGA_MS);
  const base = new Date();
  base.setMonth(base.getMonth() + 1);
  return iso(base.getTime() + FOLGA_MS);
}

async function acharUsuarioPorEmail(email: string): Promise<string | null> {
  const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const alvo = email.toLowerCase();
  return data.users.find((u) => (u.email ?? "").toLowerCase() === alvo)?.id ?? null;
}

function telefoneDe(customer: EventoTicto["customer"]): string | undefined {
  const t = customer?.phone;
  if (!t) return undefined;
  if (typeof t === "string") return t.replace(/\D/g, "") || undefined;
  // Ticto manda { ddi:"+55", ddd:"51", number:"996901333" } → monta o completo.
  const cheio = `${(t.ddi ?? "+55").replace(/\D/g, "")}${(t.ddd ?? "").replace(/\D/g, "")}${(t.number ?? "").replace(/\D/g, "")}`;
  return cheio.length >= 10 ? cheio : undefined;
}

/**
 * Resolve o usuário: sck (user_id logado) OU email do comprador (guest checkout →
 * acha a conta; se não existe e `criar`, cria — o trigger faz o perfil). Igual à Cakto.
 */
async function resolverUsuario(
  sck: string,
  customer: EventoTicto["customer"],
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
    email_confirm: true,
    user_metadata: { name: customer?.name ?? undefined, phone: telefoneDe(customer) },
  });
  if (error || !data.user) {
    console.error(`[ticto webhook] falha ao criar conta ${email}: ${error?.message ?? "?"}`);
    return null;
  }
  return { userId: data.user.id, novo: true };
}

export async function POST(req: Request): Promise<Response> {
  const raw = await req.text();
  const esperado = process.env.TICTO_WEBHOOK_TOKEN ?? "";

  let evento: EventoTicto | null = null;
  try {
    evento = JSON.parse(raw) as EventoTicto;
  } catch {
    /* corpo não-JSON */
  }
  const tokenOk = Boolean(esperado) && typeof evento?.token === "string" && segredoConfere(evento.token, esperado);

  // Debug (antes de validar) — confirma o formato/token sem log da Vercel.
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => (headers[k] = v));
  try {
    await supabaseAdmin.from("worker_config").upsert(
      { chave: "TICTO_DEBUG_ULTIMO_EVENTO", valor: JSON.stringify({ recebido_em: new Date().toISOString(), token_ok: tokenOk, status: evento?.status, headers, body: evento ?? raw }).slice(0, 60000) },
      { onConflict: "chave" }
    );
  } catch {
    /* debug não derruba o processamento */
  }

  if (!esperado) {
    console.error("[ticto webhook] TICTO_WEBHOOK_TOKEN não configurado — rejeitando.");
    return NextResponse.json({ erro: "token_nao_configurado" }, { status: 500 });
  }
  if (!tokenOk) {
    console.warn("[ticto webhook] token inválido.");
    return NextResponse.json({ erro: "token_invalido" }, { status: 401 });
  }

  const tipo = evento?.status ?? "";
  const ehGrant = GRANT.has(tipo);
  const ehRevogar = REVOGAR.has(tipo);
  if (!ehGrant && !ehRevogar) return NextResponse.json({ ok: true, ignorado: tipo });

  // sck=claim_{token} = guest zero-clique (resolve por email + amarra o claim).
  const sckRaw = (evento?.tracking?.sck ?? "").trim();
  const claimToken = sckRaw.startsWith("claim_") ? sckRaw.slice(6) : null;
  const sck = claimToken ? "" : sckRaw;
  const resolvido = await resolverUsuario(sck, evento?.customer, ehGrant);
  if (!resolvido) {
    console.warn(`[ticto webhook] ${tipo}: sem sck e sem email/conta (comprador=${evento?.customer?.email ?? "?"}).`);
    return NextResponse.json({ ok: true, semUsuario: true });
  }
  const { userId, novo } = resolvido;

  // 1ª ativação vs renovação: só a 1ª é a conversão que a campanha atribui (Purchase no
  // CAPI). Conta nova (guest) já é nova por definição; usuário existente → lê o status
  // anterior. Isso também blinda contra reenvio do MESMO evento (na 2ª vez já está active).
  let jaEraAtivo = false;
  if (!novo && ehGrant) {
    const { data: antes } = await supabaseAdmin
      .from("perfis")
      .select("assinatura_status")
      .eq("user_id", userId)
      .maybeSingle();
    jaEraAtivo = antes?.assinatura_status === "active" || antes?.assinatura_status === "trialing";
  }
  const conversaoNova = ehGrant && !jaEraAtivo;

  const patch: Record<string, unknown> = ehGrant
    ? { assinatura_status: "active", premium_expira_em: calcularExpira(evento!) }
    : { assinatura_status: "canceled", premium_expira_em: new Date().toISOString() };
  if (novo && evento?.customer?.name) patch.nome = evento.customer.name;
  if (novo && telefoneDe(evento?.customer)) patch.whatsapp = telefoneDe(evento?.customer);

  const { error } = await supabaseAdmin.from("perfis").update(patch).eq("user_id", userId);
  if (error) {
    console.error(`[ticto webhook] falha ao atualizar perfil ${userId}: ${error.message}`);
    return NextResponse.json({ erro: "falha_update" }, { status: 500 });
  }

  if (ehGrant && claimToken) {
    const { error: eClaim } = await supabaseAdmin.from("claims").upsert(
      { token: claimToken, user_id: userId, email: evento?.customer?.email ?? null, status: "ready", criado_em: new Date().toISOString() },
      { onConflict: "token" }
    );
    if (eClaim) console.error(`[ticto webhook] falha ao gravar claim ${claimToken}: ${eClaim.message}`);
  }

  // Purchase no CAPI — só na 1ª ativação. Best-effort: NUNCA derruba o webhook (pagamento
  // já foi processado acima). Dormante até META_PIXEL_ID + META_CAPI_TOKEN existirem.
  if (conversaoNova) {
    try {
      const preco = await buscarPrecoExibicao();
      await enviarEventoCapi({
        evento: "Purchase",
        eventId: randomUUID(),
        email: evento?.customer?.email,
        phone: telefoneDe(evento?.customer),
        externalId: userId,
        value: preco.centavos / 100,
        currency: "BRL",
        eventSourceUrl: `${URL_BASE_SITE}/planos`,
      });
    } catch (e) {
      console.error(`[ticto webhook] CAPI Purchase falhou: ${e instanceof Error ? e.message : e}`);
    }
  }

  console.log(`[ticto webhook] ${tipo} → premium ${ehGrant ? "ON" : "OFF"} p/ ${userId}${novo ? " (conta NOVA)" : ""}${claimToken ? " [claim]" : ""}.`);
  return NextResponse.json({ ok: true });
}

export async function GET(): Promise<Response> {
  return NextResponse.json({ ok: true, hint: "Ticto webhook. Use POST." });
}
