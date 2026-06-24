import "dotenv/config";
import {
  buscarDetalhesDaPaginaAnuncio,
  capturarAnunciosOlx,
  montarUrlPagina,
  resolverChaveFiltroFipe,
} from "./olxService.js";
import { calcularMargemPercentual, classificar, ehElegivel, MARGEM_MINIMA_PADRAO } from "./margin.js";
import { avancarCheckpoint, linkOrigemJaExiste, obterCheckpoint, salvarOportunidade } from "./supabaseClient.js";
import type { AnuncioOlx, Oportunidade } from "./types.js";

type ModoVarredura = "inicial" | "incremental" | "intervalo";

/**
 * Aceita uma ou mais URLs de categoria separadas por vírgula (uma por
 * estado) — a varredura roda para cada uma, em sequência, na mesma
 * execução do worker.
 */
const CATEGORIAS_URL_BASE = (
  process.env.OLX_CATEGORY_URL ?? "https://www.olx.com.br/autos-e-pecas/carros-vans-e-utilitarios/estado-rs"
)
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);
const MARGEM_MINIMA = Number(process.env.MARGEM_MINIMA_PERCENTUAL ?? MARGEM_MINIMA_PADRAO);
const MODO: ModoVarredura =
  process.env.MODO_VARREDURA === "inicial"
    ? "inicial"
    : process.env.MODO_VARREDURA === "intervalo"
      ? "intervalo"
      : "incremental";
const JANELA_INICIAL_DIAS = Number(process.env.JANELA_INICIAL_DIAS ?? 30);
const MAX_PAGINAS = Number(process.env.MAX_PAGINAS ?? 50);

/**
 * Modo "intervalo": varredura avulsa para preencher uma janela de datas
 * específica (ex.: ampliar a base de testes com um dia anterior ao início
 * real da operação), sem o atalho do modo incremental de parar no primeiro
 * anúncio já conhecido — aqui o objetivo é justamente revisitar uma faixa
 * "atrás" do que já foi capturado.
 */
const JANELA_INICIO = process.env.JANELA_INICIO ? new Date(process.env.JANELA_INICIO) : null;
const JANELA_FIM = process.env.JANELA_FIM ? new Date(process.env.JANELA_FIM) : null;

interface ResultadoVarredura {
  novos: number;
  elegiveis: number;
  descartados: number;
  semFipe: number;
}

/**
 * O FIPE usado aqui vem direto da página individual do anúncio (a OLX já
 * calcula isso para cada veículo) — não da API externa de FIPE. Por isso
 * todo anúncio novo precisa de uma requisição extra para sua própria
 * página, não só os que pareceriam elegíveis por uma estimativa textual.
 */
async function processarAnuncio(anuncio: AnuncioOlx, resultado: ResultadoVarredura): Promise<void> {
  if (await linkOrigemJaExiste(anuncio.linkOrigem)) {
    return; // já capturado antes (ex.: anúncio "renovado" pela OLX, reaparecendo no topo da listagem)
  }
  resultado.novos++;

  let detalhes;
  try {
    detalhes = await buscarDetalhesDaPaginaAnuncio(anuncio.linkOrigem);
  } catch (erro) {
    console.warn(`[motor-descoberta] Falha ao buscar FIPE na página de "${anuncio.titulo}":`, erro);
    resultado.semFipe++;
    return;
  }

  const { fipe, fotos } = detalhes;
  if (!fipe) {
    resultado.semFipe++;
    return;
  }

  // Só substitui a foto principal e usa fotos secundárias quando a página
  // do anúncio realmente trouxe uma galeria (mais de 1 foto). Caso
  // contrário, mantém a foto de capa da listagem e nenhuma secundária —
  // não há link de mais fotos para mostrar, então não preenchemos o
  // slider com nada que possa quebrá-lo.
  const fotoPrincipal = fotos[0] ?? anuncio.fotoPrincipal;
  const fotosSecundarias = fotos.length > 1 ? fotos.slice(1) : [];

  const margemPercentual = calcularMargemPercentual(anuncio.preco, fipe.fipeValor);

  if (!ehElegivel(margemPercentual, MARGEM_MINIMA)) {
    resultado.descartados++;
    return;
  }

  const classificacao = classificar(margemPercentual);
  if (!classificacao) {
    resultado.descartados++;
    return;
  }

  const oportunidade: Oportunidade = {
    fonte: "OLX",
    link_origem: anuncio.linkOrigem,
    veiculo: anuncio.titulo,
    versao: anuncio.modelo,
    ano: anuncio.ano,
    cambio: anuncio.cambio,
    km: anuncio.km,
    cidade: anuncio.cidade,
    estado: anuncio.estado,
    preco: anuncio.preco,
    fipe_valor: fipe.fipeValor,
    fipe_data_referencia: fipe.mesReferencia,
    margem_percentual: Number(margemPercentual.toFixed(2)),
    classificacao,
    foto_principal: fotoPrincipal,
    fotos_secundarias: fotosSecundarias,
    descricao: anuncio.descricao,
    origem_tipo: "descoberta",
    status: "descoberta",
    data_publicacao_origem:
      anuncio.dataPublicacao !== null ? new Date(anuncio.dataPublicacao * 1000).toISOString() : null,
  };

  await salvarOportunidade(oportunidade);
  resultado.elegiveis++;
}

