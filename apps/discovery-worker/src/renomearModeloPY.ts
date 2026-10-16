import "dotenv/config";
import { supabase } from "./supabaseClient.js";

/**
 * ★ RENOMEIA UM MODELO em todos os lugares onde o nome está gravado.
 *
 * ⚠️ É RENAME, não re-inferência. O `renormalizarModelosPY` recalcula o modelo
 * a partir do título e por isso só mexe no que o título explica — em 16/10/2026
 * ele pegou 25 dos 69 Axio/Runx da base, porque os outros tiveram o modelo
 * resolvido pela descrição ou por backfill. Quando a mudança é só de NOME
 * (mesmo carro, grafia diferente), reinferir é a ferramenta errada: o certo é
 * trocar a etiqueta onde ela estiver.
 *
 * ★ Nasceu da correção do Gustavo: no Paraguai ninguém diz "Corolla Axio" nem
 * "Corolla Runx" — a tampa do porta-malas não traz "Corolla" e, na cabeça do
 * comprador, são modelos diferentes. E são mesmo.
 *
 * ⚠️ Mexe nos DOIS lugares, e o livro guarda o modelo em minúsculas. Trocar só
 * em `opportunities` deixaria a tabela de referência publicando o nome velho,
 * que é o erro que o `resincronizarObservacoesPY` existe para evitar.
 *
 * Uso: npx tsx src/renomearModeloPY.ts "Corolla Axio=Axio" "Corolla Runx=Runx" [--aplicar]
 */
const APLICAR = process.argv.includes("--aplicar");
const PARES = process.argv.slice(2).filter((a) => a.includes("=")).map((a) => {
  const [de, para] = a.split("=");
  return { de: de.trim(), para: para.trim() };
});

async function main() {
  if (!PARES.length) {
    console.log('Uso: npx tsx src/renomearModeloPY.ts "Corolla Axio=Axio" [--aplicar]');
    return;
  }
  for (const { de, para } of PARES) {
    const { count: nAnuncios } = await supabase
      .from("opportunities").select("id", { count: "exact", head: true })
      .eq("pais", "PY").eq("modelo", de);
    const { count: nLivro } = await supabase
      .from("py_observacoes_preco").select("id", { count: "exact", head: true })
      .eq("modelo", de.toLowerCase());

    console.log(`${de} → ${para}: ${nAnuncios ?? 0} anúncio(s) · ${nLivro ?? 0} observação(ões)`);
    if (!APLICAR) continue;

    const { error: e1 } = await supabase.from("opportunities")
      .update({ modelo: para }).eq("pais", "PY").eq("modelo", de);
    if (e1) console.log(`  ✗ anúncios: ${e1.message.slice(0, 70)}`);
    const { error: e2 } = await supabase.from("py_observacoes_preco")
      .update({ modelo: para.toLowerCase() }).eq("modelo", de.toLowerCase());
    if (e2) console.log(`  ✗ livro: ${e2.message.slice(0, 70)}`);
    if (!e1 && !e2) console.log(`  ✓ feito`);
  }
  if (!APLICAR) console.log(`\n(seco — nada mudou. Use --aplicar.)`);
  else console.log(`\n⚠️ Rode em seguida: npx tsx src/publicarTabelaPY.ts --gravar`);
}

main().catch((e) => { console.error(e); process.exit(1); });
