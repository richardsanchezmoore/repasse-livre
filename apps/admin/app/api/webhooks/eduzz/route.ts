import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Webhook da Eduzz — libera/corta o acesso ao Repasse Livre PRO (fonte da verdade).
 *
 * ⚠️ VERSÃO DE CAPTURA (13/07): a doc da Eduzz é fragmentada (developers.eduzz +
 * Checkout Sun, formatos possivelmente diferentes). Então esta 1ª versão só CAPTURA
 * o evento real (corpo + headers) em worker_config.EDUZZ_DEBUG_ULTIMO_EVENTO e
 * responde 200 — pra eu ver o formato EXATO (nome dos eventos, campos do comprador,
 * header de assinatura HMAC) e escrever o grant/revoke correto depois. Mesmo método
 * que validou a Cakto. Ver project_repasse_livre_gateway_pagamento_woovi.
 *
 * PRÓXIMO (após o 1º teste real): validação HMAC + grant (venda paga/assinatura) /
 * revoke (reembolso/chargeback/cancelamento), casando o usuário por email do comprador
 * (ou por um parâmetro custom no link de checkout, se a Eduzz propagar).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const raw = await req.text();
  let corpo: unknown = raw;
  try {
    corpo = JSON.parse(raw);
  } catch {
    /* pode vir form-urlencoded ou outro formato — guardo cru */
  }

  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => (headers[k] = v));

  try {
    await supabaseAdmin.from("worker_config").upsert(
      {
        chave: "EDUZZ_DEBUG_ULTIMO_EVENTO",
        valor: JSON.stringify({ recebido_em: new Date().toISOString(), headers, body: corpo }).slice(0, 60000),
      },
      { onConflict: "chave" }
    );
  } catch (erro) {
    console.error("[eduzz webhook] falha ao gravar debug:", erro);
  }

  // 200 sempre nesta fase (só captura) — pra o teste da Eduzz passar.
  return NextResponse.json({ ok: true });
}

export async function GET(): Promise<Response> {
  return NextResponse.json({ ok: true, hint: "Eduzz webhook (captura). Use POST." });
}
