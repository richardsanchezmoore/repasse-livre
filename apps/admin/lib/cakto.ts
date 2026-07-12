import "server-only";

/**
 * Cliente da API da Cakto (gateway de pagamento Pix-first do Clube BIA).
 * Auth = OAuth2: POST /public_api/token/ com client_id+client_secret
 * (x-www-form-urlencoded) → access_token JWT (Bearer), validade ~10h.
 * As credenciais vivem SÓ no ambiente (Vercel): CAKTO_CLIENT_ID / CAKTO_CLIENT_SECRET.
 * Ver project_repasse_livre_gateway_pagamento_woovi (Cakto).
 */

const BASE = "https://api.cakto.com.br/public_api";

let cache: { token: string; expiraEm: number } | null = null;

async function obterToken(): Promise<string> {
  // Reusa o token em memória enquanto válido (com 1 min de folga).
  if (cache && Date.now() < cache.expiraEm - 60_000) return cache.token;

  const clientId = process.env.CAKTO_CLIENT_ID;
  const clientSecret = process.env.CAKTO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("CAKTO_CLIENT_ID / CAKTO_CLIENT_SECRET não configurados no ambiente.");
  }

  const resposta = await fetch(`${BASE}/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret }),
  });
  if (!resposta.ok) {
    throw new Error(`Cakto: falha ao obter token (${resposta.status}).`);
  }
  const dados = (await resposta.json()) as { access_token: string; expires_in?: number };
  cache = {
    token: dados.access_token,
    expiraEm: Date.now() + (dados.expires_in ?? 36000) * 1000,
  };
  return cache.token;
}

/**
 * Chamada autenticada à API da Cakto. `caminho` começa com "/" (ex.: "/subscriptions/").
 * Renova o token sozinho. Devolve a Response crua (o chamador decide o parse).
 */
export async function caktoFetch(caminho: string, init: RequestInit = {}): Promise<Response> {
  const token = await obterToken();
  return fetch(`${BASE}${caminho}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}
