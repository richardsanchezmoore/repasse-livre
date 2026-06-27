import "dotenv/config";
import { garantirCoordenadasCidade } from "./supabaseClient.js";
import { supabase } from "./supabaseClient.js";

/**
 * Backfill único: geocodifica todas as combinações (cidade, estado) já
 * presentes em opportunities, mas que ainda não têm linha em
 * cidades_coordenadas — cobre a base capturada antes do dedupe-on-write
 * (ver garantirCoordenadasCidade, chamada em processarAnuncio pra
 * oportunidades novas). Sem isso, "ordenar por proximidade" não funciona
 * pra nenhum anúncio já existente.
 *
 * Uso: npm run backfill:coordenadas
 */
async function executarBackfill(): Promise<void> {
  const { data, error } = await supabase
    .from("opportunities")
    .select("cidade, estado")
    .not("cidade", "is", null)
    .not("estado", "is", null);

  if (error) {
    throw new Error(`Falha ao buscar cidades: ${error.message}`);
  }

  const combinacoes = new Map<string, { cidade: string; estado: string }>();
  for (const linha of data) {
    const cidade = linha.cidade as string;
    const estado = linha.estado as string;
    combinacoes.set(`${cidade}|${estado}`, { cidade, estado });
  }

  console.log(`[backfill-coordenadas] ${combinacoes.size} combinações (cidade, estado) distintas na base.`);

  let processadas = 0;
  for (const { cidade, estado } of combinacoes.values()) {
    await garantirCoordenadasCidade(cidade, estado);
    processadas++;
  }

  const { count: totalComCoordenada } = await supabase
    .from("cidades_coordenadas")
    .select("*", { count: "exact", head: true });

  console.log(
    `[backfill-coordenadas] Resultado: ${processadas} combinações processadas | ${totalComCoordenada ?? 0} com coordenada salva na tabela de referência.`
  );
}

executarBackfill().catch((erro) => {
  console.error("[backfill-coordenadas] Falha na execução:", erro);
  process.exitCode = 1;
});
