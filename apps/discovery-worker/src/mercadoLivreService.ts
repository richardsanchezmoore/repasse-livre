import { chromium } from "playwright";
import type { Page } from "playwright";
import { buscarReferenciaFipe } from "./fipeService.js";
import { calcularMargemPercentual, classificar, ehElegivel } from "./margin.js";
import { garantirCoordenadasCidade, linkOrigemJaExiste, salvarOportunidade } from "./supabaseClient.js";
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
  if (pagina === 1) return categoriaUrlBase;
  const offset = (pagina - 1) * TAMANHO_PAGINA + 1;
  const base = categoriaUrlBase.endsWith("/") ? categoriaUrlBase : `${categoriaUrlBase}/`;
  return `${base}_Desde_${offset}`;
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

/**
 * Varre a listagem (já filtrada por categoria + "particular" na própria
 * URL, ver gerarUrlCategoriaParticular) usando um browser real através de
 * um proxy residencial. Ritmo pausado entre páginas de propósito — bater
 * rápido demais no mesmo IP dispara um cooldown de captcha (confirmado em
 * teste; ver memória do projeto), não é só cortesia.
 */
export async function buscarAnunciosMercadoLivre(
  categoriaUrlBase: string,
  maxPaginas: number
): Promise<AnuncioMercadoLivreBruto[]> {
  const proxyUrl = process.env.PROXY_URL;
  const browser = await chromium.launch({
    headless: false,
    proxy: proxyUrl ? parseProxy(proxyUrl) : undefined,
    args: ["--no-sandbox"],
  });

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      locale: "pt-BR",
      viewport: { width: 1366, height: 768 },
    });
    const page = await context.newPage();

    await aquecerSessao(page);

    const anuncios: AnuncioMercadoLivreBruto[] = [];
    for (let pagina = 1; pagina <= maxPaginas; pagina++) {
      const url = montarUrlPagina(categoriaUrlBase, pagina);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(2500);

      const cardsBrutos = await extrairCardsDaPagina(page);
      if (cardsBrutos.length === 0) {
        console.log(`[motor-descoberta-mercadolivre] Página ${pagina} vazia, fim da listagem.`);
        break;
      }

      const convertidos = cardsBrutos.map(converterCard).filter((a): a is AnuncioMercadoLivreBruto => a !== null);
      console.log(
        `[motor-descoberta-mercadolivre] Página ${pagina}: ${cardsBrutos.length} cards (${convertidos.length} de particular, ${cardsBrutos.length - convertidos.length} patrocinado/loja descartados).`
      );
      anuncios.push(...convertidos);

      // ritmo pausado entre páginas (8-12s) — ver comentário da função.
      await page.waitForTimeout(8000 + Math.floor(Math.random() * 4000));
    }

    return anuncios;
  } finally {
    await browser.close();
  }
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

export interface OportunidadeMercadoLivreOuDescarte {
  oportunidade: Oportunidade | null;
  motivoDescarte: "ja_existe" | "sem_dados_minimos" | "sem_fipe" | "fora_da_margem" | null;
}

/**
 * O título do card ("Chevrolet Tracker 2021 1.2 Premier Turbo Aut. 5p")
 * não vem com marca/modelo separados como na Webmotors — só texto livre.
 * Primeira palavra = marca, segunda = modelo, resto = variante; o ano vem
 * do atributo separado do card (mais confiável que tentar achar um número
 * de 4 dígitos no título, já que nem todo título tem o ano embutido — ex.:
 * títulos com cilindrada como "Ford Ka 1.0 Flex 3p" sem ano nenhum no
 * texto). buscarReferenciaFipe já faz correspondência aproximada de
 * marca/modelo/variante, então essa divisão simples é suficiente.
 */
function extrairMarcaModelo(titulo: string): { marca: string; modelo: string; variante: string | null } {
  const palavras = titulo.trim().split(/\s+/);
  const marca = palavras[0] ?? "";
  const modelo = palavras[1] ?? "";
  const variante = palavras.slice(2).join(" ") || null;
  return { marca, modelo, variante };
}

