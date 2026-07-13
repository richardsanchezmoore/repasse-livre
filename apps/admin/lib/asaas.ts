import "server-only";

/**
 * Cliente da API do Asaas (gateway/PSP — Pix + assinaturas nativas).
 * Auth = header `access_token` (NÃO é Bearer). Ambiente por env
 * ASAAS_AMBIENTE ("producao" | "sandbox", default sandbox). Chave SÓ no
 * ambiente (Vercel): ASAAS_API_KEY ($aact_hmlg_… sandbox / $aact_prod_… prod).
 *
 * ★ Vantagem sobre a Cakto: `externalReference` — marco o cliente E a assinatura
 * com o nosso user_id e ele VOLTA no webhook (payment.externalReference) →
 * casamento à prova de bala. Ver project_repasse_livre_gateway_pagamento_woovi.
 *
 * ⚠️ Pix AUTOMÁTICO (débito recorrente) exige CNPJ ativo 6+ meses (confirmado na
 * doc do Asaas 13/07). Com CPF: assinatura Pix gera cobrança/mês (paga manual) ou
 * cartão recorrente. Este cliente serve os dois; o que muda é o billingType/produto.
 */

const AMBIENTE = process.env.ASAAS_AMBIENTE === "producao" ? "producao" : "sandbox";
const BASE = AMBIENTE === "producao" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";

function chave(): string {
  const k = process.env.ASAAS_API_KEY;
  if (!k) throw new Error("ASAAS_API_KEY não configurada no ambiente.");
  return k;
}

/** Chamada autenticada. `caminho` começa com "/" (ex.: "/subscriptions"). Response crua. */
export async function asaasFetch(caminho: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${BASE}${caminho}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "RepasseLivre",
      access_token: chave(),
      ...init.headers,
    },
  });
}

interface RespostaAsaas {
  id?: string;
  errors?: { description?: string }[];
  data?: { id?: string; invoiceUrl?: string }[];
}

async function erroDe(r: Response): Promise<string> {
  const j = (await r.json().catch(() => null)) as RespostaAsaas | null;
  return j?.errors?.map((e) => e.description).join("; ") || `HTTP ${r.status}`;
}

/**
 * Acha (por externalReference = nosso user_id) ou cria o cliente Asaas.
 * `cpfCnpj` é o CPF do COMPRADOR — exigido pra cobrança Pix/boleto; opcional na
 * criação, mas sem ele a 1ª cobrança Pix falha (coletar no checkout).
 */
export async function acharOuCriarCliente(dados: {
  userId: string;
  nome: string;
  email: string;
  cpfCnpj?: string;
  telefone?: string;
}): Promise<string> {
  const busca = await asaasFetch(`/customers?externalReference=${encodeURIComponent(dados.userId)}&limit=1`);
  if (busca.ok) {
    const j = (await busca.json()) as RespostaAsaas;
    const existente = j.data?.[0]?.id;
    if (existente) return existente;
  }
  const r = await asaasFetch("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: dados.nome,
      email: dados.email,
      cpfCnpj: dados.cpfCnpj,
      mobilePhone: dados.telefone,
      externalReference: dados.userId,
    }),
  });
  const j = (await r.json()) as RespostaAsaas;
  if (!r.ok || !j.id) throw new Error(`Asaas: falha ao criar cliente — ${await erroDe(r)}`);
  return j.id;
}

/** Cria a assinatura (agendador de cobranças recorrentes). Retorna o subscription id. */
export async function criarAssinatura(dados: {
  clienteId: string;
  userId: string;
  valorReais: number;
  descricao: string;
  billingType: "PIX" | "CREDIT_CARD" | "BOLETO" | "UNDEFINED";
  proximoVencimento: string; // YYYY-MM-DD
}): Promise<string> {
  const r = await asaasFetch("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      customer: dados.clienteId,
      billingType: dados.billingType,
      value: dados.valorReais,
      cycle: "MONTHLY",
      nextDueDate: dados.proximoVencimento,
      description: dados.descricao,
      externalReference: dados.userId,
    }),
  });
  const j = (await r.json()) as RespostaAsaas;
  if (!r.ok || !j.id) throw new Error(`Asaas: falha ao criar assinatura — ${await erroDe(r)}`);
  return j.id;
}

/**
 * A cobrança é criada DEPOIS da assinatura (não junto) → busca a 1ª cobrança pra
 * pegar a invoiceUrl (fatura hospedada onde o comprador paga o Pix/cartão).
 */
export async function primeiraCobranca(subId: string): Promise<string | null> {
  const r = await asaasFetch(`/subscriptions/${subId}/payments?limit=1`);
  if (!r.ok) return null;
  const j = (await r.json()) as RespostaAsaas;
  return j.data?.[0]?.invoiceUrl ?? null;
}

