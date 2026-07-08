import { buscarReferenciaFipe } from "./fipeService.js";
import { garantirHistoricoFipe } from "./historicoFipe.js";
import { calcularMargemPercentual, classificar, ehElegivel } from "./margin.js";
import { garantirCoordenadasCidade, linkOrigemJaExiste, salvarOportunidade } from "./supabaseClient.js";
import type { Classificacao, Oportunidade } from "./types.js";

const BRIGHTDATA_BASE = "https://api.brightdata.com/datasets/v3";
const BRIGHTDATA_DATASET_ID = "gd_ld73zt91j10sphddj";
/** Teto de anúncios por run (Bright Data cobra por registro). Configurável via env. */
const LIMITE_PADRAO = 150;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

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
  /** "Loja" | "Concessionária" | "Pessoa Física" — ver decisaoAnuncianteProfissional. */
  vendor?: string;
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

/** Remove os registros de erro (dead_page etc., vêm por include_errors=true) — só anúncios reais. */
function filtrarValidos(dados: unknown[]): AnuncioWebmotorsBruto[] {
  return dados.filter((r): r is AnuncioWebmotorsBruto => {
    const rec = r as { error?: unknown; error_code?: unknown };
    return !rec.error && !rec.error_code;
  });
}

/** Aguarda a coleta assíncrona do Bright Data ficar "ready". */
async function esperarSnapshotPronto(snapshotId: string, headers: Record<string, string>, maxMinutos = 15): Promise<void> {
  const inicio = Date.now();
  while (Date.now() - inicio < maxMinutos * 60_000) {
    await sleep(10_000);
    const r = await fetch(`${BRIGHTDATA_BASE}/progress/${snapshotId}`, { headers });
    const p = (await r.json()) as { status?: string };
    if (p.status === "ready") return;
    if (p.status === "failed") throw new Error(`Snapshot ${snapshotId} falhou no Bright Data.`);
  }
  throw new Error(`Snapshot ${snapshotId} não ficou pronto em ${maxMinutos}min.`);
}

/**
 * Baixa o snapshot pronto. DEPOIS do "ready" o Bright Data ainda "monta o
 * arquivo de entrega" e nesse meio-tempo responde 202 (building) ou 200 com um
 * objeto `{status:"building"}` em vez do array — isso pode levar VÁRIOS minutos
 * sob carga. A versão antiga desistia em 120s (20×6s) e estourava "não
 * completou" mesmo com os registros prontos (foi o que derrubou os runs de
 * 07-08/07). Agora espera até `maxMinutos` e loga o último status real pra
 * diagnóstico. Ver project_repasse_livre_webmotors_async_e_custo.
 */
async function baixarSnapshot(snapshotId: string, headers: Record<string, string>, maxMinutos = 12): Promise<unknown[]> {
  const inicio = Date.now();
  let ultimoStatus = "sem resposta";
  while (Date.now() - inicio < maxMinutos * 60_000) {
    const r = await fetch(`${BRIGHTDATA_BASE}/snapshot/${snapshotId}?format=json`, { headers });
    const texto = await r.text();
    if (r.status === 200) {
      try {
        const dados = JSON.parse(texto);
        if (Array.isArray(dados)) return dados;
        // 200 mas ainda "building" (objeto com status) — continua esperando.
        ultimoStatus = `200 ${(dados as { status?: string })?.status ?? "objeto-nao-array"}`;
      } catch {
        ultimoStatus = `200 nao-json(${texto.length}b)`;
      }
    } else {
      // 202 = building; 4xx/5xx = captura corpo pro log.
      ultimoStatus = `HTTP ${r.status} ${texto.slice(0, 100)}`;
    }
    await sleep(8_000);
  }
  throw new Error(`Download do snapshot ${snapshotId} não completou em ${maxMinutos}min (último status: ${ultimoStatus}).`);
}

