import "dotenv/config";
import { buscarDetalhesDaPaginaAnuncio } from "./olxService.js";
import { supabase } from "./supabaseClient.js";

/**
 * Corrige retroativamente a descrição das oportunidades de Descobertas
 * salvas antes da correção em `extrairDescricaoDoHtml` — a regex excluía
 * "&" do valor capturado, então qualquer descrição com entidade HTML
 * (&nbsp;, &amp; etc.) ou o símbolo "&" no texto do anunciante ficava nula.
 *
 * Revisita a página de cada oportunidade de origem OLX sem descrição pra
 * extrair o texto correto. Uso: npm run backfill:descricoes
 */
async function executarBackfill(): Promise<void> {
  const { data, error } = await supabase
    .from("opportunities")
    .select("id, link_origem")
    .eq("origem_tipo", "descoberta")
    .is("descricao", null);

  if (error) {
    throw new Error(`Falha ao buscar oportunidades: ${error.message}`);
  }

  console.log(`[backfill-descricoes] ${data.length} oportunidades sem descrição para revisar.`);

  let corrigidos = 0;
  let semDescricao = 0;
  let falhas = 0;

  for (const oportunidade of data) {
    try {
      const { descricao } = await buscarDetalhesDaPaginaAnuncio(oportunidade.link_origem);

      if (!descricao) {
        semDescricao++;
        continue;
      }

      const { error: erroUpdate } = await supabase
        .from("opportunities")
        .update({ descricao })
        .eq("id", oportunidade.id);

      if (erroUpdate) {
        console.warn(`[backfill-descricoes] Falha ao salvar "${oportunidade.id}": ${erroUpdate.message}`);
        falhas++;
        continue;
      }

      console.log(`[backfill-descricoes] Preenchida descrição de "${oportunidade.id}".`);
      corrigidos++;
    } catch (erro) {
      console.warn(`[backfill-descricoes] Falha ao revisitar ${oportunidade.link_origem}:`, erro);
      falhas++;
    }

    // Pausa entre requisições para não sobrecarregar a OLX nem se parecer
    // com tráfego automatizado agressivo.
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  console.log(
    `[backfill-descricoes] Resultado: ${corrigidos} corrigidos | ${semDescricao} sem descrição na OLX | ${falhas} falharam.`
  );
}

executarBackfill().catch((erro) => {
  console.error("[backfill-descricoes] Falha na execução:", erro);
  process.exitCode = 1;
});
