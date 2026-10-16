import "dotenv/config";
import { supabase } from "./supabaseClient.js";

/**
 * ★★★ TIRA A MOTO DA VITRINE DE CARRO — e do livro de preço do carro.
 *
 * ⚠️⚠️ Achado em 16/10/2026: a coluna `categoria` existe desde a migração 0097
 * exatamente para separar as duas, e NINGUÉM a lia. Nem a vitrine, nem a
 * tabela de referência, nem as contagens do topo. As motos capturadas estavam
 * aprovadas e misturadas aos carros — uma Kenton de ₲6,5 milhões no mesmo
 * mural de um Prado — e as observações delas entravam na mediana do carro.
 *
 * ★ O portão novo (`publicacao.ts`) impede que ISSO VOLTE A ACONTECER. Este
 * script conserta o que já aconteceu, e faz as duas metades:
 *
 *   1) `status` volta para `descoberta`. Não apaga nada: o anúncio é bom e vai
 *      alimentar /motos. O que não pode é aparecer como carro.
 *   2) `categoria` da OBSERVAÇÃO passa para 'moto' (migração 0098), para a
 *      mediana do carro deixar de contá-la.
 *
 * ⚠️ A ligação entre as duas tabelas é o id do item do Facebook, que no
 * anúncio vive no fim do `link_origem` e na observação é o `item_id`. Não há
 * chave estrangeira: o livro sobrevive ao anúncio de propósito.
 *
 * ⚠️ Seco por padrão. `PY_APLICAR=1` para gravar.
 */
const APLICAR = process.env.PY_APLICAR === "1";

const idDoLink = (link: string | null): string | null =>
  String(link ?? "").match(/\/item\/(\d+)/)?.[1] ?? null;

async function main() {
  const { data: motos, error } = await supabase
    .from("opportunities")
    .select("id, veiculo, status, link_origem")
    .eq("pais", "PY")
    .eq("categoria", "moto");
  if (error) throw new Error(error.message);

  const aprovadas = (motos ?? []).filter((m) => m.status === "aprovada");
  const itemIds = (motos ?? []).map((m) => idDoLink(m.link_origem as string | null)).filter(Boolean) as string[];

  // Quais observações dessas motos ainda estão marcadas como carro?
  const { data: obs } = await supabase
    .from("py_observacoes_preco")
    .select("id, item_id, modelo, categoria")
    .in("item_id", itemIds.slice(0, 500))
    .eq("categoria", "carro");

  console.log(`${(motos ?? []).length} motos na base · ${aprovadas.length} APROVADAS (na vitrine de carro)`);
  for (const m of aprovadas) console.log(`  ${String(m.veiculo).slice(0, 44)}`);
  console.log(`\n${(obs ?? []).length} observação(ões) de moto contando na mediana do CARRO:`);
  for (const o of obs ?? []) console.log(`  ${o.item_id}  ${o.modelo ?? "—"}`);

  if (!APLICAR) {
    console.log(`\n⚠️ SECO. Nada foi gravado. Para aplicar:  PY_APLICAR=1`);
    return;
  }

  let voltaram = 0;
  for (const m of aprovadas) {
    const { error: e } = await supabase.from("opportunities").update({ status: "descoberta" }).eq("id", m.id);
    if (e) { console.log(`  ✗ ${m.id}: ${e.message.slice(0, 60)}`); continue; }
    voltaram++;
  }
  let remarcadas = 0;
  for (const o of obs ?? []) {
    const { error: e } = await supabase.from("py_observacoes_preco").update({ categoria: "moto" }).eq("id", o.id);
    if (e) { console.log(`  ✗ obs ${o.id}: ${e.message.slice(0, 60)}`); continue; }
    remarcadas++;
  }
  console.log(`\n★ ${voltaram} moto(s) fora da vitrine de carro · ${remarcadas} observação(ões) remarcada(s).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
