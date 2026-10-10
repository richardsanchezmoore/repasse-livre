import "dotenv/config";
import { supabase } from "./supabaseClient.js";
import { ehImovel } from "./precoParaguai.js";

/**
 * VARRE A BASE ATRÁS DE IMÓVEL QUE ENTROU ANTES DA GUARDA.
 *
 * ⚠️ `ehImovel()` passou a rodar na CAPTURA em 10/10/2026, mas o que já estava
 * no banco continuou lá — e um "Vendo Loft 2027 En Encarnación" no primeiro
 * card da home é o tipo de coisa que custa a confiança inteira do site.
 *
 * ★ USA A MESMA FUNÇÃO DA CAPTURA, nunca um regex novo aqui. Duas regras para
 * a mesma pergunta divergem no primeiro ajuste, e aí a base passa a ter imóvel
 * que a captura barraria e vice-versa.
 *
 * ⚠️ REJEITA, NÃO APAGA: `status = 'rejeitada'` tira da listagem e mantém o
 * registro — se a regra errar, dá para ver o que ela pegou. E a observação de
 * preço no livro não é tocada: lá é fato datado.
 *
 * Uso:
 *   npx tsx src/limparImoveisPY.ts            → só lista (seco)
 *   npx tsx src/limparImoveisPY.ts --aplicar  → rejeita
 */
const APLICAR = process.argv.includes("--aplicar");

async function main() {
  const tudo: any[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase
      .from("opportunities")
      .select("id, veiculo, descricao, cidade")
      .eq("pais", "PY").neq("status", "rejeitada")
      .range(de, de + 999);
    if (error) throw new Error(error.message);
    tudo.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }

  const achados = tudo.filter((o) => ehImovel(String(o.veiculo ?? ""), String(o.descricao ?? "")));
  console.log(`${tudo.length} anúncios ativos · ${achados.length} identificados como imóvel\n`);
  achados.forEach((o) => console.log(`  - ${String(o.veiculo).slice(0, 70)}  [${o.cidade ?? "—"}]`));

  if (!achados.length) return;
  if (!APLICAR) { console.log("\n(seco — nada mudou. Use --aplicar para rejeitar.)"); return; }

  const { error } = await supabase
    .from("opportunities")
    .update({ status: "rejeitada" })
    .in("id", achados.map((o) => o.id));
  if (error) throw new Error(error.message);
  console.log(`\n✓ ${achados.length} rejeitado(s)`);
}
main().catch((e) => { console.error("falhou:", e.message); process.exitCode = 1; });
