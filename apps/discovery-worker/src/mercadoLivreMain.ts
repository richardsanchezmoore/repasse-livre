import "dotenv/config";
import {
  gerarUrlCategoriaParticular,
  varrerEProcessarMercadoLivre,
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

async function executarVarreduraMercadoLivre(categoriaUrlBase: string): Promise<ResultadoLoteMercadoLivre> {
  const margemMinima = Number(
    (await lerConfig("MARGEM_MINIMA_PERCENTUAL")) ?? process.env.MARGEM_MINIMA_PERCENTUAL ?? MARGEM_MINIMA_PADRAO
  );
  const maxPaginas = Number((await lerConfig("MERCADOLIVRE_MAX_PAGINAS")) ?? process.env.MERCADOLIVRE_MAX_PAGINAS ?? 10);
  // Página inicial da varredura (default 1). Útil pra testar em anúncios NOVOS:
  // como deduplicamos por link, re-varrer a pág 1 logo após uma varredura pula
  // tudo; começar na 2 pega anúncios ainda não captados.
  const paginaInicial = Number((await lerConfig("MERCADOLIVRE_PAGINA_INICIAL")) ?? process.env.MERCADOLIVRE_PAGINA_INICIAL ?? 1);

  const urlComFiltro = gerarUrlCategoriaParticular(categoriaUrlBase);
  console.log(
    `[motor-descoberta-mercadolivre] Categoria: ${urlComFiltro} | páginas: ${paginaInicial}..${paginaInicial + maxPaginas - 1} | margem mínima: ${margemMinima}%`
  );

  const resultado = await varrerEProcessarMercadoLivre(urlComFiltro, maxPaginas, margemMinima, paginaInicial);

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
