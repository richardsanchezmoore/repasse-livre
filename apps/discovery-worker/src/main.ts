import "dotenv/config";
import { capturarAnunciosOlx, montarUrlPagina } from "./olxService.js";
import { buscarReferenciaFipe } from "./fipeService.js";
import { calcularMargemPercentual, classificar, ehElegivel, MARGEM_MINIMA_PADRAO } from "./margin.js";
import { linkOrigemJaExiste, salvarOportunidade } from "./supabaseClient.js";
import type { AnuncioOlx, Oportunidade } from "./types.js";

type ModoVarredura = "inicial" | "incremental";

const CATEGORIA_URL_BASE =
  process.env.OLX_CATEGORY_URL ?? "https://www.olx.com.br/autos-e-pecas/carros-vans-e-utilitarios/estado-rs";
const MARGEM_MINIMA = Number(process.env.MARGEM_MINIMA_PERCENTUAL ?? MARGEM_MINIMA_PADRAO);
const MODO: ModoVarredura = process.env.MODO_VARREDURA === "inicial" ? "inicial" : "incremental";
const JANELA_INICIAL_DIAS = Number(process.env.JANELA_INICIAL_DIAS ?? 30);
const MAX_PAGINAS = Number(process.env.MAX_PAGINAS ?? 50);

interface ResultadoVarredura {
  novos: number;
  elegiveis: number;
  descartados: number;
  semFipe: number;
}

async function processarAnuncio(anuncio: AnuncioOlx, resultado: ResultadoVarredura): Promise<void> {
  if (await linkOrigemJaExiste(anuncio.linkOrigem)) {
    return; // já capturado em execução anterior (não deveria ocorrer no modo incremental, que já corta antes)
  }
  resultado.novos++;

  if (!anuncio.marca || !anuncio.modelo || !anuncio.ano) {
    resultado.semFipe++;
    return;
  }

  let referenciaFipe;
  try {
    referenciaFipe = await buscarReferenciaFipe(anuncio.marca, anuncio.modelo, anuncio.ano);
  } catch (erro) {
    console.warn(`[motor-descoberta] Falha ao consultar FIPE para "${anuncio.titulo}":`, erro);
    resultado.semFipe++;
    return;
  }

  if (!referenciaFipe) {
    resultado.semFipe++;
    return;
  }

  const margemPercentual = calcularMargemPercentual(anuncio.preco, referenciaFipe.valor);

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
    veiculo: anuncio.modelo,
    versao: anuncio.modelo,
    ano: anuncio.ano,
    cambio: anuncio.cambio,
    cidade: anuncio.cidade,
    estado: anuncio.estado,
    preco: anuncio.preco,
    fipe_valor: referenciaFipe.valor,
    fipe_data_referencia: referenciaFipe.mesReferencia,
    margem_percentual: Number(margemPercentual.toFixed(2)),
    classificacao,
    foto_principal: anuncio.fotoPrincipal,
    fotos_secundarias: anuncio.fotosSecundarias,
    descricao: anuncio.descricao,
    origem_tipo: "descoberta",
    status: "descoberta",
  };

  await salvarOportunidade(oportunidade);
  resultado.elegiveis++;
}

/**
 * Varredura paginada da OLX, ordenada por data (mais recentes primeiro).
 *
 * - Modo "inicial": pagina até encontrar um anúncio mais antigo que
 *   JANELA_INICIAL_DIAS, populando a "prateleira" antes do primeiro envio.
 * - Modo "incremental" (execução recorrente, a cada 6h): pagina até
 *   encontrar o primeiro anúncio já salvo no banco — como a listagem está
 *   ordenada da mais nova para a mais antiga, a partir daquele ponto tudo
 *   já foi visto em uma varredura anterior, então não há motivo para
 *   continuar nem para reprocessar.
 */
async function executarVarredura(): Promise<void> {
  const resultado: ResultadoVarredura = { novos: 0, elegiveis: 0, descartados: 0, semFipe: 0 };
  const cutoffEpoch = Math.floor(Date.now() / 1000) - JANELA_INICIAL_DIAS * 24 * 60 * 60;

  console.log(`[motor-descoberta] Modo: ${MODO} | Categoria: ${CATEGORIA_URL_BASE}`);

  paginas: for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
    const url = montarUrlPagina(CATEGORIA_URL_BASE, pagina);
    const anuncios = await capturarAnunciosOlx(url);

    if (anuncios.length === 0) {
      console.log(`[motor-descoberta] Página ${pagina} vazia, fim da listagem.`);
      break;
    }

    console.log(`[motor-descoberta] Página ${pagina}: ${anuncios.length} anúncios.`);

    for (const anuncio of anuncios) {
      if (MODO === "incremental" && (await linkOrigemJaExiste(anuncio.linkOrigem))) {
        console.log(`[motor-descoberta] Anúncio já conhecido encontrado, parando varredura incremental.`);
        break paginas;
      }

      if (MODO === "inicial" && anuncio.dataPublicacao !== null && anuncio.dataPublicacao < cutoffEpoch) {
        console.log(
          `[motor-descoberta] Anúncio fora da janela de ${JANELA_INICIAL_DIAS} dias, parando varredura inicial.`
        );
        break paginas;
      }

      await processarAnuncio(anuncio, resultado);
    }
  }

  console.log(
    `[motor-descoberta] Resultado: ${resultado.novos} novos | ${resultado.elegiveis} elegíveis salvos | ${resultado.descartados} descartados (margem < ${MARGEM_MINIMA}%) | ${resultado.semFipe} sem correspondência FIPE.`
  );
}

executarVarredura().catch((erro) => {
  console.error("[motor-descoberta] Falha na execução:", erro);
  process.exitCode = 1;
});
