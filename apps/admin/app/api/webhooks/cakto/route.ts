import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Webhook da Cakto — FASE 1: CAPTURA.
 *
 * A doc da Cakto NÃO publica o exemplo de payload nem o método de validação do
 * `secret`, então este endpoint só REGISTRA o evento cru (headers + body) em
 * `worker_config.CAKTO_DEBUG_ULTIMO_EVENTO` pra inspeção — assim mapeamos a
 * liberação de premium em cima do que a Cakto REALMENTE manda (identidade do
 * comprador, id da assinatura, datas, onde vem o secret), sem chutar campos.
 *
 * FASE 2 (depois de ver um evento de teste real): validar o secret + traduzir os
 * eventos (subscription_created/renewed → premium ON; canceled/renewal_refused/
 * refund/chargeback → premium OFF) reusando a lógica agnóstica de assinatura.
 *
 * Esta fase NÃO concede acesso a ninguém — é seguro capturar sem validar ainda.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const raw = await req.text();

  const headers: Record<string, string> = {};
  req.headers.forEach((valor, chave) => {
    headers[chave] = valor;
  });

  let body: unknown = raw;
  try {
    body = JSON.parse(raw);
  } catch {
    // mantém o texto cru se não for JSON
  }

  const evento = { recebido_em: new Date().toISOString(), headers, body };

  try {
    await supabaseAdmin
      .from("worker_config")
      .upsert(
        { chave: "CAKTO_DEBUG_ULTIMO_EVENTO", valor: JSON.stringify(evento).slice(0, 60000) },
        { onConflict: "chave" }
      );
  } catch (erro) {
    console.error("[cakto webhook] falha ao gravar debug:", erro);
  }

  const tipo = (body as { event?: string; type?: string })?.event ?? (body as { type?: string })?.type ?? "desconhecido";
  console.log(`[cakto webhook] evento capturado: ${tipo}`);

  // 200 rápido pra Cakto não re-tentar.
  return NextResponse.json({ ok: true });
}

// Alguns painéis validam o endpoint com um GET — responde 200.
export async function GET(): Promise<Response> {
  return NextResponse.json({ ok: true, hint: "Cakto webhook (captura). Use POST." });
}
