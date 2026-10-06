/**
 * DICIONÁRIO MODELO × ANO — "quando o anúncio não fecha".
 *
 * ★★ Pedido do Gustavo (05/10/2026): "um dicionário próprio para mapear modelos
 * conforme ano e já sabermos quando o anúncio está errado... ou o ano não
 * condiz... isso tudo é a base da tabela que virá".
 *
 * ⚠️⚠️ A REGRA DE OURO DESTE ARQUIVO: ele SINALIZA, não REJEITA.
 *
 * No Paraguai o ano do anúncio nem sempre é o ano-modelo. O carro entra por
 * Iquique anos depois de fabricado, e o vendedor às vezes escreve o ano de
 * IMPORTAÇÃO ou o da habilitação. Um "Vitz 2021" pode ser um 2018 importado em
 * 2021 — não é mentira, é outro calendário.
 *
 * Por isso: ano fora da faixa vira AVISO para revisão e para tirar da mediana,
 * nunca descarte automático. Descartar por isto jogaria fora anúncio bom e
 * calaria justamente o sinal que a gente quer estudar.
 *
 * ★ E, como a raridade, a faixa DECLARADA é o ponto de partida. Quando a base
 * tiver volume, o ano mínimo e máximo OBSERVADOS por modelo valem mais que
 * esta tabela — eles descrevem o que de fato circula no Paraguai, que é o que
 * importa, e não o que a fábrica produziu no Japão.
 *
 * Fontes: en.wikipedia.org/wiki/Toyota_Vitz · /Toyota_Premio · /Toyota_Platz ·
 * /Toyota_Yaris_Verso (FunCargo). O resto é conhecimento geral e está marcado
 * com `?` quando eu não tenho confirmação — ver CONFIANCA abaixo.
 */

export interface FaixaAno {
  /** Primeiro ano-modelo. */
  de: number;
  /** Último ano-modelo; null = ainda em linha. */
  ate: number | null;
  /** `firme` = confirmado em fonte; `estimado` = conhecimento geral, a refinar. */
  confianca: "firme" | "estimado";
}

/** Chave = nome canônico do catálogo (catalogoJdmParaguai.ts). */
export const ANOS_MODELO: Record<string, FaixaAno> = {
  // ── confirmados em fonte ────────────────────────────────────────────────
  vitz:            { de: 1999, ate: 2019, confianca: "firme" },
  platz:           { de: 1999, ate: 2005, confianca: "firme" },
  funcargo:        { de: 1999, ate: 2005, confianca: "firme" },
  ractis:          { de: 2005, ate: 2016, confianca: "firme" },
  allion:          { de: 2001, ate: 2021, confianca: "firme" },
  premio:          { de: 2001, ate: 2021, confianca: "firme" },

  // ── estimados (conhecimento geral; refinar com o dado da praça) ─────────
  "corolla axio":  { de: 2006, ate: 2024, confianca: "estimado" },
  ist:             { de: 2002, ate: 2016, confianca: "estimado" },
  probox:          { de: 2002, ate: null, confianca: "estimado" },
  succeed:         { de: 2002, ate: 2020, confianca: "estimado" },
  "corolla runx":  { de: 2001, ate: 2006, confianca: "estimado" },
  spacio:          { de: 1997, ate: 2007, confianca: "estimado" },
  noah:            { de: 2001, ate: null, confianca: "estimado" },
  voxy:            { de: 2001, ate: null, confianca: "estimado" },
  sienta:          { de: 2003, ate: null, confianca: "estimado" },
  passo:           { de: 2004, ate: null, confianca: "estimado" },
  aqua:            { de: 2011, ate: null, confianca: "estimado" },
  belta:           { de: 2005, ate: 2012, confianca: "estimado" },
  auris:           { de: 2006, ate: 2018, confianca: "estimado" },
  "mark x":        { de: 2004, ate: 2019, confianca: "estimado" },
  celsior:         { de: 1989, ate: 2006, confianca: "estimado" },
  century:         { de: 1967, ate: null, confianca: "estimado" },
  "crown athlete": { de: 1999, ate: 2018, confianca: "estimado" },
  "crown majesta": { de: 1991, ate: 2018, confianca: "estimado" },
  alphard:         { de: 2002, ate: null, confianca: "estimado" },
  vellfire:        { de: 2008, ate: null, confianca: "estimado" },
  caldina:         { de: 1992, ate: 2007, confianca: "estimado" },
  ipsum:           { de: 1996, ate: 2009, confianca: "estimado" },
  gaia:            { de: 1998, ate: 2004, confianca: "estimado" },
  wish:            { de: 2003, ate: 2017, confianca: "estimado" },
  isis:            { de: 2004, ate: 2017, confianca: "estimado" },
  vanguard:        { de: 2007, ate: 2013, confianca: "estimado" },
  rush:            { de: 2006, ate: null, confianca: "estimado" },
  "hilux surf":    { de: 1984, ate: 2009, confianca: "estimado" },
  "land cruiser prado": { de: 1990, ate: null, confianca: "estimado" },
  "corolla fielder": { de: 2000, ate: 2024, confianca: "estimado" },
  "hiace regius":  { de: 1997, ate: 2002, confianca: "estimado" },
  "grand hiace":   { de: 1995, ate: 2002, confianca: "estimado" },
  cami:            { de: 1999, ate: 2005, confianca: "estimado" },

  // ── Mitsubishi ──────────────────────────────────────────────────────────
  "delica space gear": { de: 1994, ate: 2007, confianca: "estimado" },
  "pajero io":     { de: 1998, ate: 2007, confianca: "estimado" },
  "pajero mini":   { de: 1994, ate: 2012, confianca: "estimado" },
  "pajero junior": { de: 1995, ate: 1998, confianca: "estimado" },
  "lancer cedia":  { de: 2000, ate: 2003, confianca: "estimado" },
  "galant vr-4":   { de: 1996, ate: 2002, confianca: "estimado" },
  "chariot grandis": { de: 1997, ate: 2003, confianca: "estimado" },

  // ── Kia ─────────────────────────────────────────────────────────────────
  morning:         { de: 2004, ate: null, confianca: "estimado" },
  k5:              { de: 2010, ate: null, confianca: "estimado" },
  k7:              { de: 2009, ate: null, confianca: "estimado" },
  ray:             { de: 2011, ate: null, confianca: "estimado" },
  mohave:          { de: 2008, ate: null, confianca: "estimado" },
};

