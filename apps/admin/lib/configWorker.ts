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

/** UUID de qualquer coisa que o admin colar: a URL inteira do anúncio ou o ID cru. */
const RX_UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
export function extrairIdOportunidade(bruto: string): string | null {
  const m = (bruto ?? "").trim().match(RX_UUID);
  return m ? m[0] : null;
}

/**
 * ID do ANÚNCIO-ÂNCORA — a oferta REAL que o visitante "experimenta" na /planos e
 * na /planos-slim (Copiloto e acesso liberados, exceção de marketing pra UM anúncio).
 * Vem do painel (`worker_config.DEMO_OPPORTUNITY_ID`); o admin cola a URL ou o ID cru.
 * null = sem âncora (a /planos cai no card de exemplo estático). Server-only.
 *
 * ⚠️ NÃO confundir com PRECO_ANCORA (o valor riscado da oferta) — moram na mesma aba
 * do painel e a palavra "âncora" colide. Aqui é ANÚNCIO; lá é PREÇO.
 */
export async function buscarDemoOportunidadeId(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("worker_config")
    .select("valor")
    .eq("chave", "DEMO_OPPORTUNITY_ID")
    .maybeSingle();
  return extrairIdOportunidade(data?.valor ?? "");
}

/** Um anúncio de campanha: a URL que o criativo do ADS aponta. */
export interface AnuncioAds {
  /** URL da página do anúncio (ou o ID cru) — o que o admin colou. */
  url: string;
  /** Rótulo livre pra se achar no painel ("Corolla XEi 18%", "teste Meta jul"). */
  rotulo: string;
}

/**
 * ANÚNCIOS DE CAMPANHA (ADS) — `worker_config.ADS_OPORTUNIDADES`, JSON:
 * `[{ "url": "...", "rotulo": "..." }]`.
 *
 * A tese do user: o criativo do anúncio é o CARRO, não a plataforma. A pessoa clica
 * porque quer ver um bom negócio; ao entrar, encontra a análise completa (Referência
 * de Preço, Copiloto, Comparativos, BIA) e só então descobre a plataforma por trás.
 * Por isso TODA URL cadastrada aqui tem a área premium LIBERADA — o visitante frio
 * precisa ver o produto inteiro pra a assinatura virar decisão lógica.
 *
 * Diferença pro ANÚNCIO-ÂNCORA (DEMO_OPPORTUNITY_ID): a âncora é UM só e alimenta o
 * modal "Experimente agora" da /planos e da /planos-slim. Estes aqui são os destinos
 * das campanhas — vários, e é sobre eles que os gatilhos de overlay vão agir (a fazer).
 * A âncora também fica liberada; ver `buscarIdsLiberados`. Server-only.
 */
export async function buscarAnunciosAds(): Promise<AnuncioAds[]> {
  const { data } = await supabaseAdmin
    .from("worker_config")
    .select("valor")
    .eq("chave", "ADS_OPORTUNIDADES")
    .maybeSingle();
  try {
    const v: unknown = JSON.parse((data?.valor ?? "[]").trim() || "[]");
    if (!Array.isArray(v)) return [];
    return (v as AnuncioAds[])
      .filter((a) => a && typeof a.url === "string" && extrairIdOportunidade(a.url))
      .map((a) => ({ url: a.url.trim(), rotulo: (a.rotulo ?? "").trim() }));
  } catch {
    return []; // config inválida → nenhum liberado (fail-closed: nunca abre premium por erro de parse)
  }
}

/**
 * ★ CONJUNTO DE IDs COM A ÁREA PREMIUM LIBERADA = âncora + campanhas.
 *
 * É a exceção de marketing: estes anúncios mostram Copiloto e acesso completo a
 * QUALQUER visitante, logado ou não. Fora desta lista, nada muda — o gate premium
 * normal continua valendo. **Fail-closed por desenho**: qualquer erro de leitura ou
 * JSON inválido devolve conjunto VAZIO, nunca "libera tudo".
 *
 * Uma consulta só (a página do anúncio é dinâmica e roda isso por request).
 */
export async function buscarIdsLiberados(): Promise<Set<string>> {
  const liberados = new Set<string>();
  const { data } = await supabaseAdmin
    .from("worker_config")
    .select("chave, valor")
    .in("chave", ["DEMO_OPPORTUNITY_ID", "ADS_OPORTUNIDADES"]);

  for (const linha of data ?? []) {
    if (linha.chave === "DEMO_OPPORTUNITY_ID") {
      const id = extrairIdOportunidade(linha.valor ?? "");
      if (id) liberados.add(id);
    } else if (linha.chave === "ADS_OPORTUNIDADES") {
      try {
        const v: unknown = JSON.parse((linha.valor ?? "[]").trim() || "[]");
        if (!Array.isArray(v)) continue;
        for (const a of v as AnuncioAds[]) {
          const id = extrairIdOportunidade(a?.url ?? "");
          if (id) liberados.add(id);
        }
      } catch {
        /* JSON inválido → ignora a lista; a âncora segue valendo */
      }
    }
  }
  return liberados;
}

