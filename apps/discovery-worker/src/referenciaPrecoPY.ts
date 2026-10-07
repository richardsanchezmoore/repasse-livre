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

export function calcularReferencia(
  modelo: string,
  ano: number | null,
  moeda: string,
  observacoes: Observacao[],
): ReferenciaPY | null {
  const precos = colapsar(observacoes);
  if (precos.length < MINIMO_PUBLICAVEL) {
    return {
      modelo, ano, moeda,
      n: precos.length, anuncios: observacoes.length,
      mediana: 0, min: 0, max: 0, q1: 0, q3: 0,
      confianca: "insuficiente",
    };
  }
  return {
    modelo, ano, moeda,
    n: precos.length,
    anuncios: observacoes.length,
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
