/**
 * A REFERÊNCIA DE PREÇO PARAGUAIA — a "FIPE" que não existe lá.
 *
 * ★★★ A REGRA DO PRODUTO (Gustavo, 07/10/2026): *"nossa tabela será como é no
 * Brasil: não se trata KM dentro da média de preço, é simplesmente a média que
 * se encontra do total apurado."*
 *
 * Então a referência é por **MODELO + ANO**, como a FIPE brasileira — que
 * também não segmenta por quilometragem. Isso encerrou um bloqueio: 66% do km
 * da base é duvidoso, e se o km fosse eixo, não haveria tabela.
 *
 * ⚠️⚠️ MAS NÃO É MÉDIA, É MEDIANA. A diferença não é preciosismo: um importador
 * que anuncia cinco Vitz iguais a ₲15.000.000 puxa a média para onde ele quer.
 * A mediana aguenta isso. É também o que nos separa do Carden, que publica
 * "média" sobre UM anúncio.
 *
 * ═══ O PROBLEMA DO REANÚNCIO, e por que a regra óbvia não serve ═══
 *
 * Medido em 07/10: três anúncios de Vitz 2007 em Encarnación, todos a
 * ₲15.000.000, todos km=500 — e com DESCRIÇÕES DIFERENTES, cada uma com seu
 * texto de marketing. A regra que eu ia escrever (descrição idêntica = mesmo
 * carro) falharia exatamente aqui.
 *
 * ★ A assinatura que funciona é (modelo, ano, preço, cidade). E a decisão
 * estatística que vem dela:
 *
 *     N anúncios do mesmo carro, mesmo preço, mesma praça = UMA observação.
 *
 * Não porque sejam necessariamente o mesmo veículo — um importador pode ter
 * cinco unidades iguais. É porque são **uma oferta só**: um vendedor pedindo um
 * preço. Contar cinco vezes deixaria um único importador definir a mediana do
 * modelo, que é precisamente o que a mediana existe para impedir.
 *
 * ⚠️ NADA É APAGADO. Os cinco anúncios continuam na base e na listagem — quem
 * procura carro quer ver todos. O colapso acontece SÓ no cálculo da referência.
 */

export interface Observacao {
  preco: number;
  moeda: string;
  cidade: string | null;
}

export interface ReferenciaPY {
  modelo: string;
  ano: number | null;
  moeda: string;
  /** ⚠️ O n que VALE: ofertas distintas, não anúncios. É ele que vai na tela. */
  n: number;
  /** Quantos anúncios existem de fato — a diferença revela o reanúncio. */
  anuncios: number;
  /**
   * ★ Preços que ficaram FORA do cálculo por não terem companhia (ver
   * VIZINHANCA). Não são lixo: é aqui que moram o vendedor com pressa e o carro
   * com problema — e é exatamente deles que o selo *"3% por debajo de la tabla"*
   * vai falar. Saem da régua, não da base.
   */
  solitarios: number[];
  mediana: number;
  min: number;
  max: number;
  /** Primeiro e terceiro quartis: a faixa onde mora o miolo do mercado. */
  q1: number;
  q3: number;
  /** Quão confiável é publicar isto. */
  confianca: "boa" | "fraca" | "insuficiente";
}

/**
 * ⚠️ PISO PARA PUBLICAR. Com menos de 3 ofertas distintas, a mediana é o preço
 * de alguém, não do mercado — e seria o erro do Carden com outro nome.
 *
 * 5 é onde ela começa a resistir a um outlier; abaixo disso a tela tem que
 * dizer que o dado é fraco, em vez de fingir precisão.
 */
const MINIMO_PUBLICAVEL = 3;
const MINIMO_CONFIAVEL = 5;

/**
 * ★★★ PREÇO SOLITÁRIO NÃO MOVE A TABELA — regra do Gustavo, 08/10/2026.
 *
 * *"um único anúncio muito barato não deve contaminar a média... somente quando
 * somado a outros anúncios com x variação de similaridade a média é afetada.
 * Assim temos uma média real, não um único preço que pode ser só de um
 * desesperado ou de um carro com algum grande problema."*
 *
 * ⚠️ A mediana já protege contra UM outlier numa amostra grande — é para isso
 * que ela existe aqui. Mas no Paraguai a amostra é pequena: com n=3, a lista
 * [15M, 16M, 40M] tem mediana 16M, e a tabela passa a mentir sobre o modelo.
 *
 * ★ A regra dele é melhor que a correção estatística comum. O caminho clássico
 * seria cortar por DISTÂNCIA (fora de 1,5×IQR, fora de k×MAD), que é arbitrário
 * e some com cauda legítima. O dele corta por COMPANHIA: um preço só entra no
 * cálculo se existe outra oferta perto dele. Dois carros a ₲15M são um mercado;
 * um carro a ₲15M é uma história — um vendedor com pressa, ou um carro com
 * problema que o anúncio não conta.
 *
 * ⚠️⚠️ E O SOLITÁRIO NÃO É APAGADO. Ele sai do CÁLCULO e continua na base e na
 * listagem — porque é exatamente ele que, mais tarde, o selo *"3% por debajo de
 * la tabla AutoRadarPY"* vai querer apontar. Jogar fora o outlier seria jogar
 * fora o achado; o que não se pode é deixá-lo DEFINIR a régua contra a qual ele
 * próprio será medido.
 *
 * ★ 15% é a vizinhança. Abaixo disso, carro usado do mesmo modelo e ano se
 * separa por quilometragem e estado, e exigiríamos coincidência; muito acima,
 * dois preços que não têm relação virariam "companhia" um do outro.
 */
