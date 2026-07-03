import { supabaseAdmin } from "@/lib/supabase";

/**
 * "Preços de referência Repasse Livre": posiciona o preço de um anúncio dentro
 * da faixa (mín/médio/máx) das NOSSAS ofertas reais do MESMO modelo
 * (codigo_fipe + ano) publicadas na plataforma. Diferente do histórico da FIPE
 * (fipeHistorico.ts) — aqui a referência são nossas ofertas, não a tabela.
 * Ver project_repasse_livre_referencia_preco_plataforma.
 *
 * SERVER-ONLY (usa supabaseAdmin / service role) — nunca importar de um
 * componente "use client"; a barra recebe os dados prontos por props.
 */

// Piso pra a faixa fazer sentido: com 3 ofertas já temos mín/médio/máx. Abaixo
// disso (a maioria dos modelos, cauda longa de 1-2 ofertas) a UI esconde o
// painel. ~45% das páginas têm ofertas suficientes com este piso (medido 03/07).
const MIN_OFERTAS_REFERENCIA = 3;

// O fipe_codigo às vezes é mal-atribuído (fuzzy casa "Discovery Sport" no código
// do "Discovery" full) → o grupo mistura modelos diferentes e a faixa vira lixo.
// Como o fipe_valor de cada oferta é o FIPE EXATO daquele veículo, exigir que ele
// bata (± tolerância, p/ absorver a virada mensal da FIPE) com o do anúncio-alvo
// filtra os contaminantes: mesmo modelo real → mesma FIPE.
const TOLERANCIA_FIPE = 0.08;

export interface ReferenciaPreco {
  min: number;
  media: number;
  max: number;
  /** Quantas ofertas do modelo entraram na faixa. */
  total: number;
}

export async function buscarReferenciaPreco(
  codigoFipe: string | null,
  ano: string | null,
  fipeValorAlvo: number | null
): Promise<ReferenciaPreco | null> {
  if (!codigoFipe || !ano) return null;

  const { data, error } = await supabaseAdmin
    .from("opportunities")
    .select("preco, fipe_valor")
    .eq("status", "aprovada")
    .eq("fipe_codigo", codigoFipe)
    .eq("ano", ano);

  if (error || !data) return null;

  const precos = data
    // Sanidade anti-código-errado: só ofertas cuja FIPE bate com a do alvo (mesmo
    // modelo real). Sem fipe_valor no alvo, não dá pra filtrar → aceita o grupo.
    .filter((o) => {
      if (fipeValorAlvo == null || !(fipeValorAlvo > 0)) return true;
      const v = Number(o.fipe_valor);
      return Number.isFinite(v) && v > 0 && Math.abs(v - fipeValorAlvo) / fipeValorAlvo <= TOLERANCIA_FIPE;
    })
    .map((o) => Number(o.preco))
    .filter((p) => Number.isFinite(p) && p > 0)
    .sort((a, b) => a - b);
  if (precos.length < MIN_OFERTAS_REFERENCIA) return null;

  const min = precos[0];
  const max = precos[precos.length - 1];
  // Todas iguais → sem faixa; a barra não comunicaria nada. Esconde.
  if (max <= min) return null;

  const media = Math.round(precos.reduce((soma, p) => soma + p, 0) / precos.length);
  return { min, media, max, total: precos.length };
}
