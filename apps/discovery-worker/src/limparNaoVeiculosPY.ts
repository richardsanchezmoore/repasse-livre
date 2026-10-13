import "dotenv/config";
import { supabase } from "./supabaseClient.js";
import { conferirNaoEhVeiculo } from "./naoEhVeiculoPY.js";

/**
 * ═══ TIRA DA VITRINE O QUE NÃO É CARRO ════════════════════════════════════
 *
 * ★ Companheiro de `naoEhVeiculoPY.ts`: aquele barra na entrada, este limpa o
 * que já entrou. Sem os dois, consertar a captação deixaria o estrago antigo
 * publicado para sempre — a varredura pula o que está em `fb_vistos`.
 *
 * ⚠️⚠️ MEXE EM TRÊS LUGARES, e cada um por um motivo diferente:
 *
 *   1. `status` → "rejeitada": é o mecanismo que já existe para tirar da
 *      vitrine sem apagar nada. O registro fica, revisável.
 *
 *   2. `marca`/`modelo`/`segmento`/`geracao` → null: enquanto o modelo
 *      estiver gravado, a "Bateria Odyssey" segue sendo uma Honda Odyssey para
 *      qualquer consulta que olhe a coluna — inclusive a fileira de modelos da
 *      home, que conta por modelo.
 *
 *   3. `py_observacoes_preco.modelo` → null: ESTE é o que protege o produto.
 *      O preço de um jogo de pneus estava entrando na mediana do modelo que o
 *      título citava. ⚠️ Zerar o MODELO não é reescrever a observação: preço,
 *      moeda, data e item_id ficam intactos — o que muda é a nossa LEITURA,
 *      exatamente como no `resincronizarObservacoesPY`.
 *
 * ⚠️ E a ordem importa: se eu zerasse só o livro, o re-sincronizador leria a
 * oportunidade (que ainda diria "Odyssey") e devolveria o erro ao livro na
 * próxima rodada.
 *
 * Uso: npx tsx src/limparNaoVeiculosPY.ts [--aplicar]
 */
const APLICAR = process.argv.includes("--aplicar");

interface Linha {
  id: string;
  link_origem: string | null;
  veiculo: string | null;
  veiculo_bruto: string | null;
  modelo: string | null;
  status: string | null;
  preco: number | null;
  moeda: string | null;
}

async function main() {
  const linhas: Linha[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase
      .from("opportunities")
      .select("id, link_origem, veiculo, veiculo_bruto, modelo, status, preco, moeda")
      .eq("pais", "PY")
      .order("id", { ascending: true })
      .range(de, de + 999);
    if (error) throw new Error(error.message);
    linhas.push(...((data ?? []) as Linha[]));
    if (!data || data.length < 1000) break;
  }

  const achados = linhas
    .map((l) => ({ l, v: conferirNaoEhVeiculo(l.veiculo_bruto || l.veiculo) }))
    .filter((x) => x.v.ehNaoVeiculo);

  console.log(`${linhas.length} anúncios PY · ${achados.length} que não são carro${APLICAR ? "" : "  (ENSAIO — nada gravado)"}\n`);
  const porMotivo = new Map<string, number>();
  for (const { l, v } of achados) {
    porMotivo.set(v.motivo ?? "?", (porMotivo.get(v.motivo ?? "?") ?? 0) + 1);
    const naVitrine = l.status === "aprovada" ? "NA VITRINE" : l.status ?? "";
    console.log(
      `  ${String(v.motivo).padEnd(18)} ${String(l.modelo ?? "-").padEnd(16)} ${naVitrine.padEnd(11)} ` +
        `${String(l.veiculo_bruto || l.veiculo).slice(0, 52)}`
    );
  }
  console.log("\npor motivo:", [...porMotivo].map(([k, n]) => `${k}=${n}`).join("  "));

  if (!APLICAR || !achados.length) {
    if (!APLICAR) console.log("\n(seco — use --aplicar para gravar.)");
    return;
  }

  let ok = 0;
  const itemIds: string[] = [];
  for (const { l } of achados) {
    const { error } = await supabase
      .from("opportunities")
      .update({ status: "rejeitada", marca: null, modelo: null, segmento: null, geracao: null })
      .eq("id", l.id);
    if (error) {
      console.log(`  ✗ ${l.id}: ${error.message.slice(0, 60)}`);
      continue;
    }
    ok++;
    const item = String(l.link_origem ?? "").match(/item\/(\d+)/)?.[1];
    if (item) itemIds.push(item);
  }

  let obs = 0;
  if (itemIds.length) {
    // ⚠️ Em lotes de 50: um `in` com centenas de ids estoura o tamanho da URL
    // do PostgREST e falha com erro que não diz o motivo.
    for (let i = 0; i < itemIds.length; i += 50) {
      const lote = itemIds.slice(i, i + 50);
      const { data, error } = await supabase
        .from("py_observacoes_preco")
        .update({ modelo: null, geracao: null })
        .in("item_id", lote)
        .select("id");
      if (error) console.log(`  ✗ livro: ${error.message.slice(0, 60)}`);
      else obs += (data ?? []).length;
    }
  }

  console.log(`\n✓ ${ok} tirados da vitrine (status rejeitada, modelo zerado)`);
  console.log(`  ${obs} observação(ões) de preço deixaram de contaminar a mediana`);
}

main().catch((e) => {
  console.error("falhou:", (e as Error).message);
  process.exitCode = 1;
});
