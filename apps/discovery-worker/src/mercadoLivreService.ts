import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, BrowserContext, Page } from "playwright";

// Stealth: Playwright puro vaza navigator.webdriver, chrome.runtime, plugins,
// permissions, etc. — sinais que sistemas antibot leem como "robô". O plugin
// patcheia isso. Tentativa de passar o /gz/account-verification do ML SEM login
// (login real arrisca banimento). Registrado uma vez, no escopo do módulo.
chromium.use(StealthPlugin());
import { buscarReferenciaFipe } from "./fipeService.js";
import { garantirHistoricoFipe } from "./historicoFipe.js";
import { calcularMargemPercentual, classificar, ehElegivel } from "./margin.js";
import { garantirCoordenadasCidade, linkOrigemJaExiste, salvarOportunidade } from "./supabaseClient.js";
import type { AtributosOlx } from "./olxService.js";
import type { Classificacao, Oportunidade } from "./types.js";

/**
 * Mercado Livre não bloqueia por TLS fingerprint (curl-impersonate não
 * resolve) nem por reputação genérica de IP de datacenter (curl_chrome116 +
 * proxy ISP da Bright Data, a mesma combinação que resolve a OLX, continua
 * bloqueado) — é bloqueio comportamental: precisa de um browser real
 * navegando organicamente (home → categoria → sub-categoria) E de um IP
 * residencial cujo pool não esteja na lista negra deles especificamente
 * (Bright Data ISP estático estava; DataImpulse residencial rotativo não).
 * Ver project_repasse_livre_mercadolivre_* na memória do projeto pro
 * histórico completo da investigação (29/06/2026).
 */

const TAMANHO_PAGINA = 48;


/** Nome completo do estado (como a ML mostra em poly-component__location) → sigla. */
const UF_POR_NOME: Record<string, string> = {
  acre: "AC",
  alagoas: "AL",
  amapa: "AP",
  amazonas: "AM",
  bahia: "BA",
  ceara: "CE",
  "distrito federal": "DF",
  "espirito santo": "ES",
  goias: "GO",
  maranhao: "MA",
  "mato grosso": "MT",
  "mato grosso do sul": "MS",
  "minas gerais": "MG",
  para: "PA",
  paraiba: "PB",
  parana: "PR",
  pernambuco: "PE",
  piaui: "PI",
  "rio de janeiro": "RJ",
  "rio grande do norte": "RN",
  "rio grande do sul": "RS",
  rondonia: "RO",
  roraima: "RR",
  "santa catarina": "SC",
  "sao paulo": "SP",
  sergipe: "SE",
  tocantins: "TO",
};

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** "Brasília - Distrito Federal" → { cidade: "Brasília", estado: "DF" }. */
function extrairCidadeEstado(localizacaoTexto: string): { cidade: string | null; estado: string | null } {
  const partes = localizacaoTexto.split(" - ").map((p) => p.trim());
  if (partes.length < 2) return { cidade: localizacaoTexto || null, estado: null };
  const [cidade, nomeEstado] = partes;
  const estado = UF_POR_NOME[normalizar(nomeEstado)] ?? null;
  return { cidade: cidade || null, estado };
}

export interface AnuncioMercadoLivreBruto {
  titulo: string;
  preco: number | null;
  ano: string | null;
  km: number | null;
  localizacaoTexto: string | null;
  linkOrigem: string;
  fotoPrincipal: string | null;
}

function parseProxy(url: string) {
  const u = new URL(url);
  return {
    server: `${u.protocol}//${u.host}`,
    username: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
  };
}

/**
 * Aquecimento orgânico (home → clique na categoria → clique na
 * sub-categoria) — bater direto numa URL de listagem "fria", sem essa
 * navegação prévia, é o que dispara o bloqueio mesmo com IP residencial
 * (confirmado em teste; ver memória do projeto). Não pula etapa.
 */