/**
 * Cria um CHECKOUT hospedado do Asaas (página deles, tipo Cakto) — o cliente é
 * redirecionado, o Asaas COLETA O CPF e processa, e volta pro nosso callback.
 * `chargeTypes: RECURRENT` + `subscription.cycle` = assinatura recorrente.
 * Resolve o gap de CPF e mira o Pix recorrente via checkout.
 *
 * Fluxo: POST /checkouts → recebe `id` → monto a URL `…/checkoutSession/show?id={id}`.
 *
 * ★ CONFIRMADO no sandbox (13/07): recorrente (RECURRENT) no checkout do Asaas =
 * SÓ CARTÃO (o Asaas recusa PIX em RECURRENT; Pix só como DETACHED/avulso). Débito
 * recorrente automático via Pix = só pelo fluxo de Pix Automático (criarAutorizacao,
 * exige CNPJ 6+ meses). Então o checkout recorrente aqui é CARTÃO — auto-débito que
 * roda com CPF hoje. Ver project_repasse_livre_gateway_pagamento_woovi.
 */
export async function criarCheckout(dados: {
  userId: string;
  valorReais: number;
  descricao: string;
  successUrl: string;
  cancelUrl: string;
  cliente?: { nome?: string; email?: string; cpfCnpj?: string; telefone?: string };
}): Promise<string> {
  const hoje = new Date().toISOString().slice(0, 10);
  const r = await asaasFetch("/checkouts", {
    method: "POST",
    body: JSON.stringify({
      billingTypes: ["CREDIT_CARD"], // RECURRENT no Asaas só aceita cartão (confirmado no sandbox)
      chargeTypes: ["RECURRENT"],
      minutesToExpire: 60,
      callback: { successUrl: dados.successUrl, cancelUrl: dados.cancelUrl, expiredUrl: dados.cancelUrl },
      items: [{ name: dados.descricao, quantity: 1, value: dados.valorReais }],
      subscription: { cycle: "MONTHLY", nextDueDate: hoje },
      externalReference: dados.userId,
      customerData: dados.cliente
        ? { name: dados.cliente.nome, email: dados.cliente.email, cpfCnpj: dados.cliente.cpfCnpj, phone: dados.cliente.telefone }
        : undefined,
    }),
  });
  const raw = await r.text();
  let j: { id?: string } = {};
  try {
    j = JSON.parse(raw) as { id?: string };
  } catch {
    /* resposta não-JSON */
  }
  if (!r.ok || !j.id) throw new Error(`checkout ${r.status}: ${raw.slice(0, 700)}`);
  const dominio = AMBIENTE === "producao" ? "https://asaas.com" : "https://sandbox.asaas.com";
  return `${dominio}/checkoutSession/show?id=${j.id}`;
}

/**
 * Cria uma autorização de PIX AUTOMÁTICO (débito recorrente de verdade — o cliente
 * autoriza 1× no QR do 1º pagamento e o banco debita sozinho nas próximas).
 * `paymentCreationMode: SUBSCRIPTION` → o Asaas cria as cobranças recorrentes
 * sozinho (SEM cron do nosso lado). contractId = user_id sem hífen (máx 35 chars).
 *
 * ⚠️ A ESTRUTURA de `immediateQrCode` e do JSON de RESPOSTA (id/qrCode/payload/
 * invoiceUrl) NÃO está detalhada na doc → CONFIRMAR na 1ª chamada real do sandbox
 * e ajustar os campos abaixo. Endpoint: POST /v3/pix/automatic/authorizations.
 */
export async function criarAutorizacaoPixAutomatico(dados: {
  clienteId: string;
  userId: string;
  valorReais: number;
  descricao: string;
}): Promise<{ id: string; invoiceUrl: string | null; payload: string | null }> {
  const hoje = new Date().toISOString().slice(0, 10);
  const contractId = dados.userId.replace(/-/g, "").slice(0, 35);
  const desc = dados.descricao.slice(0, 35);
  const r = await asaasFetch("/pix/automatic/authorizations", {
    method: "POST",
    body: JSON.stringify({
      frequency: "MONTHLY",
      contractId,
      customerId: dados.clienteId,
      startDate: hoje,
      value: dados.valorReais,
      description: desc,
      paymentCreationMode: "SUBSCRIPTION", // Asaas cria as recorrentes → sem cron
      retryPolicy: "ALLOW_THREE_IN_SEVEN_DAYS", // 3 tentativas em 7 dias se falhar
      immediateQrCode: { value: dados.valorReais, description: desc }, // ⚠️ confirmar campos
    }),
  });
  const j = (await r.json()) as {
    id?: string;
    invoiceUrl?: string;
    immediateQrCode?: { invoiceUrl?: string; payload?: string; encodedImage?: string };
    qrCode?: { payload?: string };
  };
  if (!r.ok || !j.id) throw new Error(`Asaas: falha ao criar autorização Pix Automático — ${await erroDe(r)}`);
  return {
    id: j.id,
    invoiceUrl: j.invoiceUrl ?? j.immediateQrCode?.invoiceUrl ?? null,
    payload: j.immediateQrCode?.payload ?? j.qrCode?.payload ?? null,
  };
}

/** Email do cliente Asaas (fallback de casamento quando não há externalReference). */
export async function emailDoCliente(clienteId: string): Promise<string | null> {
  const r = await asaasFetch(`/customers/${clienteId}`);
  if (!r.ok) return null;
  const j = (await r.json()) as { email?: string | null };
  return j.email ?? null;
}
