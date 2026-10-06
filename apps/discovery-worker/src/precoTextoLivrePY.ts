/**
 * PREÇO EM TEXTO LIVRE — posts de grupo do Facebook (Paraguai).
 *
 * ★★ POR QUE NÃO DEU PARA REUSAR o leitor do Marketplace: lá o preço vem num
 * CAMPO (`formatted_price`). No grupo não existe campo — o preço está no meio
 * da frase, junto com telefone, ano, cilindrada e quilometragem. Passar o texto
 * inteiro para `lerPrecoComContexto` produziu lixo: "USD 200.818", "PYG
 * 102.318,435", "USD 991,34" — números colados uns nos outros.
 *
 * ═══ FORMATOS MEDIDOS nos 140 posts reais colhidos em 06/10/2026 ═══
 *
 *   "PRECIO: Gs. 23.000.000"      marcador + prefixo
 *   "Precio 28.750.000gs"         sufixo gs (minúsculo)
 *   "PRECIO: 36.000.000GS"        sufixo GS
 *   "PRECIO: 43MILLONES"          ⚠️ palavra COLADA no número
 *   "PRECIO : 38 MILLONES"        espaço antes dos dois pontos
 *   "Oferta del dia 10 millones"  sem marcador nenhum
 *   "18 millones"                 só isso
 *   "Precio: 1.350..000"          ⚠️ erro de digitação do vendedor
 *
 * ⚠️ RUÍDO que tem que ser rejeitado, também medido:
 *   0991911781, 0994684938        celulares (09 + 8 dígitos)
 *   "PYG43", "PYG30"              selo do Facebook TRUNCADO — parece preço e
 *                                 não é: o valor real era 43 milhões
 *   "Motor 1.5", "1500cc"         cilindrada
 *   "año 2009", "97/98"           ano
 *   "11400km"                     quilometragem
 */

export interface PrecoTexto {
  valor: number;
  moeda: "PYG" | "USD";
  /** De qual padrão saiu — serve para medir qual regra sustenta a amostra. */
  como: "marcador" | "millones" | "sufixo_gs" | "simbolo_dolar";
}

/** Converte "28.750.000" / "1.350..000" / "23,000,000" em número. */
function numero(bruto: string): number | null {
  const limpo = bruto.replace(/[.,]+/g, "");       // o ".." do erro de digitação some aqui
  if (!/^\d{1,12}$/.test(limpo)) return null;
  const n = Number(limpo);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * ⚠️ Tira do texto o que PARECE preço e não é, ANTES de procurar o preço.
 *
 * A ordem importa: se eu procurar primeiro e filtrar depois, o telefone
 * 0994684938 ganha de "43 MILLONES" por aparecer antes na frase.
 */
function mascarar(texto: string): string {
  return texto
    // celular paraguaio, com ou sem espaços: 0994 684 938 / 0991911781
    .replace(/\b0\d{3}[\s.-]?\d{3}[\s.-]?\d{3,4}\b/g, " ")
    .replace(/\b\d{9,11}\b/g, " ")
    // selo truncado do Facebook: PYG43, PYG30 (sem separador = não é preço cheio)
    .replace(/\bPYG\d{1,3}\b/gi, " ")
    // quilometragem e cilindrada
    .replace(/\b[\d.]+\s?(?:km|kms|cc|hp)\b/gi, " ")
    .replace(/\bmotor\s+[\d.]+/gi, " ")
    // ano isolado ou faixa "97/98"
    .replace(/\ba[ñn]o\s+\d{2,4}(?:\/\d{2,4})?/gi, " ")
    .replace(/\b(?:19|20)\d{2}\b/g, " ");
}

const MILHAO = 1_000_000;

export function acharPrecoEmTexto(texto: string): PrecoTexto | null {
  const t = mascarar(String(texto ?? ""));

  // ── 1) "N millones" — o formato mais comum do grupo ────────────────────
  // ⚠️ `\s*` e não `\s+`: "43MILLONES" vem colado. E aceita "millon" singular.
  const mMil = t.match(/\b(\d{1,3}(?:[.,]\d{1,3})?)\s*millon(?:es)?\b/i);
  if (mMil) {
    const n = Number(mMil[1].replace(",", "."));
    // 5 a 500 milhões: abaixo disso é peça, acima é erro de digitação.
    if (Number.isFinite(n) && n >= 1 && n <= 500) {
      return { valor: Math.round(n * MILHAO), moeda: "PYG", como: "millones" };
    }
  }

  // ── 2) marcador explícito: "PRECIO: ..." ───────────────────────────────
  const mMarc = t.match(/\bprecio\s*:?\s*(?:gs\.?|₲)?\s*([\d][\d.,]{4,14})/i);
  if (mMarc) {
    const n = numero(mMarc[1]);
    if (n && n >= 1_000_000) return { valor: n, moeda: "PYG", como: "marcador" };
  }

  // ── 3) sufixo/prefixo de guarani ───────────────────────────────────────
  const mGs = t.match(/(?:gs\.?|₲)\s*([\d][\d.,]{4,14})|([\d][\d.,]{4,14})\s*gs\b/i);
  if (mGs) {
    const n = numero(mGs[1] ?? mGs[2] ?? "");
    if (n && n >= 1_000_000) return { valor: n, moeda: "PYG", como: "sufixo_gs" };
  }

  // ── 4) dólar explícito ─────────────────────────────────────────────────
  const mUsd = t.match(/(?:us\s?\$|usd|d[oó]lares?)\s*([\d][\d.,]{2,9})|([\d][\d.,]{2,9})\s*(?:us\s?\$|usd|d[oó]lares)\b/i);
  if (mUsd) {
    const n = numero(mUsd[1] ?? mUsd[2] ?? "");
    // US$ 500 a 500 mil: fora disso não descreve carro
    if (n && n >= 500 && n <= 500_000) return { valor: n, moeda: "USD", como: "simbolo_dolar" };
  }

  return null;
}
