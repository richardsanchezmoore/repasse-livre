import type { ReferenciaFipe } from "./types.js";

const FIPE_BASE_URL = "https://fipe.parallelum.com.br/api/v2/cars";
const FIPE_API_KEY = process.env.FIPE_API_KEY;

interface FipeMarca {
  code: string;
  name: string;
}

interface FipeModelo {
  code: string;
  name: string;
}

interface FipeAno {
  code: string;
  name: string;
}

interface FipeValor {
  price: string; // ex: "R$ 79.900,00"
  referenceMonth: string;
}

const DIACRITICOS = /[̀-ͯ]/g;

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(DIACRITICOS, "").toLowerCase().trim();
}

function parsePrecoFipe(precoTexto: string): number {
  const numerico = precoTexto
    .replace("R$", "")
    .trim()
    .replace(/\./g, "")
    .replace(",", ".");
  return Number.parseFloat(numerico);
}

function aguardar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** A API pública da FIPE limita por taxa (429) sob volume; uma pequena espera com retentativas resolve a maioria dos casos. */
async function fetchJson<T>(url: string, tentativa = 1): Promise<T> {
  const resp = await fetch(url, {
    headers: FIPE_API_KEY ? { Authorization: `Bearer ${FIPE_API_KEY}` } : undefined,
  });

  if (resp.status === 429 && tentativa <= 3) {
    await aguardar(500 * tentativa);
    return fetchJson<T>(url, tentativa + 1);
  }

  if (!resp.ok) {
    throw new Error(`Falha ao consultar FIPE (${resp.status}): ${url}`);
  }
  return resp.json() as Promise<T>;
}

const cacheModelosPorMarca = new Map<string, Promise<FipeModelo[]>>();
let cacheMarcas: Promise<FipeMarca[]> | null = null;

/** A lista de marcas e a de modelos por marca não mudam durante uma execução, então ficam em cache em memória. */
function buscarMarcas(): Promise<FipeMarca[]> {
  if (!cacheMarcas) {
    cacheMarcas = fetchJson<FipeMarca[]>(`${FIPE_BASE_URL}/brands`);
  }
  return cacheMarcas;
}

function buscarModelos(marcaCode: string): Promise<FipeModelo[]> {
  let promessa = cacheModelosPorMarca.get(marcaCode);
  if (!promessa) {
    promessa = fetchJson<FipeModelo[]>(`${FIPE_BASE_URL}/brands/${marcaCode}/models`);
    cacheModelosPorMarca.set(marcaCode, promessa);
  }
  return promessa;
}

function tokenizar(texto: string): Set<string> {
  return new Set(normalizar(texto).split(/\s+/).filter((palavra) => palavra.length >= 2));
}

/**
 * Pontua por sobreposição de palavras (não exige substring exata), porque o
 * texto livre da OLX nem sempre usa os mesmos termos da FIPE — ex: a FIPE
 * cataloga a Evoque como "Range Rover Evoque", enquanto a OLX usa "Land
 * Rover Evoque" para o mesmo veículo.
 */
function encontrarMelhorCorrespondencia<T extends { name: string }>(
  itens: T[],
  textoBusca: string,
  pontuacaoMinima = 1
): T | null {
  const busca = normalizar(textoBusca);

  const exato = itens.find((item) => normalizar(item.name) === busca);
  if (exato) return exato;

  const tokensBusca = tokenizar(textoBusca);
  if (tokensBusca.size === 0) return null;

  let melhor: T | null = null;
  let melhorPontuacao = 0;

  for (const item of itens) {
    const tokensItem = tokenizar(item.name);
    let pontuacao = 0;
    for (const token of tokensItem) {
      if (tokensBusca.has(token)) pontuacao++;
    }
    if (pontuacao > melhorPontuacao) {
      melhorPontuacao = pontuacao;
      melhor = item;
    }
  }

  return melhorPontuacao >= pontuacaoMinima ? melhor : null;
}

/**
 * O nome do modelo (ex.: "Q3") é "sagrado": todo token dele precisa
 * aparecer no nome do item da FIPE antes de qualquer pontuação por
 * variante. Sem essa restrição, uma variante/trim genérico (ex.: "Prestige
 * Plus") pode arrastar a busca pra outro modelo da mesma marca que também
 * tenha essa variante — ex.: "Q3 P. Plus 1.4 TFSI Flex/P.Plus S-tronic"
 * abrevia "Prestige" pra "P.", então sem esse filtro a palavra "Prestige"
 * escrita por extenso em "A3 Sedan Prestige Plus 1.4 TFSI Flex Tip" pontua
 * mais alto e rouba a correspondência do Q3 certo.
 */
function encontrarMelhorCorrespondenciaModeloVariante<T extends { name: string }>(
  itens: T[],
  modelo: string,
  variante: string | null,
  pontuacaoMinima = 1
): T | null {
  const tokensModelo = tokenizar(modelo);
  const candidatos = itens.filter((item) => {
    const tokensItem = tokenizar(item.name);
    for (const token of tokensModelo) if (!tokensItem.has(token)) return false;
    return true;
  });

  const baseCandidatos = candidatos.length > 0 ? candidatos : itens;
  return encontrarMelhorCorrespondencia(baseCandidatos, `${modelo} ${variante ?? ""}`.trim(), pontuacaoMinima);
}

/**
 * Busca a referência FIPE mais próxima para marca/modelo/ano informados.
 * A correspondência é por aproximação textual (a OLX não usa os mesmos
 * nomes exatos da tabela FIPE), por isso pode não encontrar resultado.
 * `variante` é opcional — quando informada (ex.: motorização/trim vindos
 * separados do nome do modelo, como na Webmotors), ajuda a desambiguar
 * entre versões do mesmo modelo sem arriscar roubar a correspondência de
 * outro modelo da marca (ver encontrarMelhorCorrespondenciaModeloVariante).
 */
export async function buscarReferenciaFipe(
  marca: string,
  modelo: string,
  ano: string,
  variante: string | null = null
): Promise<ReferenciaFipe | null> {
  const marcas = await buscarMarcas();
  const marcaEncontrada = encontrarMelhorCorrespondencia(marcas, marca);
  if (!marcaEncontrada) return null;

  const modelos = await buscarModelos(marcaEncontrada.code);
  const modeloEncontrado = encontrarMelhorCorrespondenciaModeloVariante(modelos, modelo, variante, 2);
  if (!modeloEncontrado) return null;

  const anos = await fetchJson<FipeAno[]>(
    `${FIPE_BASE_URL}/brands/${marcaEncontrada.code}/models/${modeloEncontrado.code}/years`
  );
  const anoEncontrado =
    anos.find((item) => item.name.startsWith(ano)) ?? anos.find((item) => item.name.includes(ano));
  if (!anoEncontrado) return null;

  const valor = await fetchJson<FipeValor>(
    `${FIPE_BASE_URL}/brands/${marcaEncontrada.code}/models/${modeloEncontrado.code}/years/${anoEncontrado.code}`
  );

  return {
    marca: marcaEncontrada.name,
    modelo: modeloEncontrado.name,
    ano: anoEncontrado.name,
    valor: parsePrecoFipe(valor.price),
    mesReferencia: valor.referenceMonth,
  };
}
