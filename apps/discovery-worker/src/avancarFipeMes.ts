import "dotenv/config";
import { supabase } from "./supabaseClient.js";
import { buscarReferenciaFipe } from "./fipeService.js";
import { registrarPontoHistoricoFipe } from "./historicoFipe.js";

/**
 * Passo 1 do "dia da FIPE" mensal: AVANÇAR o mês no `fipe_historico` — puxa o
 * valor do mês vigente da FIPE OFICIAL e grava a série adiante. É o que traz o
 * mês novo (ex.: julho) que ainda não existe no nosso banco nem no mirror (o
 * mirror atrasa a virada do mês). Ver project_repasse_livre_fipe_recalculo_mensal.
 *
 * Roda 1× por MODELO ÚNICO (codigo_fipe + ano) — não por anúncio: o value-cache
 * do fipeService já dedup, e aqui também pulamos repetidos. Só ENRIQUECE o
 * histórico (upsert idempotente), não mexe em nenhum anúncio — seguro rodar
 * sempre. Resiliente: um erro/429 num modelo não derruba o run (pula e segue).
 *
 * Depois deste, rodar `recalcular:fipe-mensal` (lê o mês novo local).
 * Uso: npm run avancar:fipe-mes
 */
async function main(): Promise<void> {
  const TAM = 1000;
  const anuncios: { veiculo: string; versao: string | null; ano: string | null; fipe_codigo: string | null }[] = [];
  for (let inicio = 0; ; inicio += TAM) {
    const { data, error } = await supabase
      .from("opportunities")
      .select("veiculo, versao, ano, fipe_codigo")
      .eq("origem_tipo", "descoberta")
      .not("fipe_codigo", "is", null)
      .range(inicio, inicio + TAM - 1);
    if (error) throw new Error(`Falha ao listar: ${error.message}`);
    anuncios.push(...(data ?? []));
    if (!data || data.length < TAM) break;
  }

  // Um representante por (codigo_fipe, ano) — é o que define um ponto histórico.
  const feitos = new Set<string>();
  const unicos = anuncios.filter((a) => {
    const chave = `${a.fipe_codigo}|${a.ano}`;
    if (feitos.has(chave) || !a.ano) return false;
    feitos.add(chave);
    return true;
  });
  console.log(`[avancar-fipe] ${anuncios.length} anúncios → ${unicos.length} modelos únicos (codigo+ano) pra avançar.`);

  let gravados = 0, semFipe = 0, erros = 0, i = 0;
  for (const a of unicos) {
    i++;
    const palavras = (a.veiculo ?? "").trim().split(/\s+/);
    const marca = palavras[0] ?? "";
    const modelo = palavras[1] ?? "";
    if (!marca || !modelo || !a.ano) { semFipe++; continue; }

    try {
      const ref = await buscarReferenciaFipe(marca, modelo, a.ano, a.versao);
      if (!ref) { semFipe++; continue; }
      await registrarPontoHistoricoFipe(ref);
      gravados++;
    } catch {
      // erro transitório (ex.: 429) — pula, não derruba o run
      erros++;
    }

    if (i % 100 === 0) {
      console.log(`[avancar-fipe] ${i}/${unicos.length} — ${gravados} gravados, ${semFipe} sem FIPE, ${erros} erros.`);
    }
  }

  console.log(`[avancar-fipe] Concluído: ${gravados} pontos gravados no fipe_historico | ${semFipe} sem match | ${erros} erros (pulados).`);
}

main().catch((erro) => {
  console.error("[avancar-fipe] Falha:", erro);
  process.exitCode = 1;
});
