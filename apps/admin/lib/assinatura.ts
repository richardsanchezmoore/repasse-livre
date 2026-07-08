import "server-only";
import type Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe";

/**
 * Fim do período pago da assinatura, em ISO. O campo mudou de lugar entre
 * versões da API do Stripe (topo da subscription → item), então lê dos dois.
 */
function fimDoPeriodo(sub: Stripe.Subscription): string | null {
  const item = sub.items?.data?.[0] as { current_period_end?: number } | undefined;
  const epoch = item?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end;
  return epoch ? new Date(epoch * 1000).toISOString() : null;
}

/**
 * Espelha o estado de uma assinatura do Stripe na linha do perfil (achada pelo
 * stripe_customer_id). Chamado pelo webhook em todo evento de subscription.
 * Escreve via service role (o webhook não tem sessão de usuário).
 */
export async function sincronizarAssinatura(sub: Stripe.Subscription): Promise<void> {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const { error } = await supabaseAdmin
    .from("perfis")
    .update({
      stripe_subscription_id: sub.id,
      assinatura_status: sub.status,
      premium_expira_em: fimDoPeriodo(sub),
    })
    .eq("stripe_customer_id", customerId);
  if (error) {
    throw new Error(`Falha ao sincronizar assinatura ${sub.id}: ${error.message}`);
  }
}

/**
 * Garante um Stripe Customer pro usuário e devolve o id, salvando no perfil na
 * primeira vez (assim o webhook consegue casar customer → usuário depois).
 */
export async function garantirClienteStripe(userId: string, email: string | null): Promise<string> {
  const { data: perfil } = await supabaseAdmin
    .from("perfis")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .single();

  if (perfil?.stripe_customer_id) return perfil.stripe_customer_id as string;

  const customer = await getStripe().customers.create({
    email: email ?? undefined,
    metadata: { user_id: userId },
  });
  const { error } = await supabaseAdmin
    .from("perfis")
    .update({ stripe_customer_id: customer.id })
    .eq("user_id", userId);
  if (error) {
    throw new Error(`Falha ao salvar stripe_customer_id: ${error.message}`);
  }
  return customer.id;
}
