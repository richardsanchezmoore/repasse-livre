const FIPE_BASE_URL = "https://fipe.parallelum.com.br/api/v2/cars";
const FIPE_API_KEY = process.env.FIPE_API_KEY;

export interface FipeOpcao {
  code: string;
  name: string;
}

interface FipeValorResposta {
  price: string; // ex: "R$ 79.900,00"
  referenceMonth: string;
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

export function listarMarcasFipe(): Promise<FipeOpcao[]> {
  return fetchJson<FipeOpcao[]>(`${FIPE_BASE_URL}/brands`);
}

export function listarModelosFipe(marcaCode: string): Promise<FipeOpcao[]> {
  return fetchJson<FipeOpcao[]>(`${FIPE_BASE_URL}/brands/${marcaCode}/models`);
}

export function listarAnosFipe(marcaCode: string, modeloCode: string): Promise<FipeOpcao[]> {
  return fetchJson<FipeOpcao[]>(`${FIPE_BASE_URL}/brands/${marcaCode}/models/${modeloCode}/years`);
}

export async function buscarValorFipe(
  marcaCode: string,
  modeloCode: string,
  anoCode: string
): Promise<{ valor: number; mesReferencia: string }> {
  const resposta = await fetchJson<FipeValorResposta>(
    `${FIPE_BASE_URL}/brands/${marcaCode}/models/${modeloCode}/years/${anoCode}`
  );
  return {
    valor: parsePrecoFipe(resposta.price),
    mesReferencia: resposta.referenceMonth,
  };
}