/**
 * Baixa E ingere um snapshot que JÁ existe no Bright Data (pelo id), sem
 * re-disparar coleta (nem re-pagar). Usado na recuperação de snapshots que
 * completaram no BD mas cujo run falhou no download/morreu — ver
 * recuperarSnapshotsWebmotors.ts.
 */
export async function coletarSnapshotWebmotorsPorId(snapshotId: string): Promise<AnuncioWebmotorsBruto[]> {
  const apiToken = process.env.BRIGHTDATA_API_TOKEN;
  if (!apiToken) throw new Error("BRIGHTDATA_API_TOKEN não configurado.");
  const headers = { Authorization: `Bearer ${apiToken}` };
  await esperarSnapshotPronto(snapshotId, headers);
  const dados = await baixarSnapshot(snapshotId, headers);
  return filtrarValidos(dados);
}

/**
 * Busca anúncios "abaixo da FIPE" via Bright Data ("Discover by category") —
 * substitui o papel de buscarHtml+curl_chrome116 da OLX, já que a Webmotors
 * bloqueia esse truque (Akamai/Lambda@Edge; confirmado 30/06 que nem browser
 * residencial nem Scraping Browser passam — só o desbloqueio premium do Bright
 * Data). categoryUrl é a listagem da Webmotors com filtro nativo já aplicado
 * (ex.: `?Oportunidades=Super%20Preco` pro "Abaixo da Fipe").
 *
 * A API é ASSÍNCRONA: o POST retorna 202 + `snapshot_id`, depois é preciso
 * pollar `/progress` até "ready" e baixar via `/snapshot`. `limit_per_input`
 * limita quantos anúncios coletar (Bright Data cobra por registro; default 150
 * corta ~70% do custo vs sem limite).
 */
export async function buscarAnunciosWebmotors(categoryUrl: string): Promise<AnuncioWebmotorsBruto[]> {
  const apiToken = process.env.BRIGHTDATA_API_TOKEN;
  if (!apiToken) {
    throw new Error("BRIGHTDATA_API_TOKEN não configurado.");
  }
  const headers = { Authorization: `Bearer ${apiToken}` };
  const limite = Number(process.env.WEBMOTORS_LIMIT_PER_INPUT ?? LIMITE_PADRAO);

  const url = new URL(`${BRIGHTDATA_BASE}/scrape`);
  url.searchParams.set("dataset_id", BRIGHTDATA_DATASET_ID);
  url.searchParams.set("notify", "false");
  url.searchParams.set("include_errors", "true");
  url.searchParams.set("type", "discover_new");
  url.searchParams.set("discover_by", "category");
  // limit_per_input precisa ir na QUERY STRING (não só no body) para o Bright
  // Data respeitar o teto no discover_by=category — senão ignora e coleta tudo.
  url.searchParams.set("limit_per_input", String(limite));

  const trigger = await fetch(url.toString(), {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ input: [{ category_url: categoryUrl }], limit_per_input: limite }),
  });
  const respostaTrigger: unknown = await trigger.json();
  // Compat: se algum dia voltar síncrono (array direto), usa direto.
  if (Array.isArray(respostaTrigger)) return filtrarValidos(respostaTrigger);
  const snapshotId = (respostaTrigger as { snapshot_id?: string })?.snapshot_id;
  if (!snapshotId) {
    throw new Error(`Bright Data não retornou snapshot_id (HTTP ${trigger.status}): ${JSON.stringify(respostaTrigger).slice(0, 200)}`);
  }

  console.log(`[motor-descoberta-webmotors] Snapshot ${snapshotId} disparado (limite ${limite}), aguardando coleta…`);
  await esperarSnapshotPronto(snapshotId, headers);
  const dados = await baixarSnapshot(snapshotId, headers);
  const anuncios = filtrarValidos(dados);
  console.log(
    `[motor-descoberta-webmotors] Snapshot ${snapshotId}: ${dados.length} registros, ${anuncios.length} anúncios válidos (${dados.length - anuncios.length} erros/dead_page filtrados).`
  );
  return anuncios;
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

