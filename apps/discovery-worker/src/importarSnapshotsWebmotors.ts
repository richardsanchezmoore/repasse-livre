import "dotenv/config";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MARGEM_MINIMA_PADRAO } from "./margin.js";
import { lerConfig } from "./supabaseClient.js";
import { processarLoteAnunciosWebmotors } from "./webmotorsService.js";
import type { AnuncioWebmotorsBruto } from "./webmotorsService.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PASTA_DOCS = join(__dirname, "..", "..", "..", "docs");

/**
 * Ingestão dos snapshots PAGOS da Bright Data já baixados em docs/sd_*.json
 * (varreduras da Webmotors feitas durante a investigação — ver
 * project_repasse_livre_webmotors_async_e_custo). Passa por TODOS os arquivos
 * de uma vez, concatenando, pra não desperdiçar o dado pago. O
 * processarLoteAnunciosWebmotors já: deduplica por link_origem (contra o banco
 * E dentro do lote), pula registros sem `url` (os de erro do include_errors e o
 * arquivo "-com-margem" já processado caem fora sozinhos) e roda cada anúncio
 * pelo FIPE oficial. Uso pontual: npm run importar:snapshots-webmotors
 */
function lerTodosSnapshots(): AnuncioWebmotorsBruto[] {
  const arquivos = readdirSync(PASTA_DOCS).filter((n) => /^sd_.*\.json$/.test(n));
  const todos: AnuncioWebmotorsBruto[] = [];
  for (const arquivo of arquivos) {
    try {
      const conteudo = JSON.parse(readFileSync(join(PASTA_DOCS, arquivo), "utf-8"));
      if (!Array.isArray(conteudo)) {
        console.warn(`[importar-snapshots] ${arquivo}: não é array, pulado.`);
        continue;
      }
      const comUrl = conteudo.filter((r) => r && typeof r.url === "string");
      console.log(`[importar-snapshots] ${arquivo}: ${conteudo.length} registros, ${comUrl.length} com url.`);
      todos.push(...(comUrl as AnuncioWebmotorsBruto[]));
    } catch (erro) {
      console.warn(`[importar-snapshots] ${arquivo}: falha ao ler/parsear —`, erro);
    }
  }
  return todos;
}

async function main(): Promise<void> {
  const anuncios = lerTodosSnapshots();
  console.log(`[importar-snapshots] Total consolidado: ${anuncios.length} anúncios com url (antes do dedupe por link_origem).`);

  const margemMinima = Number(
    (await lerConfig("MARGEM_MINIMA_PERCENTUAL")) ?? process.env.MARGEM_MINIMA_PERCENTUAL ?? MARGEM_MINIMA_PADRAO
  );
  const janelaDias = Number((await lerConfig("WEBMOTORS_JANELA_DIAS")) ?? process.env.WEBMOTORS_JANELA_DIAS ?? "60");
  console.log(`[importar-snapshots] Janela: ${janelaDias} dias | margem mínima: ${margemMinima}%`);

  const resultado = await processarLoteAnunciosWebmotors(anuncios, margemMinima, janelaDias);

  console.log(
    `[importar-snapshots] Resultado: ${resultado.novos} novos | ${resultado.elegiveis} elegíveis salvos | ${resultado.descartados} descartados | ${resultado.semFipe} sem FIPE.`
  );
}

main().catch((erro) => {
  console.error("[importar-snapshots] Falha:", erro);
  process.exitCode = 1;
});
