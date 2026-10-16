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

/**
 * ★★ DE ONDE VEIO O CARRO — e isso é PREÇO, não curiosidade.
 *
 * O Gustavo: os coreanos têm "uma vantagem gigantesca no Paraguai: como vêm da
 * Coreia do Sul, muitos vêm com o volante original na esquerda DE FÁBRICA (sem
 * necessidade de troca de caixa de direção), o que agrada muito quem tem receio
 * de carros convertidos."
 *
 * Ou seja: dois carros equivalentes valem diferente conforme a origem, porque o
 * japonês chegou com volante à direita e foi convertido. Quando a tabela tiver
 * volume, esta coluna é candidata a virar EIXO, do mesmo jeito que o km.
 */
export type OrigemImportacao = "japao" | "coreia";

/**
 * ★ O que faz o comprador paraguaio pagar mais: diesel robusto, GLP de fábrica
 * (combustível muito barato lá) e híbrido. Nas palavras dele, "os modelos a
 * Diesel e os carros a Gás de fábrica são os que mais atraem compradores pelas
 * vantagens econômicas no Paraguai".
 */
export type DestaquePY = "diesel" | "glp" | "hibrido" | "4x4" | "kei";

/**
 * ★★ RARIDADE — ideia do Gustavo (03/10/2026), vinda da nota do Century:
 * "ter essa classificação no anúncio, no card e dentro de uma categoria seria
 * maravilhoso".
 *
 * ⚠️⚠️ ISTO AQUI É O PONTO DE PARTIDA, NÃO O PRODUTO. O que está declarado
 * abaixo é conhecimento de mercado — serve desde o primeiro dia, quando ainda
 * não há base para medir nada. Mas a raridade que vale de verdade é a MEDIDA:
 * "apareceu 1 vez em 6 meses nesta praça". Essa ninguém copia, porque depende
 * de ter o histórico — e é exatamente o moat que ele descreveu: dado bagunçado
 * organizado vira alerta, alerta vira decisão.
 *
 * Quando a base tiver meses de histórico, a medida deve VENCER a declaração:
 * um modelo que eu marquei "raro" e aparece toda semana não é raro, e o dado
 * é quem sabe disso. A declaração vira o palpite inicial de um modelo novo.
 *
 * ⚠️ RARIDADE NÃO ENTRA NA MEDIANA. Um Century V12 com n=1 não é referência de
 * preço de nada — é outlier. Raro é etiqueta de DESCOBERTA ("olha o que
 * apareceu"), não insumo de avaliação.
 */
export type Raridade =
  | "incomum"      // aparece pouco, mas aparece
  | "raro"         // some por semanas; vale avisar quem procura
  | "muito_raro";  // unidade isolada; conteúdo por si só

