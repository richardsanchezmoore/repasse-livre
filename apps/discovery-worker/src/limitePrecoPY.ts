/**
 * O "RAIO LIMITADOR" — piso de plausibilidade por idade do veículo.
 *
 * ★★ Ideia do Gustavo (09/10/2026), a partir de um Land Cruiser Prado 2018 que
 * entrou no site a **USD 1.234**: *"facilmente conseguimos pesquisar a média de
 * preço de uma Toyota Prado 2018 no Paraguai e isso virar um raio limitador em
 * nossas descobertas e descartes"*.
 *
 * ═══ POR QUE NÃO É UM LIVRO DE PREÇOS POR MODELO ═══
 *
 * Pesquisei a Prado 2018: US$ 36.700 na Nicarágua (TXL diesel, 140 mil km), de
 * ~US$ 40 mil a ~US$ 70 mil na Colômbia conforme versão e rodagem. Nenhuma
 * fonte paraguaia direta.
 *
 * ★ E a dispersão é a lição: um livro por modelo precisaria de versão,
 * quilometragem e origem para ser útil, envelheceria sozinho e exigiria
 * pesquisa para cada um dos 176 modelos do catálogo. Caro, frágil e sempre
 * desatualizado.
 *
 * ⚠️ Mas o limitador não precisa saber **quanto vale** a Prado. Precisa saber
 * que **US$ 1.234 não é preço de carro de 2018**. Os erros que ele existe para
 * pegar são de 10× a 1000× — isca, zero a menos, moeda trocada —, não de 20%.
 * Ordem de grandeza resolve, e escala para o catálogo inteiro sem pesquisa.
 *
 * ⚠️⚠️ ELE É PISO, NÃO FAIXA. Teto por idade seria errado: carro de 1998 pode
 * ser um Land Cruiser de coleção, e barrá-lo por ser antigo jogaria fora
 * exatamente o achado raro que o produto quer encontrar.
 *
 * ★ E a tabela do Auto Radar continua sendo o árbitro PREFERENCIAL onde tem
 * massa — isto aqui é a rede para o modelo que ainda não tem mediana. Ver
 * [[corrigirPrecoIncoerentePY]] e [[referenciaPrecoPY]].
 */

/**
 * Piso por idade. Números deliberadamente baixos: o objetivo é ser
 * indiscutível, não preciso. Um carro paraguaio de 2018 abaixo de US$ 4.000 ou
 * é sucata batida — e aí o anúncio diz — ou é isca.
 *
 * ⚠️⚠️ SEM CONVERSÃO DE MOEDA AQUI — corrigido em 09/10/2026.
 *
 * A primeira versão tinha os pisos em dólar e multiplicava por um `7.300`
 * fixo para chegar ao guarani. Isso viola o que o próprio `precoParaguai`
 * declara no cabeçalho — *"este módulo NÃO converte nada"*; conversão é da
 * EXIBIÇÃO, com cotação datada — e cria justamente o que o Gustavo apontou que
 * mudaria no decorrer de um ano: um número que apodrece em silêncio enquanto o
 * guarani anda.
 *
 * ★ Dois pisos independentes, cada um na sua moeda, nenhum câmbio no meio.
 * Eles não precisam concordar entre si: são a mesma pergunta feita em dois
 * idiomas, e cada idioma responde sozinho.
 */
const PISO: Record<"USD" | "PYG", { desdeAno: number; piso: number }[]> = {
  USD: [
    { desdeAno: 2020, piso: 5_000 },
    { desdeAno: 2015, piso: 4_000 },
    { desdeAno: 2010, piso: 2_500 },
    { desdeAno: 2005, piso: 1_500 },
    { desdeAno: 1990, piso: 800 },
  ],
  // ⚠️ Mais baixos que a conversão direta dos de dólar, de propósito: aferido
  // contra a base em 09/10/2026, piso alto acendia a bandeira em 6% dos
  // anúncios, e sinal que dispara demais ninguém olha.
  PYG: [
    { desdeAno: 2020, piso: 20_000_000 },
    { desdeAno: 2015, piso: 15_000_000 },
    { desdeAno: 2010, piso: 10_000_000 },
    { desdeAno: 2005, piso: 7_000_000 },
    { desdeAno: 1990, piso: 4_000_000 },
  ],
};

export interface Limite {
  piso: number;
  moeda: "PYG" | "USD";
}

export function pisoPlausivel(ano: number | null | undefined, moeda: string): Limite | null {
  if (!ano || !Number.isFinite(ano)) return null;
  if (moeda !== "USD" && moeda !== "PYG") return null;
  const regra = PISO[moeda].find((r) => ano >= r.desdeAno);
  return regra ? { piso: regra.piso, moeda } : null;
}

/**
 * O preço é implausível para a idade do carro?
 *
 * ⚠️ SÓ olha o piso. Preço alto demais não é barrado aqui — pode ser blindado,
 * zero-km ou raridade, e o produto existe para achar justamente esses.
 */
export function precoImplausivel(preco: number, ano: number | null | undefined, moeda: string): boolean {
  const l = pisoPlausivel(ano, moeda);
  if (!l || l.moeda !== moeda) return false;
  return preco < l.piso;
}
