export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function formatarMoeda(digitos: string): string {
  if (!digitos) return "";
  return Number(digitos).toLocaleString("pt-BR");
}

export function formatarWhatsapp(digitos: string): string {
  const d = digitos.slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// Telefones em descrições captadas de outras plataformas (OLX etc.) não
// devem aparecer aqui — só nossos anunciantes (inserção direta) têm contato
// exposto. Casa sequências de 10-11 dígitos (com DDD), com ou sem
// parênteses/espaço/hífen separando, opcionalmente prefixadas por +55.
const REGEX_TELEFONE = /(?:\+?55\s?)?\(?\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}/g;

export type SegmentoDescricao = { tipo: "texto" | "telefone"; valor: string };

export function ocultarTelefonesNaDescricao(texto: string): SegmentoDescricao[] {
  const segmentos: SegmentoDescricao[] = [];
  let ultimoIndice = 0;

  for (const match of texto.matchAll(REGEX_TELEFONE)) {
    const inicio = match.index ?? 0;
    if (inicio > ultimoIndice) {
      segmentos.push({ tipo: "texto", valor: texto.slice(ultimoIndice, inicio) });
    }
    segmentos.push({ tipo: "telefone", valor: match[0] });
    ultimoIndice = inicio + match[0].length;
  }

  if (ultimoIndice < texto.length) {
    segmentos.push({ tipo: "texto", valor: texto.slice(ultimoIndice) });
  }

  return segmentos;
}
