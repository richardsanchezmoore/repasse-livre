import "server-only";
import type Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe";
import { buscarStripePriceId, buscarGatewayAtivo } from "@/lib/configWorker";

export interface PrecoExibicao {
  /** Ex.: "R$ 99" (sem centavos quando redondo). */
  valor: string;
  /** Ex.: "/mês" | "/ano". */
  intervalo: string;
  /** Valor cru em centavos (pra calcular equivalentes de planos mais longos). */
  centavos: number;
}

const PRECO_FALLBACK: PrecoExibicao = { valor: "R$ 97", intervalo: "/mês", centavos: 9700 };

function formatarPreco(centavos: number, intervalo: string): PrecoExibicao {
  const formatado = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
    .format(centavos / 100)
    .replace(/,00$/, ""); // "R$ 97,00" → "R$ 97"
  return { valor: formatado, intervalo, centavos };
}

/**
 * Preço a EXIBIR na /planos — GATEWAY-AWARE (não hardcode):
 *  - gateway ativo = Stripe → vem do próprio Stripe (Price ID, fonte única).
 *  - Cakto/Ticto/Asaas/nenhum → vem da config `PRECO_MENSAL` (em reais), editável
 *    no painel; deve BATER com o que o gateway ativo cobra. É também a base do
 *    "% OFF" do contador. Cai num fallback se nada configurado.
 *
 * ★ SEM CACHE DE PROCESSO (tinha 5min; removido). Motivo: ele existia pra não bater
 * no Stripe (`prices.retrieve`) a cada render — mas a /planos e a /planos-slim agora
 * são ESTÁTICAS (ISR 900s), então já renderizam no máximo 1x por janela e o cache não
 * protegia mais nada. Pior: ele ANULAVA o `revalidatePath` do painel — a página
 * regenerava na hora e lia o preço velho da memória (e, sendo por-instância, nem dava
 * pra limpar de fora: quem salva pode estar noutra instância de quem renderiza).
 * Se um dia a /planos voltar a ser dinâmica COM gateway=stripe, o cache precisa voltar.
 */
export async function buscarPrecoExibicao(): Promise<PrecoExibicao> {
  try {
    let valor: PrecoExibicao | null = null;
    const gateway = await buscarGatewayAtivo();

    if (gateway === "stripe") {
      const priceId = await buscarStripePriceId();
      if (priceId) {
        const preco = await getStripe().prices.retrieve(priceId);
        if (preco.unit_amount && preco.currency) {
          valor = formatarPreco(preco.unit_amount, preco.recurring?.interval === "year" ? "/ano" : "/mês");
        }
      }
    } else {
      const { data } = await supabaseAdmin
        .from("worker_config")
        .select("valor")
        .eq("chave", "PRECO_MENSAL")
        .maybeSingle();
      const n = Number((data?.valor ?? "").replace(",", "."));
      if (Number.isFinite(n) && n > 0) valor = formatarPreco(Math.round(n * 100), "/mês");
    }

    return valor ?? PRECO_FALLBACK;
  } catch {
    return PRECO_FALLBACK;
  }
}

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