async function aquecerSessao(page: Page): Promise<void> {
  await page.goto("https://www.mercadolivre.com.br/", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1500);

  try {
    const aceitar = page.getByText("Aceitar cookies", { exact: false });
    if (await aceitar.first().isVisible({ timeout: 3000 })) {
      await aceitar.first().click();
      await page.waitForTimeout(800);
    }
  } catch {
    // sem banner de cookies — segue normal
  }

  await page.goto("https://www.mercadolivre.com.br/c/carros-motos-e-outros", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(1500);

  // Entra na sub-categoria via goto direto (em vez de clicar no link). Com o
  // bloqueio de imagem/fonte ativo, o link da sub-categoria fica num carrossel
  // que não renderiza/posiciona a tempo, e o clique dava timeout → warmup
  // incompleto → /captcha/wall. O goto warma a sessão igual e é robusto ao
  // bloqueio (validado: 48 cards com img+media+font bloqueados).
  await page.goto("https://lista.mercadolivre.com.br/veiculos/carros-caminhonetes/", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(2500);
}

interface CardBruto {
  titulo: string;
  href: string;
  precoTexto: string;
  atributos: string[];
  localizacaoTexto: string;
  fotoPrincipal: string | null;
  patrocinado: boolean;
  lojaOficial: boolean;
}

async function extrairCardsDaPagina(page: Page): Promise<CardBruto[]> {
  return page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll("li.ui-search-layout__item"));
    return cards.map((card) => {
      const linkEl = card.querySelector("a.poly-component__title") as HTMLAnchorElement | null;
      const imgEl = card.querySelector("img.poly-component__picture") as HTMLImageElement | null;
      const atributos = Array.from(card.querySelectorAll(".poly-attributes_list__item")).map(
        (li) => li.textContent?.trim() ?? ""
      );
      return {
        titulo: linkEl?.textContent?.trim() ?? "",
        href: linkEl?.href ?? "",
        precoTexto: card.querySelector(".poly-price__amount .andes-money-amount__fraction")?.textContent ?? "",
        atributos,
        localizacaoTexto: card.querySelector(".poly-component__location")?.textContent?.trim() ?? "",
        fotoPrincipal: imgEl?.src ?? null,
        patrocinado: card.querySelector(".poly-component__ads-promotions") !== null,
        lojaOficial: card.querySelector(".poly-component__seller") !== null,
      };
    });
  });
}

function montarUrlPagina(categoriaUrlBase: string, pagina: number): string {
  const base = categoriaUrlBase.endsWith("/") ? categoriaUrlBase : `${categoriaUrlBase}/`;
  // O ML marca listagens filtradas com o sufixo `_NoIndex_True`, e o offset
  // `_Desde_N` vem ANTES dele. Sem o sufixo, a URL de paginação (`_Desde_49`)
  // não é servida como listagem e volta sem cards — era a causa real do
  // "Página 2 vazia" (e não o rate-limit/wall, como se supôs antes).
  // URLs reais: .../particular/_NoIndex_True (pág 1),
  //             .../particular/_Desde_49_NoIndex_True (pág 2), +48 por página.
  if (pagina === 1) return `${base}_NoIndex_True`;
  const offset = (pagina - 1) * TAMANHO_PAGINA + 1;
  return `${base}_Desde_${offset}_NoIndex_True`;
}

function converterCard(card: CardBruto): AnuncioMercadoLivreBruto | null {
  // anúncio patrocinado (brand ads) ou de loja oficial — o filtro
  // "/particular/" na URL já deveria excluir lojas, mas anúncios
  // patrocinados aparecem mesmo assim no topo independente do filtro
  // (confirmado em teste real: 3 de 48 cards eram "Ad" de loja oficial).
  if (card.patrocinado || card.lojaOficial) return null;
  if (!card.href || !card.titulo) return null;

  const preco = card.precoTexto ? Number(card.precoTexto.replace(/\./g, "")) : null;
  const ano = card.atributos[0] && /^\d{4}$/.test(card.atributos[0]) ? card.atributos[0] : null;
  const kmTexto = card.atributos[1] ?? "";
  const kmMatch = kmTexto.match(/[\d.]+/);
  const km = kmMatch ? Number(kmMatch[0].replace(/\./g, "")) : null;

  return {
    titulo: card.titulo,
    preco,
    ano,
    km,
    localizacaoTexto: card.localizacaoTexto || null,
    linkOrigem: card.href.split("#")[0],
    fotoPrincipal: card.fotoPrincipal,
  };
}

