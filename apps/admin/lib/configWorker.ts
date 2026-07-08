import { supabaseAdmin } from "@/lib/supabase";
import { MARGEM_MINIMA_PADRAO } from "@/lib/margin";

/**
 * Piso de margem de captação — a config `worker_config.MARGEM_MINIMA_PERCENTUAL`
 * que o Motor de Descoberta lê no início de cada varredura. Server-only (usa a
 * service role). Fallback: MARGEM_MINIMA_PADRAO (5) quando a chave não foi
 * configurada. Usado pra deixar o rótulo do filtro ("Bronze X%+") acompanhar o
 * piso automaticamente — ver rotuloClassificacaoFiltro em lib/classificacao.ts.
 */
export async function buscarPisoMargem(): Promise<number> {
  const { data } = await supabaseAdmin
    .from("worker_config")
    .select("valor")
    .eq("chave", "MARGEM_MINIMA_PERCENTUAL")
    .maybeSingle();
  const n = Number(data?.valor);
  return Number.isFinite(n) && n > 0 ? n : MARGEM_MINIMA_PADRAO;
}

/** Limite (%) a partir do qual a oferta é PREMIUM — fica atrás do overlay pra
 *  quem não é premium/admin. Config `worker_config.MARGEM_PREMIUM_PERCENTUAL`;
 *  default 10% (trava Prata+ e deixa Bronze 3–10% livre). Server-only. */
export const MARGEM_PREMIUM_PADRAO = 10;
export async function buscarMargemPremium(): Promise<number> {
  const { data } = await supabaseAdmin
    .from("worker_config")
    .select("valor")
    .eq("chave", "MARGEM_PREMIUM_PERCENTUAL")
    .maybeSingle();
  const n = Number(data?.valor);
  return Number.isFinite(n) && n > 0 ? n : MARGEM_PREMIUM_PADRAO;
}

/**
 * Price id do plano premium no Stripe. Vem do painel (`worker_config.
 * STRIPE_PRICE_ID`) pra trocar de plano/preço SEM deploy; cai no env
 * `STRIPE_PRICE_ID` como fallback. null = ainda não configurado. Server-only.
 */
export async function buscarStripePriceId(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("worker_config")
    .select("valor")
    .eq("chave", "STRIPE_PRICE_ID")
    .maybeSingle();
  const doPainel = (data?.valor ?? "").trim();
  if (doPainel) return doPainel;
  const doEnv = (process.env.STRIPE_PRICE_ID ?? "").trim();
  return doEnv || null;
}
