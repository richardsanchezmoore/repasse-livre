import "dotenv/config";
import { supabase } from "./supabaseClient.js";

/**
 * ═══ RE-SINCRONIZA A INTERPRETAÇÃO NO LIVRO DE OBSERVAÇÕES ════════════════
 *
 * ★★★ POR QUE ISTO PRECISOU EXISTIR (12/10/2026): consertar o dicionário deu
 * modelo a 397 anúncios mudos — e a tabela de preço NÃO MEXEU UM DEDO. Ela não
 * lê `opportunities`; lê `py_observacoes_preco`, e lá o modelo foi gravado no
 * instante da captura, quando ainda era nulo. O conserto parava no meio do
 * caminho: a vitrine melhorava, o produto não.
 *
 * ⚠️⚠️ O QUE ESTE SCRIPT NÃO TOCA, NUNCA: `preco`, `moeda`, `item_id`, `mes`,
 * `criado_em`. Esses são a OBSERVAÇÃO — o fato de que tal anúncio pedia tal
 * preço em tal dia. São imutáveis e é por isso que o livro vale: ele sobrevive
 * ao anúncio e dura anos.
 *
 * ★ `modelo` e `geracao` são outra coisa: são a NOSSA LEITURA do anúncio, não
 * o fato observado. Quando o dicionário melhora, a leitura melhora, e manter a
 * leitura velha no livro não preserva história nenhuma — só racha o grupo da
 * mediana em dois (metade "Song", metade "Song Pro").
 *
 * ⚠️ Só mexe em observação cujo `item_id` ainda existe em `opportunities`.
 * Anúncio que saiu da base leva a leitura que tinha — não há de onde reler.
 *
 * Uso: npx tsx src/resincronizarObservacoesPY.ts [--conferir]
 */
const CONFERIR = process.argv.includes("--conferir");

type Obs = { id: number; item_id: string; modelo: string | null; geracao: string | null };

async function paginar<T>(tabela: string, colunas: string, filtro?: (q: any) => any): Promise<T[]> {
  const linhas: T[] = [];
  for (let de = 0; ; de += 1000) {
    let q: any = supabase.from(tabela).select(colunas);
    if (filtro) q = filtro(q);
    const { data, error } = await q.order("id", { ascending: true }).range(de, de + 999);
    if (error) throw new Error(`${tabela}: ${error.message}`);
    linhas.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) break;
  }
  return linhas;
}

async function main() {
  const obs = await paginar<Obs>("py_observacoes_preco", "id, item_id, modelo, geracao");
  const anuncios = await paginar<{ link_origem: string; modelo: string | null; geracao: string | null }>(
    "opportunities",
    "link_origem, modelo, geracao",
    (q: any) => q.eq("pais", "PY")
  );

  // ⚠️ O livro guarda o `item_id` do Facebook; a oportunidade guarda o link.
  const porItem = new Map<string, { modelo: string | null; geracao: string | null }>();
  for (const a of anuncios) {
    const id = String(a.link_origem ?? "").match(/item\/(\d+)/)?.[1];
    if (id) porItem.set(id, { modelo: a.modelo, geracao: a.geracao });
  }

  let preenchidos = 0, corrigidos = 0, semAnuncio = 0, iguais = 0, erros = 0;
  const amostra: string[] = [];

  for (const o of obs) {
    const atual = porItem.get(String(o.item_id));
    if (!atual) { semAnuncio++; continue; }
    // ⚠️ O livro guarda minúsculo (é chave de agrupamento), a oportunidade
    // guarda a grafia de tela. Compara e grava sempre em minúsculo.
    const modeloNovo = atual.modelo ? atual.modelo.toLowerCase() : null;
    const geracaoNova = atual.geracao ?? null;
    if (!modeloNovo) { continue; }               // ainda mudo: nada a escrever
    if (o.modelo === modeloNovo && (o.geracao ?? null) === geracaoNova) { iguais++; continue; }

    if (o.modelo === null) preenchidos++;
    else { corrigidos++; if (amostra.length < 12) amostra.push(`${o.modelo} → ${modeloNovo}`); }

    if (!CONFERIR) {
      const { error } = await supabase
        .from("py_observacoes_preco")
        .update({ modelo: modeloNovo, geracao: geracaoNova })
        .eq("id", o.id);
      if (error) { erros++; console.log(`  ✗ obs ${o.id}: ${error.message.slice(0, 60)}`); }
    }
  }

  console.log(`${obs.length} observações${CONFERIR ? "  (ENSAIO — nada gravado)" : ""}`);
  console.log(`  ${preenchidos} ganharam modelo (estavam nulas)`);
  console.log(`  ${corrigidos} tiveram a leitura corrigida`);
  console.log(`  ${iguais} já estavam iguais — nenhuma escrita`);
  console.log(`  ${semAnuncio} sem anúncio correspondente — ficam como estão`);
  if (erros) console.log(`  ${erros} erro(s)`);
  if (amostra.length) {
    console.log("\nexemplos de correção:");
    for (const a of amostra) console.log(`     ${a}`);
  }
}

main().catch((e) => { console.error("falhou:", (e as Error).message); process.exitCode = 1; });
