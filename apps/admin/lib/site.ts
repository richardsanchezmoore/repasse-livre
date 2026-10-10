import { gerarSlugCidade, gerarSlugEstado, gerarSlugOportunidade, slugify } from "./slug";
import type { Oportunidade } from "./types";

export const URL_BASE_SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://repasselivre.com").replace(/\/$/, "");

/**
 * ★★ O PAÍS QUE O SITE ANUNCIA — e por que isso existe (02/10/2026).
 *
 * A conta do Supabase estourou o egress (5,47 de 5 GB) com DOIS usuários ativos
 * no mês. Não era gente, era robô: das oportunidades aprovadas, 934 são BR e 66
 * são PY. O buscador rastreava todo dia ~2.800 URLs de estoque brasileiro da
 * era Repasse Livre, e cada visita puxava dado do banco.
 *
 * ⚠️ O CORTE NÃO PODE SER POR DOMÍNIO. O Auto Radar PY roda HOJE no próprio
 * repasselivre.com — a troca para autoradarpy.com vem depois. Separar pelo
 * endereço desindexaria o site vivo. Quem separa as duas eras é o DADO.
 *
 * ⚠️ NÃO APAGA NADA: o conteúdo brasileiro continua no ar e no painel, só sai
 * do índice. Para trazer o Brasil de volta é mudar a env, sem deploy de código
 * — mesma lógica do "desligar por flag, não apagar" de Webmotors e OLX.
 */
export const PAIS_DO_SITE = process.env.NEXT_PUBLIC_PAIS_SITE ?? "PY";

/**
 * O nome do país por extenso, para a interface.
 *
 * ⚠️ Existe porque o seletor do topo tinha "Brasil" CHUMBADO como rótulo e
 * como opção: o Gustavo abriu o Auto Radar e leu "Oportunidades no Brasil" em
 * cima de uma lista inteira de carros de Ciudad del Este. O filtro de dado já
 * estava certo; era a palavra que mentia.
 */
export const NOME_DO_PAIS: string =
  ({ PY: "Paraguai", BR: "Brasil", AR: "Argentina" } as Record<string, string>)[PAIS_DO_SITE] ?? PAIS_DO_SITE;

/**
 * De que país é um estado. O Paraguai aparece como "PY-ASU", "PY-CDE"...;
 * o Brasil como UF de duas letras ("RS", "SP"). Sem prefixo = Brasil.
 */
export const paisDoEstado = (estado?: string | null): string =>
  /^PY(-|$)/i.test(String(estado ?? "").trim()) ? "PY" : "BR";

/** Conteúdo de país que o site não anuncia mais. */
export const ehEraAnterior = (estado?: string | null): boolean =>
  paisDoEstado(estado) !== PAIS_DO_SITE;

/**
 * Spread no objeto de metadata: tira do índice mas MANTÉM o follow, para o
 * robô continuar atravessando os links e achando as páginas do Paraguai.
 */
export const metadataEraAnterior = (estado?: string | null) =>
  ehEraAnterior(estado) ? ({ robots: { index: false, follow: true } } as const) : {};

// Colunas LEVES pras listagens/cards (páginas SEO). Evita ler as pesadas
// (fotos_secundarias, descricao, atributos_olx, copiloto_parecer, opcionais…),
// que inflam a tabela pra ~58MB e faziam a leitura por página estourar o Disk IO.
// O OpportunityCard e caminhoOportunidade só usam estas.
export const COLUNAS_CARTAO =
  "id, fonte, link_origem, veiculo, versao, ano, cambio, cidade, estado, preco, moeda, pais, procedencia, fipe_valor, fipe_data_referencia, margem_percentual, classificacao, foto_principal, origem_tipo, status, data_captura, data_atualizacao, favorito, whatsapp, data_publicacao_origem, km, motivo_venda, nome_remetente, sinistro_leilao, data_ordenacao, anunciante_profissional, criado_por, fipe_codigo";

type DadosUrlOportunidade = Pick<
  Oportunidade,
  "id" | "veiculo" | "versao" | "ano" | "cidade" | "estado" | "origem_tipo"
>;

export function caminhoOportunidade(oportunidade: DadosUrlOportunidade): string {
  return `/carros/${gerarSlugCidade(oportunidade)}/${gerarSlugOportunidade(oportunidade)}`;
}

