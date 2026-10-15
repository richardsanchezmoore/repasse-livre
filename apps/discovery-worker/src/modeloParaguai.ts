/**
 * NORMALIZAÇÃO DE MODELO — PARAGUAI.
 *
 * ★★★ POR QUE ISTO EXISTE (03/10/2026): sem modelo normalizado NÃO EXISTE tabela
 * de preço. A mediana só significa alguma coisa se os carros agrupados forem o
 * mesmo carro, e hoje não são. Medido sobre os 176 registros reais:
 *
 *   "Hyundai Santa 2013 Fe 2.2"      → era Hyundai SANTA FE 2013
 *   "Jeep Grand 2019 Cherokee Laredo" → era Jeep GRAND CHEROKEE 2019
 *   "Toyota New 2011 Ractis"          → era Toyota RACTIS 2011
 *   "Toyota Land 2026 Cruiser 300 Vx" → era Toyota LAND CRUISER 2026
 *
 * ⚠️ A CAUSA é estrutural, não falta de dicionário: `montarVeiculoPadrao` pega
 * **só a primeira palavra** do modelo (`uteis[0]`), joga o resto em "versão" e
 * insere o ANO entre os dois. Todo modelo de duas palavras é partido ao meio.
 *
 * ⚠️ E `RUIDO_TITULO`, que deveria cortar marketing, é 100% EM PORTUGUÊS — não
 * tem uma única palavra em espanhol. Por isso "Recien Importado", "Sin
 * Requisitos", "20 Millones" e "Entrega A Sola Cédula" entram no nome do modelo.
 *
 * ★★★ REGRA QUE MANDA AQUI (Gustavo, 03/10/2026): nunca traduzir, nunca cruzar
 * com o Brasil. "É um mundo à parte o Paraguay."
 *
 * Eu havia escrito que Vitz "é o Yaris japonês". Ele corrigiu: não é — são
 * carros esteticamente bem diferentes. Dividir plataforma não é ser o mesmo
 * carro para quem compra, e é o comprador que forma o preço.
 *
 * Então o normalizador não converte nome nenhum. Allion é Allion, Axio é Axio,
 * Vitz é Vitz. O catálogo (catalogoJdmParaguai.ts) deliberadamente NÃO tem
 * campo de equivalência, para que ninguém vá buscar "referência" na base
 * brasileira. A referência é a que esta base vai construir.
 */

/** Tira acento e baixa a caixa, para comparar sem susto. */
import { NOMES_JDM, NOMES_JDM_POR_MARCA, canonicoJdm, segmentoJdm, marcaJdm, type SegmentoPY } from "./catalogoJdmParaguai.js";

const chave = (s: string): string =>
  String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/**
 * ⚠️ LIXO DE ANÚNCIO PARAGUAIO — em espanhol, que é o que faltava.
 *
 * Tudo medido nos títulos reais. "20 Millones" é o preço no título; os números
 * de celular (09xx xxx xxx) aparecem colados no nome do modelo; "Entrega a sola
 * cédula" e "Sin requisitos" são condição de financiamento, não carro.
 */
const RUIDO_PY: RegExp[] = [
  /\b0\d{8,10}\b/g,                                   // celular paraguaio no título
  /\(\s*0?\d{7,11}\s*\)/g,                            // idem, entre parênteses
  /\b\d{1,3}\s*mill?[oó]n(?:es)?\b/gi,                // "20 Millones", "15 Millon"
  // ⚠️ VERBO DE VENDA NA FRENTE DO TÍTULO atrapalha mais do que parece: a
  // dedução de marca olha a PRIMEIRA palavra, e "Vendo Jetour 2025 Dashing"
  // começava com "vendo" — marca nenhuma, busca solta em todas as listas, e o
  // "Gls" do fim do título casou como Mercedes. Era um Jetour Dashing.
  /\b(vendo|venta|en\s+venta|oferta|ofertas|remato|remate)\b/gi,
  /\brecien\s+importad[oa]\b/gi,
  /\bimportad[oa]\b/gi,
  /\bsin\s+requisitos?\b/gi,
  /\bentrega\s+a\s+sola\s+c[eé]dula\b/gi,
  /\b(de\s+)?entrega\b/gi,
  /\ba\s+sola\s+c[eé]dula\b/gi,
  /\bcontado\s*(y|e)?\b/gi,
  /\bfinanci[oa]\w*\b/gi,
  /\bcuotas?\b/gi,
  /\bfull\s+equipo\b/gi,
  /\b[uú]nic[oa]\s+due[nñ][oa]\b/gi,
  /\b0\s?km\b/gi,
  /\bauto\s?m[aá]tic[oa]\b/gi,
  /\bmec[aá]nic[oa]\b/gi,
];

