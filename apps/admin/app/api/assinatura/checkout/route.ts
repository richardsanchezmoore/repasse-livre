import { NextResponse } from "next/server";
import { obterUsuarioAtual } from "@/lib/supabase-server";
import { getStripe } from "@/lib/stripe";
import { buscarStripePriceId } from "@/lib/configWorker";
import { garantirClienteStripe } from "@/lib/assinatura";
import { URL_BASE_SITE } from "@/lib/site";

/**
 * Inicia o checkout de assinatura (Stripe Checkout, mode subscription). Exige
 * usuário logado (a assinatura fica atrelada à conta). Devolve a URL hospedada
 * do Stripe; o front redireciona. A liberação do premium NÃO acontece aqui — é
 * o webhook (checkout.session.completed / subscription.*) que espelha o status.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  const usuario = await obterUsuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "nao_logado" }, { status: 401 });

  const priceId = await buscarStripePriceId();
  if (!priceId) return NextResponse.json({ erro: "preco_nao_configurado" }, { status: 500 });

  try {
    const customerId = await garantirClienteStripe(usuario.id, usuario.email);
    const sessao = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${URL_BASE_SITE}/planos?assinatura=sucesso`,
      cancel_url: `${URL_BASE_SITE}/planos?assinatura=cancelado`,
      subscription_data: { metadata: { user_id: usuario.id } },
      metadata: { user_id: usuario.id },
    });
    return NextResponse.json({ url: sessao.url });
  } catch (erro) {
    console.error("[assinatura/checkout] falha:", erro);
    return NextResponse.json({ erro: "falha_checkout" }, { status: 500 });
  }
}