export interface ModeloJdm {
  /** Como aparece no anúncio, em minúsculas. O primeiro é o canônico. */
  nomes: string[];
  segmento: SegmentoPY;
  /** Motores que de fato aparecem na praça — ajuda a validar a versão lida. */
  motores?: string[];
  // ⚠️ NÃO existe campo de equivalência aqui, e isso é deliberado — ver o
  // cabeçalho. Modelo paraguaio não se explica por modelo brasileiro.
  nota?: string;
  /**
   * ⚠️ A MARCA MORA NA FICHA, não na lista de quem a importa. Bug que eu criei
   * em 03/10/2026 ao estender o catálogo: o normalizador injetava TODOS os
   * nomes do catálogo na lista da Toyota, então uma Delica sairia "Toyota
   * Delica" e um Morning, "Toyota Morning". Sem default: quem não declara é
   * Toyota só porque o catálogo nasceu Toyota, e isso é acidente histórico, não
   * regra — por isso o campo é explícito nas fichas novas.
   */
  marca?: string;
  /** Japão = volante convertido; Coreia = volante à esquerda de fábrica. */
  origem?: OrigemImportacao;
  /** O que o comprador paraguaio procura e paga por. */
  destaques?: DestaquePY[];
  /**
   * Palpite inicial de raridade, por conhecimento de praça. Ausente = comum,
   * ou ainda não avaliado. ⚠️ A medida na base vence isto assim que existir.
   */
  raridade?: Raridade;
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
    raridade: "muito_raro",
    nota: "Raríssimo — carro da família real japonesa. ⚠️ Se aparecer é OUTLIER: etiqueta de descoberta, nunca insumo de mediana.",
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
  /**
   * ★★ O NOME CANÔNICO É "AXIO", NÃO "COROLLA AXIO" — corrigido pelo Gustavo
   * em 16/10/2026, e é conhecimento de praça que nenhuma fonte dá:
   *
   * > *"não usam aqui com o nome Corolla antes... Corolla é corolla, e Axio e
   * > Runx na cabeça do povo é modelo diferente — e de fato é. Nem diz na
   * > tampa do porta-malas Corolla, somente Axio e Runx, por isso ninguém
   * > fala."*
   *
   * ⚠️ Não é cosmética: o chip "Corolla Axio" ao lado de "Corolla" sugere que
   * um é versão do outro, que é exatamente a confusão que a nota abaixo manda
   * evitar. O alias longo continua aceito na LEITURA do anúncio; o que muda é
   * o nome que a gente EXIBE e agrupa.
   */
  { nomes: ["axio", "corolla axio"], segmento: "sedan", motores: ["1.5"], nota: "⚠️ NÃO agrupar com Corolla: é outro carro, menor e mais estreito, e o comprador sabe disso." },
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
  // ★★ "RUNX", não "Corolla Runx" — mesma razão do Axio logo acima.
  { nomes: ["runx", "corolla runx", "allex"], segmento: "hatch", motores: ["1.5", "1.8"], nota: "Hatchback do Corolla japonês dos anos 2000. Allex é o gêmeo." },

  // ────────────────────────── SUVs e jipes ─────────────────────────────────
  // ⚠⚠⚠ "land cruiser" SAIU daqui — era a causa raiz. Com ele nesta ficha,
  // todo anúncio que dissesse só "Land Cruiser" virava PRADO, inclusive os
  // LC300. A família tem ficha própria agora. ★ E "prado" sozinho ENTROU:
  // não era reconhecido, e é como boa parte do Paraguai anuncia.
  { nomes: ["land cruiser prado", "cruiser prado", "prado", "land cruiser cygnus"], segmento: "suv", motores: ["3.0 Diesel", "4.0 V6", "3.3 Diesel"], nota: "Cygnus é a versão japonesa do Lexus LX." },
  { nomes: ["hilux surf"], segmento: "suv", motores: ["3.0 Diesel", "V6 nafta"], nota: "SUV de chassi da Hilux, versão japonesa. Diesel muito durável." },
  { nomes: ["vanguard"], segmento: "suv", motores: ["2.4", "3.5 V6"], nota: "RAV4 japonês alongado, opção de 7 lugares." },
  { nomes: ["rush"], segmento: "suv", motores: ["1.5"], nota: "Mini-SUV compacto com tração integral." },

  // ──────────────────────────── peruas ─────────────────────────────────────
  { nomes: ["caldina"], segmento: "perua", raridade: "raro", motores: ["2.0 Turbo (GT-Four)", "1.8", "2.0"], nota: "GT-Four tem tração integral e o motor turbo do Celica. Clássico de entusiasta — some por semanas." },
  { nomes: ["corolla fielder", "fielder"], segmento: "perua", motores: ["1.5", "1.8"], nota: "Perua do Corolla japonês." },
  { nomes: ["probox"], segmento: "perua", motores: ["1.3", "1.5"], nota: "Utilitária de trabalho, altíssima durabilidade." },
  { nomes: ["succeed"], segmento: "perua", motores: ["1.5"], nota: "Irmã do Probox, acabamento um pouco melhor." },
  { nomes: ["spacio", "corolla spacio"], segmento: "minivan", motores: ["1.6", "1.8"], nota: "Monovolume compacto do Corolla." },
  { nomes: ["cami"], segmento: "suv", motores: ["1.3"], nota: "Gêmeo do Daihatsu Terios." },