/**
 * Janela (dias) dos KPIs "Ofertas mapeadas" E "Economia de mercado"
 * (`worker_config.KPI_MAPEADAS_DIAS`, 7|15|30; default 7). Controlado no painel.
 */
export async function buscarKpiMapeadasDias(): Promise<number> {
  const { data } = await supabaseAdmin
    .from("worker_config")
    .select("valor")
    .eq("chave", "KPI_MAPEADAS_DIAS")
    .maybeSingle();
  const n = Number(data?.valor);
  return [7, 15, 30].includes(n) ? n : 7;
}

/**
 * Janela (horas) do KPI "Novos" (`worker_config.KPI_NOVOS_HORAS`, 24|48|72|168;
 * default 24). Independente da janela de mapeadas. Controlado no painel.
 */
export async function buscarKpiNovosHoras(): Promise<number> {
  const { data } = await supabaseAdmin
    .from("worker_config")
    .select("valor")
    .eq("chave", "KPI_NOVOS_HORAS")
    .maybeSingle();
  const n = Number(data?.valor);
  return [24, 48, 72, 168].includes(n) ? n : 24;
}

/**
 * Gateway de pagamento ATIVO (`worker_config.GATEWAY_ATIVO`): "cakto" | "stripe" |
 * "asaas" | "" (nenhum). É o que o CTA de assinatura usa. Trocar = um clique no
 * painel Sistemas de Pagamento; os outros ficam codados e prontos. Server-only.
 */
export async function buscarGatewayAtivo(): Promise<string> {
  const { data } = await supabaseAdmin
    .from("worker_config")
    .select("valor")
    .eq("chave", "GATEWAY_ATIVO")
    .maybeSingle();
  return (data?.valor ?? "").trim().toLowerCase();
}

/**
 * URL de checkout do Clube BIA na Cakto (`worker_config.CAKTO_CHECKOUT_URL`, ex.:
 * https://pay.cakto.com.br/{oferta}). O CTA manda o usuário logado pra cá com
 * `?sck={user_id}` — é o que faz o pagamento voltar amarrado à conta no webhook.
 * null = não configurado → o CTA cai no fluxo antigo. Server-only.
 * Ver project_repasse_livre_gateway_pagamento_woovi (Cakto).
 */
export async function buscarCaktoCheckoutUrl(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("worker_config")
    .select("valor")
    .eq("chave", "CAKTO_CHECKOUT_URL")
    .maybeSingle();
  const url = (data?.valor ?? "").trim();
  return url.startsWith("http") ? url : null;
}

/**
 * URL de checkout do Repasse Livre PRO na Ticto (`worker_config.TICTO_CHECKOUT_URL`).
 * Mesmo padrão da Cakto: o CTA manda o usuário logado pra cá com `?sck={user_id}`
 * (a Ticto propaga em `tracking.sck` no webhook). null = não configurado. Server-only.
 */
export async function buscarTictoCheckoutUrl(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("worker_config")
    .select("valor")
    .eq("chave", "TICTO_CHECKOUT_URL")
    .maybeSingle();
  const url = (data?.valor ?? "").trim();
  return url.startsWith("http") ? url : null;
}

/**
 * Preço-âncora (SÓ VISUAL) mostrado riscado na /planos — o "De R$ X" que a
 * oferta de lançamento risca ao lado do valor real cobrado pelo Stripe. Vem do
 * painel (`worker_config.PRECO_ANCORA`, em reais, ex.: "249") pra ajustar a
 * promoção sem deploy; formatado em BRL na exibição. null = sem âncora (a
 * página some com o riscado). NÃO cobra nada — o valor real é o do Stripe.
 * Devolve o texto formatado + os centavos (pra calcular o % OFF do contador). Server-only.
 */
export async function buscarPrecoAncora(): Promise<{ texto: string; centavos: number } | null> {
  const { data } = await supabaseAdmin
    .from("worker_config")
    .select("valor")
    .eq("chave", "PRECO_ANCORA")
    .maybeSingle();
  const n = Number((data?.valor ?? "").replace(/[^\d.,]/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  const texto = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
    .format(n)
    .replace(/,00$/, "");
  return { texto, centavos: Math.round(n * 100) };
}

/**
 * Número de WhatsApp de suporte/vendas (só dígitos, com DDI 55) exibido na
 * página de planos pra destravar dúvida antes de assinar. Vem do painel
 * (`worker_config.WHATSAPP_SUPORTE`) pra trocar sem deploy. null = não
 * configurado → o botão nem aparece. Server-only.
 */
export async function buscarWhatsappSuporte(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("worker_config")
    .select("valor")
    .eq("chave", "WHATSAPP_SUPORTE")
    .maybeSingle();
  const numero = (data?.valor ?? "").replace(/\D/g, "");
  return numero || null;
}
