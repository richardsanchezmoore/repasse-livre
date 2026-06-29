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
    estado: anuncio.Ciudad ?? null,
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
    atributos_olx: {},
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