const VIZINHANCA = 0.15;

const quantil = (ordenado: number[], p: number): number => {
  if (!ordenado.length) return 0;
  const i = (ordenado.length - 1) * p;
  const baixo = Math.floor(i);
  const alto = Math.ceil(i);
  return baixo === alto ? ordenado[baixo] : ordenado[baixo] + (i - baixo) * (ordenado[alto] - ordenado[baixo]);
};

/**
 * Colapsa ofertas repetidas numa só observação.
 *
 * ⚠️ A chave inclui a CIDADE: o mesmo modelo ao mesmo preço em Asunción e em
 * Encarnación são dois vendedores diferentes, e isso é informação de mercado —
 * não duplicata.
 */
function colapsar(obs: Observacao[]): number[] {
  const vistos = new Map<string, number>();
  for (const o of obs) {
    const chave = `${o.preco}|${(o.cidade ?? "?").toLowerCase()}`;
    if (!vistos.has(chave)) vistos.set(chave, o.preco);
  }
  return [...vistos.values()].sort((a, b) => a - b);
}

/**
 * Separa os preços que têm companhia dos que estão sozinhos.
 *
 * ⚠️ A lista chega ORDENADA (colapsar devolve assim), então basta olhar o
 * vizinho de cada lado: se o mais próximo está a mais de VIZINHANCA, aquele
 * preço não tem com quem formar mercado.
 */
function separarSolitarios(ordenado: number[]): { acompanhados: number[]; solitarios: number[] } {
  if (ordenado.length < 2) return { acompanhados: [], solitarios: [...ordenado] };
  const acompanhados: number[] = [];
  const solitarios: number[] = [];
  for (let i = 0; i < ordenado.length; i++) {
    const p = ordenado[i];
    const anterior = i > 0 ? ordenado[i - 1] : null;
    const proximo = i < ordenado.length - 1 ? ordenado[i + 1] : null;
    // ⚠️ Distância RELATIVA, nunca absoluta: ₲5 milhões é um abismo num Vitz de
    // ₲18M e é ruído num Crown de ₲110M.
    const perto = (a: number | null) => a !== null && Math.abs(p - a) / Math.max(p, a) <= VIZINHANCA;
    if (perto(anterior) || perto(proximo)) acompanhados.push(p);
    else solitarios.push(p);
  }
  return { acompanhados, solitarios };
}

export function calcularReferencia(
  modelo: string,
  ano: number | null,
  moeda: string,
  observacoes: Observacao[],
): ReferenciaPY | null {
  const todos = colapsar(observacoes);

  // ★ O corte por companhia vem ANTES de qualquer estatística: a mediana tem
  // que ser calculada sobre o mercado, não sobre o mercado mais uma história.
  const { acompanhados, solitarios } = separarSolitarios(todos);
  const precos = acompanhados;

  if (precos.length < MINIMO_PUBLICAVEL) {
    return {
      modelo, ano, moeda,
      n: precos.length, anuncios: observacoes.length, solitarios,
      mediana: 0, min: 0, max: 0, q1: 0, q3: 0,
      confianca: "insuficiente",
    };
  }
  return {
    modelo, ano, moeda,
    n: precos.length,
    anuncios: observacoes.length,
    solitarios,
    mediana: quantil(precos, 0.5),
    min: precos[0],
    max: precos[precos.length - 1],
    q1: quantil(precos, 0.25),
    q3: quantil(precos, 0.75),
    confianca: precos.length >= MINIMO_CONFIAVEL ? "boa" : "fraca",
  };
}

/**
 * Onde este anúncio cai em relação à referência.
 *
 * ⚠️ Devolve a POSIÇÃO, não um veredito de "bom negócio". No Paraguai não
 * existe FIPE para dizer o que é desconto; o que a gente sabe dizer é "este
 * está abaixo da mediana dos semelhantes", e essa é uma frase honesta.
 */
export function posicaoNaReferencia(preco: number, ref: ReferenciaPY): {
  diferenca: number;
  percentual: number;
  faixa: "abaixo" | "no_miolo" | "acima";
} | null {
  if (ref.confianca === "insuficiente" || !ref.mediana) return null;
  const diferenca = preco - ref.mediana;
  return {
    diferenca,
    percentual: (diferenca / ref.mediana) * 100,
    faixa: preco < ref.q1 ? "abaixo" : preco > ref.q3 ? "acima" : "no_miolo",
  };
}
