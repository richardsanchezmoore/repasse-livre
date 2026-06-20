import type { Classificacao } from "./classificacao";

export const MARGEM_MINIMA_PADRAO = 5;

/** Margem percentual que o preço está abaixo da FIPE. Negativo = acima da FIPE. */
export function calcularMargemPercentual(preco: number, fipeValor: number): number {
  if (fipeValor <= 0) return 0;
  return ((fipeValor - preco) / fipeValor) * 100;
}

export function ehElegivel(margemPercentual: number, margemMinima = MARGEM_MINIMA_PADRAO): boolean {
  return margemPercentual >= margemMinima;
}

export function classificar(margemPercentual: number): Classificacao | null {
  if (margemPercentual >= 20) return "top_oportunidade";
  if (margemPercentual >= 15) return "oportunidade_premium";
  if (margemPercentual >= 10) return "grande_oportunidade";
  if (margemPercentual >= 5) return "oportunidade";
  return null;
}
