import "dotenv/config";
import { supabase, lerConfig } from "./supabaseClient.js";
import { calcularMargemPercentual, classificar, MARGEM_MINIMA_PADRAO } from "./margin.js";

/**
 * Recálculo mensal de margem contra a FIPE VIGENTE — o "dia da FIPE"
 * (project_repasse_livre_fipe_recalculo_mensal). Sem isto, a margem exibida
 * fica congelada na FIPE da captação e envelhece na virada do mês.
 *
 * Lê o valor FIPE mais recente que JÁ TEMOS no `fipe_historico` (por
 * codigo_fipe + ano) — NÃO bate na API da FIPE (isso seria redundante e pega
 * 429 em volume). Avançar pra um mês novo (ex.: puxar julho da oficial) é um
 * passo separado, por modelo, do cron mensal.
 *
 * Por anúncio DESCOBERTO (OLX/ML/Webmotors; não mexe em inserção direta):
 *  - margem < 2% (MARGEM_TOLERANCIA_FIPE) → sai da base (log em oportunidades_
 *    historico + delete). Abaixo de 2% não vale nem negociando.
 *  - margem >= 2% → mantido e reclassificado: >= piso vira Bronze+, e a franja
 *    2%–piso fica SEM selo (o recálculo da FIPE a derrubou abaixo do piso de
 *    captação, mas toleramos + aviso "FIPE caiu, negocie" na página — a captação
 *    exige piso pra anúncio NOVO, o recálculo só churna abaixo de 2%).
 *  - sem fipe_codigo ou sem histórico → mantido como está.
 *
 * DRY-RUN por padrão (só relatório). Pra aplicar: --aplicar.
 * Uso: npm run recalcular:fipe-mensal            (dry-run)
 *      npm run recalcular:fipe-mensal -- --aplicar
 */

const APLICAR = process.argv.includes("--aplicar");
// Piso de DESCARTE do recálculo — separado do piso de CAPTAÇÃO (config, hoje 3%).
// Um anúncio já capturado que o recálculo da FIPE derruba abaixo do piso não é
// churnado na hora: fica na base (sem selo entre 2% e o piso) com o aviso
// "FIPE caiu, negocie" até cruzar isto. Abaixo de 2% não vale nem negociando.
const MARGEM_TOLERANCIA_FIPE = 2;
const MESES_PT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

interface ValorFipe {
  valor_centavos: number;
  ano_referencia: number;
  mes_referencia: number;
}

/** Valor FIPE mais recente que temos no histórico pra um (codigo, ano). */
async function fipeMaisRecente(codigoFipe: string, anoModelo: number): Promise<ValorFipe | null> {
  const { data } = await supabase
    .from("fipe_historico")
    .select("valor_centavos, ano_referencia, mes_referencia")
    .eq("codigo_fipe", codigoFipe)
    .eq("ano_modelo", anoModelo)
    .order("ano_referencia", { ascending: false })
    .order("mes_referencia", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as ValorFipe | null) ?? null;
}

