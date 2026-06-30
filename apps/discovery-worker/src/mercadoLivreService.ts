import { chromium } from "playwright";
import type { Browser, Page } from "playwright";
import { buscarReferenciaFipe } from "./fipeService.js";
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

  try {
    const subLink = page.getByRole("link", { name: /carros e caminhonetes/i }).first();
    await subLink.scrollIntoViewIfNeeded({ timeout: 10000 });
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 45000 }),
      subLink.click({ timeout: 10000, force: true }),
    ]);
  } catch {
    // se o clique falhar (layout mudou, etc.) segue mesmo assim — o goto
    // direto na página de categoria já é navegação real, só não tão
    // "orgânica" quanto entrar na sub-categoria também
  }
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
async function buscarDetalhesPaginaMercadoLivre(page: Page, url: string): Promise<DetalhesPaginaML> {
  // O ML faz um redirect JS (challenge "Anubis") antes de renderizar o anúncio
  // real, então não basta o `domcontentloaded` (volta na challenge page). Mas
  // `networkidle` travava: páginas do ML têm analytics/websocket que nunca
  // ficam 500ms sem tráfego → estourava os 60s e derrubava o run inteiro.
  // Solução: domcontentloaded rápido + espera EXPLÍCITA pelo container do
  // anúncio aparecer (pós-redirect), sem depender de a rede ficar ociosa.
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForSelector(".ui-pdp-container, .ui-pdp-title, .ui-pdp-gallery", { timeout: 25000 });
  await page.waitForTimeout(800);

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
  // Troca o sessid para um IP diferente — ML bloqueia com /captcha/wall a
  // partir da 2ª página individual visitada na mesma sessão de proxy.
  const username = decodeURIComponent(u.username).replace(/;sessid\.\d+/, `;sessid.${sessaoId}`);
  return { server: `${u.protocol}//${u.host}`, username, password: decodeURIComponent(u.password) };
}

function criarBrowser(sessaoId?: number): Promise<Browser> {
  const proxyUrl = process.env.PROXY_URL;
  const proxy = proxyUrl
    ? sessaoId !== undefined ? parseProxyComSessao(proxyUrl, sessaoId) : parseProxy(proxyUrl)
    : undefined;
  return chromium.launch({ headless: true, proxy, args: ["--no-sandbox"] });
}

async function buscarDetalhesBrowserProprio(url: string, sessaoId: number): Promise<DetalhesPaginaML> {
  const browser = await criarBrowser(sessaoId);
  try {
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      locale: "pt-BR",
      viewport: { width: 1366, height: 768 },
    });
    const page = await context.newPage();
    // Aquecimento completo (home → categoria → sub) — o mini-warmup anterior
    // (1 goto + 3s) era insuficiente para passar o challenge Anubis da página
    // individual, que exige cookies de sessão orgânica como a listagem.
    await aquecerSessao(page);
    return await buscarDetalhesPaginaMercadoLivre(page, url);
  } finally {
    await browser.close();
  }
}

/**
 * Varre UMA página da listagem com browser+sessid próprios (IP limpo) e fecha.
 * O ML rate-limita por sessão/IP: warmup (~3 reqs) + 1 página já fica no limite,
 * e a 2ª página no MESMO IP cai no /captcha/wall. Dando um IP novo por página
 * (sessid distinto), cada IP faz só warmup + 1 página — igual à página 1, que
 * passa — então a paginação avança sem bater o wall. Retorna `walled` para o
 * chamador parar a paginação quando mesmo um IP limpo for bloqueado.
 */
async function buscarCardsPaginaBrowserProprio(
  categoriaUrlBase: string,
  pagina: number,
  sessaoId: number
): Promise<{ cards: CardBruto[]; walled: boolean }> {
  const browser = await criarBrowser(sessaoId);
  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      locale: "pt-BR",
      viewport: { width: 1366, height: 768 },
    });
    const page = await context.newPage();
    await aquecerSessao(page);
    await page.goto(montarUrlPagina(categoriaUrlBase, pagina), { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(2500);
    const walled = page.url().includes("/captcha/wall");
    const cards = walled ? [] : await extrairCardsDaPagina(page);
    return { cards, walled };
  } finally {
    await browser.close();
  }
}

