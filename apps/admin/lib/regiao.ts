/**
 * UF → macrorregião (IBGE). Usado pela ESCADA DE ESCOPO da Referência de Preço
 * (estado → região → nacional): quando o estado sozinho tem poucas ofertas de um
 * modelo, a região dá amostra suficiente pra a faixa de preço fazer sentido —
 * sem cair direto pro nacional. Ver project_repasse_livre_referencia_preco_plataforma.
 */
export const REGIAO_POR_UF: Record<string, string> = {
  AC: "Norte", AP: "Norte", AM: "Norte", PA: "Norte", RO: "Norte", RR: "Norte", TO: "Norte",
  AL: "Nordeste", BA: "Nordeste", CE: "Nordeste", MA: "Nordeste", PB: "Nordeste",
  PE: "Nordeste", PI: "Nordeste", RN: "Nordeste", SE: "Nordeste",
  DF: "Centro-Oeste", GO: "Centro-Oeste", MT: "Centro-Oeste", MS: "Centro-Oeste",
  ES: "Sudeste", MG: "Sudeste", RJ: "Sudeste", SP: "Sudeste",
  PR: "Sul", RS: "Sul", SC: "Sul",
};

export function regiaoDoEstado(uf: string | null | undefined): string | null {
  return uf ? REGIAO_POR_UF[uf] ?? null : null;
}

// Preposição correta por estado pro rótulo do escopo ("na Bahia", "no Rio de
// Janeiro", "em São Paulo"). Default "em"; só listamos os "no"/"na".
const PREP_POR_UF: Record<string, "no" | "na"> = {
  BA: "na", PB: "na",
  RJ: "no", RS: "no", RN: "no", PR: "no", ES: "no", AM: "no", CE: "no", MA: "no",
  PA: "no", PI: "no", AC: "no", AP: "no", TO: "no", MT: "no", MS: "no", DF: "no",
};

/** Frase de escopo do estado com a preposição certa (ex.: "na Bahia"). */
export function escopoDoEstado(uf: string, nome: string): string {
  return `${PREP_POR_UF[uf] ?? "em"} ${nome}`;
}
