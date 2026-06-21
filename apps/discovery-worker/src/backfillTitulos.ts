import "dotenv/config";
import { buscarTituloDaPaginaAnuncio } from "./olxService.js";
import { supabase } from "./supabaseClient.js";

/**
 * Corrige retroativamente o título (`veiculo`) das oportunidades de
 * Descobertas salvas antes da correção em main.ts — quando `veiculo` usava
 * a propriedade estruturada `vehicle_model` da OLX (incompleta, sem o nome
 * base do modelo, ex.: "Comfort Plus" em vez de "HB20 Comfort Plus") em vez
 * do título completo do anúncio (`subject`).
 *
 * Revisita a página de cada oportunidade de origem OLX para extrair o
 * título completo correto. Uso: npm run backfill:titulos
 */
async function executarBackfill(): Promise<void> {
  const { data, error } = await supabase
    .from("opportunities")
    .select("id, link_origem, veiculo")
    .eq("origem_tipo", "descoberta");

  if (error) {
    throw new Error(`Falha ao buscar oportunidades: ${error.message}`);
  }

  console.log(`[backfill-titulos] ${data.length} oportunidades de Descobertas para revisar.`);

  let corrigidos = 0;
  let inalterados = 0;
  let falhas = 0;

  for (const oportunidade of data) {
    try {
      const tituloCorreto = await buscarTituloDaPaginaAnuncio(oportunidade.link_origem);

      if (!tituloCorreto) {
        console.warn(`[backfill-titulos] Não encontrou título em: ${oportunidade.link_origem}`);
        falhas++;
        continue;
      }

      if (tituloCorreto === oportunidade.veiculo) {
        inalterados++;
        continue;
      }

      const { error: erroUpdate } = await supabase
        .from("opportunities")
        .update({ veiculo: tituloCorreto })
        .eq("id", oportunidade.id);

      if (erroUpdate) {
        console.warn(`[backfill-titulos] Falha ao salvar "${oportunidade.id}": ${erroUpdate.message}`);
        falhas++;
        continue;
      }

      console.log(`[backfill-titulos] "${oportunidade.veiculo}" → "${tituloCorreto}"`);
      corrigidos++;
    } catch (erro) {
      console.warn(`[backfill-titulos] Falha ao revisitar ${oportunidade.link_origem}:`, erro);
      falhas++;
    }

    // Pausa entre requisições para não sobrecarregar a OLX nem se parecer
    // com tráfego automatizado agressivo.
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  console.log(
    `[backfill-titulos] Resultado: ${corrigidos} corrigidos | ${inalterados} já estavam certos | ${falhas} falharam.`
  );
}

executarBackfill().catch((erro) => {
  console.error("[backfill-titulos] Falha na execução:", erro);
  process.exitCode = 1;
});