export function urlOportunidade(oportunidade: DadosUrlOportunidade): string {
  return `${URL_BASE_SITE}${caminhoOportunidade(oportunidade)}`;
}

export function caminhoCidade(oportunidade: Pick<Oportunidade, "cidade" | "estado">): string {
  return `/carros/${gerarSlugCidade(oportunidade)}`;
}

export function urlCidade(oportunidade: Pick<Oportunidade, "cidade" | "estado">): string {
  return `${URL_BASE_SITE}${caminhoCidade(oportunidade)}`;
}

export function caminhoEstado(estado: string): string {
  return `/carros/${gerarSlugEstado(estado)}`;
}

export function urlEstado(estado: string): string {
  return `${URL_BASE_SITE}${caminhoEstado(estado)}`;
}

// Marca dentro do recorte de cidade, só estado, ou nacional (nenhum dos
// dois — /carros/{marca} de nível Brasil) — mesma lógica de localidade, só
// acrescentando um segmento final /{marca}.
export function caminhoMarca(localidade: { cidade?: string | null; estado?: string | null }, marca: string): string {
  if (localidade.cidade && localidade.estado) {
    return `${caminhoCidade({ cidade: localidade.cidade, estado: localidade.estado })}/${slugify(marca)}`;
  }
  if (localidade.estado) {
    return `${caminhoEstado(localidade.estado)}/${slugify(marca)}`;
  }
  return `/carros/${slugify(marca)}`;
}

export function urlMarca(localidade: { cidade?: string | null; estado?: string | null }, marca: string): string {
  return `${URL_BASE_SITE}${caminhoMarca(localidade, marca)}`;
}

// Modelo = 1 nível abaixo da marca (/carros/{cidadeUf}/{marca}/{modelo}). Só
// cidade/estado no v1 (nacional /carros/{marca}/{modelo} conflitaria com a rota
// carro/marca). Ver project_repasse_livre_seo_pagina_modelo.
export function caminhoModelo(
  localidade: { cidade?: string | null; estado?: string | null },
  marca: string,
  modelo: string,
): string {
  return `${caminhoMarca(localidade, marca)}/${slugify(modelo)}`;
}

export function urlModelo(
  localidade: { cidade?: string | null; estado?: string | null },
  marca: string,
  modelo: string,
): string {
  return `${URL_BASE_SITE}${caminhoModelo(localidade, marca, modelo)}`;
}

/**
 * ═══ A MOLDURA FIPE SÓ APARECE ONDE EXISTE FIPE (Gustavo, 10/10/2026) ═══
 *
 * ★★★ NO PARAGUAI NÃO EXISTE FIPE. Não é que a nossa não bateu: a tabela não
 * existe no país — é justamente por isso que o Auto Radar PY tem razão de ser,
 * porque lá o produto deixa de achar desconto contra uma referência pronta e
 * passa a CRIAR a referência.
 *
 * ⚠️ O que estava NO AR: todo card paraguaio mostrava a mobília vazia da era
 * brasileira — "Ganho —", "Margem de % abaixo da FIPE", "FIPE —", e os selos
 * Bronze/Prata/Ouro/Diamante, que são faixas de margem sobre a FIPE. Num site
 * paraguaio isso não é só inútil: anuncia que o site é de outro mercado.
 *
 * ⚠️⚠️ O CORTE É POR DADO, NUNCA POR PAÍS CHUMBADO NEM POR DOMÍNIO — mesma
 * regra que separou as duas eras no `PAIS_DO_SITE` acima. Um anúncio brasileiro
 * sem casamento de FIPE também não deve mostrar "FIPE —": o teste certo é se
 * existe valor, e é só isso que esta função pergunta.
 *
 * ★ Quando a NOSSA tabela de referência estiver persistida, é aqui que entra o
 * par desta função — e o selo vira *"3% por debajo de la tabla AutoRadarPY"*.
 * Hoje `tabelaReferenciaPY.ts` só imprime; não há valor no banco para mostrar.
 */
export const temReferenciaFipe = (o: { fipe_valor?: number | null }): boolean =>
  o.fipe_valor != null && Number.isFinite(o.fipe_valor) && o.fipe_valor > 0;

/** O site inteiro trabalha contra uma tabela de referência? (Brasil sim, Paraguai ainda não.) */
export const PRACA_TEM_TABELA_PRONTA = PAIS_DO_SITE === "BR";
