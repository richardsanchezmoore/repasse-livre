/**
 * Leitura de preço dos anúncios paraguaios — guarani e dólar.
 *
 * ★ Construído em 23/09/2026 a partir de anúncios REAIS, lidos no ClasiPar,
 * WebAuto e Ajogua. Todo formato e toda armadilha aqui saiu de coisa que está
 * publicada agora, não de suposição.
 *
 * DUAS MOEDAS DE ORIGEM, TRÊS NA TELA. No Paraguai se anuncia em guarani ou
 * em dólar — ninguém anuncia em real. O real é só LEITURA, convertido na hora
 * de exibir com a cotação do dia. Por isso este módulo NÃO converte nada: ele
 * devolve o preço na moeda em que foi anunciado, que é o fato, e é ele que
 * vira base da tabela semanal e depois mensal.
 *
 * ⚠️ E ele precisa DESCONFIAR. Na primeira página de dois sites, sem procurar,
 * apareceram três tipos de lixo que destroem qualquer média ingênua — é
 * provavelmente por isso que ninguém no Paraguai publicou uma tabela de preço
 * médio ainda. Cada guarda abaixo existe por causa de um anúncio específico.
 */

export type MoedaPY = "PYG" | "USD";

export type LeituraPreco =
  | { ok: true; valor: number; moeda: MoedaPY; corrigido?: "moeda_trocada" }
  | { ok: false; motivo: MotivoDescarte; valorBruto?: number; moedaBruta?: MoedaPY };

export type MotivoDescarte =
  | "sem_preco"        // não achei número nenhum
  | "preco_isca"       // Gs. 1, US$ 1,00 — vendedor fugindo do filtro
  | "fora_de_faixa";   // valor que não descreve carro em nenhuma das moedas

/**
 * Faixas plausíveis para um CARRO. Deliberadamente largas: a função corta
 * absurdo, não julga barganha. Quem decide o que é caro é a tabela, depois.
 */
const FAIXA = {
  // ~5 milhões de Gs é um carro muito velho; 2 bilhões cobre importado de luxo.
  PYG: { min: 5_000_000, max: 2_000_000_000 },
  // US$ 500 é sucata; US$ 500 mil cobre qualquer coisa que se anuncie por lá.
  USD: { min: 500, max: 500_000 },
} as const;

/** Acima disto, "dólar" quase certamente é guarani digitado no campo errado. */
const TETO_DOLAR_CRIVEL = 300_000;

const RX_GUARANI = /(?:\bGs\.?|₲|\bGuaran[ií]e?s?\b|\bPYG\b)/i;
const RX_DOLAR = /(?:US\s?\$|\bUSD\b|\bU\$S\b|(?<![A-Za-z])\$)/i;

/**
 * Converte o texto do número para valor, no formato es-PY: ponto separa
 * milhar e vírgula separa decimal ("36.500,00" = trinta e seis mil e meio).
 *
 * ⚠️ Não dá para usar Number() direto: "97.500.000" viraria 97.5 e o carro de
 * noventa e sete milhões de guaranis vira noventa e sete reais e pouco.
 */
