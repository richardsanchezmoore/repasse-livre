import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AnuncioOlx } from "./types.js";
import { registrarDebugVarredura } from "./supabaseClient.js";

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
  professionalAd?: boolean;
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
    professionalAd: typeof ad.professionalAd === "boolean" ? ad.professionalAd : null,
  };
}

/**
 * Monta a URL de uma página de listagem na página indicada (`o=N`).
 * OLX ordena por data de publicação por padrão — sf=1 foi removido porque
 * conflita com o filtro fpdll (FIPE) e faz a OLX retornar ads:[].
 */
export function montarUrlPagina(categoriaUrl: string, pagina: number): string {
  const url = new URL(categoriaUrl);
  url.searchParams.delete("sf");
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
// ── Rotação de proxy (distribui o tráfego pra não estrangular 1 IP só) ──────
// Lê PROXY_URL, PROXY_URL_2, PROXY_URL_3… (round-robin entre eles) E injeta uma
// SESSÃO nova por fetch no usuário Bright Data → o gateway espalha entre os IPs
// da ZONA (mesma ideia do sessid do ML). Com 2 IPs, cada um pega ~metade → some o
// 504 por fair-use. Escala sozinho: adicionar IP na zona já entra no rodízio.
let contadorProxy = 0;
function lerProxies(): string[] {
  const lista: string[] = [];
  if (process.env.PROXY_URL) lista.push(process.env.PROXY_URL);
  for (let i = 2; process.env[`PROXY_URL_${i}`]; i++) lista.push(process.env[`PROXY_URL_${i}`]!);
  return lista;
}
/** Injeta -session-<id> no usuário Bright Data (…-zone-XXX → …-zone-XXX-session-<id>)
 *  pra o gateway-base espalhar entre os IPs da zona. No-op quando o IP já está PINADO
 *  (`-ip-…`, config recomendada), já tem sessão, ou não é Bright-Data → devolve intacto. */
function comSessaoNova(proxyUrl: string): string {
  try {
    const u = new URL(proxyUrl);
    const jaTemAlvo = /-session-/i.test(u.username) || /-ip-/i.test(u.username);
    if (/brd-customer/i.test(u.username) && !jaTemAlvo) {
      const sessao = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
      u.username = `${u.username}-session-${sessao}`;
      return u.toString();
    }
  } catch {
    /* URL não-parseável → devolve como veio */
  }
  return proxyUrl; // IP pinado / não-Bright-Data / já com sessão → intacto (sem re-encode)
}
function proxyRotativo(): string | undefined {
  const proxies = lerProxies();
  if (proxies.length === 0) return undefined;
  return comSessaoNova(proxies[contadorProxy++ % proxies.length]);
}

async function buscarHtml(url: string): Promise<string> {
  // --connect-timeout / --max-time: sem eles, um proxy ou a OLX travando a
  // conexão deixa o curl PENDURADO pra sempre → a varredura nunca finaliza e o
  // run fica "em_andamento" eterno (já entupiu o painel com dezenas de presos).
  // Com o teto, um fetch travado vira erro → o run finaliza como "erro" (visível),
  // não como zumbi. Backstop no exec (mata o processo) caso o curl ignore o -m.
  const args = ["-s", "--connect-timeout", "30", "--max-time", "150", "-H", "Referer: https://www.olx.com.br/"];

  const proxy = proxyRotativo();
  if (proxy) {
    args.push("-x", proxy);
  }

  args.push(url);

  const { stdout } = await execFileAsync("curl_chrome116", args, { maxBuffer: 1024 * 1024 * 20, timeout: 165_000 });
  return stdout;
}

/**
 * Extrai o array de anúncios ("ads") do flight data RSC do App Router. Desde
 * ~jul/2026 a OLX migrou a listagem de Pages Router (__NEXT_DATA__) para App
 * Router: os anúncios agora vêm como JSON ESCAPADO dentro de
 * self.__next_f.push(...). A chave ("ads") e o formato de cada anúncio
 * (subject/url/price/properties/locationDetails/images/professionalAd)
 * continuam idênticos — só mudou o envelope. Localizamos o array no payload
 * escapado, desescapamos um nível e fazemos bracket-match respeitando strings.
 */
function extrairAdsDoFlight(html: string): AdOlx[] | null {
  const marcador = '\\"ads\\":[';
  const inicio = html.indexOf(marcador);
  if (inicio === -1) return null;

  // Começa no "[" do array e desescapa um nível (\" -> ", \\ -> \).
  const texto = html.slice(inicio + marcador.length - 1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");

  // Bracket-match do array, ignorando colchetes dentro de strings.
  let profundidade = 0;
  let fim = -1;
  let emString = false;
  let escapado = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (escapado) {
      escapado = false;
      continue;
    }
    if (c === "\\") {
      escapado = true;
      continue;
    }
    if (c === '"') {
      emString = !emString;
      continue;
    }
    if (emString) continue;
    if (c === "[") profundidade++;
    else if (c === "]") {
      profundidade--;
      if (profundidade === 0) {
        fim = i;
        break;
      }
    }
  }
  if (fim === -1) return null;

  try {
    return JSON.parse(texto.slice(0, fim + 1)) as AdOlx[];
  } catch {
    return null;
  }
}

/** Extração legada via __NEXT_DATA__ (Pages Router) — mantida como fallback. */
function extrairAdsDoNextData(html: string): AdOlx[] | null {
  const match = html.match(/__NEXT_DATA__"\s*type="application\/json">(.*?)<\/script>/s);
  if (!match) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = JSON.parse(match[1]) as any;
  const pp = data?.props?.pageProps;
  const ads = pp?.ads as AdOlx[] | undefined;
  if (ads && ads.length > 0) return ads;
  for (const k of ["listings", "adList", "items", "results", "data"]) {
    const alt = pp?.[k];
    if (Array.isArray(alt) && alt.length > 0) return alt as AdOlx[];
  }
  return null;
}

/**
 * Extrai e mapeia os anúncios de uma página de listagem da OLX a partir do
 * HTML. Puro (sem rede), pra ser testável direto contra um HTML salvo. Tenta o
 * flight data (App Router) e, como fallback, o __NEXT_DATA__ (Pages Router). Se
 * nenhum casar, LANÇA — pra uma futura mudança de formato aparecer como run com
 * erro (visível em discovery_runs), não como 0 anúncios silencioso.
 */
export function extrairAnunciosDoHtml(html: string): AnuncioOlx[] {
  const ads = extrairAdsDoFlight(html) ?? extrairAdsDoNextData(html);
  if (!ads) {
    console.error(`[olx] Anúncios não localizados (flight nem __NEXT_DATA__). Início do HTML: ${html.slice(0, 400)}`);
    throw new Error("Não foi possível localizar os anúncios na página da OLX (flight/__NEXT_DATA__).");
  }
  const validos = ads.filter((ad) => ad.subject && ad.url && ad.price);
  console.log(`[olx] ${ads.length} anúncios brutos na página, ${validos.length} válidos.`);
  return validos.map(mapearAnuncio);
}

/**
 * Busca uma página de listagem da OLX e extrai os anúncios do JSON estruturado
 * embutido no HTML (flight data RSC do App Router; __NEXT_DATA__ no legado),
 * sem parsing de DOM nem browser headless.
 */
export async function capturarAnunciosOlx(paginaUrl: string): Promise<AnuncioOlx[]> {
  const html = await buscarHtml(paginaUrl);
  console.log(`[olx] HTML size: ${html.length} | url: ${paginaUrl.slice(0, 120)}`);
  try {
    return extrairAnunciosDoHtml(html);
  } catch (erro) {
    // Guarda o que a OLX devolveu pra diagnosticar DAQUI (mudou o formato? bloqueou?)
    // sem depender do log da Railway. Início + fim do HTML (o flight vem no fim).
    await registrarDebugVarredura(
      "OLX_DEBUG_HTML_FALHA",
      JSON.stringify({ em: new Date().toISOString(), url: paginaUrl, tamanho: html.length, inicio: html.slice(0, 1500), fim: html.slice(-4000) })
    );
    throw erro;
  }
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

export interface AtributoOlx {
  label: string;
  value: string;
}

export type AtributosOlx = Record<string, AtributoOlx>;

/**
 * Chaves de `properties[].name` (bloco `id="initial-data"` da página do
 * anúncio) que valem a pena exibir na ficha técnica. A OLX expõe dezenas de
 * outras (categoria, marca, modelo, ano, câmbio, km — já capturadas por
 * outros campos — e várias específicas de lojas/concessionárias), por isso
 * a extração é feita por allowlist, não capturando tudo que aparece.
 */
const CHAVES_ATRIBUTOS_RELEVANTES = [
  "cartype",
  "carcolor",
  "fuel",
  "doors",
  "car_steering",
  "motorpower",
  "owner",
  "exchange",
  "owner_manual",
  "extra_key",
  "dealership_review",
  "warranty",
  "has_gnv_kit",
  "has_auction",
  "has_paid_ipva",
  "has_with_fine",
  "is_settled",
  "is_funded",
  "on_autos_fair",
] as const;

/**
 * Extrai o array `"properties":[...]` do bloco `id="initial-data"` da
 * página do anúncio (mesmo padrão de aspas literais/entidade `&quot;` do
 * resto do parsing nesse arquivo) e filtra só as chaves em
 * `CHAVES_ATRIBUTOS_RELEVANTES`. Cada propriedade preenchida vem com seu
 * próprio rótulo em português já traduzido pela OLX (`label`), por isso não
 * precisamos manter um dicionário de tradução aqui.
 */
function extrairAtributosDoHtml(html: string): AtributosOlx {
  const regex =
    /(?:"|&quot;)name(?:"|&quot;):(?:"|&quot;)([a-z_]+)(?:"|&quot;),(?:"|&quot;)label(?:"|&quot;):(?:"|&quot;)([^"&]*)(?:"|&quot;),(?:"|&quot;)value(?:"|&quot;):(?:"|&quot;)([^"&]*)(?:"|&quot;)/g;

  const chavesRelevantes = new Set<string>(CHAVES_ATRIBUTOS_RELEVANTES);
  const atributos: AtributosOlx = {};
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const [, name, label, value] = match;
    if (chavesRelevantes.has(name) && value) {
      atributos[name] = { label, value };
    }
  }
  return atributos;
}

/**
 * Extrai a descrição completa (campo `body` do bloco `id="initial-data"`).
 * A listagem (__NEXT_DATA__) não traz mais `description` no objeto de cada
 * anúncio — só a página individual tem esse texto, por isso a extração
 * acontece aqui e não em `mapearAnuncio`. A OLX formata o texto com `<br>`
 * para quebra de linha (não `\n`), que convertemos para preservar os
 * parágrafos originais do anunciante.
 */
function extrairDescricaoDoHtml(html: string): string | null {
  // O delimitador de abertura ("\"" ou "&quot;") é capturado num grupo e
  // reusado via backreference pra achar o fechamento: usar um conjunto fixo
  // de caracteres excluídos (como nas outras extrações deste arquivo) falha
  // quando a página usa "&quot;" como delimitador — esses 6 caracteres não
  // contêm aspas literal nenhuma, então um "[^\"]*" não para ali e a captura
  // vaza pro resto do JSON até achar a próxima aspa literal de verdade
  // (ex.: a do campo "subject" mais adiante), trazendo lixo de JSON na
  // descrição.
  const match = html.match(/(?:"|&quot;)body(?:"|&quot;):("|&quot;)([\s\S]*?)\1/);
  if (!match || !match[2]) return null;

  // Quando o bloco "initial-data" inteiro vem entity-encoded (variante
  // "&quot;" das aspas), os "<br>" da descrição também vêm como
  // "&lt;br&gt;" em vez de literais — por isso decodifica as entidades
  // antes de converter quebras de linha, senão sobra "&lt;br&gt;" no texto.
  const textoDecodificado = match[2]
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

  return textoDecodificado.replace(/<br\s*\/?>/gi, "\n").trim() || null;
}

/**
 * O bloco "initial-data" da página individual também carrega `professionalAd`
 * (mesmo campo já usado na listagem, ver mapearAnuncio) — exigir o valor
 * boolean explícito (`true`/`false`) evita casar com um bloco solto
 * `"professionalAd":""` que aparece em outro objeto da mesma página
 * (`adDetail`), sempre vazio, não confiável.
 */
function extrairTipoAnuncianteDoHtml(html: string): boolean | null {
  const match = html.match(/(?:"|&quot;)professionalAd(?:"|&quot;):(true|false)/);
  return match ? match[1] === "true" : null;
}

export interface DetalhesPaginaAnuncio {
  fipe: FipeDaPagina | null;
  fotos: string[];
  atributos: AtributosOlx;
  descricao: string | null;
  professionalAd: boolean | null;
}

/**
 * Busca FIPE, galeria completa de fotos, atributos opcionais (cor,
 * combustível, portas etc.) e a descrição completa da página individual do
 * anúncio, numa única requisição. A listagem (capturarAnunciosOlx) já traz
 * fotos, mas o JSON embutido ali costuma vir truncado — em muitos anúncios
 * só com a foto de capa, o que quebrava o slider na página individual por
 * faltar o restante da galeria; também não traz mais a descrição nem os
 * atributos opcionais. A página do próprio anúncio é a fonte de verdade
 * para os quatro (e por isso só é usada para anúncios novos, que já
 * provocam essa requisição extra para buscar o FIPE).
 */
export async function buscarDetalhesDaPaginaAnuncio(linkOrigem: string): Promise<DetalhesPaginaAnuncio> {
  const html = await buscarHtml(linkOrigem);
  return {
    fipe: extrairFipeDoHtml(html),
    fotos: extrairFotosDoHtml(html),
    atributos: extrairAtributosDoHtml(html),
    descricao: extrairDescricaoDoHtml(html),
    professionalAd: extrairTipoAnuncianteDoHtml(html),
  };
}

/** Usado pelo backfill de oportunidades capturadas antes da coluna `anunciante_profissional` existir. */
export async function buscarTipoAnuncianteDaPagina(linkOrigem: string): Promise<boolean | null> {
  const html = await buscarHtml(linkOrigem);
  return extrairTipoAnuncianteDoHtml(html);
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
