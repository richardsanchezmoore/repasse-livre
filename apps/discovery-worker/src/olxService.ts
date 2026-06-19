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
  date?: number; // epoch em segundos
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
    dataPublicacao: ad.date ?? null,
  };
}

/**
 * Monta a URL de uma página de listagem ordenada por data (mais recentes
 * primeiro, parâmetro `sf=1`), na página indicada (`o=N`). A ordenação por
 * data é o que permite a varredura incremental parar assim que encontra um
 * anúncio já conhecido, sem precisar reler tudo a cada execução.
 */
export function montarUrlPagina(categoriaUrl: string, pagina: number): string {
  const url = new URL(categoriaUrl);
  url.searchParams.set("sf", "1");
  url.searchParams.set("o", String(pagina));
  return url.toString();
}

const ID_FILTRO_FIPE = "fipe_price_discount_level";
const QS_FALLBACK_FIPE = "fpdll";

/**
 * Resolve dinamicamente a chave de query string do filtro nativo da OLX
 * "Ofertas abaixo da FIPE" (hoje `fpdll`), lendo a definição do filtro
 * embutida na própria página em vez de fixar a chave no código. Se a OLX
 * renomear esse parâmetro no futuro, a varredura se adapta sozinha; se a
 * leitura falhar por qualquer motivo, cai no valor conhecido como
 * fallback, para nunca travar a varredura por isso.
 */
export async function resolverChaveFiltroFipe(categoriaUrlBase: string): Promise<string> {
  try {
    const html = await buscarHtml(categoriaUrlBase);
    const idx = html.indexOf(`"id":"${ID_FILTRO_FIPE}"`);
    if (idx === -1) return QS_FALLBACK_FIPE;

    const trecho = html.slice(idx, idx + 600);
    const match = trecho.match(/"qs":"([^"]+)"/);
    return match ? match[1] : QS_FALLBACK_FIPE;
  } catch {
    return QS_FALLBACK_FIPE;
  }
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
export async function capturarAnunciosOlx(paginaUrl: string): Promise<AnuncioOlx[]> {
  const html = await buscarHtml(paginaUrl);

  const match = html.match(/__NEXT_DATA__"\s*type="application\/json">(.*?)<\/script>/s);
  if (!match) {
    throw new Error("Não foi possível localizar __NEXT_DATA__ na página da OLX.");
  }

  const data = JSON.parse(match[1]) as NextDataOlx;
  const anunciosValidos = data.props.pageProps.ads.filter((ad) => ad.subject && ad.url && ad.price);
  return anunciosValidos.map(mapearAnuncio);
}

export interface FipeDaPagina {
  fipeValor: number;
  mesReferencia: string;
}

/**
 * Busca o valor de FIPE que a própria OLX já calculou para o veículo do
 * anúncio (campos `abuyFipePrice.fipePrice` e `abuyPriceRef.year_month_ref`,
 * embutidos na página individual). É a fonte de verdade usada pelo Motor de
 * Descoberta: a correspondência por aproximação textual contra a API
 * externa de FIPE (usada na Inserção Direta, onde o usuário escolhe
 * marca/modelo/ano exatos via select) se mostrou inconsistente aqui, porque
 * o texto livre da OLX não identifica o veículo com precisão suficiente.
 */
export async function buscarFipeDaPaginaAnuncio(linkOrigem: string): Promise<FipeDaPagina | null> {
  const html = await buscarHtml(linkOrigem);
  // O JSON aparece tanto com aspas literais quanto com aspas em entidade
  // HTML (&quot;), dependendo do bloco da página onde está embutido.
  const matchPreco = html.match(/abuyFipePrice(?:"|&quot;):\{(?:"|&quot;)fipePrice(?:"|&quot;):(\d+(?:\.\d+)?)\}/);
  if (!matchPreco) return null;

  const matchMes = html.match(/year_month_ref(?:"|&quot;):(\d{6})/);
  const mesReferencia = matchMes ? `${matchMes[1].slice(0, 4)}-${matchMes[1].slice(4, 6)}` : "desconhecido";

  return { fipeValor: Number.parseFloat(matchPreco[1]), mesReferencia };
}