  // ══════════════════════ MITSUBISHI (Japão) ══════════════════════════════
  // ⚠️ ALIAS É PARA RECONHECER, NÃO PARA EQUIVALER. "Challenger" e "Pajero
  // Sport" são o MESMO carro circulando no Paraguai sob os dois nomes, e o
  // anúncio pode usar qualquer um — por isso ficam na mesma ficha. Isso é
  // reconhecimento DENTRO do Paraguai. NÃO autoriza buscar preço no Pajero
  // Sport brasileiro: ver a regra no cabeçalho deste arquivo.
  {
    nomes: ["delica space gear", "delica d:5", "delica d5", "delica"],
    marca: "mitsubishi", segmento: "van_luxo", origem: "japao", destaques: ["diesel", "4x4"],
    motores: ["2.8 Turbo Diesel 4M40", "2.2 Turbo Diesel", "2.4 nafta"],
    nota: "★★ Lenda absoluta no Paraguai: van com chassi e tração 4x4 de Pajero. Space Gear (anos 90/2000) com o 4M40 2.8 TD enfrenta qualquer lamaçal; a D:5 é a geração quadrada moderna.",
  },
  { nomes: ["chariot grandis", "chariot", "grandis"], marca: "mitsubishi", segmento: "minivan", origem: "japao", motores: ["2.4 GDI", "2.4"], nota: "Minivan de 7 lugares. Chariot comum com motor GDI; a Grandis é mais aerodinâmica e confortável." },
  { nomes: ["pajero io", "pajero pinin", "pinin", "pajerito"], marca: "mitsubishi", segmento: "suv", origem: "japao", destaques: ["4x4"], motores: ["1.8", "2.0"], nota: "O “Pajerito”: jipe compacto, valente no 4x4, procurado por quem quer jipe urbano econômico." },
  { nomes: ["pajero mini"], marca: "mitsubishi", segmento: "suv", origem: "japao", raridade: "incomum", destaques: ["4x4", "kei"], motores: ["0.66 (660cc)", "0.66 Turbo"], nota: "Kei car. Ótimo para as ruas apertadas de Ciudad del Este." },
  { nomes: ["pajero junior"], marca: "mitsubishi", segmento: "suv", origem: "japao", raridade: "raro", destaques: ["4x4"], motores: ["1.1"], nota: "Irmão do Pajero Mini, motor 1.1." },
  { nomes: ["pajero sport", "challenger"], marca: "mitsubishi", segmento: "suv", origem: "japao", destaques: ["diesel", "4x4"], motores: ["2.5 Diesel", "3.0 V6"], nota: "“Challenger” é o nome japonês da 1ª geração. Acabamento interno diferente do mercado asiático." },
  { nomes: ["pajero full", "montero", "pajero"], marca: "mitsubishi", segmento: "suv", origem: "japao", destaques: ["diesel", "4x4"], motores: ["3.2 DiD", "3.8 V6"], nota: "Deixar DEPOIS de pajero io/mini/junior/sport na busca." },
  { nomes: ["galant vr-4", "legnum", "galant"], marca: "mitsubishi", segmento: "sedan", origem: "japao", raridade: "incomum", motores: ["2.5 V6 Twin Turbo (VR-4)", "2.0", "2.4 GDI"], nota: "Frente agressiva de “tubarão”. Legnum é a perua. VR-4 tem V6 biturbo e tração integral." },
  { nomes: ["lancer cedia"], marca: "mitsubishi", segmento: "sedan", origem: "japao", motores: ["1.5 CVT", "1.8 CVT"], nota: "Lancer do mercado doméstico japonês: CVT e consumo baixo, bem diferente dos Lancer esportivos." },
  { nomes: ["colt"], marca: "mitsubishi", segmento: "hatch", origem: "japao", motores: ["1.3", "1.5"], nota: "Hatch compacto, irmão menor do Lancer." },