interface DetalhesPaginaML {
  fotos: string[];
  descricao: string | null;
  cambio: string | null;
  atributos: AtributosOlx;
}

/**
 * Visita a página individual do anúncio e extrai fotos (máx. 10), descrição
 * e atributos técnicos (câmbio, combustível, cor…). Deve ser chamada com o
 * browser já aquecido e com cookies da sessão de listagem — a página
 * individual do ML exige um challenge SHA-256 ("Anubis") que resolve
 * automaticamente via JS em sessão quente; em sessão fria (sem cookies da
 * listagem) o challenge demora ou bloqueia. Nunca navegar para páginas
 * individuais em um browser novo sem antes varrer a listagem no mesmo
 * contexto.
 */
/** Detecta se a página caiu no challenge do ML (captcha wall / account-verification). */
function tipoWall(page: Page): "captcha/wall" | "account-verification" | null {
  const u = page.url();
  if (u.includes("/captcha/wall")) return "captcha/wall";
  if (u.includes("/gz/account-verification")) return "account-verification";
  return null;
}

const DETALHE_VAZIO: DetalhesPaginaML = { fotos: [], descricao: null, cambio: null, atributos: {} };

/** Extrai os detalhes de uma página de anúncio JÁ CARREGADA (aba aberta via clique). */
async function extrairDetalhesDaPagina(page: Page): Promise<DetalhesPaginaML> {
  return page.evaluate(() => {
    // FOTOS — pega a URL full-res via data-zoom (se disponível) ou src.
    // Limita a 10 para não explodir o banco.
    const imgEls = Array.from(
      document.querySelectorAll<HTMLImageElement>(
        "figure.ui-pdp-gallery__figure img, .ui-pdp-gallery figure img"
      )
    );
    const fotos = [...new Set(
      imgEls
        .map((img) => img.getAttribute("data-zoom") || img.src || "")
        .filter((src) => src.startsWith("http"))
    )].slice(0, 10);

    // DESCRIÇÃO
    const descEl = document.querySelector(
      ".ui-pdp-description__content, p.ui-pdp-description__content"
    );
    const descricao = descEl?.textContent?.trim() || null;

    // SPECS — tabela de atributos técnicos (câmbio, combustível, cor…)
    const specRows = Array.from(
      document.querySelectorAll(".ui-pdp-specs__table tr, .andes-table__row")
    );
    const atributos: Record<string, { label: string; value: string }> = {};
    for (const row of specRows) {
      const cells = row.querySelectorAll("th, td");
      if (cells.length >= 2) {
        const label = cells[0].textContent?.trim() ?? "";
        const value = cells[1].textContent?.trim() ?? "";
        if (label && value) {
          atributos[label.toLowerCase().replace(/\s+/g, "_")] = { label, value };
        }
      }
    }

    const cambio =
      atributos["transmissão"]?.value ||
      atributos["câmbio"]?.value ||
      atributos["transmissao"]?.value ||
      atributos["cambio"]?.value ||
      null;

    return { fotos, descricao, cambio, atributos };
  });
}

function parseProxyComSessao(url: string, sessaoId: number) {
  const u = new URL(url);
  // Sessão fixa por IP — o ML walla a 2ª requisição no mesmo IP, então cada
  // página/detalhe usa um sessid diferente (= IP diferente). Formato Thordata:
  // `td-customer-<id>-country-BR-sessid-<N>-sesstime-10` no username (mesmo IP
  // enquanto o sessid se repete; `sesstime` segura o IP por até 10min e evita
  // a troca por 60s de inatividade durante uma navegação multi-passo).
  // O PROXY_URL traz o username base (sem sessid); aqui anexamos um sessid
  // único e idempotente (remove um anterior, se houver).
  const usernameBase = decodeURIComponent(u.username).replace(/-sessid-[^-]+(-sesstime-\d+)?$/i, "");
  const username = `${usernameBase}-sessid-${sessaoId}-sesstime-10`;
  return { server: `${u.protocol}//${u.host}`, username, password: decodeURIComponent(u.password) };
}