/**
 * ★ MODELOS CONHECIDOS, com os de VÁRIAS PALAVRAS primeiro.
 *
 * A ordem importa: a busca é por maior casamento, senão "Land Cruiser" vira
 * "Land" e "Grand Cherokee" vira "Grand" — exatamente o defeito que isto
 * conserta. Lista montada sobre os 176 registros reais, não inventada.
 */
const MODELOS: Record<string, string[]> = {
  // ⚠️ Os JDM vêm do CATÁLOGO, não repetidos aqui: catalogoJdmParaguai.ts é a
  // fonte única, com segmento, motores e as notas de mercado do Gustavo.
  // Duplicar a lista era garantir que uma das duas ficaria desatualizada.
  toyota: [
    ...(NOMES_JDM_POR_MARCA.toyota ?? NOMES_JDM),
    // ⚠️ "cruiser prado"/"cruiser" sem o "land": o ano partia "Land Cruiser" ao
    // meio e o "Land" se perdia antes mesmo da limpeza ("Toyota Cruiser 2025
    // Prado Ob"). Os aliases pegam o estrago que já está gravado na base.
    "land cruiser prado", "cruiser prado", "land cruiser", "corolla cross", "corolla fielder", "corolla axio",
    "corolla runx", "hilux surf", "fj cruiser",
    // JDM — nomes mantidos de propósito (ver cabeçalho)
    "allion", "premio", "axio", "vitz", "platz", "ractis", "probox", "succeed", "runx",
    "sienta", "voxy", "noah", "funcargo", "ist", "passo", "belta", "spacio", "auris",
    "cami", "rush", "raize", "frontlander", "corolla", "camry", "hilux", "fortuner",
    "rav4", "yaris", "etios", "prius", "avanza", "innova", "4runner", "tacoma", "tundra",
  ],
  // ⚠️ Variante SEM hífen entra como alias própria: a chave preserva o hífen,
  // então "Honda Hrv 2026" NÃO casa com "hr-v". Medido: 37% dos Honda da base
  // estavam sem modelo, e hrv/crv respondiam por boa parte.
  honda: ["hr-v", "hrv", "cr-v", "crv", "wr-v", "wrv", "br-v", "brv", "civic", "fit", "accord", "city", "jazz",
    "vezel", "odyssey", "pilot", "passport", "ridgeline", "insight", "stepwgn", "freed", "shuttle", "elysion",
    "s2000", "crx"],
  // ★ "versa" sozinho respondia por 41 anúncios sem modelo — o maior buraco
  // de uma marca só na base.
  nissan: ["x-trail", "xtrail", "x trail", "qashqai", "navara", "frontier", "sunny", "march", "note", "tiida",
    "sentra", "kicks", "juke", "versa", "murano", "pathfinder", "patrol", "atlas", "serena", "elgrand",
    "wingroad", "cube", "leaf"],
  mitsubishi: ["pajero sport", "pajero", "pajerito", "l200", "outlander", "lancer", "asx", "montero",
    "montero sport", "eclipse cross", "space wagon", "triton", "canter", "mirage", "l300", "fuso"],
  suzuki: ["grand vitara", "swift", "vitara", "jimny", "baleno", "alto", "s-cross", "ertiga", "celerio",
    "fronx", "ciaz", "wagon r", "every", "carry"],
  subaru: ["forester", "impreza", "outback", "legacy", "justy", "xv", "wrx", "brz", "levorg", "exiga", "sambar"],
  // ⚠️ A ordem aqui é indiferente (a busca ordena por tamanho), mas "hb20x" e
  // "hb20s" PRECISAM existir: sem elas o "hb20" casava e o X virava o hatch
  // comum — dois carros e dois preços na mesma linha da tabela.
  hyundai: ["grand santa fe", "santa fe", "grand starex", "starex", "tucson", "accent", "elantra", "creta",
    "venue", "veloster", "palisade", "kona", "ioniq", "i10", "i30", "hb20x", "hb20s", "hb20", "porter",
    "h100", "h-1", "h1", "galloper", "terracan", "sonata", "azera", "getz"],
  kia: ["grand carnival", "sportage", "sorento", "picanto", "cerato", "carnival", "rio", "seltos", "soul",
    "stonic", "niro", "k5", "k3", "k7", "sedona", "carens", "telluride", "ev6", "pride"],
  chevrolet: ["grand blazer", "trailblazer", "silverado", "captiva", "camaro", "spark", "onix", "cruze",
    "tracker", "s10", "blazer", "corsa", "celta", "prisma", "equinox", "aveo", "luv", "colorado", "sail",
    "optra", "orlando", "tahoe", "suburban", "montana"],
  ford: ["grand c-max", "explorer", "mustang", "ranger", "escape", "edge", "fusion", "focus", "fiesta",
    "f-150", "f150", "f 150", "f-250", "ecosport", "territory", "bronco", "maverick", "expedition", "transit",
    "everest", "courier"],
  volkswagen: ["golf gti", "amarok", "saveiro", "voyage", "parati", "tiguan allspace", "tiguan", "touareg",
    "jetta", "passat", "polo", "virtus", "nivus", "t-cross", "tcross", "t cross", "taos", "crossfox",
    "spacefox", "caddy", "transporter", "golf", "gol", "fox", "up"],
  jeep: ["grand cherokee", "wrangler unlimited", "wrangler", "cherokee", "compass", "renegade", "rubicon", "commander", "gladiator"],
  "mercedes-benz": [
    "c-class", "e-class", "s-class", "a-class", "glc", "gle", "gla", "glb", "gls", "gl",
    "gla-class", "glb-class", "glc-class", "gle-class", "gls-class", "b-class", "v-class", "gl-class",
    "sprinter", "vito", "viano", "clk", "cla", "slk", "amg gt", "ml",
  ],
  bmw: ["serie 1", "serie 2", "serie 3", "serie 4", "serie 5", "serie 6", "serie 7", "x1", "x2", "x3", "x4",
    "x5", "x6", "x7", "z4", "i3", "i4", "i8", "ix", "m3", "m4"],
  audi: ["q2", "q3", "q5", "q7", "q8", "a1", "a3", "a4", "a5", "a6", "a7", "a8", "tt", "rs3", "rs6"],
  "land rover": ["range rover sport", "range rover evoque", "range rover velar", "range rover", "discovery", "defender", "freelander"],
  porsche: ["cayenne", "macan", "panamera", "boxster", "cayman", "911"],
  volvo: ["xc90", "xc60", "xc40", "s60", "v40"],
  mini: ["cooper s", "cooper", "countryman", "clubman"],
  fiat: ["strada", "toro", "cronos", "argo", "mobi", "uno", "palio", "siena", "doblo", "ducato"],
  renault: ["kangoo", "duster", "sandero", "logan", "captur", "master", "oroch", "express", "stepway", "alaskan"],
  // ⚠️⚠️ Os números da Peugeot são tratados à parte (MODELOS_NUMERICOS, logo
  // abaixo) porque o normalizador apaga os anos ANTES de procurar o modelo —
  // e "2008" é modelo E ano. Ficam aqui também para o caso de a marca não vir.
  peugeot: ["partner", "5008", "3008", "2008", "508", "408", "308", "301", "208", "207", "206", "205",
    "expert", "boxer", "rifter", "landtrek"],
  dodge: ["challenger", "charger", "durango", "journey", "ram"],
  byd: ["song plus", "song pro", "yuan plus", "yuan up", "dolphin mini", "dolphin", "sealion 6", "sealion 7",
    "sealion", "seagull", "seal", "shark", "atto 3", "song", "yuan", "han", "tang", "qin", "e2"],
  jetour: ["dashing", "x70", "x90", "t1", "t2", "x1"],
  chery: ["tiggo 7", "tiggo 8", "tiggo 2", "tiggo", "arrizo"],
  scania: ["g480", "r450", "p310"],

  /**
   * ★★ A FROTA CHINESA — 333 dos 338 anúncios SEM MARCA na base não tinham
   * modelo (12/10/2026), e era quase toda ela. Nenhuma destas marcas existia
   * aqui, então nem o nome da marca o normalizador reconhecia: o anúncio
   * entrava mudo e nunca chegava à tabela de preço.
   *
   * ⚠️ Entram como marca própria (e não como "chinesas"), porque a dedução de
   * marca usa a PRIMEIRA PALAVRA do título — e no Paraguai o anúncio escreve
   * "Geely Coolray", "Haval H6", "Changan Cs35".
   */
  geely: ["coolray", "emgrand", "geome", "okavango", "azkarra", "tugella", "starray", "cityray"],
  // ⚠️ GWM é o grupo; Haval é a marca que aparece no anúncio. Ver MARCA_CORRIGIDA.
  haval: ["h6 gt", "h6", "jolion", "h2", "h9", "dargo", "big dog"],
  "great wall": ["wingle 7", "wingle 5", "wingle", "poer", "steed"],
  changan: ["cs35 plus", "cs35", "cs55", "cs75", "alsvin", "eado", "hunter", "uni-t"],
  jac: ["s2", "s3", "s4", "t6", "t8", "e10x", "j3"],
  foton: ["tunland", "aumark", "gratour", "view"],
  // Daihatsu tinha 10 anúncios na base e 10 sem modelo — 100%.
  daihatsu: ["move", "terios", "mira", "hijet", "cuore", "rocky", "sirion", "copen", "tanto", "bego"],
  // ⚠️ MOTOS: entram na captacao (o Marketplace mistura) e precisam de marca
  // para nao caírem como "nao reconhecido". A tabela de preco vai separá-las
  // por aqui — moto e carro nao dividem curva.
  kenton: ["blitz", "bull", "dakar", "strada"],
  buler: ["buler"],
  skua: ["skua"],
  ktm: ["duke", "adventure", "890", "390"],
  yamaha: ["ybr", "fazer", "crypton", "xtz"],
  // ⚠️ Chave distinta de `honda` porque a Honda faz carro E moto, e um "CG" não
  // pode casar na lista de carros. Mas a chave é INTERNA: sem o apelido abaixo
  // ela vazava para a tela como marca "Honda_moto" — pego ao medir o backfill,
  // antes de gravar isso em 183 registros.
  honda_moto: ["crf", "cg", "xr", "titan", "bros", "pop", "biz"],
};

