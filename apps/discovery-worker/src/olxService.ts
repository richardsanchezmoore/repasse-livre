import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AnuncioOlx } from "./types.js";

const execFileAsync = promisify(execFile);

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

interface PropriedadeOlx {
  name: string;
  value: string;
}

interface AdOlx {
  subject: string;
  price: string;
  url: string;
  description?: string;
  location?: string;
  images?: { original: string }[];
  properties?: PropriedadeOlx[];
  locationDetails?: { uf?: string; municipality?: string };
}

interface NextDataOlx {
  props: {
    pageProps: {
      ads: AdOlx[];
    };
  };
}

function buscarPropriedade(properties: PropriedadeOlx[] | undefined, nome: string): string | null {
  return properties?.find((p) => p.name === nome)?.value ?? null;
}

function parsePreco(precoTexto: string | undefined): number {
  if (!precoTexto) return 0;
  const numerico = precoTexto.replace("R$", "").trim().replace(/\./g, "").replace(",", ".");
  return Number.parseFloat(numerico) || 0;
}

function mapearAnuncio(ad: AdOlx): AnuncioOlx {
  return {
    titulo: ad.subject,
    marca: buscarPropriedade(ad.properties, "vehicle_brand"),
    modelo: buscarPropriedade(ad.properties, "vehicle_model"),
    ano: buscarPropriedade(ad.properties, "regdate"),
    cambio: buscarPropriedade(ad.properties, "gearbox"),
    preco: parsePreco(ad.price),
    cidade: ad.locationDetails?.municipality ?? ad.location ?? null,
    estado: ad.locationDetails?.uf ?? null,
    fotoPrincipal: ad.images?.[0]?.original ?? null,
    fotosSecundarias: (ad.images ?? []).slice(1).map((img) => img.original),
    descricao: ad.description ?? null,
    linkOrigem: ad.url,
  };
}

/**
 * Busca o HTML da página via curl.
 *
 * O fetch nativo do Node (undici) recebe 403 da proteção anti-bot da OLX,
 * mesmo enviando os mesmos headers que o curl envia com sucesso (200) —
 * a barreira filtra por fingerprint de TLS/HTTP do cliente, não só pelos
 * headers. Por isso o transporte usa curl como subprocesso. Isso exige que
 * o ambiente de execução (Railway/VPS) tenha curl disponível.
 */
async function buscarHtml(url: string): Promise<string> {
  const { stdout } = await execFileAsync("curl", [
    "-s",
    "-A",
    USER_AGENT,
    "-H",
    "Accept-Language: pt-BR,pt;q=0.9",
    "-H",
    "Referer: https://www.olx.com.br/",
    url,
  ], { maxBuffer: 1024 * 1024 * 20 });
  return stdout;
}

/**
 * Busca uma página de listagem da OLX e extrai os anúncios a partir do
 * JSON estruturado embutido no HTML (__NEXT_DATA__), sem precisar de
 * parsing de DOM ou browser headless.
 */
export async function capturarAnunciosOlx(categoriaUrl: string): Promise<AnuncioOlx[]> {
  const html = await buscarHtml(categoriaUrl);

  const match = html.match(/__NEXT_DATA__"\s*type="application\/json">(.*?)<\/script>/s);
  if (!match) {
    throw new Error("Não foi possível localizar __NEXT_DATA__ na página da OLX.");
  }

  const data = JSON.parse(match[1]) as NextDataOlx;
  const anunciosValidos = data.props.pageProps.ads.filter((ad) => ad.subject && ad.url && ad.price);
  return anunciosValidos.map(mapearAnuncio);
}
