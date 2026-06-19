import "dotenv/config";
import { capturarAnunciosOlx } from "./olxService.js";
import { buscarReferenciaFipe } from "./fipeService.js";
import { calcularMargemPercentual, classificar, ehElegivel, MARGEM_MINIMA_PADRAO } from "./margin.js";
import { linkOrigemJaExiste, salvarOportunidade } from "./supabaseClient.js";
import type { Oportunidade } from "./types.js";

const CATEGORIA_URL =
  process.env.OLX_CATEGORY_URL ?? "https://www.olx.com.br/autos-e-pecas/carros-vans-e-utilitarios/estado-rs";
const MARGEM_MINIMA = Number(process.env.MARGEM_MINIMA_PERCENTUAL ?? MARGEM_MINIMA_PADRAO);

async function executarVarredura(): Promise<void> {
  console.log(`[motor-descoberta] Capturando anúncios em: ${CATEGORIA_URL}`);
  const anuncios = await capturarAnunciosOlx(CATEGORIA_URL);
  console.log(`[motor-descoberta] ${anuncios.length} anúncios encontrados na página.`);

  let novos = 0;
  let elegiveis = 0;
  let descartados = 0;
  let semFipe = 0;

  for (const anuncio of anuncios) {
    if (await linkOrigemJaExiste(anuncio.linkOrigem)) {
      continue; // já capturado em execução anterior
    }
    novos++;

    if (!anuncio.marca || !anuncio.modelo || !anuncio.ano) {
      semFipe++;
      continue;
    }

    const referenciaFipe = await buscarReferenciaFipe(anuncio.marca, anuncio.modelo, anuncio.ano);
    if (!referenciaFipe) {
      semFipe++;
      continue;
    }

    const margemPercentual = calcularMargemPercentual(anuncio.preco, referenciaFipe.valor);

    if (!ehElegivel(margemPercentual, MARGEM_MINIMA)) {
      descartados++;
      continue;
    }

    const classificacao = classificar(margemPercentual);
    if (!classificacao) {
      descartados++;
      continue;
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
    elegiveis++;
  }

  console.log(
    `[motor-descoberta] Resultado: ${novos} novos | ${elegiveis} elegíveis salvos | ${descartados} descartados (margem < ${MARGEM_MINIMA}%) | ${semFipe} sem correspondência FIPE.`
  );
}

executarVarredura().catch((erro) => {
  console.error("[motor-descoberta] Falha na execução:", erro);
  process.exitCode = 1;
});