/**
 * ★★ O CATÁLOGO ENTRA EM TODAS AS MARCAS, não só na Toyota.
 *
 * ⚠⚠ O que estava quebrado: `MODELOS.toyota` recebia os 94 nomes do catálogo
 * inteiro, e as outras marcas ficavam só com a lista escrita à mão. As 10
 * entradas Mitsubishi do catálogo — pajero io, mini, junior, sport, full —
 * NUNCA eram consultadas para um anúncio Mitsubishi. Quem respondia era
 * `["pajero sport", "pajero", ...]`, e o alias genérico "pajero" canonizava
 * para "Pajero Full".
 *
 * Medido: Junior (1.1), Mini (kei 660cc) e io, TODOS viravam Pajero Full —
 * que é um SUV 3.2 diesel. Três carros distintos numa linha só da tabela.
 *
 * ⚠️ A ordenação por TAMANHO no fim não é arrumação: a busca é por maior
 * casamento, e é ela que faz "pajero junior" ganhar de "pajero". Sem isso o
 * conserto não conserta nada — a própria ficha do Pajero Full avisa no
 * catálogo: “deixar DEPOIS de pajero io/mini/junior/sport na busca”.
 */
for (const [marca, nomes] of Object.entries(NOMES_JDM_POR_MARCA)) {
  if (marca === "toyota") continue; // já entrou na definição acima
  const atual = MODELOS[marca] ?? [];
  MODELOS[marca] = [...new Set([...nomes, ...atual])].sort((a, b) => b.length - a.length);
}

