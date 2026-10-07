/**
 * QUILOMETRAGEM NO PARAGUAI — e por que ela NÃO É O EIXO que a gente achava.
 *
 * ★★★ MEDIDO em 07/10/2026 sobre os 311 anúncios paraguaios:
 *
 *     10.000 km → 53% da base
 *      1.000 km → 13%
 *        500 km →  7%
 *     ─────────────────────
 *     dois valores cobrem 66%
 *
 * ⚠️ Não é bug nosso: o número vem do campo ESTRUTURADO do Facebook
 * (`vehicle_odometer_data`), fielmente extraído. É o VENDEDOR que digita um
 * redondo qualquer para passar da validação.
 *
 * ═══ A HIPÓTESE DO GUSTAVO, E O QUE O DADO RESPONDEU ═══
 *
 * Ele levantou algo que eu não teria: *"único dueño com 11.400 km pode ser
 * DEPOIS da importação — único dono paraguaio que andou 11.400 km. É a cultura
 * paraguaia."* Ou seja, o campo poderia ser km RODADO NO PARAGUAI, não total —
 * e aí os números baixos seriam dado verdadeiro, não lixo.
 *
 * Testei, e no agregado NÃO se sustenta: "Recien Importado" tem mediana de
 * 10.000 km, **idêntica** à dos demais (10.000). Se o campo contasse km desde a
 * importação, o recém-chegado seria muito menor que o carro que já rodou anos
 * aqui.
 *
 * ★ Mas o teste revelou outra coisa, que muda o desenho: quando o vendedor
 * preenche de verdade, CAMPO E TEXTO BATEM —
 *
 *     campo  80.000 · texto  80.000     campo  49.800 · texto  49.800
 *     campo  24.000 · texto  24.000     campo 182.000 · texto 182.000
 *
 * Então são duas POPULAÇÕES de vendedor, não dois significados de km: quem
 * informa (valores altos e irregulares, coerentes com o texto) e quem preenche
 * qualquer coisa.
 *
 * ⚠️⚠️ POR ISSO ESTE MÓDULO NÃO APAGA NADA. Eu ia zerar 213 registros como
 * "falsos" — e a hipótese dele, mesmo refutada no agregado, pode valer em casos
 * individuais. Apagar seria decidir com 311 anúncios uma questão que 1.500
 * resolverão sozinhos. O que faço é marcar CONFIANÇA e deixar o dado.
 *
 * ═══ A DECISÃO DE PRODUTO (Gustavo, 07/10/2026) ═══
 *
 * Ele encerrou a questão, e por um caminho melhor que o meu: *"pode ser que
 * tenha grande maioria de imprecisão de KM porque eles aqui no Paraguai não dão
 * tanta importância... nossa tabela será como é no Brasil: não se trata KM
 * dentro da média de preço, é simplesmente a média que se encontra do total
 * apurado."*
 *
 * ★★ Ou seja: a referência é por MODELO + ANO, como a FIPE brasileira — que
 * também não segmenta por quilometragem. Isso **desfaz o bloqueio**: o km
 * duvidoso deixa de impedir a tabela, porque ele não entra no cálculo.
 *
 * ⚠️⚠️ ISTO SUPERA A MEMÓRIA do projeto, que registrava "KM É EIXO da nossa
 * tabela" como diferencial contra o Carden. O diferencial continua existindo,
 * mas é outro: **mediana em vez de média, n visível e cotação datada**.
 *
 * O km fica como INFORMAÇÃO do card — exibido quando confiável, omitido quando
 * duvidoso. Mostrar "10.000 km" num Premio 2004 seria repassar ao comprador uma
 * afirmação que a gente sabe que é frágil.
 */

export type ConfiancaKm = "informado" | "duvidoso" | "ausente";

export interface LeituraKm {
  km: number | null;
  confianca: ConfiancaKm;
  /** De onde veio o número que ficou. */
  origem: "campo" | "texto" | "nenhuma";
}

/**
 * Redondos que a medição mostrou concentrados.
 *
 * ⚠️ São marcados como DUVIDOSOS, não removidos: um carro pode genuinamente ter
 * 10.000 km, e com a amostra de hoje eu não tenho como separar o verdadeiro do
 * preenchido às pressas. Marcar deixa a decisão para quem tiver mais dado.
 */
const REDONDOS_SUSPEITOS = new Set([0, 1, 10, 100, 111, 300, 500, 1000, 1111, 10000, 11111, 12345, 99999, 111111, 123456]);

const PISO_PLAUSIVEL = 1_000;
const TETO_PLAUSIVEL = 900_000;

/** O formato COM separador vem primeiro: senão "110.000 km" vira 110. */
const RX_TEXTO: { rx: RegExp; fator: number }[] = [
  { rx: /\b(\d{1,3}(?:[.,]\d{3})+)\s*(?:km|kms|kil[oó]metros?)\b/i, fator: 1 },
  { rx: /\b(\d{1,3})\s*mil\s*(?:km|kms|kil[oó]metros?)\b/i, fator: 1000 },
  { rx: /\b(\d{4,7})\s*(?:km|kms|kil[oó]metros?)\b/i, fator: 1 },
];

export function kmDoTexto(texto: string): number | null {
  const t = String(texto ?? "");
  for (const { rx, fator } of RX_TEXTO) {
    const m = t.match(rx);
    if (!m) continue;
    const n = Number(m[1].replace(/[.,]/g, "")) * fator;
    if (Number.isFinite(n) && n >= PISO_PLAUSIVEL && n <= TETO_PLAUSIVEL) return n;
  }
  return null;
}

export function ehSuspeito(km: number | null | undefined): boolean {
  if (km === null || km === undefined || !Number.isFinite(km)) return false;
  return REDONDOS_SUSPEITOS.has(km) || km < PISO_PLAUSIVEL || km > TETO_PLAUSIVEL;
}

/**
 * ★ O TEXTO CONFIRMA ou CORRIGE o campo.
 *
 * Quando os dois existem e batem, a confiança é alta — foi o padrão medido.
 * Quando o campo é redondo suspeito e o texto traz outro número, o texto vence:
 * é lá que o vendedor escreve para convencer, e ninguém detalha km na descrição
 * depois de inventar no formulário.
 */
export function lerKm(campoFacebook: number | null | undefined, texto: string): LeituraKm {
  const campo = campoFacebook == null ? null : Number(campoFacebook);
  const doTexto = kmDoTexto(texto);

  if (campo !== null && doTexto !== null) {
    const proximos = Math.abs(campo - doTexto) / Math.max(campo, doTexto) < 0.1;
    if (proximos) return { km: campo, confianca: "informado", origem: "campo" };
    // divergem: o texto ganha se o campo é um redondo suspeito
    return ehSuspeito(campo)
      ? { km: doTexto, confianca: "informado", origem: "texto" }
      : { km: campo, confianca: "duvidoso", origem: "campo" };
  }

  if (campo === null && doTexto !== null) return { km: doTexto, confianca: "informado", origem: "texto" };
  if (campo === null) return { km: null, confianca: "ausente", origem: "nenhuma" };

  return ehSuspeito(campo)
    ? { km: campo, confianca: "duvidoso", origem: "campo" }
    : { km: campo, confianca: "informado", origem: "campo" };
}