/**
 * Varredura paginada da OLX, ordenada por data (mais recentes primeiro).
 *
 * - Modo "inicial": pagina até encontrar um anúncio mais antigo que
 *   JANELA_INICIAL_DIAS, populando a "prateleira" antes do primeiro envio.
 * - Modo "incremental" (execução recorrente, a cada 6h): pagina até a data
 *   de publicação cair no ou antes do checkpoint da varredura anterior
 *   (não mais "até achar um anúncio já salvo" — a OLX reposiciona no topo
 *   anúncios antigos "renovados" pelo anunciante, com data aparente recente;
 *   parar nesse ponto faria a varredura ignorar anúncios genuinamente novos
 *   posicionados abaixo dele). Anúncios já conhecidos pelo caminho são só
 *   pulados (o upsert por link_origem em salvarOportunidade já evita
 *   duplicar), não interrompem mais a varredura.
 */
async function executarVarredura(categoriaUrlBase: string): Promise<ResultadoVarredura> {
  const resultado: ResultadoVarredura = { novos: 0, elegiveis: 0, descartados: 0, semFipe: 0 };
  const cutoffEpoch = Math.floor(Date.now() / 1000) - JANELA_INICIAL_DIAS * 24 * 60 * 60;
  const checkpointAnteriorEpoch = MODO === "incremental" ? await obterCheckpoint(categoriaUrlBase) : null;
  let maiorDataVistaEpoch: number | null = null;

  if (MODO === "intervalo" && (!JANELA_INICIO || !JANELA_FIM)) {
    throw new Error(
      "Modo 'intervalo' exige JANELA_INICIO e JANELA_FIM (datas ISO, ex.: 2026-06-18T00:00:00-03:00)."
    );
  }
  const intervaloInicioEpoch = JANELA_INICIO ? Math.floor(JANELA_INICIO.getTime() / 1000) : null;
  const intervaloFimEpoch = JANELA_FIM ? Math.floor(JANELA_FIM.getTime() / 1000) : null;

  const chaveFiltroFipe = await resolverChaveFiltroFipe(categoriaUrlBase);
  const urlComFiltro = new URL(categoriaUrlBase);
  urlComFiltro.searchParams.set(chaveFiltroFipe, "2");

  console.log(
    `[motor-descoberta] Modo: ${MODO} | Categoria: ${urlComFiltro.toString()} (filtro "abaixo da FIPE" via chave "${chaveFiltroFipe}")`
  );

  paginas: for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
    const url = montarUrlPagina(urlComFiltro.toString(), pagina);
    const anuncios = await capturarAnunciosOlx(url);

    if (anuncios.length === 0) {
      console.log(`[motor-descoberta] Página ${pagina} vazia, fim da listagem.`);
      break;
    }

    console.log(`[motor-descoberta] Página ${pagina}: ${anuncios.length} anúncios.`);

    for (const anuncio of anuncios) {
      if (anuncio.dataPublicacao !== null && (maiorDataVistaEpoch === null || anuncio.dataPublicacao > maiorDataVistaEpoch)) {
        maiorDataVistaEpoch = anuncio.dataPublicacao;
      }

      if (
        MODO === "incremental" &&
        checkpointAnteriorEpoch !== null &&
        anuncio.dataPublicacao !== null &&
        anuncio.dataPublicacao <= checkpointAnteriorEpoch
      ) {
        console.log(`[motor-descoberta] Checkpoint alcançado, parando varredura incremental.`);
        break paginas;
      }

      if (MODO === "inicial" && anuncio.dataPublicacao !== null && anuncio.dataPublicacao < cutoffEpoch) {
        console.log(
          `[motor-descoberta] Anúncio fora da janela de ${JANELA_INICIAL_DIAS} dias, parando varredura inicial.`
        );
        break paginas;
      }

      if (MODO === "intervalo") {
        if (anuncio.dataPublicacao === null) {
          continue; // sem data, não dá pra saber se está na janela — pula sem parar a varredura
        }
        if (anuncio.dataPublicacao > intervaloFimEpoch!) {
          continue; // ainda mais novo que o fim da janela, segue procurando os mais antigos
        }
        if (anuncio.dataPublicacao < intervaloInicioEpoch!) {
          console.log(`[motor-descoberta] Anúncio anterior ao início da janela, parando varredura de intervalo.`);
          break paginas;
        }
      }

      await processarAnuncio(anuncio, resultado);
    }
  }

  if (MODO === "incremental" && maiorDataVistaEpoch !== null) {
    await avancarCheckpoint(categoriaUrlBase, maiorDataVistaEpoch);
  }

  console.log(
    `[motor-descoberta] Resultado (${categoriaUrlBase}): ${resultado.novos} novos | ${resultado.elegiveis} elegíveis salvos | ${resultado.descartados} descartados (margem < ${MARGEM_MINIMA}%) | ${resultado.semFipe} sem FIPE na página do anúncio.`
  );

  return resultado;
}

async function executarTodasCategorias(): Promise<void> {
  for (const categoriaUrlBase of CATEGORIAS_URL_BASE) {
    await executarVarredura(categoriaUrlBase);
  }
}

executarTodasCategorias().catch((erro) => {
  console.error("[motor-descoberta] Falha na execução:", erro);
  process.exitCode = 1;
});
