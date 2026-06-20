export const PERFIS_REMETENTE = [
  "pessoa_fisica",
  "intermediador",
  "repassador",
  "lojista",
  "investidor",
] as const;

export type PerfilRemetente = (typeof PERFIS_REMETENTE)[number];

export const ROTULO_PERFIL_REMETENTE: Record<PerfilRemetente, string> = {
  pessoa_fisica: "Pessoa física",
  intermediador: "Intermediador",
  repassador: "Repassador",
  lojista: "Lojista",
  investidor: "Investidor",
};
