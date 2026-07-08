import "dotenv/config";
import { MARGEM_MINIMA_PADRAO } from "./margin.js";
import {
  buscarRunsWebmotorsRecuperaveis,
  lerConfig,
  marcarVarreduraRecuperada,
} from "./supabaseClient.js";
import { coletarSnapshotWebmotorsPorId, processarLoteAnunciosWebmotors } from "./webmotorsService.js";
import type { ResultadoLoteWebmotors } from "./webmotorsService.js";

/**
 * Recupera snapshots da Webmotors que COMPLETARAM no Bright Data mas cujo run
 * falhou no download ou morreu no meio. Baixa pelo ID (sem re-disparar/re-pagar)
 * e ingere com a mesma lógica do run normal. Ver
 * project_repasse_livre_webmotors_async_e_custo.
 *
 * Dois modos:
 *  - SEM argumentos (1 clique): varre discovery_runs, acha os runs "erro"/
 *    "em_andamento" com snapshot_id salvo, reingere cada um e marca o run como
 *    recuperado (limpa o "Em andamento"/"Erro" preso no histórico).
 *      npm run recuperar:snapshots-webmotors
 *  - COM ids explícitos (avulso, ex.: run antigo sem snapshot_id salvo):
 *      npx tsx src/recuperarSnapshotsWebmotors.ts sd_aaa sd_bbb
 */
async function obterParametros(): Promise<{ margemMinima: number; janelaDias: number }> {
  const margemMinima = Number(
    (await lerConfig("MARGEM_MINIMA_PERCENTUAL")) ?? process.env.MARGEM_MINIMA_PERCENTUAL ?? MARGEM_MINIMA_PADRAO
  );
  const janelaDias = Number((await lerConfig("WEBMOTORS_JANELA_DIAS")) ?? process.env.WEBMOTORS_JANELA_DIAS ?? "60");
  return { margemMinima, janelaDias };
}

async function ingerirSnapshot(
  snapshotId: string,
  margemMinima: number,
  janelaDias: number
): Promise<ResultadoLoteWebmotors> {
  console.log(`\n[recuperar-snapshots] Baixando ${snapshotId}…`);
  const anuncios = await coletarSnapshotWebmotorsPorId(snapshotId);
  console.log(`[recuperar-snapshots] ${snapshotId}: ${anuncios.length} anúncios válidos. Ingerindo…`);
  const r = await processarLoteAnunciosWebmotors(anuncios, margemMinima, janelaDias);
  console.log(
    `[recuperar-snapshots] ${snapshotId}: ${r.novos} novos | ${r.elegiveis} elegíveis salvos | ${r.descartados} descartados | ${r.semFipe} sem FIPE.`
  );
  return r;
}

async function main(): Promise<void> {
  const idsArgv = process.argv.slice(2).filter((a) => a.startsWith("sd_"));
  const { margemMinima, janelaDias } = await obterParametros();
  console.log(`[recuperar-snapshots] janela ${janelaDias} dias | margem mínima ${margemMinima}%`);

  // Modo avulso: ids passados na linha de comando (sem marcação de run).
  if (idsArgv.length > 0) {
    console.log(`[recuperar-snapshots] Modo avulso: ${idsArgv.length} id(s).`);
    for (const id of idsArgv) {
      try {
        await ingerirSnapshot(id, margemMinima, janelaDias);
      } catch (erro) {
        console.error(`[recuperar-snapshots] ${id}: FALHOU —`, erro);
        process.exitCode = 1;
      }
    }
    return;
  }

  // Modo 1 clique: acha os runs falhados/travados com snapshot_id salvo.
  const runs = await buscarRunsWebmotorsRecuperaveis();
  if (runs.length === 0) {
    console.log("[recuperar-snapshots] Nenhum run Webmotors pendente de recuperação (erro/em_andamento com snapshot_id).");
    return;
  }
  console.log(`[recuperar-snapshots] ${runs.length} run(s) recuperável(is).`);
  for (const run of runs) {
    try {
      const resultado = await ingerirSnapshot(run.snapshot_id, margemMinima, janelaDias);
      await marcarVarreduraRecuperada(run.id, resultado, run.snapshot_id);
      console.log(`[recuperar-snapshots] run ${run.id} marcado como recuperado.`);
    } catch (erro) {
      console.error(`[recuperar-snapshots] run ${run.id} (${run.snapshot_id}): FALHOU —`, erro);
      process.exitCode = 1;
    }
  }
}

main().catch((erro) => {
  console.error("[recuperar-snapshots] Falha geral:", erro);
  process.exitCode = 1;
});
