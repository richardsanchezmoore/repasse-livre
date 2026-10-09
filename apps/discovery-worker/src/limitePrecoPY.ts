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
 * Piso em DÓLAR por idade. Números deliberadamente baixos: o objetivo é ser
 * indiscutível, não preciso. Um carro paraguaio de 2018 abaixo de US$ 4.000 ou
 * é sucata batida — e aí o anúncio diz — ou é isca.
 *
 * ⚠️ Aferidos contra a nossa própria base em 09/10/2026: o 1º percentil de
 * preço por faixa de ano ficou bem acima destes valores, então nenhum anúncio
 * legítimo que já temos seria barrado.
 */
const PISO_USD: { desdeAno: number; piso: number }[] = [
  { desdeAno: 2020, piso: 5_000 },
  { desdeAno: 2015, piso: 4_000 },
  { desdeAno: 2010, piso: 2_500 },
  { desdeAno: 2005, piso: 1_500 },
  { desdeAno: 1990, piso: 800 },
];

/** ₲ por dólar — ordem de grandeza, não cotação. Só converte o piso. */
const GS_POR_USD = 7_300;

export interface Limite {
  piso: number;
  moeda: "PYG" | "USD";
}

export function pisoPlausivel(ano: number | null | undefined, moeda: string): Limite | null {
  if (!ano || !Number.isFinite(ano)) return null;
  const regra = PISO_USD.find((r) => ano >= r.desdeAno);
  if (!regra) return null;
  return moeda === "USD"
    ? { piso: regra.piso, moeda: "USD" }
    : { piso: regra.piso * GS_POR_USD, moeda: "PYG" };
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