export async function avaliarAnuncioMercadoLivre(
  anuncio: AnuncioMercadoLivreBruto,
  margemMinima: number
): Promise<OportunidadeMercadoLivreOuDescarte> {
  if (await linkOrigemJaExiste(anuncio.linkOrigem)) {
    return { oportunidade: null, motivoDescarte: "ja_existe" };
  }

  if (!anuncio.preco || !anuncio.ano || !anuncio.titulo) {
    return { oportunidade: null, motivoDescarte: "sem_dados_minimos" };
  }

  const { marca, modelo, variante } = extrairMarcaModelo(anuncio.titulo);
  if (!marca || !modelo) {
    return { oportunidade: null, motivoDescarte: "sem_dados_minimos" };
  }

  const referenciaFipe = await buscarReferenciaFipe(marca, modelo, anuncio.ano, variante);
  if (!referenciaFipe) {
    return { oportunidade: null, motivoDescarte: "sem_fipe" };
  }

  const margemPercentual = calcularMargemPercentual(anuncio.preco, referenciaFipe.valor);
  if (!ehElegivel(margemPercentual, margemMinima)) {
    return { oportunidade: null, motivoDescarte: "fora_da_margem" };
  }

  const classificacao: Classificacao | null = classificar(margemPercentual);
  if (!classificacao) {
    return { oportunidade: null, motivoDescarte: "fora_da_margem" };
  }

  const { cidade, estado } = extrairCidadeEstado(anuncio.localizacaoTexto ?? "");

  const oportunidade: Oportunidade = {
    fonte: "MERCADO_LIVRE",
    link_origem: anuncio.linkOrigem,
    veiculo: `${marca} ${modelo}`,
    versao: variante,
    ano: anuncio.ano,
    cambio: null,
    km: anuncio.km,
    cidade,
    estado,
    preco: anuncio.preco,
    fipe_valor: referenciaFipe.valor,
    fipe_data_referencia: referenciaFipe.mesReferencia,
    margem_percentual: Number(margemPercentual.toFixed(2)),
    classificacao,
    foto_principal: anuncio.fotoPrincipal,
    fotos_secundarias: [],
    descricao: null,
    origem_tipo: "descoberta",
    status: "descoberta",
    // a listagem da ML não expõe data de publicação (diferente da OLX) —
    // sem isso pra fazer janela/incremental por data; dedupe por
    // link_origem (linkOrigemJaExiste acima) é o que evita duplicar.
    data_publicacao_origem: null,
    atributos_olx: {},
    // já filtrado por "/particular/" na URL + descartado lojaOficial no
    // card (ver converterCard) — sempre pessoa física aqui.
    anunciante_profissional: false,
  };

  return { oportunidade, motivoDescarte: null };
}

export interface ResultadoLoteMercadoLivre {
  novos: number;
  elegiveis: number;
  descartados: number;
  semFipe: number;
}

export async function processarLoteAnunciosMercadoLivre(
  anuncios: AnuncioMercadoLivreBruto[],
  margemMinima: number
): Promise<ResultadoLoteMercadoLivre> {
  const resultado: ResultadoLoteMercadoLivre = { novos: 0, elegiveis: 0, descartados: 0, semFipe: 0 };

  for (const anuncio of anuncios) {
    const { oportunidade, motivoDescarte } = await avaliarAnuncioMercadoLivre(anuncio, margemMinima);

    if (motivoDescarte === "ja_existe") continue;
    resultado.novos++;

    if (!oportunidade) {
      if (motivoDescarte === "sem_fipe") resultado.semFipe++;
      else resultado.descartados++;
      continue;
    }

    await salvarOportunidade(oportunidade);
    resultado.elegiveis++;

    if (oportunidade.cidade && oportunidade.estado) {
      await garantirCoordenadasCidade(oportunidade.cidade, oportunidade.estado);
    }
  }

  return resultado;
}
