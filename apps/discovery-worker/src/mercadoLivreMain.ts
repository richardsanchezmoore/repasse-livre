import "dotenv/config";
import {
  buscarAnunciosMercadoLivre,
  gerarUrlCategoriaParticular,
  processarLoteAnunciosMercadoLivre,
} from "./mercadoLivreService.js";
import type { ResultadoLoteMercadoLivre } from "./mercadoLivreService.js";
import { MARGEM_MINIMA_PADRAO } from "./margin.js";
import {
  finalizarRegistroVarreduraComErro,
  finalizarRegistroVarreduraComSucesso,
  iniciarRegistroVarredura,
  lerConfig,
} from "./supabaseClient.js";

const MODO = "mercadolivre";

// Serviço Railway próprio, cron separado da OLX/Webmotors (decisão do
// usuário, mesmo padrão dos outros dois). Precisa de PROXY_URL apontando
// pra um proxy residencial rotativo (não o ISP estático da Bright Data
// usado pela OLX — está bloqueado pelo Mercado Livre especificamente, ver
// memória do projeto) e roda via `xvfb-run` (script discover:mercadolivre
// no package.json) porque usa Playwright em modo headed de verdade, não
// curl — Mercado Livre exige navegação orgânica de browser real.

async function executarVarreduraMercadoLivre(categoriaUrlBase: string): Promise<ResultadoLoteMercadoLivre> {
  const margemMinima = Number(
    (await lerConfig("MARGEM_MINIMA_PERCENTUAL")) ?? process.env.MARGEM_MINIMA_PERCENTUAL ?? MARGEM_MINIMA_PADRAO
  );
  const maxPaginas = Number((await lerConfig("MERCADOLIVRE_MAX_PAGINAS")) ?? process.env.MERCADOLIVRE_MAX_PAGINAS ?? 10);

  const urlComFiltro = gerarUrlCategoriaParticular(categoriaUrlBase);
  console.log(
    `[motor-descoberta-mercadolivre] Categoria: ${urlComFiltro} | máx. páginas: ${maxPaginas} | margem mínima: ${margemMinima}%`
  );

  const anuncios = await buscarAnunciosMercadoLivre(urlComFiltro, maxPaginas);
  console.log(`[motor-descoberta-mercadolivre] ${anuncios.length} anúncios de particular extraídos da listagem.`);

  const resultado = await processarLoteAnunciosMercadoLivre(anuncios, margemMinima);

  console.log(
    `[motor-descoberta-mercadolivre] Resultado: ${resultado.novos} novos | ${resultado.elegiveis} elegíveis salvos | ${resultado.descartados} descartados | ${resultado.semFipe} sem FIPE.`
  );

  return resultado;
}

async function executarComRegistro(categoriaUrlBase: string): Promise<void> {
  const registroId = await iniciarRegistroVarredura(categoriaUrlBase, MODO);
  try {
    const resultado = await executarVarreduraMercadoLivre(categoriaUrlBase);
    await finalizarRegistroVarreduraComSucesso(registroId, resultado);
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    await finalizarRegistroVarreduraComErro(registroId, mensagem);
    throw erro;
  }
}

async function main(): Promise<void> {
  const categoriaUrlBase =
    (await lerConfig("MERCADOLIVRE_CATEGORY_URL")) ??
    process.env.MERCADOLIVRE_CATEGORY_URL ??
    "https://lista.mercadolivre.com.br/veiculos/carros-caminhonetes";

  await executarComRegistro(categoriaUrlBase);
}

main().catch((erro) => {
  console.error("[motor-descoberta-mercadolivre] Falha na execução:", erro);
  process.exitCode = 1;
});