/**
 * Bloqueia imagens, mídia e fontes — puro tráfego de banda, inúteis para
 * extrair o DOM ou resolver o challenge JS (Anubis). Corta a maior parte do
 * consumo do proxy residencial (a home/listagem do ML é pesadíssima em
 * imagem; um run com warmup por página + por detalhe chegou a ~400MB).
 * Mantém document/script/xhr/css — necessários para o challenge e para a
 * listagem hidratar.
 */
async function bloquearMidia(context: BrowserContext): Promise<void> {
  await context.route("**/*", (route) => {
    const tipo = route.request().resourceType();
    if (tipo === "image" || tipo === "media" || tipo === "font") {
      return route.abort();
    }
    return route.continue();
  });
}

function criarBrowser(sessaoId?: number): Promise<Browser> {
  const proxyUrl = process.env.PROXY_URL;
  const proxy = proxyUrl
    ? sessaoId !== undefined ? parseProxyComSessao(proxyUrl, sessaoId) : parseProxy(proxyUrl)
    : undefined;
  return chromium.launch({ headless: true, proxy, args: ["--no-sandbox"] });
}

/** Extrai o id "MLB-XXXXXXXX" da URL do anúncio (para localizar o card na listagem). */
function extrairMlbId(link: string): string | null {
  const m = link.match(/MLB-?\d+/);
  if (!m) return null;
  return m[0].startsWith("MLB-") ? m[0] : m[0].replace("MLB", "MLB-");
}

/** Sinaliza que o clique caiu no challenge do ML (IP saturado) — o chamador rotaciona a sessão. */
class WallError extends Error {}

/**
 * Abre o detalhe de um anúncio CLICANDO no seu card na listagem já carregada
 * (mesma sessão/IP). A chegada "fria" via goto direto na URL do anúncio cai no
 * account-verification; o clique orgânico (referer real + abre aba nova) passa
 * — validado. Lança WallError se o detalhe cair no challenge (IP saturado),
 * para o chamador rotacionar a sessão e continuar os pendentes.
 */
async function abrirDetalheViaClique(
  listaPage: Page,
  context: BrowserContext,
  mlbId: string
): Promise<DetalhesPaginaML> {
  const cardLink = listaPage.locator(`li.ui-search-layout__item a.poly-component__title[href*="${mlbId}"]`).first();
  if ((await cardLink.count()) === 0) throw new Error(`card ${mlbId} não está na listagem`);
  await cardLink.scrollIntoViewIfNeeded({ timeout: 8000 });
  await listaPage.waitForTimeout(700 + Math.floor(Math.random() * 900)); // pacing humano antes do clique

  const [popup] = await Promise.all([
    context.waitForEvent("page", { timeout: 30000 }),
    cardLink.click({ timeout: 12000 }),
  ]);
  try {
    await popup.waitForLoadState("domcontentloaded").catch(() => {});
    try {
      await popup.waitForSelector(".ui-pdp-container, .ui-pdp-title, .ui-pdp-gallery", { timeout: 40000 });
    } catch {
      const wall = tipoWall(popup);
      if (wall) throw new WallError(wall);
      throw new Error(`detalhe ${mlbId} não renderizou (url: ${popup.url().split("?")[0]})`);
    }
    const wall = tipoWall(popup);
    if (wall) throw new WallError(wall);
    await popup.waitForTimeout(800);
    return await extrairDetalhesDaPagina(popup);
  } finally {
    await popup.close().catch(() => {});
  }
}

/** FIPE encontrada para um anúncio (sem o caso null já filtrado). */
type ReferenciaFipe = NonNullable<Awaited<ReturnType<typeof buscarReferenciaFipe>>>;

/** Máximo de sessões (IPs) por página — rotaciona quando o IP satura clicando detalhes. */
const MAX_SESSOES_POR_PAGINA = 6;

/** Anúncio que passou FIPE + margem, pronto para ter o detalhe buscado via clique e ser salvo. */
interface Elegivel {
  anuncio: AnuncioMercadoLivreBruto;
  mlbId: string;
  // preco/ano já estreitados para não-nulo (o tipo bruto os mantém nullable).
  preco: number;
  ano: string;
  marca: string;
  modelo: string;
  variante: string | null;
  referenciaFipe: ReferenciaFipe;
  margemPercentual: number;
  classificacao: Classificacao;
}

