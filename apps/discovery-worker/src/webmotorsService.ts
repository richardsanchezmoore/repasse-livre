import { buscarReferenciaFipe } from "./fipeService.js";
import { calcularMargemPercentual, classificar, ehElegivel } from "./margin.js";
import { garantirCoordenadasCidade, linkOrigemJaExiste, salvarOportunidade } from "./supabaseClient.js";
import type { Classificacao, Oportunidade } from "./types.js";

const BRIGHTDATA_API_URL = "https://api.brightdata.com/datasets/v3/scrape";
const BRIGHTDATA_DATASET_ID = "gd_ld73zt91j10sphddj";

export interface AnuncioWebmotorsBruto {
  id?: number;
  url?: string;
  Marca?: string;
  Modelo?: string;
  Ano?: number;
  Variante?: string;
  Kilometraje?: number;
  description?: string;
  price?: number;
  Tipo_de_vendedor?: boolean;
  create_date?: string;
  Comuna?: string;
  Ciudad?: string;
  number_of_photos?: number;
  photos?: string[];
  Color?: string;
  Combustible?: string;
  carroceria?: string;
  accept_exchange?: boolean;
  single_owner?: boolean;
  // cnpj_cpf e phone existem na resposta da Bright Data, mas são dado
  // pessoal — propositalmente fora dessa interface, pra nunca acabarem
  // armazenados (ver descarteDeDadoPessoal logo abaixo).
}

/**
 * Busca anúncios "abaixo da FIPE" via Bright Data ("Discover by category",
 * modo síncrono) — substitui o papel de buscarHtml+curl_chrome116 da OLX,
 * já que a Webmotors bloqueia esse truque (ver
 * project_repasse_livre_webmotors_bloqueio_lambda_edge na memória do
 * projeto). categoryUrl é a URL de listagem da própria Webmotors, com
 * qualquer filtro nativo já aplicado (ex.: `?Oportunidades=Super%20Preco`
 * pro filtro "Abaixo da Fipe").
 */
export async function buscarAnunciosWebmotors(categoryUrl: string): Promise<AnuncioWebmotorsBruto[]> {
  const apiToken = process.env.BRIGHTDATA_API_TOKEN;
  if (!apiToken) {
    throw new Error("BRIGHTDATA_API_TOKEN não configurado.");
  }

  const url = new URL(BRIGHTDATA_API_URL);
  url.searchParams.set("dataset_id", BRIGHTDATA_DATASET_ID);
  url.searchParams.set("notify", "false");
  url.searchParams.set("include_errors", "true");
  url.searchParams.set("type", "discover_new");
  url.searchParams.set("discover_by", "category");

  const resposta = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: [{ category_url: categoryUrl }],
      limit_per_input: null,
    }),
  });

  if (!resposta.ok) {
    throw new Error(`Falha ao buscar anúncios da Webmotors via Bright Data (${resposta.status}).`);
  }

  const dados = (await resposta.json()) as AnuncioWebmotorsBruto[];
  return Array.isArray(dados) ? dados : [];
}

/**
 * O campo `Ciudad` da Webmotors vem como "Santa Catarina (SC)" (nome do
 * estado por extenso + sigla entre parênteses), não a sigla isolada que o
 * resto do sistema espera em `estado` (igual a OLX já entrega via
 * `locationDetails.uf`) — usado pra montar o slug da URL (`gerarSlugCidade`
 * em apps/admin/lib/slug.ts faz `estado.toLowerCase()` direto, sem validar
 * formato). Sem essa extração, o link da página individual sai quebrado
 * (slug com nome do estado por extenso, espaços e parênteses).
 */