function numeroPY(texto: string): number | null {
  const limpo = texto.replace(/[^\d.,]/g, "");
  if (!limpo) return null;

  const temVirgula = limpo.includes(",");
  const temPonto = limpo.includes(".");

  let normal: string;
  if (temVirgula && temPonto) {
    // "36.500,00" → ponto é milhar, vírgula é decimal
    normal = limpo.replace(/\./g, "").replace(",", ".");
  } else if (temVirgula) {
    // Só vírgula: decimal se sobrarem 1 ou 2 casas ("1,00"), milhar se 3 ("1,500")
    const depois = limpo.split(",")[1] ?? "";
    normal = depois.length === 3 ? limpo.replace(/,/g, "") : limpo.replace(",", ".");
  } else if (temPonto) {
    // Só ponto: decimal se sobrarem 1 ou 2 casas, senão é milhar.
    const depois = limpo.split(".").pop() ?? "";
    normal = limpo.split(".").length > 2 || depois.length === 3
      ? limpo.replace(/\./g, "")
      : limpo;
  } else {
    normal = limpo;
  }

  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

/**
 * Lê o preço de um anúncio paraguaio.
 *
 * @param texto  o trecho de preço como aparece na página ("Gs. 97.500.000")
 */
export function lerPreco(texto: string): LeituraPreco {
  if (!texto) return { ok: false, motivo: "sem_preco" };

  const ehGuarani = RX_GUARANI.test(texto);
  const ehDolar = RX_DOLAR.test(texto);
  const valor = numeroPY(texto);

  if (valor === null || valor <= 0) return { ok: false, motivo: "sem_preco" };

  // ⚠️ PREÇO-ISCA. Real, no ClasiPar: "TOYOTA 4RUNNER — Gs. 130" e
  // "RAM 1500 RHO 2025 — US$. 1,00". É o vendedor escapando do filtro de preço
  // de quem busca por faixa. Entra na média como se fosse oferta e a arrasta
  // para baixo — um desses num modelo raro já estraga a linha da tabela.
  const isca = (ehGuarani && valor < FAIXA.PYG.min) || (ehDolar && valor < FAIXA.USD.min);
  if (isca) {
    return { ok: false, motivo: "preco_isca", valorBruto: valor, moedaBruta: ehGuarani ? "PYG" : "USD" };
  }

  // ⚠️ MOEDA TROCADA NO CAMPO. Real, no WebAuto: "TOYOTA PASEO 2000 —
  // US$ 20.000.000". Ninguém vende um Paseo de 2000 por vinte milhões de
  // dólares: é valor em guarani digitado no campo de dólar. Corrigir é melhor
  // que descartar, porque o anúncio em si é legítimo — só o rótulo está errado.
  if (ehDolar && !ehGuarani && valor > TETO_DOLAR_CRIVEL) {
    if (valor >= FAIXA.PYG.min && valor <= FAIXA.PYG.max) {
      return { ok: true, valor, moeda: "PYG", corrigido: "moeda_trocada" };
    }
    return { ok: false, motivo: "fora_de_faixa", valorBruto: valor, moedaBruta: "USD" };
  }

  if (ehGuarani) {
    if (valor > FAIXA.PYG.max) return { ok: false, motivo: "fora_de_faixa", valorBruto: valor, moedaBruta: "PYG" };
    return { ok: true, valor, moeda: "PYG" };
  }

  if (ehDolar) {
    if (valor > FAIXA.USD.max) return { ok: false, motivo: "fora_de_faixa", valorBruto: valor, moedaBruta: "USD" };
    return { ok: true, valor, moeda: "USD" };
  }

  // Sem símbolo nenhum: a grandeza decide. Sete dígitos ou mais só faz sentido
  // em guarani; abaixo disso, só em dólar.
  if (valor >= FAIXA.PYG.min) return { ok: true, valor, moeda: "PYG" };
  if (valor >= FAIXA.USD.min && valor <= FAIXA.USD.max) return { ok: true, valor, moeda: "USD" };
  return { ok: false, motivo: "fora_de_faixa", valorBruto: valor };
}

/**
 * ⚠️ ANÚNCIO DE COMPRA travestido de venda. Real, no ClasiPar: "COMPRO CONTADO
 * HYUNDAI TUCSON — Gs. 1" aparece na listagem de autos à venda. Não é oferta,
 * é procura — e o preço nem é preço. Tem que sair antes de qualquer média.
 */
const RX_PROCURA = /\b(compro|compramos|busco|buscamos|necesito|permuto|cambio\s+por|se\s+busca)\b/i;

export function ehAnuncioDeCompra(titulo: string, descricao = ""): boolean {
  return RX_PROCURA.test(`${titulo} ${descricao}`);
}

/**
 * ★★ IMPORTADO vs USO LOCAL — o eixo que decide se a tabela vale alguma coisa.
 *
 * "Recién importado" (chega do Japão/Coreia pelo porto de Iquique, no Chile)
 * e "uso local" (já rodou no Paraguai, dono particular) são DUAS CURVAS DE
 * PREÇO diferentes para o mesmo modelo e o mesmo ano. Uma média que mistura as
 * duas não descreve nenhuma — e é pior que não ter tabela, porque parece
 * precisa.
 *
 * Por isso isto não é uma observação no anúncio: é campo de captura, tão
 * essencial quanto o preço.
 */
export type Procedencia = "importado" | "uso_local" | "desconhecida";

// ⚠️ SEM `\b` na frente. Em JavaScript, `\b` não enxerga letra acentuada como
// caractere de palavra: `/\b[uú]nico/` NÃO casa em " único dueño", porque
// entre o espaço e o "ú" o motor não vê limite de palavra. O teste pegou isso
// nas duas frases com "único dueño" — e seriam justamente as mais comuns num
// anúncio de particular. As expressões aqui têm duas ou três palavras, então
// não precisam da âncora para evitar falso positivo.
const RX_IMPORTADO = /(reci[eé]n\s+importad|importad[oa]s?|iquique|rec[ií]en\s+llegad|sin\s+rodar\s+en\s+py|0\s?km\s+importad)/i;
const RX_USO_LOCAL = /(uso\s+local|rodado\s+en\s+(py|paraguay)|[uú]nico\s+due[nñ]o|uso\s+n[aá]utico|chapa\s+paraguaya|con\s+uso\b)/i;

export function lerProcedencia(texto: string): Procedencia {
  const t = texto || "";
  const imp = RX_IMPORTADO.test(t);
  const loc = RX_USO_LOCAL.test(t);
  // Diz os dois: "importado, único dueño" é carro importado que já teve dono
  // aqui. Na dúvida vale o uso local, que é a curva mais barata — errar para
  // baixo mantém a tabela conservadora.
  if (imp && loc) return "uso_local";
  if (imp) return "importado";
  if (loc) return "uso_local";
  return "desconhecida";
}