/** Monta e salva a oportunidade a partir do elegível + detalhes (que podem ser vazios/card-only). */
async function salvarElegivel(el: Elegivel, detalhes: DetalhesPaginaML, resultado: ResultadoLoteMercadoLivre): Promise<void> {
  const { anuncio, preco, ano, marca, modelo, variante, referenciaFipe, margemPercentual, classificacao } = el;
  const { cidade, estado } = extrairCidadeEstado(anuncio.localizacaoTexto ?? "");
  const todasFotos = [
    ...(anuncio.fotoPrincipal ? [anuncio.fotoPrincipal] : []),
    ...detalhes.fotos.filter((f) => f !== anuncio.fotoPrincipal),
  ].slice(0, 10);

  const oportunidade: Oportunidade = {
    fonte: "MERCADO_LIVRE",
    link_origem: anuncio.linkOrigem,
    // Título COMPLETO do anúncio (igual OLX guarda o titulo) — o card e a
    // página renderizam `veiculo`, então guardar só "marca modelo" cortava o
    // nome. A BI/SEO/slug extraem marca+modelo das 2 primeiras palavras via
    // extrairMarcaModelo/extrairMarca, então título completo não os afeta.
    veiculo: anuncio.titulo,
    versao: variante,
    ano,
    cambio: detalhes.cambio,
    km: anuncio.km,
    cidade,
    estado,
    preco,
    fipe_valor: referenciaFipe.valor,
    fipe_data_referencia: referenciaFipe.mesReferencia,
    fipe_codigo: referenciaFipe.codigoFipe,
    margem_percentual: Number(margemPercentual.toFixed(2)),
    classificacao,
    foto_principal: todasFotos[0] ?? null,
    fotos_secundarias: todasFotos.slice(1),
    descricao: detalhes.descricao,
    origem_tipo: "descoberta",
    status: "descoberta",
    data_publicacao_origem: null,
    atributos_olx: detalhes.atributos,
    anunciante_profissional: false,
  };
  await salvarOportunidade(oportunidade);
  resultado.elegiveis++;
  await garantirHistoricoFipe(referenciaFipe.codigoFipe, Number.parseInt(referenciaFipe.ano, 10));
  if (cidade && estado) await garantirCoordenadasCidade(cidade, estado);
}

/**
 * Filtra os cards de uma página, retornando os elegíveis (FIPE + margem) ainda
 * não salvos. `contabilizar` só conta novos/descartados na primeira leitura da
 * página (evita recontar quando a listagem é recarregada numa rotação de IP).
 */
async function coletarElegiveis(
  cards: CardBruto[],
  margemMinima: number,
  resultado: ResultadoLoteMercadoLivre,
  contabilizar: boolean
): Promise<Elegivel[]> {
  const elegiveis: Elegivel[] = [];
  const anuncios = cards.map(converterCard).filter((a): a is AnuncioMercadoLivreBruto => a !== null);
  for (const anuncio of anuncios) {
    if (await linkOrigemJaExiste(anuncio.linkOrigem)) continue;
    const mlbId = extrairMlbId(anuncio.linkOrigem);
    if (!mlbId) continue;
    if (contabilizar) resultado.novos++;

    if (!anuncio.preco || !anuncio.ano || !anuncio.titulo) { if (contabilizar) resultado.descartados++; continue; }
    const { marca, modelo, variante } = extrairMarcaModelo(anuncio.titulo);
    if (!marca || !modelo) { if (contabilizar) resultado.descartados++; continue; }
    // FIPE resiliente: 429/502/timeout da API não pode derrubar o run — trata
    // como "sem FIPE" e segue (transitório; o próximo run reprocessa).
    let referenciaFipe: ReferenciaFipe | null = null;
    try {
      referenciaFipe = await buscarReferenciaFipe(marca, modelo, anuncio.ano, variante);
    } catch (erro) {
      console.warn(`[motor-descoberta-mercadolivre] FIPE falhou (${marca} ${modelo} ${anuncio.ano}): ${erro instanceof Error ? erro.message.split("\n")[0] : erro} — pulando.`);
    }
    if (!referenciaFipe) { if (contabilizar) resultado.semFipe++; continue; }
    const margemPercentual = calcularMargemPercentual(anuncio.preco, referenciaFipe.valor);
    if (!ehElegivel(margemPercentual, margemMinima)) { if (contabilizar) resultado.descartados++; continue; }
    const classificacao: Classificacao | null = classificar(margemPercentual);
    if (!classificacao) { if (contabilizar) resultado.descartados++; continue; }

    elegiveis.push({ anuncio, mlbId, preco: anuncio.preco, ano: anuncio.ano, marca, modelo, variante, referenciaFipe, margemPercentual, classificacao });
  }
  return elegiveis;
}

