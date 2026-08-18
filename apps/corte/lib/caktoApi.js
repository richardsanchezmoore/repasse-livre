// Cliente da Public API da Cakto — checkout PIX nativo (damasvirtuosas.com).
// A gente cria a cobrança pela API e mostra o QR/copia-e-cola no NOSSO site,
// sem mandar a compradora pro checkout deles. O acesso continua sendo liberado
// pelo webhook existente (app/api/cakto), que dispara quando o pedido é pago.
//
// Credenciais (Vercel env, NUNCA no repo):
//   CAKTO_API_CLIENT_ID, CAKTO_API_CLIENT_SECRET
//   CAKTO_OFFER_ID  (default 3fowby7 — oferta "Como se Tornar a Mulher...")

const BASE = "https://api.cakto.com.br/public_api";

// Token OAuth em cache (expires_in ~36000s). Guardado no módulo (por instância
// serverless) — renova sozinho ~1min antes de expirar.
let _token = null;
let _exp = 0;

async function getToken() {
  const agora = Date.now();
  if (_token && agora < _exp - 60_000) return _token;

  const client_id = process.env.CAKTO_API_CLIENT_ID;
  const client_secret = process.env.CAKTO_API_CLIENT_SECRET;
  if (!client_id || !client_secret) {
    throw new Error("Cakto API: CAKTO_API_CLIENT_ID / CAKTO_API_CLIENT_SECRET ausentes");
  }

  const r = await fetch(BASE + "/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id, client_secret }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error("Cakto API token " + r.status + " " + t.slice(0, 200));
  }
  const j = await r.json();
  _token = j.access_token;
  _exp = agora + (Number(j.expires_in) || 36000) * 1000;
  return _token;
}

// Cria uma cobrança PIX. Devolve { ok, id, qrCode, amount, expiraEm } ou { ok:false, ... }.
export async function criarPix({ nome, email, cpf, telefone, fingerprint, offerId, metadata }) {
  const token = await getToken();
  const oferta = offerId || process.env.CAKTO_OFFER_ID || "3fowby7";

  const corpo = {
    paymentMethod: "pix",
    customer: {
      name: nome,
      email,
      phone: telefone,
      docType: "cpf",
      docNumber: cpf,
      // A API exige um fingerprint do dispositivo (antifraude). Não usamos o SDK
      // Nethone p/ PIX; um identificador estável por sessão já satisfaz o contrato.
      fingerprint: fingerprint || "fp_" + crypto.randomUUID(),
    },
    items: [{ offerId: oferta }],
    pixExpiresIn: 3600, // 1h pra pagar
    ...(metadata ? { metadata } : {}),
  };

  const r = await fetch(BASE + "/payments/", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
      "X-Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(corpo),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    return { ok: false, status: r.status, erro: j };
  }
  return {
    ok: true,
    id: j.id,
    refId: j.refId || null,
    amount: j.amount ?? null,
    qrCode: j.pix?.qrCode || "",
    expiraEm: j.pix?.expirationDate || null,
  };
}

// Cria uma cobrança com CARTÃO DE CRÉDITO. O token do cartão e a referência do
// antifraude vêm do SDK no browser (o número do cartão nunca toca no servidor).
// Sem 3DS (o painel da oferta está com 3DS desligado). Cobrança é síncrona:
// devolve status paid | declined | refused.
export async function criarCartao({ nome, email, cpf, telefone, fingerprint, cardToken, antifraudRef, installments, offerId, metadata }) {
  const token = await getToken();
  const oferta = offerId || process.env.CAKTO_OFFER_ID || "3fowby7";

  const corpo = {
    paymentMethod: "credit_card",
    customer: {
      name: nome,
      email,
      phone: telefone,
      docType: "cpf",
      docNumber: cpf,
      fingerprint: fingerprint || "fp_" + crypto.randomUUID(),
    },
    items: [{ offerId: oferta }],
    card: { token: cardToken },
    // ⚠️ snake_case — a API rejeita o camelCase que a doc mostra.
    antifraud_profiling_attempt_reference: antifraudRef,
    installments: Number(installments) || 1,
    ...(metadata ? { metadata } : {}),
  };

  const r = await fetch(BASE + "/payments/", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
      "X-Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(corpo),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    return { ok: false, status: r.status, erro: j };
  }
  const s = String(j.status || "").toLowerCase();
  return {
    ok: true,
    id: j.id,
    status: s,
    pago: ["paid", "approved", "completed", "authorized"].includes(s),
    amount: j.amount ?? null,
  };
}

// Consulta o status do pedido. Devolve { ok, status, pago }.
export async function statusPedido(id) {
  const token = await getToken();
  const r = await fetch(BASE + "/orders/" + encodeURIComponent(id) + "/", {
    headers: { Authorization: "Bearer " + token },
  });
  if (!r.ok) return { ok: false, status: r.status };
  const j = await r.json().catch(() => ({}));
  const s = String(j.status || "").toLowerCase();
  const pago = ["paid", "approved", "completed", "authorized"].includes(s);
  return { ok: true, status: s, pago };
}
