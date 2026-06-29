import "dotenv/config";
import { avaliarAnuncioWebmotors, buscarAnunciosWebmotors } from "./webmotorsService.js";
import { MARGEM_MINIMA_PADRAO } from "./margin.js";
import {
  finalizarRegistroVarreduraComErro,
  finalizarRegistroVarreduraComSucesso,
  garantirCoordenadasCidade,
  iniciarRegistroVarredura,
  lerConfig,
  linkOrigemJaExiste,
  salvarOportunidade,
} from "./supabaseClient.js";

const MODO = "webmotors";

interface ResultadoVarreduraWebmotors {
  novos: number;
  elegiveis: number;
  descartados: number;
  semFipe: number;
}

// Serviço Railway próprio (não reaproveita o cron da OLX), com cron diário
// configurado direto no painel — diferente da OLX, a Webmotors não ordena
// listagem por data (só "relevância"/rateio entre lojistas, ver
// project_repasse_livre_webmotors_bloqueio_lambda_edge na memória do
// projeto), então não dá pra fazer checkpoint incremental. O modelo aqui é
// "reler o recorte top do filtro 'abaixo da FIPE' a cada execução e
// dedupe por link_origem" — cada leitura custa créditos da Bright Data,
// por isso 1x/dia já é a cadência, decidida no cron, não em código.

/**
 * Janela de dias de publicação aceita na ingestão — registros com
 * `create_date` mais antigo que isso são descartados mesmo se elegíveis,
 * pra não poluir a base com inventário muito parado (ver decisão do
 * usuário: base de 60 dias normalmente, captação inicial alargada pra 50
 * dias via config). Configurável pelo painel (worker_config), assim a
 * captação inicial pode usar um valor diferente do regime normal sem
 * precisar de deploy.
 */
async function obterJanelaDias(): Promise<number> {
  const valor = (await lerConfig("WEBMOTORS_JANELA_DIAS")) ?? process.env.WEBMOTORS_JANELA_DIAS ?? "60";
  return Number(valor);
}

async function executarVarreduraWebmotors(categoryUrl: string): Promise<ResultadoVarreduraWebmotors> {
  const margemMinima = Number(
    (await lerConfig("MARGEM_MINIMA_PERCENTUAL")) ?? process.env.MARGEM_MINIMA_PERCENTUAL ?? MARGEM_MINIMA_PADRAO
  );
  const janelaDias = await obterJanelaDias();
  const cutoffEpoch = Date.now() - janelaDias * 24 * 60 * 60 * 1000;

  const resultado: ResultadoVarreduraWebmotors = { novos: 0, elegiveis: 0, descartados: 0, semFipe: 0 };

  console.log(`[motor-descoberta-webmotors] Categoria: ${categoryUrl} | janela: ${janelaDias} dias | margem mínima: ${margemMinima}%`);

  const anuncios = await buscarAnunciosWebmotors(categoryUrl);
  console.log(`[motor-descoberta-webmotors] ${anuncios.length} anúncios retornados pela Bright Data.`);

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

  console.log(
    `[motor-descoberta-webmotors] Resultado: ${resultado.novos} novos | ${resultado.elegiveis} elegíveis salvos | ${resultado.descartados} descartados | ${resultado.semFipe} sem FIPE.`
  );

  return resultado;
}

async function executarComRegistro(categoryUrl: string): Promise<void> {
  const registroId = await iniciarRegistroVarredura(categoryUrl, MODO);
  try {
    const resultado = await executarVarreduraWebmotors(categoryUrl);
    await finalizarRegistroVarreduraComSucesso(registroId, resultado);
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    await finalizarRegistroVarreduraComErro(registroId, mensagem);
    throw erro;
  }
}

async function main(): Promise<void> {
  const categoryUrl =
    (await lerConfig("WEBMOTORS_CATEGORY_URL")) ??
    process.env.WEBMOTORS_CATEGORY_URL ??
    "https://www.webmotors.com.br/carros/estoque?tipoveiculo=carros&Oportunidades=Super%20Preco";

  await executarComRegistro(categoryUrl);
}

main().catch((erro) => {
  console.error("[motor-descoberta-webmotors] Falha na execução:", erro);
  process.exitCode = 1;
});
