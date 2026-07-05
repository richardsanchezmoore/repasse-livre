import "dotenv/config";
import { supabase } from "./supabaseClient.js";
import { resolverReferenciaFipePorTexto } from "./fipeService.js";
import { garantirHistoricoFipe, registrarPontoHistoricoFipe } from "./historicoFipe.js";
import { gravarCodigoAprendido } from "./mapaAprendidoFipe.js";
import { calcularMargemPercentual, classificar } from "./margin.js";

/**
 * Backfill dos anúncios do MERCADO_LIVRE com FIPE errada por CRUZAMENTO de
 * combustível/cilindrada (ex.: Commander 1.3 Flex que ficou com o código do
 * Commander 2.2 Diesel). Re-resolve por TEXTO com os guards (combustível+motor
 * reais do ML), sem depender do tooltip. DRY-RUN por padrão; --aplicar pra gravar.
 */
const APLICAR = process.argv.includes("--aplicar");
const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const fuel = (t: string) => {
  const s = norm(t);
  if (/\bdiesel\b|\btdi?\b|\bbtdi\b/.test(s)) return "diesel";
  if (/eletric|hibrid/.test(s)) return "eletrico";
  if (/flex|gasolina|alcool|etanol/.test(s)) return "leve";
  return null;
};
const cil = (t: string) => {
  const m = norm(t).match(/(?:^|\s)(\d[.,]\d)(?:\s|$|v|t|l)/);
  return m ? m[1].replace(",", ".") : null;
};

async function main() {
  const codMap = new Map<string, string>();
  for (let i = 0; ; i += 1000) {
    const { data } = await supabase.from("fipe_historico").select("codigo_fipe, nome_modelo").range(i, i + 999);
    if (!data || !data.length) break;
    for (const r of data) if (!codMap.has(r.codigo_fipe)) codMap.set(r.codigo_fipe, r.nome_modelo);
    if (data.length < 1000) break;
  }

  const ads: any[] = [];
  for (let i = 0; ; i += 1000) {
    const { data } = await supabase
      .from("opportunities")
      .select(
        "id, veiculo, versao, ano, estado, preco, fipe_codigo, fipe_valor, atributos_olx, origem_tipo, fonte, status, classificacao, data_captura, data_publicacao_origem, ultimo_visto"
      )
      .eq("fonte", "MERCADO_LIVRE")
      .not("fipe_codigo", "is", null)
      .range(i, i + 999);
    if (!data || !data.length) break;
    ads.push(...data);
    if (data.length < 1000) break;
  }

  const at = (a: any, k: string) => a.atributos_olx?.[k]?.value ?? "";
  const suspeitos = ads.filter((a) => {
    const comb = at(a, "tipo_de_combustível") || at(a, "tipo_de_combustivel");
    const mot = at(a, "motor");
    const adF = fuel(`${comb} ${a.veiculo}`), adC = cil(`${mot} ${a.veiculo}`);
    const nome = codMap.get(a.fipe_codigo) ?? "";
    return (adF && fuel(nome) && adF !== fuel(nome)) || (adC && cil(nome) && adC !== cil(nome));
  });

  console.log(`[backfill-ml-comb] ${suspeitos.length} suspeitos. Modo: ${APLICAR ? "APLICAR" : "DRY-RUN"}.`);
  let corrigidos = 0, removidos = 0, semRef = 0, iguais = 0;
  for (const a of suspeitos) {
    const pv = a.veiculo.trim().split(/\s+/);
    const comb = at(a, "tipo_de_combustível") || at(a, "tipo_de_combustivel");
    const mot = at(a, "motor");
    const variante = `${a.veiculo} ${mot} ${comb}`.replace(/\s+/g, " ").trim();
    const ref = await resolverReferenciaFipePorTexto(pv[0] ?? "", pv[1] ?? "", String(a.ano), variante).catch(() => null);
    if (!ref) { semRef++; continue; }
    if (ref.codigoFipe === a.fipe_codigo) { iguais++; continue; }
    const margem = calcularMargemPercentual(a.preco, ref.valor);

    // Margem real < 3% = FALSO POSITIVO (só entrou por causa da FIPE errada mais
    // cara) → remove da base (move pro histórico + delete), como o recálculo mensal.
    if (margem < 3) {
      console.log(`  ✗ REMOVE (margem real ${margem.toFixed(1)}% < 3%): ${a.veiculo.slice(0, 42)} [${a.fipe_codigo}→${ref.codigoFipe}]`);
      removidos++;
      if (APLICAR) {
        await supabase.from("oportunidades_historico").insert({
          origem_tipo: a.origem_tipo, fonte: a.fonte, classificacao: a.classificacao,
          margem_percentual: Number(margem.toFixed(2)), status: a.status, data_captura: a.data_captura,
          veiculo: a.veiculo, versao: a.versao, ano: a.ano, estado: a.estado, preco: a.preco,
          fipe_codigo: ref.codigoFipe, data_publicacao_origem: a.data_publicacao_origem,
          ultimo_visto: a.ultimo_visto, motivo: "fipe_corrigida_sem_margem",
        });
        await supabase.from("opportunities").delete().eq("id", a.id);
      }
      continue;
    }

    console.log(`  ✎ ${a.veiculo.slice(0, 42)} | ${a.fipe_codigo} (R$${a.fipe_valor}) → ${ref.codigoFipe} (R$${ref.valor}) "${ref.modelo.slice(0, 28)}" | margem ${margem.toFixed(1)}%`);
    corrigidos++;
    if (APLICAR) {
      await supabase.from("opportunities").update({
        fipe_codigo: ref.codigoFipe,
        fipe_valor: ref.valor,
        margem_percentual: Number(margem.toFixed(2)),
        classificacao: classificar(margem),
      }).eq("id", a.id);
      await gravarCodigoAprendido(a.versao ?? a.veiculo, String(a.ano), ref).catch(() => {});
      await registrarPontoHistoricoFipe(ref).catch(() => {});
      await garantirHistoricoFipe(ref.codigoFipe, ref.anoModelo).catch(() => {});
    }
  }
  console.log(`[backfill-ml-comb] ${APLICAR ? "APLICADO" : "SIMULAÇÃO"}: ${corrigidos} corrigidos | ${removidos} removidos (<3%) | ${iguais} já certos | ${semRef} sem ref.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
