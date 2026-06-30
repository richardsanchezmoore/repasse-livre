/**
 * Rótulo de exibição + classe CSS do selo de fonte, a partir do valor cru
 * gravado no banco. Cada serviço de descoberta grava a fonte num formato
 * diferente — `"OLX"`, `"WEBMOTORS"` e `"MERCADO_LIVRE"` (uppercase, e o ML
 * ainda com underscore) — enquanto a Inserção Direta grava `"Inserção Direta"`
 * já formatado. Normalizamos a chave (sem caixa/acento/underscore) para casar
 * independente do formato e evitar o selo cair no genérico mostrando
 * "MERCADO_LIVRE"/"WEBMOTORS" cru.
 */
export interface InfoFonte {
  rotulo: string;
  classe: string;
}

const INFO_POR_FONTE: Record<string, InfoFonte> = {
  OLX: { rotulo: "OLX", classe: "selo-fonte-olx" },
  WEBMOTORS: { rotulo: "Webmotors", classe: "selo-fonte-webmotors" },
  MERCADOLIVRE: { rotulo: "Mercado Livre", classe: "selo-fonte-mercadolivre" },
};

/** Chave canônica: sem acento, sem caixa, só letras/números (tira `_`, espaço). */
function chaveFonte(fonte: string): string {
  return fonte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function infoFonte(fonte: string | null | undefined): InfoFonte {
  if (!fonte) return { rotulo: "", classe: "selo-fonte-generico" };
  // Fallback: mostra o valor cru (ex.: "Inserção Direta", que já vem formatado)
  // com a classe genérica.
  return INFO_POR_FONTE[chaveFonte(fonte)] ?? { rotulo: fonte, classe: "selo-fonte-generico" };
}
