import "dotenv/config";
import { buscarTipoAnuncianteDaPagina } from "./olxService.js";
import { supabase } from "./supabaseClient.js";

/**
 * Backfill do campo `anunciante_profissional` (profissional/lojista vs.
 * particular) pras oportunidades de origem OLX capturadas antes dessa
 * coluna existir — revisita a página de cada anúncio, mesmo padrão do
 * backfill de descrições (ver backfillDescricoes.ts). Inserção direta não
 * tem esse conceito (não vem da OLX), por isso o filtro é só
 * origem_tipo='descoberta'.
 *
 * Uso: npm run backfill:anunciante
 * `BACKFILL_LIMITE` (opcional) processa só os N primeiros registros — útil
 * pra rodar em lotes.
 */
async function executarBackfill(): Promise<void> {
  const limite = Number(process.env.BACKFILL_LIMITE) || undefined;

  let consulta = supabase
    .from("opportunities")
    .select("id, link_origem")
    .eq("origem_tipo", "descoberta")
    .is("anunciante_profissional", null);

  if (limite) {
    consulta = consulta.limit(limite);
  }

  const { data, error } = await consulta;
  if (error) {
    throw new Error(`Falha ao buscar oportunidades: ${error.message}`);
  }

  console.log(`[backfill-anunciante] ${data.length} oportunidades sem tipo de anunciante pra revisar.`);

  let preenchidas = 0;
  let semInformacao = 0;
  let falhas = 0;

  for (const oportunidade of data) {
    try {
      const professionalAd = await buscarTipoAnuncianteDaPagina(oportunidade.link_origem);

      if (professionalAd === null) {
        semInformacao++;
        continue;
      }

      const { error: erroUpdate } = await supabase
        .from("opportunities")
        .update({ anunciante_profissional: professionalAd })
        .eq("id", oportunidade.id);

      if (erroUpdate) {
        console.warn(`[backfill-anunciante] Falha ao salvar "${oportunidade.id}": ${erroUpdate.message}`);
        falhas++;
        continue;
      }

      preenchidas++;
    } catch (erro) {
      console.warn(`[backfill-anunciante] Falha ao revisitar ${oportunidade.link_origem}:`, erro);
      falhas++;
    }

    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  console.log(
    `[backfill-anunciante] Resultado: ${preenchidas} preenchidas | ${semInformacao} sem informação na OLX | ${falhas} falharam.`
  );
}

executarBackfill().catch((erro) => {
  console.error("[backfill-anunciante] Falha na execução:", erro);
  process.exitCode = 1;
});