async function main(): Promise<void> {
  const TAM = 1000;
  const anuncios: {
    id: string; ano: string | null; preco: number; fipe_codigo: string | null; margem_percentual: number | null;
    fonte: string; origem_tipo: string; classificacao: string | null; status: string; data_captura: string;
  }[] = [];
  for (let inicio = 0; ; inicio += TAM) {
    const { data, error } = await supabase
      .from("opportunities")
      .select("id, ano, preco, fipe_codigo, margem_percentual, fonte, origem_tipo, classificacao, status, data_captura")
      .eq("origem_tipo", "descoberta")
      .range(inicio, inicio + TAM - 1);
    if (error) throw new Error(`Falha ao listar: ${error.message}`);
    anuncios.push(...(data ?? []));
    if (!data || data.length < TAM) break;
  }
  const piso = Number((await lerConfig("MARGEM_MINIMA_PERCENTUAL")) ?? process.env.MARGEM_MINIMA_PERCENTUAL ?? MARGEM_MINIMA_PADRAO);
  console.log(`[recalcular-fipe] ${anuncios.length} anúncios descobertos. Piso: ${piso}%. Modo: ${APLICAR ? "APLICAR" : "DRY-RUN (sem escrever)"}.`);

  let atualizados = 0, excluidos = 0, semFipe = 0, viraramSemSelo = 0, subiram = 0, cairam = 0, iguais = 0;
  let ordemRefMax = 0, refMes = 0, refAno = 0;
  for (const a of anuncios) {
    const anoModelo = a.fipe_codigo && a.ano ? Number.parseInt(a.ano, 10) : NaN;
    if (!a.fipe_codigo || !Number.isFinite(anoModelo)) { semFipe++; continue; }

    const fipe = await fipeMaisRecente(a.fipe_codigo, anoModelo);
    if (!fipe) { semFipe++; continue; }

    // Mês de referência predominante (o mais recente visto) pro resumo BIA.
    const ordemRef = fipe.ano_referencia * 12 + fipe.mes_referencia;
    if (ordemRef > ordemRefMax) { ordemRefMax = ordemRef; refMes = fipe.mes_referencia; refAno = fipe.ano_referencia; }

    const margem = calcularMargemPercentual(a.preco, fipe.valor_centavos / 100);

    // Comparação com a margem antiga (só pra relatório: subiu/caiu).
    const antiga = a.margem_percentual;
    if (antiga !== null) {
      const delta = margem - antiga;
      if (delta > 0.05) subiram++;
      else if (delta < -0.05) cairam++;
      else iguais++;
    }

    if (margem < MARGEM_TOLERANCIA_FIPE) {
      excluidos++;
      if (APLICAR) {
        await supabase.from("oportunidades_historico").insert({
          origem_tipo: a.origem_tipo, fonte: a.fonte, classificacao: a.classificacao,
          margem_percentual: Number(margem.toFixed(2)), status: a.status, data_captura: a.data_captura,
          motivo: "fipe_sem_margem", // exclusão por margem < 2% (tolerância FIPE) — NÃO é liquidez
        });
        await supabase.from("opportunities").delete().eq("id", a.id);
      }
      continue;
    }

    const novaClassificacao = classificar(margem, piso);
    if (novaClassificacao === null) viraramSemSelo++;
    if (APLICAR) {
      const dataRef = `${MESES_PT[fipe.mes_referencia - 1]} de ${fipe.ano_referencia}`;
      await supabase.from("opportunities").update({
        fipe_valor: fipe.valor_centavos / 100,
        fipe_data_referencia: dataRef,
        margem_percentual: Number(margem.toFixed(2)),
        classificacao: novaClassificacao,
      }).eq("id", a.id);
    }
    atualizados++;
  }

  console.log(`[recalcular-fipe] ${APLICAR ? "APLICADO" : "SIMULAÇÃO"}:`);
  console.log(`  ${atualizados} atualizados | ${excluidos} excluídos (<${MARGEM_TOLERANCIA_FIPE}%) | ${viraramSemSelo} sem selo (${MARGEM_TOLERANCIA_FIPE}%–${piso}%) | ${semFipe} sem fipe_codigo/histórico (mantidos)`);
  console.log(`  variação vs margem atual: ${subiram} subiram | ${cairam} caíram | ${iguais} ~iguais | piso captação: ${piso}% | descarte: ${MARGEM_TOLERANCIA_FIPE}%`);

  // Persiste o resumo pra BIA (série de saúde de margem da base) — só quando
  // aplica de verdade. Upsert por dia (idempotente se rodar 2x no mesmo dia).
  if (APLICAR) {
    const hoje = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("bi_recalculo_fipe").upsert(
      {
        data: hoje,
        mes_referencia_fipe: refMes || null,
        ano_referencia_fipe: refAno || null,
        total_processados: anuncios.length,
        atualizados, excluidos, ficaram_3_5: viraramSemSelo, sem_fipe: semFipe,
        subiram, cairam, iguais,
      },
      { onConflict: "data" }
    );
    if (error) console.warn(`[recalcular-fipe] Falha ao gravar resumo BIA: ${error.message}`);
    else console.log(`[recalcular-fipe] Resumo BIA gravado (bi_recalculo_fipe, ${hoje}).`);
  }
}

main().catch((erro) => {
  console.error("[recalcular-fipe] Falha:", erro);
  process.exitCode = 1;
});
