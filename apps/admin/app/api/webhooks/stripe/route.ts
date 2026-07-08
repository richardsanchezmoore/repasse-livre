import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { sincronizarAssinatura } from "@/lib/assinatura";

/**
 * Webhook do Stripe — a ÚNICA fonte da verdade que libera/renova/revoga o
 * premium (o checkout no front só inicia o pagamento). Verifica a assinatura
 * HMAC do payload com STRIPE_WEBHOOK_SECRET (fail-closed) e espelha o estado da
 * subscription no perfil. Precisa do corpo CRU (req.text()) pra validar a
 * assinatura — por isso runtime nodejs e sem parse antes.
 *
 * Configurar no Stripe: endpoint https://<site>/api/webhooks/stripe, eventos
 * checkout.session.completed + customer.subscription.created/updated/deleted.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const segredo = process.env.STRIPE_WEBHOOK_SECRET;
  if (!segredo) return NextResponse.json({ erro: "webhook_nao_configurado" }, { status: 500 });

  const assinaturaHeader = req.headers.get("stripe-signature");
  if (!assinaturaHeader) return NextResponse.json({ erro: "sem_assinatura" }, { status: 400 });

  const corpo = await req.text();
  let evento: Stripe.Event;
  try {
    evento = getStripe().webhooks.constructEvent(corpo, assinaturaHeader, segredo);
  } catch (err) {
    console.error("[stripe-webhook] assinatura inválida:", err);
    return NextResponse.json({ erro: "assinatura_invalida" }, { status: 400 });
  }

  try {
    switch (evento.type) {
      case "checkout.session.completed": {
        const sessao = evento.data.object as Stripe.Checkout.Session;
        if (sessao.subscription) {
          const subId = typeof sessao.subscription === "string" ? sessao.subscription : sessao.subscription.id;
          const sub = await getStripe().subscriptions.retrieve(subId);
          await sincronizarAssinatura(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await sincronizarAssinatura(evento.data.object as Stripe.Subscription);
        break;
      }
      default:
        break;
    }
  } catch (erro) {
    // 500 → o Stripe re-tenta a entrega (idempotente: sincronizar é um update).
    console.error(`[stripe-webhook] erro processando ${evento.type}:`, erro);
    return NextResponse.json({ erro: "falha_processamento" }, { status: 500 });
  }

  return NextResponse.json({ recebido: true });
}