/**
 * ⚠️ "NEW" É PREFIXO DE GERAÇÃO, NÃO MODELO. No Paraguai o importador escreve
 * "Toyota New Allion", "Toyota New Vitz", "Kia New Sportage" para dizer que é a
 * geração renovada. Hoje isso vira o modelo "New" — e é por isso que a base
 * mostra "Toyota New" com 14 unidades, o falso campeão de repetição.
 */
const PREFIXOS_GERACAO = /^(new|nueva|nuevo|all\s*new|the\s*new)\s+/i;

/**
 * ★★ MODELO ALFANUMÉRICO DAS ALEMÃS — padrão, não vocabulário.
 *
 * Mercedes, BMW e Audi nomeiam por letra+número ("C300", "C63", "E320",
 * "300d", "320d", "420i", "Q3", "X5"). Lista fixa nunca vai cobrir: a cada ano
 * nasce um. No primeiro teste, 7 dos 31 não reconhecidos eram exatamente isso.
 *
 * ⚠️ Só vale para as marcas que REALMENTE nomeiam assim. Soltar este padrão em
 * qualquer marca transformaria "1.5" e "150 Cc" em nome de modelo.
 */
/**
 * ★★ MODELO QUE É UM ANO — o caso Peugeot.
 *
 * ⚠️⚠️ O normalizador APAGA todos os números de 1990–2027 antes de procurar o
 * modelo, para que "Toyota New 2011 Ractis" não vire modelo "2011". Só que a
 * Peugeot batizou três carros de 208, 2008, 3008 e 5008 — e o apagador come o
 * nome do carro junto com o ano. Medido: 22 dos 39 Peugeot da base estavam sem
 * modelo, a maior taxa de qualquer marca.
 *
 * ★ A regra que desempata: o modelo é o número da lista que NÃO é o ano
 * detectado. "Peugeot 2008 2019" → ano 2019, modelo 2008. Quando só existe um
 * número e ele é o ano, fica ambíguo de verdade ("Peugeot 2008" pode ser o
 * carro ou o ano) e aí não se chuta — o anúncio segue sem modelo, que é a
 * política desta função.
 */
