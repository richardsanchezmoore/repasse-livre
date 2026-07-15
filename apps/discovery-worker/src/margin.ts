import type { Classificacao } from "./types.js";

export const MARGEM_MINIMA_PADRAO = 5;

/**
 * TETO de margem suspeita (regra GERAL, todas as fontes). Margem ACIMA disso é
 * quase certo FALSO ALARME — não é oportunidade real, é ou FIPE errada ou preço
 * incompleto no anúncio (o clássico: o anunciante põe o valor da PARCELA de um
 * carro 100% financiado como se fosse o preço → 96% "abaixo da FIPE"). Cada
 * PROCESSO de worker chama `definirTetoSuspeita` uma vez com o valor da config
 * (MARGEM_MAX_SUSPEITA, default 50). Sem chamar → Infinity = sem teto (compat).
 * O FB tem teto PRÓPRIO, mais rígido (FACEBOOK_MARGEM_MAX_SUSPEITA), aplicado lá.
 */
let TETO_SUSPEITA = Number.POSITIVE_INFINITY;
export function definirTetoSuspeita(valor: number): void {
  if (Number.isFinite(valor) && valor > 0) TETO_SUSPEITA = valor;
}

/** Margem percentual que o preço está abaixo da FIPE. Negativo = acima da FIPE. */
export function calcularMargemPercentual(preco: number, fipeValor: number): number {
  if (fipeValor <= 0) return 0;
  return ((fipeValor - preco) / fipeValor) * 100;
}

export function ehElegivel(margemPercentual: number, margemMinima = MARGEM_MINIMA_PADRAO): boolean {
  return margemPercentual >= margemMinima && margemPercentual <= TETO_SUSPEITA;
}

// Bronze (menor medalha) começa no PISO configurado (margemMinima), não mais
// fixo em 5%. Com o piso baixado pra 3% na config, os carros 3–5% passavam no
// ehElegivel mas caíam aqui em null e eram DESCARTADOS pelos motores (segundo
// piso de 5% escondido). Prata/Ouro/Diamante seguem fixos em 10/15/20%.
export function classificar(margemPercentual: number, margemMinima = MARGEM_MINIMA_PADRAO): Classificacao | null {
  if (margemPercentual > TETO_SUSPEITA) return null; // margem suspeita: nem classifica
  if (margemPercentual >= 20) return "top_oportunidade";
  if (margemPercentual >= 15) return "oportunidade_premium";
  if (margemPercentual >= 10) return "grande_oportunidade";
  if (margemPercentual >= margemMinima) return "oportunidade";
  return null;
}