function extrairSiglaEstado(ciudad: string | undefined): string | null {
  if (!ciudad) return null;
  const match = ciudad.match(/\(([A-Za-z]{2})\)/);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Mapeia os campos estruturados da Webmotors pras mesmas chaves que a OLX
 * usa em atributos_olx (ver CHAVES_ATRIBUTOS_RELEVANTES em olxService.ts) —
 * a página individual já sabe renderizar essas chaves (ficha técnica pra
 * cartype/carcolor/fuel, chips de "Sim" pro resto), sem precisar de
 * nenhuma mudança no app. Só inclui o que a Webmotors realmente manda;
 * "doors", "car_steering" e "motorpower" não vêm nesses dados, por
 * exemplo, e ficam de fora (a renderização já trata chave ausente).
 */
function montarAtributos(anuncio: AnuncioWebmotorsBruto): Record<string, { label: string; value: string }> {
  const atributos: Record<string, { label: string; value: string }> = {};

  if (anuncio.carroceria) atributos.cartype = { label: "Tipo", value: anuncio.carroceria };
  if (anuncio.Color) atributos.carcolor = { label: "Cor", value: anuncio.Color };
  if (anuncio.Combustible) atributos.fuel = { label: "Combustível", value: anuncio.Combustible };
  if (anuncio.accept_exchange) atributos.exchange = { label: "Aceita troca", value: "Sim" };
  if (anuncio.single_owner) atributos.owner = { label: "Único dono", value: "Sim" };

  return atributos;
}

export interface OportunidadeWebmotorsOuDescarte {
  oportunidade: Oportunidade | null;
  motivoDescarte: "ja_existe" | "sem_dados_minimos" | "sem_fipe" | "fora_da_margem" | null;
}

/**
 * Converte um anúncio bruto da Webmotors numa Oportunidade, calculando a
 * margem via fipeService (a Bright Data não traz valor FIPE pronto, ver
 * project_repasse_livre_pivot_multifonte_webmotors). Não inclui `cnpj_cpf`
 * nem o campo `phone` estruturado — nunca devem chegar ao banco; telefones
 * dentro de `description` continuam sendo mascarados na renderização, igual
 * já acontece pra OLX (ver apps/admin/lib/mascaras.ts).
 */
export async function avaliarAnuncioWebmotors(
  anuncio: AnuncioWebmotorsBruto,
  margemMinima: number
): Promise<OportunidadeWebmotorsOuDescarte> {
  if (!anuncio.id || !anuncio.url || !anuncio.Marca || !anuncio.Modelo || !anuncio.Ano || !anuncio.price) {
    return { oportunidade: null, motivoDescarte: "sem_dados_minimos" };
  }

  const referenciaFipe = await buscarReferenciaFipe(
    anuncio.Marca,
    anuncio.Modelo,
    String(anuncio.Ano),
    anuncio.Variante ?? null
  );
  if (!referenciaFipe) {
    return { oportunidade: null, motivoDescarte: "sem_fipe" };
  }

  const margemPercentual = calcularMargemPercentual(anuncio.price, referenciaFipe.valor);
  if (!ehElegivel(margemPercentual, margemMinima)) {
    return { oportunidade: null, motivoDescarte: "fora_da_margem" };
  }

  const classificacao: Classificacao | null = classificar(margemPercentual);
  if (!classificacao) {
    return { oportunidade: null, motivoDescarte: "fora_da_margem" };
  }

  const oportunidade: Oportunidade = {
    fonte: "WEBMOTORS",
    link_origem: anuncio.url,
    veiculo: `${anuncio.Marca} ${anuncio.Modelo}`,
    versao: anuncio.Variante ?? null,
    ano: String(anuncio.Ano),
    cambio: null,
    km: anuncio.Kilometraje ?? null,
    cidade: anuncio.Comuna ?? null,
    estado: extrairSiglaEstado(anuncio.Ciudad),
    preco: anuncio.price,
    fipe_valor: referenciaFipe.valor,
    fipe_data_referencia: referenciaFipe.mesReferencia,
    margem_percentual: Number(margemPercentual.toFixed(2)),
    classificacao,
    foto_principal: anuncio.photos?.[0] ?? null,
    fotos_secundarias: anuncio.photos?.slice(1) ?? [],
    descricao: anuncio.description ?? null,
    origem_tipo: "descoberta",
    status: "descoberta",
    data_publicacao_origem: anuncio.create_date ? new Date(anuncio.create_date).toISOString() : null,
    atributos_olx: montarAtributos(anuncio),
    anunciante_profissional: typeof anuncio.Tipo_de_vendedor === "boolean" ? anuncio.Tipo_de_vendedor : null,
  };

  return { oportunidade, motivoDescarte: null };
}

export interface ResultadoLoteWebmotors {
  novos: number;
  elegiveis: number;
  descartados: number;
  semFipe: number;
}

/**
 * Processa um lote de anúncios brutos (vindos da Bright Data em tempo real
 * ou de um JSON já baixado anteriormente — ver backfillWebmotorsLocal.ts,
 * que reaproveita uma varredura já paga em vez de chamar a Bright Data de
 * novo) contra o banco: dedupe por link_origem, corte por janela de dias de
 * publicação, e gravação das oportunidades elegíveis. Compartilhado entre
 * os dois entrypoints pra não duplicar essa lógica.
 */
export async function processarLoteAnunciosWebmotors(
  anuncios: AnuncioWebmotorsBruto[],
  margemMinima: number,
  janelaDias: number
): Promise<ResultadoLoteWebmotors> {
  const cutoffEpoch = Date.now() - janelaDias * 24 * 60 * 60 * 1000;
  const resultado: ResultadoLoteWebmotors = { novos: 0, elegiveis: 0, descartados: 0, semFipe: 0 };

  for (const anuncio of anuncios) {
    if (!anuncio.url) continue;
    if (await linkOrigemJaExiste(anuncio.url)) continue;

    if (anuncio.create_date && new Date(anuncio.create_date).getTime() < cutoffEpoch) {
      resultado.descartados++;
      continue;
    }

    resultado.novos++;

    const { oportunidade, motivoDescarte } = await avaliarAnuncioWebmotors(anuncio, margemMinima);
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