/** FIPE encontrada para um anúncio (sem o caso null já filtrado). */
type ReferenciaFipe = NonNullable<Awaited<ReturnType<typeof buscarReferenciaFipe>>>;

/** Anúncio que passou todos os filtros da Fase 1 e merece visita individual na Fase 2. */
interface CandidatoElegivel {
  anuncio: AnuncioMercadoLivreBruto;
  // preco/ano já estreitados para não-nulo na Fase 1 (o tipo bruto os mantém
  // nullable, e o narrowing se perde ao destructurar na Fase 2).
  preco: number;
  ano: string;
  marca: string;
  modelo: string;
  variante: string | null;
  referenciaFipe: ReferenciaFipe;
  margemPercentual: number;
  classificacao: Classificacao;
}

/**
 * Função principal — dividida em 2 fases, ambas com IP limpo por requisição,
 * porque o ML rate-limita por sessão/IP e walla a 2ª página (de listagem OU
 * individual) na mesma sessão de proxy.
 *
 * - Fase 1: varre a listagem coletando candidatos elegíveis (FIPE + margem),
 *   uma página por vez com browser/sessid próprio (warmup + 1 página por IP).
 * - Fase 2: só então visita a página individual de cada elegível, também com
 *   browser/sessid próprio. Os ~90% descartados nunca chegam aqui.
 */
