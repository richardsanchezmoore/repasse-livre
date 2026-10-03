/**
 * CATÁLOGO JDM DO PARAGUAI — a frota que entra por Iquique.
 *
 * ★★★ ORIGEM: conhecimento de mercado do Gustavo (03/10/2026), não de busca na
 * web. Ele conhece a praça; este arquivo é a memória disso em forma de código.
 * Onde a pesquisa confirmou ou acrescentou, está marcado com a fonte.
 *
 * ★★ POR QUE UM CATÁLOGO E NÃO UMA LISTA DE NOMES: o `segmento` é o que a
 * tabela de preço precisa para agrupar. Uma Alphard e um Vitz são os dois
 * "Toyota importado do Japão" e não têm nada a ver em preço — van de luxo com
 * poltrona de avião contra hatch urbano de 1.0. Agrupar por nome só funciona
 * quando o nome já está certo; agrupar por segmento é o que dá sentido à
 * mediana quando o volume ainda é pequeno.
 *
 * ⚠️⚠️⚠️ NUNCA TRADUZIR, NUNCA CRUZAR COM O BRASIL. Regra do Gustavo, dita em
 * 03/10/2026, e ela manda neste arquivo inteiro:
 *
 *     "Nunca tradução nem cruzamento com Brasil no quesito modelos...
 *      é um mundo à parte o Paraguay."
 *
 * Eu havia escrito que "Vitz é o nome japonês do Yaris". Ele corrigiu: NÃO é um
 * Yaris — são carros esteticamente bem diferentes. Uma enciclopédia pode dizer
 * que dividem plataforma; quem compra no Paraguai está comprando outro carro, e
 * é o comprador que forma o preço.
 *
 * Por isso este catálogo NÃO TEM campo de equivalência. Tinha, e eu tirei: um
 * campo "equivalente" é convite a alguém — inclusive eu, daqui a um mês —
 * cruzar com a base brasileira "só para ter referência". Não existe referência
 * brasileira para um Allion. A referência é a que ESTA base vai construir, e é
 * exatamente nisso que o produto se diferencia do Carden.
 *
 * O que o catálogo guarda é o que o mercado paraguaio usa: nome, segmento,
 * motores e nota de praça.
 *
 * ⚠️ A ORDEM DENTRO DE CADA SEGMENTO IMPORTA: nome composto antes do simples,
 * senão "Crown Majesta" casa como "Crown", "Grand Hiace" como "Hiace" e
 * "Land Cruiser Prado" como "Land Cruiser". A função que monta a lista de busca
 * ordena por comprimento, mas manter a ordem aqui deixa o erro óbvio na leitura.
 */

export type SegmentoPY =
  | "sedan_luxo"       // V6/V8, topo de linha
  | "sedan"            // médio e compacto
  | "van_luxo"         // Alphard, Regius, Granvia — o império das vans
  | "minivan"          // Noah, Voxy, Sienta, Wish
  | "hatch"            // Vitz, Ist, Passo, Aqua
  | "suv"              // Prado, Surf, Rush, Vanguard
  | "perua"            // Caldina, Fielder
  | "pickup";

export interface ModeloJdm {
  /** Como aparece no anúncio, em minúsculas. O primeiro é o canônico. */
  nomes: string[];
  segmento: SegmentoPY;
  /** Motores que de fato aparecem na praça — ajuda a validar a versão lida. */
  motores?: string[];
  // ⚠️ NÃO existe campo de equivalência aqui, e isso é deliberado — ver o
  // cabeçalho. Modelo paraguaio não se explica por modelo brasileiro.
  nota?: string;
}

