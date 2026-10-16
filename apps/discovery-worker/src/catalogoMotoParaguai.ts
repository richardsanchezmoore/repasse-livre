/**
 * ★★★ CATÁLOGO DE MOTO DO PARAGUAI — 16/10/2026.
 *
 * ⚠️ Montado da NOSSA BASE, não de uma lista chutada. A busca na web não
 * devolve ranking confiável de moto para o Paraguai (não há DINATRAN
 * publicando emplacamento por modelo como o Brasil tem), e inventar uma lista
 * "mercosul" foi exatamente o erro que a gente não cometeu no carro.
 *
 * ★ O método foi contar as palavras que aparecem nos títulos e descrições das
 * motos já capturadas. O resultado, em 65 anúncios:
 *
 *     41x kenton · 20x suzuki · 17x gsx · 16x yamaha · 13x honda
 *     12x dakar  ·  7x gtr    ·  7x harley/davidson  ·  6x bull
 *      5x ducati ·  5x cbr
 *
 * Ou seja: a frota é a chinesa montada local (Kenton domina sozinha) mais um
 * nicho de alta cilindrada que o próprio mercado chama pelo nome da marca.
 *
 * ⚠️⚠️ LISTA CURTA DE PROPÓSITO. Pedido do Gustavo: *"talvez pudéssemos testar
 * catalogar as principais motos, umas 10 no máximo, mas ao menos teria alguma
 * referência"*. Catálogo grande sem massa de anúncio não vira mediana, vira
 * linha "dado fraco" — e a gente já aprendeu isso com os 59 modelos JDM dos
 * quais 34 nunca apareceram.
 *
 * ⚠️ SEPARADO do catálogo de carro de propósito, e consultado só quando
 * `categoria === "moto"`. Sem isso, "Honda CB" competiria com modelo de carro
 * na mesma busca por maior casamento — e a separação carro/moto, que custou a
 * migração 0097 e um portão na publicação, voltaria a vazar pelo dicionário.
 */
export const MARCAS_MOTO: Record<string, string[]> = {
  /** A marca dominante: montada no Paraguai, é 41 dos 65 anúncios medidos. */
  kenton: ["dakar", "bull", "blitz", "gtr", "stratta", "trail", "scooter"],
  /** "Star Motorcycles" nos anúncios; o modelo RX4 é o que mais aparece. */
  star: ["rx4", "desert", "tr5"],
  leopard: ["lp", "cross"],
  /** Alta cilindrada — o anúncio costuma trazer o modelo junto. */
  suzuki: ["gsx-r", "gsx", "bandit", "v-strom", "intruder"],
  yamaha: ["ybr", "fazer", "mt-07", "mt-09", "xtz", "r1", "r6", "tenere"],
  honda: ["cbr", "cb", "xre", "shadow", "africa twin", "twister", "titan"],
  "harley-davidson": ["iron", "sportster", "fat boy", "street", "softail"],
  ducati: ["monster", "multistrada", "panigale", "scrambler"],
  kawasaki: ["ninja", "versys", "z400", "z650", "z900"],
  bajaj: ["pulsar", "rouser", "boxer", "dominar"],
};

/** Grafias que o anúncio usa e que apontam para a mesma marca. */
export const MARCA_MOTO_CORRIGIDA: Record<string, string> = {
  "star motorcycles": "Star",
  "harley davidson": "Harley-Davidson",
  harley: "Harley-Davidson",
  davidson: "Harley-Davidson",
  motomel: "Motomel",
  zanella: "Zanella",
  // ⚠️ "Buler" e "Skua" apareceram na base com marca = modelo ("Buler Buler").
  // São marcas, e o modelo fica vazio até haver anúncio que o diga.
  buler: "Buler",
  skua: "Skua",
};

/**
 * ⚠️ Cilindrada NÃO é modelo. "Kenton 150cc" e "Kenton 150" são a mesma moto
 * em versões de motor, e tratar o número como modelo criaria uma linha de
 * mediana por cilindrada — exatamente o esfarelamento que a geração resolve
 * no carro. A cilindrada fica na versão.
 */
export const RX_CILINDRADA = /\b(\d{2,4})\s*(?:cc|cilindradas?)\b/i;