  // ════════════════════════ KIA (Coreia do Sul) ═══════════════════════════
  // ★ Vantagem estrutural da Coreia: volante à ESQUERDA DE FÁBRICA, sem
  // conversão de caixa de direção. Pesa no preço e na confiança do comprador.
  {
    // ⚠⚠ SÓ os nomes que dizem HI-LIMOUSINE. "carnival" e "grand carnival"
    // saíram daqui: eles nomeiam a FAMÍLIA, e deixando-os aqui todo Carnival
    // do Paraguai virava a versão coreana topo de linha — medido em 11/10/2026.
    // A família tem entrada própria logo abaixo.
    nomes: ["grand carnival hi-limousine", "hi-limousine"],
    marca: "kia", segmento: "van_luxo", origem: "coreia", destaques: ["diesel"],
    motores: ["2.2 CRDi Turbo Diesel"],
    nota: "★ As versões coreanas topo de linha (Hi-Limousine) têm teto elevado, telas grandes e poltronas de massagem — diferente da Carnival que o Brasil conhece.",
  },
  { nomes: ["bongo"], marca: "kia", segmento: "pickup", origem: "coreia", destaques: ["diesel", "4x4"], motores: ["2.5 CRDi", "3.0 CRDi"], nota: "★ Febre no comércio paraguaio. As importadas vêm com cabine dupla de fábrica, 4x4 real e conforto que a versão de concessionária não tem." },
  { nomes: ["mohave", "borrego"], marca: "kia", segmento: "suv", origem: "coreia", destaques: ["diesel", "4x4"], motores: ["3.0 V6 Turbo Diesel CRDi"], nota: "SUV grande de chassi rígido. As importadas 3.0 V6 TD são cobiçadas pelo torque e pelo status." },
  { nomes: ["sorento"], marca: "kia", segmento: "suv", origem: "coreia", destaques: ["diesel"], motores: ["2.2 CRDi", "2.5 CRDi"], nota: "⚠️ Vendido oficialmente E importado da Coreia. As importadas se reconhecem por emblema diferente, couro marrom/vinho e motores diesel que nunca vieram oficialmente para a América do Sul — e valem diferente." },
  { nomes: ["sportage"], marca: "kia", segmento: "suv", origem: "coreia", destaques: ["diesel"], motores: ["2.0 CRDi", "2.0"], nota: "Mesma observação do Sorento: oficial e importada convivem na praça." },
  {
    nomes: ["k5", "lotze", "optima"],
    marca: "kia", segmento: "sedan", origem: "coreia", destaques: ["glp"],
    motores: ["2.0 GLP", "2.0"],
    nota: "★★ Frotas imensas de K5 importado rodando PURAMENTE A GLP DE FÁBRICA — não têm tanque de gasolina. O GLP é muito barato no Paraguai, então isso é argumento de venda e entra no preço.",
  },
  { nomes: ["k7", "cadenza"], marca: "kia", segmento: "sedan_luxo", origem: "coreia", motores: ["3.0 V6", "3.3 V6"], nota: "Irmão maior e mais luxuoso do K5, rival direto do Toyota Crown." },
  { nomes: ["morning", "picanto"], marca: "kia", segmento: "hatch", origem: "coreia", motores: ["1.0", "1.2"], nota: "★ Nome coreano do Picanto. As ruas paraguaias estão inundadas de Morning de todas as gerações — dos carros mais baratos e econômicos do país." },
  { nomes: ["ray"], marca: "kia", segmento: "hatch", origem: "coreia", raridade: "incomum", destaques: ["kei"], motores: ["1.0"], nota: "Carrinho quadrado “caixinha de leite”, porta traseira deslizante de UM lado só. Rei da praticidade urbana, faz sucesso com o público jovem." },
];

/**
 * Lista plana de nomes para o casador, do mais longo para o mais curto.
 *
 * ⚠️ A ordenação por comprimento é o que impede "Crown Majesta" de casar como
 * "Crown" e "Grand Hiace" como "Hiace". Não trocar por ordem alfabética.
 */
/**
 * ★★ ENTRADAS DE FAMÍLIA — o nome genérico do carro, separado da versão.
 *
 * ⚠⚠ A ARMADILHA, medida em 11/10/2026: quando o nome comum do carro é ALIAS
 * de uma versão específica, TODO carro daquela família vira aquela versão. Foi
 * o que aconteceu com "pajero" → Pajero Full (Junior, Mini e io iam junto) e
 * com "carnival" → Grand Carnival Hi-Limousine.
 *
 * ★ A regra que separa um caso do outro: o alias é APELIDO do mesmo carro
 * ("axio", "runx", "regius", "fielder" — esses podem ficar) ou é o nome de uma
 * FAMÍLIA que tem várias versões distintas? Só o segundo caso precisa de entrada
 * própria.
 *
 * ⚠️ Vir “depois” no arquivo não importa: a busca é por MAIOR CASAMENTO, e
 * “land cruiser prado” (18) sempre ganha de “land cruiser” (12). A ordem do
 * array é irrelevante; o tamanho do nome é que manda.
 *
 * ⚠️ PENDENTE, porque é pergunta de mercado e não de código: “crown” cai em
 * Crown Athlete e “delica” em Delica Space Gear. Se no Paraguai quase todo
 * Crown importado FOR Athlete, deixar como está é melhor que partir a amostra.
 * Decisão do Gustavo.
 */
