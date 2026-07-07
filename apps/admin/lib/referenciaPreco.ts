import { supabaseAdmin } from "@/lib/supabase";
import { NOME_POR_UF } from "@/lib/estados";
import { regiaoDoEstado, escopoDoEstado } from "@/lib/regiao";

/**
 * "Preços de referência Repasse Livre": posiciona o preço de um anúncio dentro
 * da faixa (mín/médio/máx) das NOSSAS ofertas reais do MESMO modelo
 * (codigo_fipe + ano) publicadas na plataforma. Diferente do histórico da FIPE
 * (fipeHistorico.ts) — aqui a referência são nossas ofertas, não a tabela.
 * Ver project_repasse_livre_referencia_preco_plataforma.
 *
 * ESCADA DE ESCOPO (a "média regional"): tenta o ESTADO do anúncio → cai pra
 * REGIÃO → cai pro NACIONAL, usando o escopo MAIS ESTREITO que tiver amostra
 * suficiente. Rotula honestamente o escopo usado. Cobertura por estado é rala
 * (medido 06/07), então o nacional é o piso — nenhuma página perde o painel.
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
  /** Escopo geográfico da faixa, já com preposição: "em São Paulo" | "no
   *  Sudeste" | "no Brasil". Comunica em que base a média foi calculada. */
  escopo: string;
}

/** Faixa mín/médio/máx de uma lista de preços — null se sem amostra/spread. */
function faixaDe(precos: number[]): { min: number; media: number; max: number; total: number } | null {
  if (precos.length < MIN_OFERTAS_REFERENCIA) return null;
  const ord = [...precos].sort((a, b) => a - b);
  const min = ord[0];
  const max = ord[ord.length - 1];
  if (max <= min) return null; // todas iguais → a barra não comunicaria nada
  const media = Math.round(ord.reduce((soma, p) => soma + p, 0) / ord.length);
  return { min, media, max, total: ord.length };
}

export async function buscarReferenciaPreco(
  codigoFipe: string | null,
  ano: string | null,
  fipeValorAlvo: number | null,
  estado: string | null
): Promise<ReferenciaPreco | null> {
  if (!codigoFipe || !ano) return null;

  const { data, error } = await supabaseAdmin
    .from("opportunities")
    .select("preco, fipe_valor, estado")
    .eq("status", "aprovada")
    .eq("fipe_codigo", codigoFipe)
    .eq("ano", ano);

  if (error || !data) return null;

  // Ofertas válidas (com o estado), já filtradas pela sanidade anti-código-errado:
  // só as cuja FIPE bate com a do alvo (mesmo modelo real). Sem fipe_valor no
  // alvo, não dá pra filtrar → aceita o grupo.
  const ofertas = data
    .filter((o) => {
      if (fipeValorAlvo == null || !(fipeValorAlvo > 0)) return true;
      const v = Number(o.fipe_valor);
      return Number.isFinite(v) && v > 0 && Math.abs(v - fipeValorAlvo) / fipeValorAlvo <= TOLERANCIA_FIPE;
    })
    .map((o) => ({ preco: Number(o.preco), estado: (o.estado as string | null) }))
    .filter((o) => Number.isFinite(o.preco) && o.preco > 0);

  // Escada estado → região → nacional: usa o escopo mais estreito com amostra.
  const regiaoAlvo = regiaoDoEstado(estado);
  const niveis: { itens: typeof ofertas; escopo: string }[] = [];
  if (estado) niveis.push({ itens: ofertas.filter((o) => o.estado === estado), escopo: escopoDoEstado(estado, NOME_POR_UF[estado] ?? estado) });
  if (regiaoAlvo) niveis.push({ itens: ofertas.filter((o) => regiaoDoEstado(o.estado) === regiaoAlvo), escopo: `no ${regiaoAlvo}` });
  niveis.push({ itens: ofertas, escopo: "no Brasil" });

  for (const nivel of niveis) {
    const faixa = faixaDe(nivel.itens.map((o) => o.preco));
    if (faixa) return { ...faixa, escopo: nivel.escopo };
  }
  return null;
}
