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

export const ROTULO_CLASSIFICACAO_FILTRO: Record<Classificacao, string> = {
  // Bronze começa no PISO de captação (config MARGEM_MINIMA_PERCENTUAL, hoje 3%).
  // Este número acompanha o piso: se mudar o piso na config, ajuste aqui.
  // Prata/Ouro/Diamante têm limiares fixos.
  oportunidade: "Bronze 3%+",
  grande_oportunidade: "Prata 10%+",
  oportunidade_premium: "Ouro 15%+",
  top_oportunidade: "Diamante 20%+",
};

export const CLASSE_CLASSIFICACAO: Record<Classificacao, string> = {
  oportunidade: "selo-classificacao-oportunidade",
  grande_oportunidade: "selo-classificacao-grande",
  oportunidade_premium: "selo-classificacao-premium",
  top_oportunidade: "selo-classificacao-top",
};
