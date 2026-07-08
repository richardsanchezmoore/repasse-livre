import "dotenv/config";
import { MARGEM_MINIMA_PADRAO } from "./margin.js";
import { lerConfig } from "./supabaseClient.js";
import { coletarSnapshotWebmotorsPorId, processarLoteAnunciosWebmotors } from "./webmotorsService.js";
import type { AnuncioWebmotorsBruto } from "./webmotorsService.js";

/**
 * Recupera snapshots da Webmotors que COMPLETARAM no Bright Data mas cujo run
 * falhou no download (bug de impaciência, corrigido) ou morreu no meio ("Em
 * andamento" preso). Baixa cada snapshot pelo ID (sem re-disparar/re-pagar) e
 * ingere com a mesma lógica do run normal (dedupe por link_origem, janela,
 * FIPE). Ver project_repasse_livre_webmotors_async_e_custo.
 *
 * Uso: npx tsx src/recuperarSnapshotsWebmotors.ts sd_aaa sd_bbb
 */
async function main(): Promise<void> {
  const ids = process.argv.slice(2).filter((a) => a.startsWith("sd_"));
  if (ids.length === 0) {
    console.error("Passe um ou mais snapshot ids. Ex.: npx tsx src/recuperarSnapshotsWebmotors.ts sd_xxx sd_yyy");
    process.exitCode = 1;
    return;
  }

  const margemMinima = Number(
    (await lerConfig("MARGEM_MINIMA_PERCENTUAL")) ?? process.env.MARGEM_MINIMA_PERCENTUAL ?? MARGEM_MINIMA_PADRAO
  );
  const janelaDias = Number((await lerConfig("WEBMOTORS_JANELA_DIAS")) ?? process.env.WEBMOTORS_JANELA_DIAS ?? "60");
  console.log(`[recuperar-snapshots] ${ids.length} snapshot(s) | janela ${janelaDias} dias | margem mínima ${margemMinima}%`);

  for (const id of ids) {
    try {
      console.log(`\n[recuperar-snapshots] Baixando ${id}…`);
      const anuncios: AnuncioWebmotorsBruto[] = await coletarSnapshotWebmotorsPorId(id);
      console.log(`[recuperar-snapshots] ${id}: ${anuncios.length} anúncios válidos. Ingerindo…`);
      const r = await processarLoteAnunciosWebmotors(anuncios, margemMinima, janelaDias);
      console.log(
        `[recuperar-snapshots] ${id}: ${r.novos} novos | ${r.elegiveis} elegíveis salvos | ${r.descartados} descartados | ${r.semFipe} sem FIPE.`
      );
    } catch (erro) {
      console.error(`[recuperar-snapshots] ${id}: FALHOU —`, erro);
      process.exitCode = 1;
    }
  }
}

main().catch((erro) => {
  console.error("[recuperar-snapshots] Falha geral:", erro);
  process.exitCode = 1;
});
