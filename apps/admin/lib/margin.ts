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

// Bronze (menor medalha) começa no PISO configurado (margemMinima), não mais
// fixo em 5%. Com o piso baixado pra 3% na config, os carros 3–5% passavam no
// ehElegivel mas caíam aqui em null e eram DESCARTADOS pelos motores (segundo
// piso de 5% escondido). Prata/Ouro/Diamante seguem fixos em 10/15/20%.
export function classificar(margemPercentual: number, margemMinima = MARGEM_MINIMA_PADRAO): Classificacao | null {
  if (margemPercentual >= 20) return "top_oportunidade";
  if (margemPercentual >= 15) return "oportunidade_premium";
  if (margemPercentual >= 10) return "grande_oportunidade";
  if (margemPercentual >= margemMinima) return "oportunidade";
  return null;
}