const MODELOS_NUMERICOS: Record<string, string[]> = {
  peugeot: ["5008", "3008", "2008", "508", "408", "308", "301", "208", "207", "206", "205"],
};

const MARCAS_ALFANUMERICAS = new Set(["mercedes-benz", "bmw", "audi", "volvo", "lexus", "infiniti"]);
const RX_MODELO_ALFANUMERICO = /^(?:[a-z]{1,3}\s?\d{2,3}[a-z]{0,3}|\d{3}[a-z]{1,3})$/i;

/** Marcas que vêm erradas ou escondidas no título paraguaio. */
/**
 * ⚠️ APELIDO DE EXIBIÇÃO para chaves INTERNAS do dicionário.
 *
 * Algumas chaves existem para separar listas que não podem se misturar — a
 * Honda faz carro e moto, e um "CG" não pode casar na lista de carros. Mas a
 * chave é detalhe de implementação: sem este mapa, "honda_moto" ia para a TELA
 * como nome de marca. Peguei medindo o backfill, antes de gravar em 183
 * registros.
 */
/**
 * ★★ GRAFIAS DO MESMO CARRO — o que o anunciante escreve de três jeitos.
 *
 * ⚠️⚠️ ACEITAR A VARIANTE SEM CANONIZAR É PIOR DO QUE NÃO ACEITAR. Ao admitir
 * "Xtrail" eu passaria a reconhecer 12 anúncios — e a criar uma SEGUNDA linha
 * na tabela, separada do "X-Trail" que já existia. Duas medianas com metade do
 * n cada é exatamente o defeito que o dicionário existe para evitar.
 *
 * ⚠️ Isto NÃO é tradução de nome (regra do Gustavo: Vitz não vira Yaris). É a
 * mesma palavra escrita com e sem hífen pelo mesmo mercado.
 *
 * ⚠️ "l200"/"triton": o anúncio paraguaio escreve os dois, às vezes no mesmo
 * título ("Mitsubishi L200 2015 Triton 2.5"). L200 é o nome da praça, então é
 * ele o canônico — senão o grupo racha em dois.
 */
const ALIAS_CANONICO: Record<string, string> = {
  xtrail: "x-trail", "x trail": "x-trail",
  hrv: "hr-v", crv: "cr-v", wrv: "wr-v", brv: "br-v",
  tcross: "t-cross", "t cross": "t-cross",
  f150: "f-150", "f 150": "f-150",
  h1: "h-1",
  triton: "l200",
  // Mercedes: a lista já usa "c-class"/"e-class"; as SUV ficam no mesmo padrão.
  gla: "gla-class", glb: "glb-class", glc: "glc-class", gle: "gle-class", gls: "gls-class",
};

const APELIDO_MARCA: Record<string, string> = {
  honda_moto: "Honda",
};

const MARCA_CORRIGIDA: Record<string, string> = {
  // ⚠️⚠️ "LAND CRUISER" VIRAVA LAND ROVER. Quando o título omite a marca
  // ("Land Cruiser 2025 Prado"), a dedução olha a primeira palavra e procura
  // uma marca que comece com ela — "land rover" começa com "land". Resultado
  // medido: 14 dos 20 anúncios marcados Land Rover na base eram Toyota, e
  // nenhum deles tinha modelo (a lista da Land Rover não tem Cruiser nenhum).
  "land cruiser": "Toyota", landcruiser: "Toyota",
  // "Mercedes Benz 2013 C180": sem isto a marca saía vazia, e sem marca o
  // padrão alfanumérico das alemãs (que é quem lê "C180") nem era consultado.
  "mercedes benz": "Mercedes-Benz",
  // GWM é o grupo; o anúncio escreve "Gwm Haval ... H6 Gt".
  gwm: "Haval", "great wall motors": "Great Wall",
  camaro: "Chevrolet", silverado: "Chevrolet",
  "range rover": "Land Rover", "range": "Land Rover",
  mustang: "Ford", challenger: "Dodge",
  "mercedes-benz benz": "Mercedes-Benz", benz: "Mercedes-Benz",
  dahiatsu: "Daihatsu", daihatsu: "Daihatsu",
  pajerito: "Mitsubishi",
};

/**
 * ★★ COMO O NOME DO MODELO VAI PARA A TELA.
 *
 * ⚠️ O dicionário é todo em minúscula (é chave de busca), e o title-case
 * genérico que servia para marca e versão escreve "Hb20", "Hr-V", "Cs35" e
 * "Gla-Class" — nenhum fabricante escreve assim, e no card isso passa a
 * impressão de dado raspado sem cuidado. São 85 das 296 grafias da base.
 *
 * ⚠️ REGRA, NÃO LISTA: um mapa de exceções envelheceria a cada marca nova (a
 * frota chinesa trouxe CS35, H6, S2 de uma vez). O que estes nomes têm em
 * comum é a FORMA — sigla colada a número, sigla com hífen, "-class".
 *
 * ⚠️ A letra final minúscula em "C220d" é de propósito: é assim que a Mercedes
 * escreve o diesel, e é como aparece no anúncio paraguaio.
 */