/** Abre uma sessão (browser + warmup + listagem carregada) ou null se a listagem não carregou (wall/IP ruim). */
async function abrirSessaoListagem(
  categoriaUrlBase: string,
  pagina: number,
  sessaoId: number
): Promise<{ browser: Browser; context: BrowserContext; page: Page } | null> {
  const browser = await criarBrowser(sessaoId);
  let page: Page | undefined;
  try {
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      locale: "pt-BR",
      viewport: { width: 1366, height: 768 },
    });
    await bloquearMidia(context);
    page = await context.newPage();
    page.setDefaultNavigationTimeout(120000); // Railway via proxy é lento; anti-bot se vence devagar
    await aquecerSessao(page);
    await page.goto(montarUrlPagina(categoriaUrlBase, pagina), { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector("li.ui-search-layout__item", { timeout: 45000 });
    return { browser, context, page };
  } catch (erro) {
    // Diagnóstico: qual challenge bloqueou a listagem (captcha/wall vs
    // account-verification) e onde parou — pra decidir a estratégia do detalhe.
    const wall = page ? tipoWall(page) : null;
    const url = page ? page.url().split("?")[0] : "(sem page)";
    console.log(
      `[motor-descoberta-mercadolivre]   ↳ bloqueio listagem: ${wall ? `wall=${wall}` : "sem wall (timeout?)"} | url=${url} | ${erro instanceof Error ? erro.message.split("\n")[0] : erro}`
    );
    await browser.close();
    return null;
  }
}

/**
 * Função principal — fluxo unificado com CLIQUE orgânico.
 *
 * Para cada página da listagem: abre uma sessão (IP), carrega a listagem,
 * coleta os elegíveis (FIPE + margem) e CLICA no card de cada um para abrir o
 * detalhe. O `goto` direto na URL do anúncio cai no account-verification; o
 * clique orgânico (referer real, abre aba nova) passa — validado. Quando o IP
 * satura (WallError no clique), rotaciona a sessão, recarrega a listagem e
 * continua os elegíveis pendentes (`feitos` evita reprocessar). O warmup é
 * amortizado entre vários detalhes da mesma sessão. Pacing lento e deliberado
 * (anti-bot se vence com lentidão, não velocidade — como os actors da Apify,
 * que usam timeout de 1h).
 */
