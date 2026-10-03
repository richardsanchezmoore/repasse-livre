import "dotenv/config";
import { buscarAnunciosWebmotors, processarLoteAnunciosWebmotors } from "./webmotorsService.js";
import type { ResultadoLoteWebmotors } from "./webmotorsService.js";
import { definirTetoSuspeita, MARGEM_MINIMA_PADRAO } from "./margin.js";
import {
  finalizarRegistroVarreduraComErro,
  finalizarRegistroVarreduraComSucesso,
  iniciarRegistroVarredura,
  lerConfig,
  registrarSnapshotIdVarredura,
} from "./supabaseClient.js";

const MODO = "webmotors";

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

async function executarVarreduraWebmotors(
  categoryUrl: string,
  onSnapshotId?: (snapshotId: string) => Promise<void> | void
): Promise<ResultadoLoteWebmotors> {
  const margemMinima = Number(
    (await lerConfig("MARGEM_MINIMA_PERCENTUAL")) ?? process.env.MARGEM_MINIMA_PERCENTUAL ?? MARGEM_MINIMA_PADRAO
  );
  // Teto de margem suspeita (regra geral): acima disso = falso alarme → descarta.
  definirTetoSuspeita(Number((await lerConfig("MARGEM_MAX_SUSPEITA")) ?? process.env.MARGEM_MAX_SUSPEITA ?? 50));
  const janelaDias = await obterJanelaDias();

  console.log(`[motor-descoberta-webmotors] Categoria: ${categoryUrl} | janela: ${janelaDias} dias | margem mínima: ${margemMinima}%`);

  const anuncios = await buscarAnunciosWebmotors(categoryUrl, onSnapshotId);
  console.log(`[motor-descoberta-webmotors] ${anuncios.length} anúncios retornados pela Bright Data.`);

  const resultado = await processarLoteAnunciosWebmotors(anuncios, margemMinima, janelaDias);

  console.log(
    `[motor-descoberta-webmotors] Resultado: ${resultado.novos} novos | ${resultado.elegiveis} elegíveis salvos | ${resultado.descartados} descartados | ${resultado.semFipe} sem FIPE.`
  );

  return resultado;
}

async function executarComRegistro(categoryUrl: string): Promise<void> {
  const registroId = await iniciarRegistroVarredura(categoryUrl, MODO);
  try {
    const resultado = await executarVarreduraWebmotors(categoryUrl, (sid) =>
      registrarSnapshotIdVarredura(registroId, sid)
    );
    await finalizarRegistroVarreduraComSucesso(registroId, resultado);
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    await finalizarRegistroVarreduraComErro(registroId, mensagem);
    throw erro;
  }
}

async function main(): Promise<void> {
  // ⚠️⚠️ CHAVE GERAL DA ERA BRASIL — WEBMOTORS_ATIVO, criada em 03/10/2026.
  //
  // O Gustavo viu no site "Oportunidades no Brasil" com carro brasileiro novo
  // entrando e pediu: "temos que parar toda captação Brasil". A medição deu
  // 276 anúncios da OLX num único dia (último 11:47) e o Webmotors em
  // TEMPESTADE DE RETRY — uma execução a cada ~3,5s, todas com erro.
  //
  // ★ Desligar por FLAG e não apagar o código: o Auto Radar PY é o sucessor do
  // Repasse Livre, não um projeto novo, e o motor brasileiro pode voltar a
  // servir se um dia abrirmos outra praça. Apagar seria perder o que já está
  // provado em produção.
  //
  // ⚠️ AUSENTE = DESLIGADO, de propósito. Só a string "true" liga. Assim um
  // ambiente novo (ou uma tabela sem a chave) nasce sem captar Brasil, em vez
  // de nascer captando e alguém descobrir pelo site.
  //
  // ⚠️ NÃO confundir com FACEBOOK_ATIVO: aquele hoje serve o PARAGUAI
  // (FACEBOOK_REGIOES só tem praças paraguaias, locale es_LA). Desligar o
  // Facebook mataria a captação que a gente QUER.
  const ativo = ((await lerConfig("WEBMOTORS_ATIVO")) ?? "").trim() === "true";
  if (!ativo) {
    console.log("[webmotors] desligado (WEBMOTORS_ATIVO ≠ true). Era Brasil pausada — nada a fazer.");
    return;
  }
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