const SIGLAS_SOLTAS = new Set(["gt", "gl", "gls", "glx", "gti", "gtr", "rs", "amg", "dmi", "phev", "hev", "cdi", "crdi", "tdi", "4x4"]);

export function exibirModelo(nome: string): string {
  return nome
    .split(" ")
    .map((tok) => {
      if (SIGLAS_SOLTAS.has(tok)) return tok.toUpperCase();
      if (/^[a-z]{1,3}-class$/.test(tok)) return tok.slice(0, tok.indexOf("-")).toUpperCase() + "-Class";
      if (/^[a-z]{1,3}-[a-z]$/.test(tok)) return tok.toUpperCase();         // hr-v, cr-v, wr-v
      if (/^[a-z]{1,3}-\d+$/.test(tok)) return tok.toUpperCase();           // f-150, h-1, vr-4
      const siglaNumero = tok.match(/^([a-z]{1,3})(\d+)([a-z]{0,3})$/);
      if (siglaNumero) {
        const [, sigla, numero, sufixo] = siglaNumero;
        // ⚠️ O "d" solto fica minúsculo porque é o diesel da nomenclatura alemã
        // ("C220d", "GLA220d") — é assim que a Mercedes escreve e é assim que o
        // anúncio paraguaio copia. Qualquer outro sufixo é sigla: HB20X, HB20S.
        return sigla.toUpperCase() + numero + (sufixo === "d" ? "d" : sufixo.toUpperCase());
      }
      if (/^\d+[a-z]{2,4}$/.test(tok)) return tok.replace(/[a-z]+$/, (x) => x.toUpperCase()); // 180cdi
      // ⚠️ Exige DUAS letras depois do número: "4runner" vira 4Runner, mas o
      // "i" solto do BMW 316i fica minúsculo — é injeção, não inicial de nome.
      if (/^\d/.test(tok)) return tok.replace(/^(\d+)([a-z])(?=[a-z])/, (_, d, c) => d + c.toUpperCase());
      return tok.replace(/\b[a-z]/g, (c) => c.toUpperCase());
    })
    .join(" ");
}

export interface VeiculoPY {
  marca: string | null;
  modelo: string | null;
  /** O que sobrou depois do modelo: motor, trim, tração. */
  versao: string | null;
  ano: number | null;
  /** Como a gente agrupa na tabela de preço: "toyota|corolla axio". */
  chaveAgrupamento: string | null;
  /** Van de luxo e hatch não dividem curva de preço. Null quando não é JDM. */
  segmento: SegmentoPY | null;
}

/** Tira o ruído paraguaio e devolve o texto limpo. */
export function limparRuidoPY(texto: string): string {
  let t = " " + String(texto ?? "") + " ";
  for (const rx of RUIDO_PY) t = t.replace(rx, " ");
  return t.replace(/[+]/g, " ").replace(/\s+/g, " ").trim();
}

/** Acha o ano em qualquer posição do texto (1990–2027). */
export function extrairAno(texto: string): number | null {
  const anos = [...String(texto ?? "").matchAll(/\b(19[89]\d|20[0-2]\d)\b/g)].map((m) => Number(m[1]));
  if (!anos.length) return null;
  // ⚠️ O MAIOR, não o primeiro: "Toyota New Ractis Importado 2010 Motor 1.5 20
  // 2010" tem o ano duas vezes, e títulos com "15 Millones" já deixaram number
  // solto antes. O ano do carro é sempre o maior plausível do título.
  return Math.max(...anos.filter((a) => a >= 1990 && a <= new Date().getFullYear() + 1));
}

/**
 * Extrai marca, modelo e versão de um título paraguaio.
 *
 * ⚠️ Devolve `modelo: null` quando não reconhece — DE PROPÓSITO. Chutar o
 * modelo é pior que admitir que não sabe: um palpite errado entra na mediana e
 * contamina a referência de preço, que é o produto. O que não casa fica de fora
 * da tabela e aparece no relatório para a lista crescer com dado, não com
 * suposição.
 */
