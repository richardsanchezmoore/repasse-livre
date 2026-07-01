import "dotenv/config";
import { supabase } from "./supabaseClient.js";
import { buscarReferenciaFipe } from "./fipeService.js";
import { garantirHistoricoFipe } from "./historicoFipe.js";

/**
 * Bootstrap ÚNICO (não é cron) do histórico de FIPE dos anúncios que já estão
 * na base sem `fipe_codigo` (ML/Webmotors antigos e todos os OLX — cujo FIPE
 * veio da página, sem código). Ver project_repasse_livre_fipe_historico
 * (Bloco B).
 *
 * Por anúncio: re-deriva marca/modelo/ano/versao dos campos guardados, faz o
 * lookup na FIPE oficial pra pegar o codigo_fipe, grava em
 * opportunities.fipe_codigo e dispara garantirHistoricoFipe (backfill dos 12
 * meses do mirror). NÃO mexe em margem/elegibilidade — isso é o recálculo
 * mensal (project_repasse_livre_fipe_recalculo_mensal), que tem regra própria.
 *
 * Os lookups já são throttled (300ms) e cacheados no fipeService. Uso:
 * npm run bootstrap:historico-fipe
 */
async function main(): Promise<void> {
  const TAM = 1000;
  const anuncios: { id: string; veiculo: string; versao: string | null; ano: string | null }[] = [];
  for (let inicio = 0; ; inicio += TAM) {
    const { data, error } = await supabase
      .from("opportunities")
      .select("id, veiculo, versao, ano")
      .is("fipe_codigo", null)
      .not("ano", "is", null)
      .range(inicio, inicio + TAM - 1);
    if (error) throw new Error(`Falha ao listar anúncios: ${error.message}`);
    anuncios.push(...(data ?? []));
    if (!data || data.length < TAM) break;
  }
  console.log(`[bootstrap-fipe] ${anuncios.length} anúncios sem fipe_codigo pra processar.`);

  let comCodigo = 0;
  let semFipe = 0;
  let i = 0;
  for (const anuncio of anuncios) {
    i++;
    // Re-deriva marca/modelo do título (1ª palavra = marca, 2ª = modelo);
    // versao entra como variante pra desambiguar (mesma heurística da captação).
    const palavras = (anuncio.veiculo ?? "").trim().split(/\s+/);
    const marca = palavras[0] ?? "";
    const modelo = palavras[1] ?? "";
    if (!marca || !modelo || !anuncio.ano) {
      semFipe++;
      continue;
    }

    const ref = await buscarReferenciaFipe(marca, modelo, anuncio.ano, anuncio.versao);
    if (!ref) {
      semFipe++;
      continue;
    }

    const { error: erroUpdate } = await supabase
      .from("opportunities")
      .update({ fipe_codigo: ref.codigoFipe })
      .eq("id", anuncio.id);
    if (erroUpdate) {
      console.warn(`[bootstrap-fipe] Falha ao gravar codigo em ${anuncio.id}: ${erroUpdate.message}`);
      continue;
    }
    await garantirHistoricoFipe(ref.codigoFipe, Number.parseInt(ref.ano, 10));
    comCodigo++;

    if (i % 100 === 0) {
      console.log(`[bootstrap-fipe] ${i}/${anuncios.length} — ${comCodigo} com código, ${semFipe} sem FIPE.`);
    }
  }

  console.log(
    `[bootstrap-fipe] Concluído: ${comCodigo} anúncios com fipe_codigo + histórico | ${semFipe} sem match de FIPE.`
  );
}

main().catch((erro) => {
  console.error("[bootstrap-fipe] Falha:", erro);
  process.exitCode = 1;
});
