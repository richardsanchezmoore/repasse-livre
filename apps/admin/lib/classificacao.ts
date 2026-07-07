export const CLASSIFICACOES = [
  "oportunidade",
  "grande_oportunidade",
  "oportunidade_premium",
  "top_oportunidade",
] as const;

export type Classificacao = (typeof CLASSIFICACOES)[number];

export const ROTULO_CLASSIFICACAO: Record<Classificacao, string> = {
  oportunidade: "Bronze",
  grande_oportunidade: "Prata",
  oportunidade_premium: "Ouro",
  top_oportunidade: "Diamante",
};

// Limiar de cada medalha pro rótulo do filtro. Bronze é DINÂMICO (null → usa o
// piso de captação, config MARGEM_MINIMA_PERCENTUAL) — assim o label acompanha
// sozinho qualquer mudança do piso. Prata/Ouro/Diamante têm limiares fixos.
const LIMIAR_MEDALHA: Record<Classificacao, number | null> = {
  oportunidade: null,
  grande_oportunidade: 10,
  oportunidade_premium: 15,
  top_oportunidade: 20,
};

/**
 * Rótulo do filtro de margem, ex.: "Bronze 3%+". Bronze usa o `piso` de captação
 * (dinâmico, vindo da config); as medalhas superiores têm limiares fixos.
 */
export function rotuloClassificacaoFiltro(classificacao: Classificacao, piso: number): string {
  const limiar = LIMIAR_MEDALHA[classificacao] ?? piso;
  return `${ROTULO_CLASSIFICACAO[classificacao]} ${limiar}%+`;
}

export const CLASSE_CLASSIFICACAO: Record<Classificacao, string> = {
  oportunidade: "selo-classificacao-oportunidade",
  grande_oportunidade: "selo-classificacao-grande",
  oportunidade_premium: "selo-classificacao-premium",
  top_oportunidade: "selo-classificacao-top",
};