export const CATALOGO_JDM: ModeloJdm[] = [
  // ───────────────────────── sedãs de luxo (V6/V8) ─────────────────────────
  {
    nomes: ["crown majesta"],
    segmento: "sedan_luxo",
    motores: ["3.5 V6 Híbrido", "4.3 V8", "4.6 V8"],
    nota: "Topo de linha da família Crown.",
  },
  {
    nomes: ["crown athlete", "crown royal saloon", "crown royal", "crown"],
    segmento: "sedan_luxo",
    motores: ["2.5 V6", "3.5 V6"],
    nota: "Athlete é a linha esportiva; Royal Saloon a confortável. O anúncio quase sempre traz o sufixo.",
  },
  {
    nomes: ["celsior"],
    segmento: "sedan_luxo",
    motores: ["4.3 V8"],
    nota: "Topo absoluto da Toyota japonesa, V8 4.3. No Paraguai se vende como Celsior e ponto.",
  },
  {
    nomes: ["century"],
    segmento: "sedan_luxo",
    motores: ["5.0 V12", "V8 Híbrido"],
    nota: "Raríssimo — carro da família real japonesa. Se aparecer, é outlier: NÃO deve entrar na mediana.",
  },
  {
    nomes: ["mark x"],
    segmento: "sedan_luxo",
    motores: ["2.5 V6", "3.5 V6"],
    nota: "Tração traseira, favorito dos entusiastas jovens no Paraguai.",
  },

  // ─────────────────────────── sedãs médios ────────────────────────────────
  { nomes: ["allion"], segmento: "sedan", motores: ["1.5", "1.8", "2.0"], nota: "Gêmeo do Premio, focado em conforto urbano. Exclusivo do Japão." },
  { nomes: ["premio"], segmento: "sedan", motores: ["1.5", "1.8", "2.0"], nota: "Gêmeo do Allion, acabamento mais clássico e cromado." },
  { nomes: ["corolla axio", "axio"], segmento: "sedan", motores: ["1.5"], nota: "⚠️ NÃO agrupar com Corolla: é outro carro, menor e mais estreito, e o comprador sabe disso." },
  { nomes: ["belta"], segmento: "sedan", motores: ["1.0", "1.3"], nota: "Sedã da família Vitz." },
  { nomes: ["platz"], segmento: "sedan", motores: ["1.0", "1.3", "1.5"], nota: "Sedã derivado do Vitz." },

  // ──────────────────── vans de luxo — o império Regius ────────────────────
  {
    nomes: ["grand hiace", "granvia"],
    segmento: "van_luxo",
    motores: ["3.0 1KZ Turbo Diesel", "V6 nafta (raro)"],
    nota: "Mais larga e requintada que a Regius, mesma mecânica.",
  },
  {
    nomes: ["hiace regius", "touring hiace", "regius"],
    segmento: "van_luxo",
    motores: ["3.0 1KZ Turbo Diesel"],
    nota: "★ Sucesso estrondoso no Paraguai. O 1KZ 3.0 é lendário pela robustez e facilidade de manutenção. Duplo teto solar, cortinas elétricas, bancos giratórios.",
  },
  { nomes: ["alphard"], segmento: "van_luxo", motores: ["2.4", "3.5 V6"], nota: "Poltronas de avião na traseira. O 'Crown das vans'." },
  { nomes: ["vellfire"], segmento: "van_luxo", motores: ["2.4", "3.5 V6"], nota: "Irmã esportiva da Alphard." },
  { nomes: ["hiace"], segmento: "van_luxo", motores: ["2.7", "3.0 Diesel"], nota: "Deixar DEPOIS de grand hiace / hiace regius na busca." },

  // ───────────────────────────── minivans ──────────────────────────────────
  { nomes: ["noah"], segmento: "minivan", motores: ["2.0", "1.8 Híbrido"], nota: "7 ou 8 lugares, robusta e econômica. Gêmea da Voxy." },
  { nomes: ["voxy"], segmento: "minivan", motores: ["2.0", "1.8 Híbrido"], nota: "Gêmea da Noah, visual mais agressivo." },
  { nomes: ["sienta"], segmento: "minivan", motores: ["1.5"], nota: "Compacta, portas traseiras corrediças." },
  { nomes: ["isis"], segmento: "minivan", motores: ["1.8", "2.0"], nota: "Perfil baixo e comprido, familiar." },
  { nomes: ["wish"], segmento: "minivan", motores: ["1.8", "2.0"], nota: "Idem Isis." },
  { nomes: ["ipsum"], segmento: "minivan", motores: ["2.0", "2.4"], nota: "Antecedeu Noah/Voxy. Muito usada como táxi no interior." },
  { nomes: ["gaia"], segmento: "minivan", motores: ["2.0"], nota: "Irmã da Ipsum." },
  { nomes: ["funcargo"], segmento: "minivan", motores: ["1.3", "1.5"], nota: "Compacto quadrado, bancos rebatíveis no assoalho. Irmão do Vitz, antecessor do Ractis." },

  // ───────────────────────────── hatches ───────────────────────────────────
  { nomes: ["vitz"], segmento: "hatch", motores: ["1.0", "1.3", "1.5"], nota: "★ O hatch mais vendido do Paraguai. ⚠️ NÃO é um Yaris — esteticamente é outro carro." },
  { nomes: ["auris"], segmento: "hatch", motores: ["1.5", "1.8"], nota: "Porte de Golf, bom acabamento." },
  { nomes: ["ractis"], segmento: "hatch", motores: ["1.3", "1.5"], nota: "Monovolume alto, espaço interno surpreendente. Sucessor do FunCargo." },
  { nomes: ["ist"], segmento: "hatch", motores: ["1.3", "1.5"], nota: "Suspensão mais alta, visual robusto." },
  { nomes: ["aqua"], segmento: "hatch", motores: ["1.5 Híbrido"], nota: "Híbrido puro, sistema do Prius. Consumo baixíssimo." },
  { nomes: ["passo"], segmento: "hatch", motores: ["1.0", "1.3"], nota: "O menor da lista, mini-hatch urbano." },
  { nomes: ["corolla runx", "runx", "allex"], segmento: "hatch", motores: ["1.5", "1.8"], nota: "Hatchback do Corolla japonês dos anos 2000. Allex é o gêmeo." },

  // ────────────────────────── SUVs e jipes ─────────────────────────────────
  { nomes: ["land cruiser prado", "cruiser prado", "land cruiser cygnus", "land cruiser"], segmento: "suv", motores: ["3.0 Diesel", "4.0 V6", "3.3 Diesel"], nota: "Cygnus é a versão japonesa do Lexus LX." },
  { nomes: ["hilux surf"], segmento: "suv", motores: ["3.0 Diesel", "V6 nafta"], nota: "SUV de chassi da Hilux, versão japonesa. Diesel muito durável." },
  { nomes: ["vanguard"], segmento: "suv", motores: ["2.4", "3.5 V6"], nota: "RAV4 japonês alongado, opção de 7 lugares." },
  { nomes: ["rush"], segmento: "suv", motores: ["1.5"], nota: "Mini-SUV compacto com tração integral." },

  // ──────────────────────────── peruas ─────────────────────────────────────
  { nomes: ["caldina"], segmento: "perua", motores: ["2.0 Turbo (GT-Four)", "1.8", "2.0"], nota: "GT-Four tem tração integral e o motor turbo do Celica. Clássico de entusiasta." },
  { nomes: ["corolla fielder", "fielder"], segmento: "perua", motores: ["1.5", "1.8"], nota: "Perua do Corolla japonês." },
  { nomes: ["probox"], segmento: "perua", motores: ["1.3", "1.5"], nota: "Utilitária de trabalho, altíssima durabilidade." },
  { nomes: ["succeed"], segmento: "perua", motores: ["1.5"], nota: "Irmã do Probox, acabamento um pouco melhor." },
  { nomes: ["spacio", "corolla spacio"], segmento: "minivan", motores: ["1.6", "1.8"], nota: "Monovolume compacto do Corolla." },
  { nomes: ["cami"], segmento: "suv", motores: ["1.3"], nota: "Gêmeo do Daihatsu Terios." },
];

