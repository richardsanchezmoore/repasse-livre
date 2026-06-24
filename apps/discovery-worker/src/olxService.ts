import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AnuncioOlx } from "./types.js";

const execFileAsync = promisify(execFile);

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

function parseKm(kmTexto: string | null): number | null {
  if (!kmTexto) return null;
  const numerico = Number.parseInt(kmTexto, 10);
  return Number.isFinite(numerico) ? numerico : null;
}

function mapearAnuncio(ad: AdOlx): AnuncioOlx {
  return {
    titulo: ad.subject,
    marca: buscarPropriedade(ad.properties, "vehicle_brand"),
    modelo: buscarPropriedade(ad.properties, "vehicle_model"),
    ano: buscarPropriedade(ad.properties, "regdate"),
    cambio: buscarPropriedade(ad.properties, "gearbox"),
    km: parseKm(buscarPropriedade(ad.properties, "mileage")),
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
 * Busca o HTML da página via curl-impersonate (curl_chrome116), não o curl
 * comum.
 *
 * O fetch nativo do Node (undici) e o curl padrão (vinculado ao OpenSSL)
 * recebem 403/bloqueio da Cloudflare mesmo com os headers certos — a
 * barreira filtra pela "impressão digital" do handshake TLS do cliente, que
 * é diferente da de um navegador real. O curl_chrome116 reproduz essa
 * assinatura de um Chrome real (e já define seu próprio conjunto de headers
 * coerente com ela), por isso não definimos headers manualmente aqui — só
 * o Referer, que o script não fixa por ser específico da OLX.
 */
async function buscarHtml(url: string): Promise<string> {
  const args = ["-s", "-H", "Referer: https://www.olx.com.br/"];

  if (process.env.PROXY_URL) {
    args.push("-x", process.env.PROXY_URL);
  }

  args.push(url);

  const { stdout } = await execFileAsync("curl_chrome116", args, { maxBuffer: 1024 * 1024 * 20 });
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

function extrairFipeDoHtml(html: string): FipeDaPagina | null {
  // O JSON aparece tanto com aspas literais quanto com aspas em entidade
  // HTML (&quot;), dependendo do bloco da página onde está embutido.
  const matchPreco = html.match(/abuyFipePrice(?:"|&quot;):\{(?:"|&quot;)fipePrice(?:"|&quot;):(\d+(?:\.\d+)?)\}/);
  if (!matchPreco) return null;

  const matchMes = html.match(/year_month_ref(?:"|&quot;):(\d{6})/);
  const mesReferencia = matchMes ? `${matchMes[1].slice(0, 4)}-${matchMes[1].slice(4, 6)}` : "desconhecido";

  return { fipeValor: Number.parseFloat(matchPreco[1]), mesReferencia };
}

/**
 * Extrai o bloco `"images":[...]` do HTML, respeitando colchetes aninhados
 * (cada item da galeria já é um objeto `{...}`), e parando exatamente no
 * fechamento do array — para não vazar "original" de outros blocos da
 * página (ex.: anúncios relacionados) na extração de fotos.
 */
function extrairBlocoImagens(html: string): string | null {
  const marcador = html.includes('"images":[') ? '"images":[' : '&quot;images&quot;:[';
  const inicio = html.indexOf(marcador);
  if (inicio === -1) return null;

  const inicioConteudo = inicio + marcador.length;
  let profundidade = 1;
  let i = inicioConteudo;
  for (; i < html.length && profundidade > 0; i++) {
    if (html[i] === "[") profundidade++;
    else if (html[i] === "]") profundidade--;
  }
  return html.slice(inicioConteudo, i - 1);
}

function extrairFotosDoHtml(html: string): string[] {
  const bloco = extrairBlocoImagens(html);
  if (!bloco) return [];

  const regexOriginal = /(?:"|&quot;)original(?:"|&quot;):(?:"|&quot;)([^"&]+)(?:"|&quot;)/g;
  const urls: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regexOriginal.exec(bloco)) !== null) {
    if (!urls.includes(match[1])) urls.push(match[1]);
  }
  return urls;
}

export interface DetalhesPaginaAnuncio {
  fipe: FipeDaPagina | null;
  fotos: string[];
}

/**
 * Busca FIPE e galeria completa de fotos da página individual do anúncio,
 * numa única requisição. A listagem (capturarAnunciosOlx) já traz fotos,
 * mas o JSON embutido ali costuma vir truncado — em muitos anúncios só com
 * a foto de capa, o que quebrava o slider na página individual por faltar
 * o restante da galeria. A página do próprio anúncio tem a galeria
 * completa, então essa é a fonte de verdade para fotos (e por isso só é
 * usada para anúncios novos, que já provocam essa requisição extra para
 * buscar o FIPE).
 */
export async function buscarDetalhesDaPaginaAnuncio(linkOrigem: string): Promise<DetalhesPaginaAnuncio> {
  const html = await buscarHtml(linkOrigem);
  return { fipe: extrairFipeDoHtml(html), fotos: extrairFotosDoHtml(html) };
}

/**
 * Busca o título completo (subject) direto da página individual do anúncio.
 * Usado pelo backfill de oportunidades antigas, salvas antes da correção que
 * passou a usar `subject` (título completo) em vez da propriedade estruturada
 * `vehicle_model` (incompleta, sem o nome base do modelo) como `veiculo`.
 */
export async function buscarTituloDaPaginaAnuncio(linkOrigem: string): Promise<string | null> {
  const html = await buscarHtml(linkOrigem);
  const match = html.match(/(?:"|&quot;)subject(?:"|&quot;):(?:"|&quot;)([^"&]+)(?:"|&quot;)/);
  return match ? match[1] : null;
}
