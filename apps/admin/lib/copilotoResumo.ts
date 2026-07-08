/**
 * Prévia do parecer do Copiloto p/ o teaser dos não-pagos: tira o **negrito**,
 * colapsa espaços e corta em ~180 caracteres (≈2 linhas) numa fronteira de
 * palavra. SÓ ISSO pode ir pro cliente — o parecer inteiro é item do plano pago
 * e nunca deve ser serializado no payload (senão vaza via "inspecionar"). Ver
 * project_repasse_livre_premium_monetizacao.
 */
export function resumirParecer(parecer: string | null): string | null {
  if (!parecer) return null;
  const limpo = parecer.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
  if (limpo.length <= 180) return limpo;
  const corte = limpo.slice(0, 180);
  const ultimoEspaco = corte.lastIndexOf(" ");
  return `${corte.slice(0, ultimoEspaco > 120 ? ultimoEspaco : 180).trimEnd()}…`;
}

/**
 * Zera o parecer completo antes do objeto ir pra um componente client (cards,
 * botão compartilhar): `select("*")` traz a coluna, e o Next serializa TODAS as
 * props no payload RSC — sem isto, o parecer (item pago) vazaria via inspeção.
 * Os cards não usam o parecer, então some sem efeito colateral.
 */
export function semParecer<T extends { copiloto_parecer: string | null }>(linhas: T[]): T[] {
  return linhas.map((l) => (l.copiloto_parecer === null ? l : { ...l, copiloto_parecer: null }));
}
