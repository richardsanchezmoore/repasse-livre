import "dotenv/config";
import {
  gerarUrlCategoriaParticular,
  varrerEProcessarMercadoLivre,
} from "./mercadoLivreService.js";
import type { ResultadoLoteMercadoLivre } from "./mercadoLivreService.js";
import { autoReiniciarRoteador } from "./autoReiniciarRoteador.js";
import { definirTetoSuspeita, MARGEM_MINIMA_PADRAO } from "./margin.js";
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
  // Teto de margem suspeita (regra geral): acima disso = falso alarme → descarta.
  definirTetoSuspeita(Number((await lerConfig("MARGEM_MAX_SUSPEITA")) ?? process.env.MARGEM_MAX_SUSPEITA ?? 50));
  // Teto de páginas (default 15: cobre um dia inteiro do filtro "hoje", ~601/48≈13,
  // com folga). A parada seca corta antes quando o delta do dia já foi coberto.
  const maxPaginas = Number((await lerConfig("MERCADOLIVRE_MAX_PAGINAS")) ?? process.env.MERCADOLIVRE_MAX_PAGINAS ?? 15);
  // Página inicial da varredura (default 1). Útil pra testar em anúncios NOVOS:
  // como deduplicamos por link, re-varrer a pág 1 logo após uma varredura pula
  // tudo; começar na 2 pega anúncios ainda não captados.
  const paginaInicial = Number((await lerConfig("MERCADOLIVRE_PAGINA_INICIAL")) ?? process.env.MERCADOLIVRE_PAGINA_INICIAL ?? 1);
  // "Anunciados hoje" (_PublishedToday_YES) + livro-razão de vistos: universo do
  // dia, sem re-arar a ordem embaralhada. Ligado por padrão; desliga com
  // MERCADOLIVRE_SOMENTE_HOJE=false pra voltar à varredura de estoque completo.
  const somenteHoje = ((await lerConfig("MERCADOLIVRE_SOMENTE_HOJE")) ?? process.env.MERCADOLIVRE_SOMENTE_HOJE ?? "true") !== "false";

  const urlComFiltro = gerarUrlCategoriaParticular(categoriaUrlBase);
  console.log(
    `[motor-descoberta-mercadolivre] Categoria: ${urlComFiltro} | ${somenteHoje ? "ANUNCIADOS HOJE" : "estoque completo"} | páginas: ${paginaInicial}..${paginaInicial + maxPaginas - 1} | margem mínima: ${margemMinima}%`
  );

  const resultado = await varrerEProcessarMercadoLivre(urlComFiltro, maxPaginas, margemMinima, paginaInicial, somenteHoje);

  console.log(
    `[motor-descoberta-mercadolivre] Resultado: ${resultado.novos} novos | ${resultado.elegiveis} elegíveis salvos | ${resultado.descartados} descartados | ${resultado.semFipe} sem FIPE | ${resultado.pulados} pulados (já vistos).`
  );

  return resultado;
}

async function executarComRegistro(categoriaUrlBase: string): Promise<void> {
  const registroId = await iniciarRegistroVarredura(categoriaUrlBase, MODO);
  try {
    const resultado = await executarVarreduraMercadoLivre(categoriaUrlBase);
    const { paginasCarregadas, paginasBloqueadas, pulados } = resultado;
    const observacao = `${paginasCarregadas} pág. carregadas${pulados ? `, ${pulados} já vistos (pulados)` : ""}${paginasBloqueadas ? `, ${paginasBloqueadas} bloqueadas (account-verification)` : ""}`;

    // Run TOTALMENTE bloqueado (nenhuma página carregou, mas bateu na parede):
    // não é "nada novo" — é o IP fichado. Registra como ERRO pra aparecer
    // distinto (vermelho + mensagem) no painel, em vez de "sucesso 0". Não
    // relança (não é crash): o cron segue e re-tenta na próxima janela.
    if (paginasCarregadas === 0 && paginasBloqueadas > 0) {
      await finalizarRegistroVarreduraComErro(
        registroId,
        `ML BLOQUEADO — 0 páginas carregaram, ${paginasBloqueadas} bloqueadas (account-verification: IP residencial fichado).`
      );
      console.log("[motor-descoberta-mercadolivre] ⚠ run BLOQUEADO — registrado como ERRO no painel.");
      // Gatilho do reboot: já com o erro REGISTRADO (pra bloqueiosConsecutivosMl contar a
      // run atual). Decide sozinho — só age em 2 bloqueios seguidos, janela livre, anti-loop.
      // Best-effort: nunca derruba a run. Ver autoReiniciarRoteador.
      await autoReiniciarRoteador();
      return;
    }

    await finalizarRegistroVarreduraComSucesso(registroId, resultado, observacao);
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