/**
 * Lista plana de nomes para o casador, do mais longo para o mais curto.
 *
 * ⚠️ A ordenação por comprimento é o que impede "Crown Majesta" de casar como
 * "Crown" e "Grand Hiace" como "Hiace". Não trocar por ordem alfabética.
 */
export const NOMES_JDM: string[] = CATALOGO_JDM
  .flatMap((m) => m.nomes)
  .sort((a, b) => b.length - a.length);

/** De um nome achado no anúncio para a ficha do catálogo. */
const PORNOME = new Map<string, ModeloJdm>();
for (const m of CATALOGO_JDM) for (const n of m.nomes) PORNOME.set(n, m);

export function fichaJdm(nome: string | null | undefined): ModeloJdm | null {
  if (!nome) return null;
  return PORNOME.get(String(nome).toLowerCase().trim()) ?? null;
}

/** O nome canônico (o primeiro da ficha), para agrupar sem espalhar sinônimo. */
export function canonicoJdm(nome: string | null | undefined): string | null {
  return fichaJdm(nome)?.nomes[0] ?? null;
}

/** O segmento, que é o que a tabela de preço usa para não misturar curvas. */
export function segmentoJdm(nome: string | null | undefined): SegmentoPY | null {
  return fichaJdm(nome)?.segmento ?? null;
}
