import "dotenv/config";
import { resolverCodigoPorHistoricoLocal } from "./historicoFipe.js";
import { supabase } from "./supabaseClient.js";

/**
 * Backfill do fipe_codigo dos anúncios OLX que ficaram SEM código (o 403/proxy
 * do Railway derrubou o resolvedor oficial na captação). Usa a âncora de valor
 * LOCAL contra o fipe_historico — puro banco, ZERO chamada à FIPE, zero
 * scraping. Só grava quando o histórico dá match ÚNICO (nunca chuta). Os que
 * não têm relação no histórico ficam pro giro/resolução oficial futura.
 *
 * A margem NÃO muda (segue vindo do valor da página); só preenchemos o código,
 * que liga o anúncio à série histórica e ao recálculo mensal.
 *
 * Uso: npm run backfill:codigo-local-olx            (dry-run)
 *      npm run backfill:codigo-local-olx -- --aplicar (grava)
 */
async function executar(): Promise<void> {
  const aplicar = process.argv.includes("--aplicar");
  const { data, error } = await supabase
    .from("opportunities")
    .select("id, veiculo, ano, fipe_valor")
    .eq("fonte", "OLX")
    .is("fipe_codigo", null);
  if (error) throw new Error(`Falha ao buscar oportunidades: ${error.message}`);

  console.log(`[backfill-codigo-local] ${data.length} OLX sem código. Modo: ${aplicar ? "APLICAR" : "DRY-RUN"}.`);

  let resolvidos = 0;
  let semRelacao = 0;
  let falhas = 0;

  for (const o of data) {
    const local = await resolverCodigoPorHistoricoLocal(String(o.ano ?? ""), Number(o.fipe_valor));
    if (!local) {
      semRelacao++;
      continue;
    }
    if (!aplicar) {
      console.log(`[dry] ${o.veiculo} ${o.ano} (R$${o.fipe_valor}) → ${local.codigoFipe}`);
      resolvidos++;
      continue;
    }
    const { error: erroUpdate } = await supabase
      .from("opportunities")
      .update({ fipe_codigo: local.codigoFipe })
      .eq("id", o.id);
    if (erroUpdate) {
      console.warn(`[backfill-codigo-local] Falha ao salvar "${o.id}": ${erroUpdate.message}`);
      falhas++;
      continue;
    }
    console.log(`[backfill-codigo-local] ✓ ${o.veiculo} ${o.ano} → ${local.codigoFipe}`);
    resolvidos++;
  }

  console.log(
    `[backfill-codigo-local] Resultado: ${resolvidos} ${aplicar ? "resolvidos" : "resolvíveis"} | ${semRelacao} sem relação (ficam pro oficial/giro) | ${falhas} falhas.`
  );
  process.exit(0);
}

executar().catch((erro) => {
  console.error("[backfill-codigo-local] Falha na execução:", erro);
  process.exit(1);
});