export async function varrerEProcessarMercadoLivre(
  categoriaUrlBase: string,
  maxPaginas: number,
  margemMinima: number
): Promise<ResultadoLoteMercadoLivre> {
  const resultado: ResultadoLoteMercadoLivre = { novos: 0, elegiveis: 0, descartados: 0, semFipe: 0 };
  // sessid base aleatório por run — evita reusar um IP já fichado.
  const baseSess = 1 + Math.floor(Math.random() * 9000);

  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    let sessId = baseSess + pagina * 100;
    let elegiveis: Elegivel[] | null = null; // coletado uma vez (1ª leitura da página)
    const feitos = new Set<string>();
    let paginaVazia = false;
    let sessoes = 0;

    while (sessoes < MAX_SESSOES_POR_PAGINA) {
      sessoes++;
      const sess = await abrirSessaoListagem(categoriaUrlBase, pagina, sessId++);
      if (!sess) {
        console.log(`[motor-descoberta-mercadolivre] Página ${pagina}: listagem bloqueada (sessão ${sessoes}/${MAX_SESSOES_POR_PAGINA}) — IP novo…`);
        continue;
      }
      const { browser, context, page } = sess;
      try {
        const cards = await extrairCardsDaPagina(page);
        if (cards.length === 0) {
          // Vazia na 1ª leitura = fim da listagem. Numa recarga (rotação),
          // pode ser flakiness — sai do while e o safety net salva os
          // pendentes como card-only, sem parar a paginação toda.
          if (elegiveis === null) paginaVazia = true;
          break;
        }

        if (elegiveis === null) {
          elegiveis = await coletarElegiveis(cards, margemMinima, resultado, true);
          console.log(`[motor-descoberta-mercadolivre] Página ${pagina}: ${cards.length} cards, ${elegiveis.length} elegíveis. Buscando detalhes via clique…`);
        }

        let saturou = false;
        for (const el of elegiveis) {
          if (feitos.has(el.anuncio.linkOrigem)) continue;
          try {
            const detalhes = await abrirDetalheViaClique(page, context, el.mlbId);
            await salvarElegivel(el, detalhes, resultado);
            feitos.add(el.anuncio.linkOrigem);
            console.log(`[motor-descoberta-mercadolivre] ✓ ${el.anuncio.titulo} (${detalhes.fotos.length} fotos)`);
            await page.waitForTimeout(3000 + Math.floor(Math.random() * 3000)); // pacing humano entre detalhes
          } catch (erro) {
            if (erro instanceof WallError) {
              saturou = true;
              console.log(`[motor-descoberta-mercadolivre] IP saturou [wall: ${erro.message}] (${feitos.size}/${elegiveis.length} feitos) — rotacionando sessão…`);
              break;
            }
            // card não achado / não renderizou → salva só com card e segue
            await salvarElegivel(el, DETALHE_VAZIO, resultado);
            feitos.add(el.anuncio.linkOrigem);
            console.warn(`[motor-descoberta-mercadolivre] ~ ${el.anuncio.titulo}: ${erro instanceof Error ? erro.message.split("\n")[0] : erro} — salvo só com card.`);
          }
        }
        if (!saturou) break; // todos os elegíveis da página processados
      } finally {
        await browser.close();
      }
    }

    // Elegíveis que sobraram (IP saturou em todas as sessões) — salva card-only
    // pra não perder o elegível.
    if (elegiveis) {
      for (const el of elegiveis) {
        if (!feitos.has(el.anuncio.linkOrigem)) {
          await salvarElegivel(el, DETALHE_VAZIO, resultado);
          feitos.add(el.anuncio.linkOrigem);
        }
      }
    }

    if (paginaVazia) {
      console.log(`[motor-descoberta-mercadolivre] Página ${pagina} vazia — fim da listagem.`);
      break;
    }
    if (elegiveis === null) {
      console.log(`[motor-descoberta-mercadolivre] Página ${pagina}: listagem não carregou após ${MAX_SESSOES_POR_PAGINA} IPs — parando paginação.`);
      break;
    }
  }

  return resultado;
}

/**
 * Monta a URL de listagem já com categoria + filtro nativo "particular"
 * (`/particular/` no path) — exclui lojas/concessionárias direto na
 * origem, sem precisar filtrar depois (ver
 * project_repasse_livre_mercadolivre_api_e_terceiros: scrapers terceiros
 * genéricos não tinham esse filtro, e pagavam por muito anúncio inútil).
 */
export function gerarUrlCategoriaParticular(categoriaUrlBase: string): string {
  const base = categoriaUrlBase.endsWith("/") ? categoriaUrlBase.slice(0, -1) : categoriaUrlBase;
  return `${base}/particular/`;
}

export interface ResultadoLoteMercadoLivre {
  novos: number;
  elegiveis: number;
  descartados: number;
  semFipe: number;
}

/**
 * O título do card ("Chevrolet Tracker 2021 1.2 Premier Turbo Aut. 5p")
 * não vem com marca/modelo separados — só texto livre. Primeira palavra =
 * marca, segunda = modelo, resto = variante.
 */
function extrairMarcaModelo(titulo: string): { marca: string; modelo: string; variante: string | null } {
  const palavras = titulo.trim().split(/\s+/);
  const marca = palavras[0] ?? "";
  const modelo = palavras[1] ?? "";
  const variante = palavras.slice(2).join(" ") || null;
  return { marca, modelo, variante };
}