CATALOGO_JDM.push(
  { nomes: ["grand carnival", "carnival"], marca: "kia", segmento: "minivan", origem: "coreia", motores: ["2.2 CRDi", "3.3 V6"], nota: "A família Carnival. A versão Hi-Limousine (teto elevado, poltronas de massagem) tem ficha própria." },
  // ═══ ★★★ A FAMÍLIA LAND CRUISER, por LINHAGEM (correção do Gustavo, 11/10) ═══
  //
  // ⚠⚠ Eu tinha criado UMA entrada genérica “land cruiser” e dado o caso por
  // resolvido. Não estava: ela botava um LC300 2026 topo de linha na MESMA
  // linha de tabela que um LC80 dos anos 90. Troquei um erro por outro.
  //
  // ★ “Land Cruiser” é o SOBRENOME. Dentro dele a Toyota tem três linhagens, e
  // elas não se misturam em preço:
  //   • Station Wagon (topo): LC80 → LC100 → LC200 → LC300
  //   • Light-duty: Prado (mais leve, mais barato, criado nos anos 90)
  //   • Heavy-duty: Série 70, trabalho pesado, vendida até hoje
  //
  // ⚠️ As da linha principal são GERAÇÕES, mas entram como modelos próprios de
  // propósito: é assim que o mercado paraguaio anuncia (“LC200”, “LC300”), e o
  // nosso dicionário de gerações não cobre Land Cruiser. Sem isso elas caem
  // todas num balde só e a mediana não significa nada.
  //
  // ⚠️ “land cruiser” genérico FICA, por último: anúncio que não diz a linhagem
  // existe, e é melhor cair na família do que em null. Maior casamento primeiro
  // garante que só sobra para ele o que ninguém mais reivindicou.
  // ★ O PRIMEIRO nome é o CANÔNICO (vira o rótulo na tabela), os demais só
  // servem à busca — que ordena por tamanho, independente desta ordem. Por isso
  // “land cruiser 300” vem primeiro (sai “Land Cruiser 300” na tela) e o
  // composto fica atrás, só trabalhando.
  //
  // ⚠⚠ OS ALIASES COMPOSTOS (“land cruiser lc300”) NÃO SÃO REDUNDÂNCIA.
  // A busca é por MAIOR CASAMENTO, e “land cruiser” (12) vencia “lc300” (5):
  // o token MAIS específico perdia por ser mais curto. Medido — “Land Cruiser
  // LC300 GR-Sport 2026” caiu na família. Em vez de mexer na regra do maior
  // casamento, que sustenta o dicionário inteiro, a linhagem ganha uma forma
  // longa o bastante para vencer sozinha.
  { nomes: ["land cruiser 300", "land cruiser lc300", "landcruiser lc300", "landcruiser 300", "lc300", "lc 300"], marca: "toyota", segmento: "suv", origem: "japao", destaques: ["diesel", "4x4"], motores: ["3.3 V6 biturbo diesel", "3.5 V6"], nota: "Topo da linha principal, a partir de 2021." },
  { nomes: ["land cruiser 200", "land cruiser lc200", "landcruiser lc200", "lc200", "lc 200"], marca: "toyota", segmento: "suv", origem: "japao", destaques: ["diesel", "4x4"], motores: ["4.5 V8 TD", "4.6 V8"], nota: "Linha principal 2007–2021. Antecessor do LC300." },
  { nomes: ["land cruiser 100", "land cruiser lc100", "landcruiser lc100", "lc100", "lc 100"], marca: "toyota", segmento: "suv", origem: "japao", destaques: ["diesel", "4x4"], motores: ["4.2 TD", "4.7 V8"], nota: "Linha principal 1998–2007." },
  { nomes: ["land cruiser 80", "land cruiser lc80", "landcruiser lc80", "lc80", "lc 80"], marca: "toyota", segmento: "suv", origem: "japao", destaques: ["diesel", "4x4"], motores: ["4.2 TD", "4.5"], nota: "Linha principal 1990–1997. Culto no Paraguai." },
  { nomes: ["land cruiser 70", "land cruiser serie 70", "land cruiser série 70", "lc70", "serie 70", "série 70"], marca: "toyota", segmento: "suv", origem: "japao", destaques: ["diesel", "4x4"], motores: ["4.2 TD", "4.5 V8 TD"], nota: "Heavy-duty: trabalho pesado, visual retrô, vendida até hoje." },
  { nomes: ["land cruiser", "landcruiser"], marca: "toyota", segmento: "suv", origem: "japao", destaques: ["diesel", "4x4"], motores: ["4.2 TD", "4.5 V8"], nota: "⚠️ Família, não linhagem. Só recebe o anúncio que NÃO disse qual é — as linhagens têm ficha própria." },
);

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

