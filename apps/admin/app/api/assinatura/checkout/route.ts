import { NextResponse } from "next/server";
import { obterUsuarioAtual } from "@/lib/supabase-server";
import { getStripe, precoPremiumId } from "@/lib/stripe";
import { garantirClienteStripe } from "@/lib/assinatura";

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

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  try {
    const customerId = await garantirClienteStripe(usuario.id, usuario.email);
    const sessao = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: precoPremiumId(), quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${site}/planos?assinatura=sucesso`,
      cancel_url: `${site}/planos?assinatura=cancelado`,
      subscription_data: { metadata: { user_id: usuario.id } },
      metadata: { user_id: usuario.id },
    });
    return NextResponse.json({ url: sessao.url });
  } catch (erro) {
    console.error("[assinatura/checkout] falha:", erro);
    return NextResponse.json({ erro: "falha_checkout" }, { status: 500 });
  }
}
