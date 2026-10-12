import "dotenv/config";
import fs from "node:fs";
import { supabase } from "./supabaseClient.js";

/**
 * ═══ DEVOLVE À VARREDURA OS ANÚNCIOS QUE NASCERAM SEM CIDADE ══════════════
 *
 * ★ A ESCOLHA DO GUSTAVO (12/10/2026), depois de medirmos as alternativas.
 *
 * O problema: 95 anúncios vivos estão sem cidade, e por isso fora da vitrine.
 * Medido com a página na mão: os 95 estão NO AR e NENHUM traz localização na
 * janela do anúncio principal — o Facebook simplesmente não publica ali.
 *
 * ★★ MAS CIDADE, NESTE PROJETO, NUNCA FOI DADO DO ANÚNCIO: é a PRAÇA que o
 * encontrou. A captura faz isso explicitamente (`cidade: a.cidade ?? regiao.nome`)
 * e é por isso que as 12 cidades de toda a base são os nomes das 11 praças.
 * Estes 95 vieram por um caminho que perdeu a região — não é um dado que falta,
 * é um dado que se perdeu no meio.
 *
 * ⚠️⚠️ E A VARREDURA NUNCA OS ALCANÇA SOZINHA: ela pula o que está em
 * `fb_vistos` (`ids.filter(id => !jaVistos.has(id))`). Apagar a marca de visto
 * é o que os devolve ao caminho NORMAL — e aí a praça entra como cidade, igual
 * a todo o resto da base, sem inventar nada.
 *
 * ⚠️ O QUE SE PERDE: `fb_vistos` tem três colunas (item_id, status, visto_em) e
 * nenhuma guarda "primeira vez" separada. Apagar a linha apaga a data. Por isso
 * o script GRAVA O QUE APAGOU em um arquivo antes — 95 de 7.820 linhas, e o
 * livro serve para deduplicar, não para análise (quem responde "quando vimos" é
 * `fb_buscas`, migração 0089).
 *
 * ⚠️ Não cria duplicata: o anúncio é gravado por `upsert` com
 * `onConflict: "link_origem"`, então recapturar ATUALIZA a linha que já existe.
 *
 * ⚠️ Recuperação PARCIAL é o esperado: só volta o que alguma busca devolver de
 * novo. Rodar e medir depois — não prometer os 95.
 *
 * Uso: npx tsx src/reapresentarSemCidadePY.ts [--aplicar]
 */
const APLICAR = process.argv.includes("--aplicar");
const BACKUP = "C:/claude/fb-vistos-reapresentados.json";

async function main() {
  const alvos: Array<{ link_origem: string; veiculo: string | null }> = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase
      .from("opportunities")
      .select("link_origem, veiculo")
      .eq("pais", "PY")
      .is("duplicata_de", null)
      .is("cidade", null)
      .like("link_origem", "%/marketplace/item/%")
      .order("id", { ascending: true })
      .range(de, de + 999);
    if (error) throw new Error(error.message);
    alvos.push(...((data ?? []) as typeof alvos));
    if (!data || data.length < 1000) break;
  }

  const ids = [...new Set(alvos.map((a) => String(a.link_origem).match(/item\/(\d+)/)?.[1]).filter(Boolean) as string[])];
  console.log(`${alvos.length} anúncio(s) vivos sem cidade → ${ids.length} id(s) distintos`);
  if (!ids.length) return;

  // ⚠️ Lê ANTES de apagar, para o arquivo guardar o que existia de fato.
  const { data: vistos, error: e1 } = await supabase.from("fb_vistos").select("*").in("item_id", ids);
  if (e1) throw new Error(e1.message);
  console.log(`  ${vistos?.length ?? 0} estão marcados como vistos — são esses que a varredura pula`);

  if (!APLICAR) {
    console.log("\n(seco — nada apagado. Use --aplicar.)");
    return;
  }

  fs.writeFileSync(BACKUP, JSON.stringify({ apagadoEm: new Date().toISOString(), linhas: vistos ?? [] }, null, 1), "utf8");
  console.log(`  cópia do que será apagado: ${BACKUP}`);

  const { error: e2 } = await supabase.from("fb_vistos").delete().in("item_id", ids);
  if (e2) throw new Error(e2.message);

  console.log(`\n✓ ${vistos?.length ?? 0} marca(s) de visto apagada(s) — voltam ao caminho normal da varredura`);
  console.log("  ⚠️ Recuperação é parcial por natureza: só volta o que alguma busca devolver de novo.");
}

main().catch((e) => { console.error("falhou:", (e as Error).message); process.exitCode = 1; });
