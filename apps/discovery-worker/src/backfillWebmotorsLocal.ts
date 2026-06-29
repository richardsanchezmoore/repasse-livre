import "dotenv/config";
import { readFileSync } from "node:fs";
import { MARGEM_MINIMA_PADRAO } from "./margin.js";
import { lerConfig } from "./supabaseClient.js";
import { processarLoteAnunciosWebmotors } from "./webmotorsService.js";
import type { AnuncioWebmotorsBruto } from "./webmotorsService.js";

/**
 * Ingestão única a partir de um JSON já baixado da Bright Data (snapshot
 * pago durante a investigação de viabilidade do pivot multi-fonte, ver
 * project_repasse_livre_pivot_multifonte_webmotors). Existe pra não
 * desperdiçar créditos chamando a API de novo só pra repetir uma varredura
 * que já foi feita e paga — uso pontual, não faz parte do cron normal
 * (esse é o webmotorsMain.ts).
 */
async function main(): Promise<void> {
  const caminhoArquivo = process.argv[2];
  if (!caminhoArquivo) {
    throw new Error("Uso: tsx src/backfillWebmotorsLocal.ts <caminho-do-json>");
  }

  const anuncios = JSON.parse(readFileSync(caminhoArquivo, "utf-8")) as AnuncioWebmotorsBruto[];
  console.log(`[backfill-webmotors] ${anuncios.length} anúncios lidos de ${caminhoArquivo}.`);

  const margemMinima = Number(
    (await lerConfig("MARGEM_MINIMA_PERCENTUAL")) ?? process.env.MARGEM_MINIMA_PERCENTUAL ?? MARGEM_MINIMA_PADRAO
  );
  const janelaDias = Number((await lerConfig("WEBMOTORS_JANELA_DIAS")) ?? process.env.WEBMOTORS_JANELA_DIAS ?? "60");

  console.log(`[backfill-webmotors] Janela: ${janelaDias} dias | margem mínima: ${margemMinima}%`);

  const resultado = await processarLoteAnunciosWebmotors(anuncios, margemMinima, janelaDias);

  console.log(
    `[backfill-webmotors] Resultado: ${resultado.novos} novos | ${resultado.elegiveis} elegíveis salvos | ${resultado.descartados} descartados | ${resultado.semFipe} sem FIPE.`
  );
}

main().catch((erro) => {
  console.error("[backfill-webmotors] Falha:", erro);
  process.exitCode = 1;
});