/**
 * `Tipo_de_vendedor` (booleano) não é confiável: numa amostra de 514
 * anúncios, só vinha `true` em 9 casos, sem nenhuma correlação com texto
 * de loja/concessionária na própria descrição (74 anúncios com "loja",
 * "concessionária" etc. no texto, nenhum marcado como profissional por
 * esse campo). O campo categórico `vendor` ("Loja" | "Concessionária" |
 * "Pessoa Física") é consistente com a descrição e reflete melhor a
 * realidade da Webmotors (~80% lojista/concessionária na mesma amostra,
 * batendo com a tese do pivot — ver
 * project_repasse_livre_pivot_multifonte_webmotors).
 */
function decisaoAnuncianteProfissional(vendor: string | undefined): boolean | null {
  if (!vendor) return null;
  return vendor !== "Pessoa Física";
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

  // FIPE resiliente: 429/502/timeout da API vira "sem_fipe" (não derruba o run).
  const referenciaFipe = await buscarReferenciaFipe(
    anuncio.Marca,
    anuncio.Modelo,
    String(anuncio.Ano),
    anuncio.Variante ?? null
  ).catch(() => null);
  if (!referenciaFipe) {
    return { oportunidade: null, motivoDescarte: "sem_fipe" };
  }

  const margemPercentual = calcularMargemPercentual(anuncio.price, referenciaFipe.valor);
  if (!ehElegivel(margemPercentual, margemMinima)) {
    return { oportunidade: null, motivoDescarte: "fora_da_margem" };
  }

  const classificacao: Classificacao | null = classificar(margemPercentual, margemMinima);
  if (!classificacao) {
    return { oportunidade: null, motivoDescarte: "fora_da_margem" };
  }

  const oportunidade: Oportunidade = {
    fonte: "WEBMOTORS",
    link_origem: anuncio.url,
    // Título completo (Marca + Modelo + Variante) — a Webmotors não traz um
    // campo de título bruto, mas a Variante tem o resto do nome. Guardar só
    // "Marca Modelo" cortava o veículo no card/página (mesmo bug do ML). BI/SEO
    // extraem marca+modelo das 2 primeiras palavras, então não são afetados.
    veiculo: [anuncio.Marca, anuncio.Modelo, anuncio.Variante].filter(Boolean).join(" "),
    versao: anuncio.Variante ?? null,
    ano: String(anuncio.Ano),
    cambio: null,
    km: anuncio.Kilometraje ?? null,
    cidade: anuncio.Comuna ?? null,
    estado: extrairSiglaEstado(anuncio.Ciudad),
    preco: anuncio.price,
    fipe_valor: referenciaFipe.valor,
    fipe_data_referencia: referenciaFipe.mesReferencia,
    fipe_codigo: referenciaFipe.codigoFipe,
    margem_percentual: Number(margemPercentual.toFixed(2)),
    classificacao,
    foto_principal: anuncio.photos?.[0] ?? null,
    fotos_secundarias: anuncio.photos?.slice(1) ?? [],
    descricao: anuncio.description ?? null,
    origem_tipo: "descoberta",
    status: "descoberta",
    data_publicacao_origem: anuncio.create_date ? new Date(anuncio.create_date).toISOString() : null,
    atributos_olx: montarAtributos(anuncio),
    anunciante_profissional: decisaoAnuncianteProfissional(anuncio.vendor),
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

    if (oportunidade.fipe_codigo && oportunidade.ano) {
      await garantirHistoricoFipe(oportunidade.fipe_codigo, Number.parseInt(oportunidade.ano, 10));
    }
    if (oportunidade.cidade && oportunidade.estado) {
      await garantirCoordenadasCidade(oportunidade.cidade, oportunidade.estado);
    }
  }

  return resultado;
}
