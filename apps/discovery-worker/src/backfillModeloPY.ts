import "dotenv/config";
import { supabase } from "./supabaseClient.js";
import { normalizarVeiculoPY } from "./modeloParaguai.js";
import { conferirAnoModelo } from "./anoModeloPY.js";

/**
 * BACKFILL do modelo normalizado nos anúncios já gravados.
 *
 * ★ POR QUE: o catálogo JDM e o normalizador só valiam para captação NOVA. Os
 * 225 anúncios do Paraguai estavam na base com o título cru do Facebook —
 * "Toyota New 2011 Ractis", "15.500+000+0994810323 Mitsubishi+pajerito+" — e a
 * tabela de preço agrupa por (marca, modelo, ano). Agrupar por substring de
 * texto livre não é agrupar.
 *
 * ⚠️ GUARDA O ORIGINAL em `veiculo_bruto` ANTES de reescrever `veiculo`. O
 * normalizador vai melhorar, e sem o texto de origem não haveria como
 * reprocessar — seria destruir a matéria-prima para salvar a interpretação de
 * hoje. Só grava o bruto se ainda estiver vazio, para rodar duas vezes não
 * sobrescrever o original com a versão já limpa.
 *
 * ⚠️ NÃO INVENTA: modelo não reconhecido fica com `marca`/`modelo` nulos e
 * `veiculo` INTACTO. Palpite errado contamina a mediana, que é o produto.
 *
 * Uso: npx tsx src/backfillModeloPY.ts [--conferir]
 */
const CONFERIR = process.argv.includes("--conferir");

async function main() {
  /**
   * ⚠️⚠️ PAGINA DE 1.000 EM 1.000. Aqui estava `.limit(2000)`, e isso NÃO vence
   * o teto do PostgREST: ele devolve 1.000 em silêncio, sem erro. Quando a base
   * tinha 225 anúncios ninguém via; com 3,9 mil, o backfill passava a ignorar
   * dois terços dela e o relatório final dizia "2.000 anúncios PY" como se
   * tivesse olhado tudo. Mesma armadilha de sempre neste projeto.
   */
  const linhas: Array<{
    id: string; veiculo: string | null; veiculo_bruto: string | null; ano: number | null;
    marca: string | null; modelo: string | null; segmento: string | null;
  }> = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase
      .from("opportunities")
      .select("id, veiculo, veiculo_bruto, ano, marca, modelo, segmento")
      .eq("pais", "PY")
      .order("id", { ascending: true })
      .range(de, de + 999);
    if (error) throw new Error(error.message);
    linhas.push(...((data ?? []) as typeof linhas));
    if (!data || data.length < 1000) break;
  }

  let atualizados = 0, semModelo = 0, avisosAno = 0, inalterados = 0;
  const avisos: string[] = [];

  for (const o of linhas) {
    // ★ Reprocessa sempre a partir do BRUTO quando ele existe: rodar de novo
    // sobre o texto já limpo perderia pistas que o normalizador novo usaria.
    const origem = (o.veiculo_bruto as string | null) ?? (o.veiculo as string | null) ?? "";
    const v = normalizarVeiculoPY(origem);

    if (!v.marca || !v.modelo) { semModelo++; continue; }

    const ano = v.ano ?? (o.ano ? Number(o.ano) : null);
    const conf = conferirAnoModelo(v.modelo.toLowerCase(), ano);
    if (!conf.ok && conf.problema !== "ano_ausente" && conf.problema !== "modelo_sem_faixa") {
      avisosAno++;
      if (avisos.length < 8) avisos.push(`${origem.slice(0, 40)} → ${conf.aviso}`);
    }

    const veiculoLimpo = [v.marca, v.modelo, ano].filter(Boolean).join(" ");
    const patch: Record<string, unknown> = {
      marca: v.marca,
      modelo: v.modelo,
      segmento: v.segmento,
      veiculo: veiculoLimpo,
    };
    // só na primeira vez
    if (!o.veiculo_bruto) patch.veiculo_bruto = o.veiculo;

    /**
     * ⚠️ NÃO REESCREVE O QUE JÁ ESTÁ CERTO. Sem isto o backfill mandava um
     * UPDATE por anúncio — 3.736 escritas para mudar ~400. Além do tempo, é
     * egress à toa no Supabase, e foi egress que derrubou este projeto em
     * 02/10. Só grava quem de fato mudou.
     */
    const igual =
      o.marca === v.marca && o.modelo === v.modelo &&
      (o.segmento ?? null) === (v.segmento ?? null) &&
      o.veiculo === veiculoLimpo && patch.veiculo_bruto === undefined;
    if (igual) { inalterados++; continue; }

    if (!CONFERIR) {
      const { error: e2 } = await supabase.from("opportunities").update(patch).eq("id", o.id);
      if (e2) { console.log(`  ✗ ${o.id}: ${e2.message.slice(0, 60)}`); continue; }
    }
    atualizados++;
  }

  console.log(`${linhas.length} anúncios PY`);
  console.log(`  ${atualizados} normalizados${CONFERIR ? " (ENSAIO — nada gravado)" : ""}`);
  console.log(`  ${inalterados} já estavam corretos — nenhuma escrita`);
  console.log(`  ${semModelo} sem modelo reconhecido — ficam INTACTOS e fora da tabela`);
  console.log(`  ${avisosAno} com aviso de ano`);
  avisos.forEach((a) => console.log(`     ⚠️ ${a}`));

  if (!CONFERIR) {
    const { data: g } = await supabase
      .from("opportunities")
      .select("marca, modelo, ano")
      .eq("pais", "PY").not("modelo", "is", null);
    const grupos = new Map<string, number>();
    for (const x of g ?? []) {
      const k = `${x.marca} ${x.modelo} ${x.ano ?? "?"}`;
      grupos.set(k, (grupos.get(k) ?? 0) + 1);
    }
    const bons = [...grupos.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]);
    console.log(`\n=== ${bons.length} grupos com 3+ — as primeiras linhas da tabela de preço ===`);
    bons.forEach(([k, n]) => console.log(`  ${k.padEnd(34)} n=${n}`));
  }
}

main().catch((e) => { console.error("falhou:", e.message); process.exitCode = 1; });
