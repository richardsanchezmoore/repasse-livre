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
import { NOMES_JDM, canonicoJdm, segmentoJdm, type SegmentoPY } from "./catalogoJdmParaguai.js";

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
    ...NOMES_JDM,
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
  honda: ["hr-v", "cr-v", "civic", "fit", "accord", "city", "jazz", "vezel", "s2000", "crx"],
  nissan: ["x-trail", "qashqai", "navara", "frontier", "sunny", "march", "note", "tiida", "sentra", "kicks", "juke"],
  mitsubishi: ["pajero sport", "pajero", "pajerito", "l200", "outlander", "lancer", "asx", "montero"],
  suzuki: ["grand vitara", "swift", "vitara", "jimny", "baleno", "alto"],
  subaru: ["forester", "impreza", "outback", "legacy", "justy", "xv"],
  hyundai: ["santa fe", "grand santa fe", "tucson", "accent", "elantra", "creta", "venue", "veloster", "i10", "i30", "hb20"],
  kia: ["grand carnival", "sportage", "sorento", "picanto", "cerato", "carnival", "rio", "seltos", "soul", "stonic"],
  chevrolet: ["grand blazer", "silverado", "captiva", "camaro", "spark", "onix", "cruze", "tracker", "s10", "blazer", "corsa", "celta", "prisma", "equinox"],
  ford: ["grand c-max", "explorer", "mustang", "ranger", "escape", "edge", "fusion", "focus", "fiesta", "f-150", "ecosport", "territory", "bronco"],
  volkswagen: ["golf gti", "amarok", "saveiro", "voyage", "parati", "tiguan", "touareg", "jetta", "passat", "polo", "virtus", "nivus", "t-cross", "golf", "gol", "fox", "up"],
  jeep: ["grand cherokee", "wrangler unlimited", "wrangler", "cherokee", "compass", "renegade", "rubicon", "commander", "gladiator"],
  "mercedes-benz": [
    "c-class", "e-class", "s-class", "a-class", "glc", "gle", "gla", "glb", "gls", "gl",
    "sprinter", "vito", "viano", "clk", "cla", "slk", "amg gt",
  ],
  bmw: ["serie 1", "serie 3", "serie 5", "x1", "x3", "x4", "x5", "x6", "x7", "z4", "i3", "i8", "m3", "m4"],
  audi: ["q2", "q3", "q5", "q7", "q8", "a1", "a3", "a4", "a5", "a6", "a7", "a8", "tt", "rs3", "rs6"],
  "land rover": ["range rover sport", "range rover evoque", "range rover velar", "range rover", "discovery", "defender", "freelander"],
  porsche: ["cayenne", "macan", "panamera", "boxster", "cayman", "911"],
  volvo: ["xc90", "xc60", "xc40", "s60", "v40"],
  mini: ["cooper s", "cooper", "countryman", "clubman"],
  fiat: ["strada", "toro", "cronos", "argo", "mobi", "uno", "palio", "siena", "doblo", "ducato"],
  renault: ["kangoo", "duster", "sandero", "logan", "captur", "master", "oroch"],
  peugeot: ["partner", "208", "2008", "3008", "308", "205", "206", "207"],
  dodge: ["challenger", "charger", "durango", "journey", "ram"],
  byd: ["song plus", "yuan plus", "dolphin", "seal", "song", "yuan", "han", "tang"],
  jetour: ["dashing", "x70", "x90", "t2"],
  chery: ["tiggo 7", "tiggo 8", "tiggo 2", "tiggo", "arrizo"],
  scania: ["g480", "r450", "p310"],
  // ⚠️ MOTOS: entram na captacao (o Marketplace mistura) e precisam de marca
  // para nao caírem como "nao reconhecido". A tabela de preco vai separá-las
  // por aqui — moto e carro nao dividem curva.
  kenton: ["blitz", "bull", "dakar", "strada"],
  buler: ["buler"],
  skua: ["skua"],
  ktm: ["duke", "adventure", "890", "390"],
  yamaha: ["ybr", "fazer", "crypton", "xtz"],
  honda_moto: ["crf", "cg", "xr", "titan", "bros"],
};

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
const MARCAS_ALFANUMERICAS = new Set(["mercedes-benz", "bmw", "audi", "volvo", "lexus", "infiniti"]);
const RX_MODELO_ALFANUMERICO = /^(?:[a-z]{1,3}\s?\d{2,3}[a-z]{0,3}|\d{3}[a-z]{1,3})$/i;

/** Marcas que vêm erradas ou escondidas no título paraguaio. */
const MARCA_CORRIGIDA: Record<string, string> = {
  camaro: "Chevrolet", silverado: "Chevrolet",
  "range rover": "Land Rover", "range": "Land Rover",
  mustang: "Ford", challenger: "Dodge",
  "mercedes-benz benz": "Mercedes-Benz", benz: "Mercedes-Benz",
  dahiatsu: "Daihatsu", daihatsu: "Daihatsu",
  pajerito: "Mitsubishi",
};

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
export function normalizarVeiculoPY(titulo: string, marcaBruta?: string | null): VeiculoPY {
  const ano = extrairAno(titulo);
  let limpo = limparRuidoPY(titulo);
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
  for (const [nomeMarca, lista] of candidatas) {
    const ordenada = [...lista].sort((a, b) => b.length - a.length); // maior primeiro
    const achado = ordenada.find((m) => new RegExp(`(^|\\s)${m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`, "i").test(k));
    if (achado) { modelo = achado; if (!marca) marca = nomeMarca; break; }
  }

  // alfanumérico das alemãs, quando a lista não cobriu
  if (!modelo && MARCAS_ALFANUMERICAS.has(chave(marca))) {
    const tok = k.replace(chave(marca), " ").split(/\s+/).filter(Boolean)
      .find((w) => RX_MODELO_ALFANUMERICO.test(w));
    if (tok) modelo = tok;
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
  const canonico = canonicoJdm(modelo) ?? modelo;

  return {
    marca: marca ? titlecase(marca) : null,
    modelo: canonico ? titlecase(canonico) : null,
    segmento: segmentoJdm(modelo),
    versao: versao ? titlecase(versao).slice(0, 40) : null,
    ano,
    chaveAgrupamento: marca && canonico ? `${marcaK}|${chave(canonico)}` : null,
  };
}