export async function varrerEProcessarMercadoLivre(
  categoriaUrlBase: string,
  maxPaginas: number,
  margemMinima: number
): Promise<ResultadoLoteMercadoLivre> {
  const resultado: ResultadoLoteMercadoLivre = { novos: 0, elegiveis: 0, descartados: 0, semFipe: 0 };
  const candidatos: CandidatoElegivel[] = [];

  // sessid base aleatório por run: o PROXY_URL traz `sessid.1` fixo, então
  // todo run reusava o MESMO IP residencial, que acumulava strikes de
  // rate-limit ao longo do dia e acabava caindo no /captcha/wall. Um base
  // aleatório por run dá um IP limpo a cada execução.
  const baseSess = 1 + Math.floor(Math.random() * 9000);

  // ===== Fase 1: varrer listagem, um IP limpo por página =====
  // Cada página usa browser+sessid próprios (baseSess + pagina). O ML walla a
  // 2ª página na MESMA sessão de proxy; com IP fresco por página, cada uma faz
  // só warmup + 1 página e passa.
  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    const { cards: cardsBrutos, walled } = await buscarCardsPaginaBrowserProprio(
      categoriaUrlBase,
      pagina,
      baseSess + pagina
    );

    if (walled) {
      console.log(`[motor-descoberta-mercadolivre] Página ${pagina} bloqueada (/captcha/wall) mesmo com IP limpo — parando paginação.`);
      break;
    }
    if (cardsBrutos.length === 0) {
      console.log(`[motor-descoberta-mercadolivre] Página ${pagina} vazia — fim da listagem.`);
      break;
    }

    const anuncios = cardsBrutos.map(converterCard).filter((a): a is AnuncioMercadoLivreBruto => a !== null);
    console.log(
      `[motor-descoberta-mercadolivre] Página ${pagina}: ${cardsBrutos.length} cards (${anuncios.length} de particular, ${cardsBrutos.length - anuncios.length} patrocinado/loja descartados).`
    );

    for (const anuncio of anuncios) {
      if (await linkOrigemJaExiste(anuncio.linkOrigem)) continue;
      resultado.novos++;

      if (!anuncio.preco || !anuncio.ano || !anuncio.titulo) {
        resultado.descartados++;
        continue;
      }

      const { marca, modelo, variante } = extrairMarcaModelo(anuncio.titulo);
      if (!marca || !modelo) { resultado.descartados++; continue; }

      const referenciaFipe = await buscarReferenciaFipe(marca, modelo, anuncio.ano, variante);
      if (!referenciaFipe) { resultado.semFipe++; continue; }

      const margemPercentual = calcularMargemPercentual(anuncio.preco, referenciaFipe.valor);
      if (!ehElegivel(margemPercentual, margemMinima)) { resultado.descartados++; continue; }

      const classificacao: Classificacao | null = classificar(margemPercentual);
      if (!classificacao) { resultado.descartados++; continue; }

      // Passou todos os filtros — guarda para visitar na Fase 2.
      candidatos.push({
        anuncio,
        preco: anuncio.preco,
        ano: anuncio.ano,
        marca,
        modelo,
        variante,
        referenciaFipe,
        margemPercentual,
        classificacao,
      });
    }
  }

  console.log(
    `[motor-descoberta-mercadolivre] Fase 1 concluída: ${candidatos.length} elegíveis de ${resultado.novos} novos. Iniciando Fase 2 (detalhes)…`
  );

  // ===== Fase 2: visitar página individual de cada elegível =====
  // Cada elegível usa browser/sessid próprio (ML manda /captcha/wall a partir
  // da 2ª página individual visitada na mesma sessão de proxy).
  // Páginas individuais: sessid distinto do da listagem (baseSess) e fresco
  // por run, rotacionando a cada anúncio (ML walla a 2ª individual no mesmo IP).
  let sessaoDetalheId = baseSess + 100;
  for (const cand of candidatos) {
    const { anuncio, preco, ano, marca, modelo, variante, referenciaFipe, margemPercentual, classificacao } = cand;

    console.log(`[motor-descoberta-mercadolivre] Elegível: ${anuncio.titulo} — buscando detalhes…`);
    // Resiliência: uma falha de detalhe (timeout, wall, etc.) NÃO pode derrubar
    // o run e perder todos os outros elegíveis (já aconteceu: 13 elegíveis
    // perdidos por 1 timeout). Salva a oportunidade com os dados do card e
    // segue; o backfill de detalhes pode completar fotos/descrição depois.
    let detalhes: DetalhesPaginaML;
    try {
      detalhes = await buscarDetalhesBrowserProprio(anuncio.linkOrigem, sessaoDetalheId++);
    } catch (erro) {
      const msg = erro instanceof Error ? erro.message.split("\n")[0] : String(erro);
      console.warn(`[motor-descoberta-mercadolivre] Detalhe falhou (${anuncio.titulo}): ${msg} — salvando só com dados do card.`);
      detalhes = { fotos: [], descricao: null, cambio: null, atributos: {} };
    }

    const { cidade, estado } = extrairCidadeEstado(anuncio.localizacaoTexto ?? "");
    const todasFotos = [
      ...(anuncio.fotoPrincipal ? [anuncio.fotoPrincipal] : []),
      ...detalhes.fotos.filter((f) => f !== anuncio.fotoPrincipal),
    ].slice(0, 10);

    const oportunidade: Oportunidade = {
      fonte: "MERCADO_LIVRE",
      link_origem: anuncio.linkOrigem,
      veiculo: `${marca} ${modelo}`,
      versao: variante,
      ano,
      cambio: detalhes.cambio,
      km: anuncio.km,
      cidade,
      estado,
      preco,
      fipe_valor: referenciaFipe.valor,
      fipe_data_referencia: referenciaFipe.mesReferencia,
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

    if (cidade && estado) await garantirCoordenadasCidade(cidade, estado);

    // Pausa entre detalhes (2-4s) para não martelar o proxy.
    await new Promise((r) => setTimeout(r, 2000 + Math.floor(Math.random() * 2000)));
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