/**
 * A marca de um modelo do catálogo.
 *
 * ⚠️ Toyota é o default porque o catálogo nasceu só com a frota japonesa da
 * Toyota; as fichas de Mitsubishi e Kia declaram a sua. Sem isto, o
 * normalizador atribuiria "Toyota Delica" e "Toyota Morning" — ele injeta a
 * lista inteira do catálogo na lista da Toyota.
 */
/**
 * Raridade DECLARADA do modelo. Null = comum ou não avaliado.
 *
 * ⚠️ Quem consome isto na tela deve tratar como palpite enquanto não houver a
 * contagem na base — e nunca deixar vazar para o cálculo de preço.
 */
export function raridadeJdm(nome: string | null | undefined): Raridade | null {
  return fichaJdm(nome)?.raridade ?? null;
}

export function marcaJdm(nome: string | null | undefined): string | null {
  const ficha = fichaJdm(nome);
  return ficha ? (ficha.marca ?? "toyota") : null;
}

/**
 * Os nomes do catálogo AGRUPADOS POR MARCA.
 *
 * ⚠️⚠️ O BUG QUE ISTO CONSERTA, medido em 11/10/2026: `NOMES_JDM` entrega os 94
 * nomes numa lista só, e `modeloParaguai.ts` despejava todos dentro de
 * `MODELOS.toyota`. Resultado: as 10 entradas Mitsubishi do catálogo nunca eram
 * consultadas para um anúncio Mitsubishi — quem respondia era a lista escrita à
 * mão, que tem "pajero" e não tem "pajero junior"/"mini"/"io".
 *
 * ★ Com o alias genérico "pajero" casando e o canônico sendo "Pajero Full",
 * TRÊS modelos distintos viravam o mesmo:
 *
 *     "MITSUBISHI PAJERO JUNIOR 1999 motor 1.100"  →  Pajero Full
 *     "Mitsubishi Pajero Mini 2010"                →  Pajero Full
 *     "Mitsubishi Pajero io 2003"                  →  Pajero Full
 *
 * Um kei-car 660cc, um 1.1 e um SUV 3.2 diesel na mesma linha da tabela. Isso
 * não erra só o rótulo: contamina a MEDIANA, que é o produto.
 *
 * ⚠️ `marca` ausente na ficha = Toyota, que é o default histórico do catálogo
 * (40 das 94 entradas vêm sem marca justamente por isso).
 */
export const NOMES_JDM_POR_MARCA: Record<string, string[]> = (() => {
  const por: Record<string, string[]> = {};
  for (const m of CATALOGO_JDM) {
    const marca = (m.marca ?? "toyota").toLowerCase();
    (por[marca] ??= []).push(...m.nomes);
  }
  // ⚠️ MAIOR PRIMEIRO, sempre: é o que faz "pajero junior" ganhar de "pajero".
  // A ordem aqui não é cosmética — é a regra inteira.
  for (const k of Object.keys(por)) por[k].sort((a, b) => b.length - a.length);
  return por;
})();