export function normalizarVeiculoPY(titulo: string, marcaBruta?: string | null, descricao?: string | null): VeiculoPY {
  const ano = extrairAno(titulo);
  let limpo = limparRuidoPY(titulo);
  // ⚠️ Guarda o texto COM os números antes de apagá-los: é nele que o modelo
  // numérico da Peugeot ainda existe (ver MODELOS_NUMERICOS).
  const comNumeros = chave(limpo);
  limpo = limpo.replace(/\b(19[89]\d|20[0-2]\d)\b/g, " ").replace(/\s+/g, " ").trim();
  limpo = limpo.replace(PREFIXOS_GERACAO, "");

  const k = chave(limpo);

  // marca: a declarada, ou deduzida do próprio texto
  let marca = marcaBruta ? String(marcaBruta).trim() : "";
  if (chave(marca) === "moto") marca = "";                       // "Moto Kenton" → a marca é Kenton
  if (!marca) {
    for (const [padrao, correta] of Object.entries(MARCA_CORRIGIDA)) {
      if (k.startsWith(padrao + " ") || k === padrao) { marca = correta; break; }
    }
  }
  if (!marca) {
    const primeira = k.split(" ")[0] ?? "";
    const achou = Object.keys(MODELOS).find((m) => m === primeira || m.startsWith(primeira + " "));
    if (achou) marca = achou;
  }
  const marcaK = chave(marca).replace(/\s+/g, " ");

  // modelo: maior casamento dentro da lista da marca; se a marca não tem lista,
  // tenta TODAS (o título paraguaio às vezes omite a marca: "Camaro 2ss 2018").
  // ⚠️ Percorre as marcas COM O NOME, não só as listas: quando o título omite a
  // marca ("Camaro 2ss 2018") ou a enterra em lixo ("15.500 000 0994810323
  // Mitsubishi pajerito"), o modelo encontrado é quem revela a marca. Antes eu
  // exigia as duas e descartava o registro — perdia dado por formalidade.
  const candidatas: [string, string[]][] = MODELOS[marcaK]
    ? [[marcaK, MODELOS[marcaK]]]
    : Object.entries(MODELOS);
  let modelo: string | null = null;
  const procurar = (pares: [string, string[]][]): readonly [string, string] | null => {
    for (const [nomeMarca, lista] of pares) {
      const ordenada = [...lista].sort((a, b) => b.length - a.length); // maior primeiro
      const achado = ordenada.find((m) => new RegExp(`(^|\\s)${m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`, "i").test(k));
      if (achado) return [achado, nomeMarca] as const;
    }
    return null;
  };
  const naMarca = procurar(candidatas);
  if (naMarca) { modelo = naMarca[0]; if (!marca) marca = naMarca[1]; }

  /**
   * ⚠️⚠️ SEGUNDA PASSADA EM TODAS AS MARCAS quando a marca DEDUZIDA não
   * explicou o modelo. A dedução olha só a primeira palavra do título e erra
   * com facilidade — foi assim que "Land Cruiser" caiu na lista da Land Rover,
   * não achou modelo nenhum e o anúncio ficou mudo (14 dos 20 "Land Rover" da
   * base eram Toyota). Buscar em todas já se fazia quando NÃO havia marca;
   * faltava fazer quando a marca era um palpite nosso e não bateu.
   *
   * ⚠️ Só vale para marca DEDUZIDA. Marca declarada pelo anunciante manda: se
   * ele disse Kia e o modelo não está na lista da Kia, o certo é ficar sem
   * modelo e aparecer no relatório — não sair procurando nome em outra marca.
   */
  if (!modelo && !marcaBruta && marca) {
    const emTodas = procurar(Object.entries(MODELOS).filter(([m]) => m !== marcaK));
    if (emTodas) { modelo = emTodas[0]; marca = emTodas[1]; }
  }

  // Modelo numérico (Peugeot): procura no texto que ainda tem os números e só
  // aceita o que NÃO é o ano detectado. Ver MODELOS_NUMERICOS.
  if (!modelo) {
    const numericos = MODELOS_NUMERICOS[chave(marca)] ?? [];
    const achadoNum = numericos.find(
      (n) => Number(n) !== ano && new RegExp(`(^|\\s)${n}(\\s|$)`).test(comNumeros)
    );
    if (achadoNum) modelo = achadoNum;
  }

  // alfanumérico das alemãs, quando a lista não cobriu
  if (!modelo && MARCAS_ALFANUMERICAS.has(chave(marca))) {
    const tok = k.replace(chave(marca), " ").split(/\s+/).filter(Boolean)
      .find((w) => RX_MODELO_ALFANUMERICO.test(w));
    if (tok) modelo = tok;
  }

  /**
   * ★★★ ÚLTIMO RECURSO: O CARRO ESTÁ NA DESCRIÇÃO, NÃO NO TÍTULO.
   *
   * ⚠️ O caso que o Gustavo viu na própria tela (14/10/2026): um card com o
   * título "2012" e mais nada. O anunciante escreveu só o ano no título e
   * "BMW X5 | DEL REPRESENTANTE" no corpo do anúncio. O carro estava lá o
   * tempo todo, num campo que o normalizador nunca abria.
   *
   * ⚠️⚠️ A REGRA QUE TORNA ISTO SEGURO: só aceita quando a descrição inteira
   * aponta para UM ÚNICO modelo. Medido nos 461 sem modelo da vitrine — 164
   * têm exatamente um, e 18 têm vários. Esses 18 são o veneno: texto de loja
   * com "también tenemos Corolla, Vitz, Ractis" transformaria o anúncio num
   * carro sorteado. Um deles citava "Chevrolet S10" e "Kenton Dakar" — carro e
   * moto no mesmo parágrafo.
   *
   * ⚠️ Varre FRASE A FRASE e não o texto inteiro de uma vez: o casamento por
   * maior palavra atravessaria a pontuação e colaria "Corolla" de uma frase
   * com "Cross" da seguinte.
   *
   * ⚠️ A chamada interna NÃO passa descrição — recursão de profundidade 1,
   * que termina sempre.
   *
   * ⚠️⚠️⚠️ MODELO PURAMENTE NUMÉRICO NÃO VALE AQUI — e isto não é precaução,
   * é conserto de um estrago que eu mesmo causei em 14/10/2026.
   *
   * Um "Renault Express 2023" e dois "Peugeot 2008" foram publicados no site
   * como **KTM 890**. A causa: a descrição dizia "Precio: $5.890.000", o
   * separador de milhar virou espaço na limpeza, e o token "890" casou com o
   * modelo 890 da KTM. Preço, quilometragem e telefone viram números soltos
   * em qualquer descrição paraguaia — num título o número tem contexto, numa
   * descrição de loja ele é ruído garantido.
   *
   * ★ O título SEGUE aceitando numérico (Peugeot 2008, KTM 890, BMW 320):
   * lá o número É o nome do carro. A regra vale só para esta passada.
   */
  if (!modelo && descricao) {
    const achados = new Map<string, string>();
    for (const frase of String(descricao).split(/[.!?\n·|•]+/)) {
      if (frase.trim().length < 3) continue;
      const v = normalizarVeiculoPY(frase);
      if (v.modelo && /^\d+$/.test(chave(v.modelo))) continue;
      if (v.modelo) achados.set(`${v.marca ?? ""}|${v.modelo}`, v.modelo);
    }
    if (achados.size === 1) {
      const [[chaveAchada, modeloAchado]] = [...achados.entries()];
      modelo = chave(modeloAchado);
      // A marca vem junto: foi ela que identificou o modelo lá na descrição.
      if (!marcaBruta) marca = chaveAchada.split("|")[0] || marca;
    }
  }

  // versão: o que sobra depois de tirar marca e modelo
  let versao: string | null = null;
  if (modelo) {
    versao = k
      .replace(new RegExp(`(^|\\s)${modelo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`, "i"), " ")
      .replace(new RegExp(`(^|\\s)${marcaK.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`, "i"), " ")
      .replace(/\s+/g, " ").trim() || null;
  }

  const titlecase = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

  // ★ Nome CANÔNICO: "axio" e "corolla axio" são o mesmo carro e têm que cair
  // no mesmo grupo, senão a mediana se divide em dois n pequenos.
  // ⚠️ ALIAS_CANONICO vem DEPOIS do catálogo e trata a grafia fora do JDM —
  // sem ele, as variantes que acabei de aceitar criariam o problema que o
  // dicionário existe para resolver (Xtrail separado de X-Trail).
  const canonico = ALIAS_CANONICO[chave(modelo ?? "")] ?? canonicoJdm(modelo) ?? modelo;

  // ⚠️ A marca VEM DA FICHA quando o modelo é do catálogo. O normalizador
  // injeta a lista inteira do catálogo dentro da lista da Toyota, então sem
  // isto uma Delica viraria "Toyota Delica" e um Morning, "Toyota Morning".
  const marcaFicha = marcaJdm(modelo);
  if (marcaFicha) marca = marcaFicha;
  const marcaFinal = chave(marca).replace(/\s+/g, " ");

  const marcaExibida = APELIDO_MARCA[chave(marca)] ?? marca;

  return {
    marca: marcaExibida ? titlecase(marcaExibida) : null,
    modelo: canonico ? exibirModelo(canonico) : null,
    segmento: segmentoJdm(modelo),
    versao: versao ? titlecase(versao).slice(0, 40) : null,
    ano,
    chaveAgrupamento: marca && canonico ? `${marcaFinal}|${chave(canonico)}` : null,
  };
}
