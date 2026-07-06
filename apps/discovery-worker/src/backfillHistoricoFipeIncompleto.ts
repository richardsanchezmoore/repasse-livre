import "dotenv/config";
import { supabase } from "./supabaseClient.js";
import { garantirHistoricoFipe } from "./historicoFipe.js";

/**
 * Repara séries históricas de FIPE INCOMPLETAS de anúncios que JÁ têm código.
 *
 * Por quê: `garantirHistoricoFipe` (backfill do mirror fipeX) é best-effort e,
 * quando o índice do Hugging Face está frio ("dataset index is loading"), pegava
 * 0 linhas e a série ficava num toco de 1 ponto. Como o rematch só toca em quem
 * NÃO tem código, ninguém re-disparava o backfill → gráfico "Histórico Preços
 * FIPE" vazio pra sempre (ex.: Creta Prestige 2019, código 015144-0, só 1 ponto
 * enquanto o irmão 2018 tinha 12). Ver project_repasse_livre_fipe_historico.
 *
 * Estratégia: enumera os pares (codigo_fipe, ano_modelo) dos anúncios ativos com
 * código e, pros que têm < MINIMO pontos, chama garantirHistoricoFipe — que agora
 * re-tenta o mirror frio. garantirHistoricoFipe já pula os completos sem tocar no
 * mirror, então é barato varrer todos. NUNCA mexe em código/margem/valor.
 *
 * Uso: tsx backfillHistoricoFipeIncompleto.ts [--aplicar]
 */

const APLICAR = process.argv.includes("--aplicar");
const MINIMO = 6; // mesmo piso do garantirHistoricoFipe (MINIMO_PARA_PULAR)

async function contarPontos(codigo: string, anoModelo: number): Promise<number> {
  const { count } = await supabase
    .from("fipe_historico")
    .select("*", { count: "exact", head: true })
    .eq("codigo_fipe", codigo)
    .eq("ano_modelo", anoModelo);
  return count ?? 0;
}

async function main(): Promise<void> {
  // Pares distintos (codigo, ano) dos anúncios ativos com código.
  const pares = new Map<string, { codigo: string; ano: number }>();
  const TAM = 1000;
  for (let inicio = 0; ; inicio += TAM) {
    const { data, error } = await supabase
      .from("opportunities")
      .select("fipe_codigo, ano")
      .eq("origem_tipo", "descoberta")
      .not("fipe_codigo", "is", null)
      .not("ano", "is", null)
      .range(inicio, inicio + TAM - 1);
    if (error) throw new Error(`listar: ${error.message}`);
    for (const r of data ?? []) {
      const ano = Number.parseInt(r.ano as string, 10);
      if (!Number.isFinite(ano)) continue;
      const chave = `${r.fipe_codigo}|${ano}`;
      if (!pares.has(chave)) pares.set(chave, { codigo: r.fipe_codigo as string, ano });
    }
    if (!data || data.length < TAM) break;
  }

  console.log(`[hist-repair] ${pares.size} pares (código,ano) distintos. Modo: ${APLICAR ? "APLICAR" : "DRY-RUN"}.`);

  let incompletos = 0;
  let reparados = 0;
  let aindaIncompletos = 0;
  let i = 0;
  for (const { codigo, ano } of pares.values()) {
    i++;
    const antes = await contarPontos(codigo, ano);
    if (antes >= MINIMO) continue;
    incompletos++;
    if (!APLICAR) {
      console.log(`  incompleto: ${codigo} ${ano} (${antes} ponto${antes === 1 ? "" : "s"})`);
      continue;
    }
    await garantirHistoricoFipe(codigo, ano);
    const depois = await contarPontos(codigo, ano);
    if (depois >= MINIMO) {
      reparados++;
      console.log(`  ✅ ${codigo} ${ano}: ${antes} → ${depois}`);
    } else {
      aindaIncompletos++;
      console.log(`  ⚠️  ${codigo} ${ano}: ${antes} → ${depois} (mirror ainda não cobriu)`);
    }
    if (i % 50 === 0) console.log(`[hist-repair] ${i}/${pares.size}…`);
  }

  console.log(
    `[hist-repair] ${APLICAR ? "APLICADO" : "SIMULAÇÃO"}: ${incompletos} incompletos` +
      (APLICAR ? ` | ${reparados} reparados | ${aindaIncompletos} seguem incompletos (re-tentar depois)` : "")
  );
  process.exit(0);
}

main().catch((e) => {
  console.error("[hist-repair] Falha:", e);
  process.exit(1);
});