export type ProblemaAno =
  | "antes_de_existir"   // ano anterior ao início de produção
  | "depois_do_fim"      // ano posterior ao fim de linha
  | "ano_ausente"
  | "modelo_sem_faixa";  // não é erro do anúncio: é o nosso dicionário que não cobre

export interface ConferenciaAno {
  ok: boolean;
  problema: ProblemaAno | null;
  /** Mensagem curta para o painel. */
  aviso: string | null;
  /** Quanto o ano está fora da faixa, em anos. Útil para priorizar revisão. */
  distancia: number;
}

/**
 * ⚠️ TOLERÂNCIA DE 1 ANO, de propósito. Ano-modelo e ano de fabricação se
 * cruzam na virada (um "2006" pode ser fabricado em 2005), e o anúncio
 * paraguaio frequentemente traz o ano de importação. Sem a folga, metade da
 * frota japonesa cairia em aviso e o sinal viraria ruído.
 */
const FOLGA = 1;

export function conferirAnoModelo(modeloCanonico: string | null, ano: number | null): ConferenciaAno {
  if (!modeloCanonico) return { ok: true, problema: null, aviso: null, distancia: 0 };

  const faixa = ANOS_MODELO[modeloCanonico.toLowerCase().trim()];
  if (!faixa) {
    return { ok: true, problema: "modelo_sem_faixa", aviso: null, distancia: 0 };
  }
  if (ano === null || !Number.isFinite(ano)) {
    return { ok: false, problema: "ano_ausente", aviso: "sem ano no anúncio", distancia: 0 };
  }

  if (ano < faixa.de - FOLGA) {
    const d = faixa.de - ano;
    return {
      ok: false, problema: "antes_de_existir", distancia: d,
      aviso: `${modeloCanonico} só existe a partir de ${faixa.de} — anúncio diz ${ano}`,
    };
  }

  const fim = faixa.ate;
  if (fim !== null && ano > fim + FOLGA) {
    const d = ano - fim;
    return {
      ok: false, problema: "depois_do_fim", distancia: d,
      // ⚠️ Texto escolhido com cuidado: NÃO afirma que o anúncio mente. No
      // Paraguai o ano pode ser o da IMPORTAÇÃO, e aí o anúncio está certo.
      aviso: `${modeloCanonico} saiu de linha em ${fim} — anúncio diz ${ano} (pode ser ano de importação)`,
    };
  }

  return { ok: true, problema: null, aviso: null, distancia: 0 };
}

/** Quantos modelos do catálogo já têm faixa, e quantas são firmes. */
export function coberturaAnos(): { total: number; firmes: number } {
  const vals = Object.values(ANOS_MODELO);
  return { total: vals.length, firmes: vals.filter((f) => f.confianca === "firme").length };
}
