import "dotenv/config";
import { supabase } from "./supabaseClient.js";
import { buscarReferenciaFipe } from "./fipeService.js";
import { garantirHistoricoFipe, registrarPontoHistoricoFipe } from "./historicoFipe.js";
import { calcularMargemPercentual, classificar } from "./margin.js";
import type { ReferenciaFipe } from "./types.js";

/**
 * Re-match dos anúncios que ficaram SEM fipe_codigo (os ~5% que o bootstrap não
 * casou). Diagnóstico (01/07) mostrou 3 causas: (1) falhas TRANSIENTES da FIPE
 * durante o bootstrap — casam de novo no retry; (2) títulos livres do OLX (a 1ª
 * palavra não é a marca) — a marca real está no `versao`; (3) casos de fuzzy
 * genuínos (validar com o especialista). Este script ataca 1 e 2.
 *
 * Duas estratégias por anúncio:
 *  A) marca/modelo = 1ª/2ª palavra do `veiculo` (título) — recupera os transientes.
 *  B) marca = 1ª palavra do `versao`, modelo = 1ª palavra do `veiculo` — resolve
 *     título livre (ex.: "CAPTIVA 2015 BLINDADO" + versao "Chevrolet Sport...").
 *
 * Ao casar: grava fipe_codigo, popula o histórico (ponto do mês + 12 meses do
 * mirror) e recalcula a margem contra a FIPE de agora (exclui <3%, igual ao
 * recálculo mensal). Resiliente (um erro/429 não derruba o run).
 *
 * DRY-RUN por padrão. Uso: npm run rematch:fipe [-- --aplicar]
 */

const MARGEM_EXCLUSAO = 3;
const APLICAR = process.argv.includes("--aplicar");

async function tentarMatch(veiculo: string, versao: string | null, ano: string): Promise<{ ref: ReferenciaFipe; estrategia: "A" | "B" } | null> {
  const pv = (veiculo ?? "").trim().split(/\s+/);
  try {
    const a = await buscarReferenciaFipe(pv[0] ?? "", pv[1] ?? "", ano, versao);
    if (a) return { ref: a, estrategia: "A" };
  } catch { /* transiente — tenta B */ }
  if (versao) {
    const pw = versao.trim().split(/\s+/);
    try {
      const b = await buscarReferenciaFipe(pw[0] ?? "", pv[0] ?? "", ano, versao);
      if (b) return { ref: b, estrategia: "B" };
    } catch { /* pula */ }
  }
  return null;
}

async function main(): Promise<void> {
  const TAM = 1000;
  const anuncios: { id: string; veiculo: string; versao: string | null; ano: string | null; preco: number; fonte: string; origem_tipo: string; classificacao: string | null; status: string; data_captura: string }[] = [];
  for (let inicio = 0; ; inicio += TAM) {
    const { data, error } = await supabase
      .from("opportunities")
      .select("id, veiculo, versao, ano, preco, fonte, origem_tipo, classificacao, status, data_captura")
      .eq("origem_tipo", "descoberta")
      .is("fipe_codigo", null)
      .not("ano", "is", null)
      .range(inicio, inicio + TAM - 1);
    if (error) throw new Error(`Falha ao listar: ${error.message}`);
    anuncios.push(...(data ?? []));
    if (!data || data.length < TAM) break;
  }
  console.log(`[rematch-fipe] ${anuncios.length} anúncios sem fipe_codigo. Modo: ${APLICAR ? "APLICAR" : "DRY-RUN"}.`);

  let recA = 0, recB = 0, excluidos = 0, aindaNull = 0, i = 0;
  for (const a of anuncios) {
    i++;
    if (!a.ano) { aindaNull++; continue; }
    const achado = await tentarMatch(a.veiculo, a.versao, a.ano);
    if (!achado) { aindaNull++; continue; }
    const { ref, estrategia } = achado;
    if (estrategia === "A") recA++; else recB++;

    const margem = calcularMargemPercentual(a.preco, ref.valor);
    if (APLICAR) {
      if (margem < MARGEM_EXCLUSAO) {
        await supabase.from("oportunidades_historico").insert({
          origem_tipo: a.origem_tipo, fonte: a.fonte, classificacao: a.classificacao,
          margem_percentual: Number(margem.toFixed(2)), status: a.status, data_captura: a.data_captura,
        });
        await supabase.from("opportunities").delete().eq("id", a.id);
        excluidos++;
      } else {
        await supabase.from("opportunities").update({
          fipe_codigo: ref.codigoFipe,
          fipe_valor: ref.valor,
          fipe_data_referencia: ref.mesReferencia,
          margem_percentual: Number(margem.toFixed(2)),
          classificacao: classificar(margem),
        }).eq("id", a.id);
        await registrarPontoHistoricoFipe(ref);
        await garantirHistoricoFipe(ref.codigoFipe, ref.anoModelo);
      }
    } else if (margem < MARGEM_EXCLUSAO) {
      excluidos++;
    }

    if (i % 50 === 0) console.log(`[rematch-fipe] ${i}/${anuncios.length} — A:${recA} B:${recB} excl:${excluidos} null:${aindaNull}`);
  }

  console.log(`[rematch-fipe] ${APLICAR ? "APLICADO" : "SIMULAÇÃO"}: recuperados A=${recA} + B=${recB} = ${recA + recB} | ${excluidos} desses ficariam <3% (excluídos) | ${aindaNull} continuam sem match (grupo 3, fuzzy).`);
}

main().catch((erro) => {
  console.error("[rematch-fipe] Falha:", erro);
  process.exitCode = 1;
});
