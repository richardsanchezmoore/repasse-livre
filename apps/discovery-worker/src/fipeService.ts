import type { ReferenciaFipe } from "./types.js";

const FIPE_BASE_URL = "https://parallelum.com.br/fipe/api/v2/cars";

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

async function fetchJson<T>(url: string): Promise<T> {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Falha ao consultar FIPE (${resp.status}): ${url}`);
  }
  return resp.json() as Promise<T>;
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
 * Busca a referência FIPE mais próxima para marca/modelo/ano informados.
 * A correspondência é por aproximação textual (a OLX não usa os mesmos
 * nomes exatos da tabela FIPE), por isso pode não encontrar resultado.
 */
export async function buscarReferenciaFipe(
  marca: string,
  modelo: string,
  ano: string
): Promise<ReferenciaFipe | null> {
  const marcas = await fetchJson<FipeMarca[]>(`${FIPE_BASE_URL}/brands`);
  const marcaEncontrada = encontrarMelhorCorrespondencia(marcas, marca);
  if (!marcaEncontrada) return null;

  const modelos = await fetchJson<FipeModelo[]>(
    `${FIPE_BASE_URL}/brands/${marcaEncontrada.code}/models`
  );
  const modeloEncontrado = encontrarMelhorCorrespondencia(modelos, modelo, 2);
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
