import "dotenv/config";
import { supabase } from "./supabaseClient.js";

/**
 * ═══ TIRA DA VITRINE O PREÇO QUE A GRANDEZA ADIVINHOU ERRADO ══════════════
 *
 * ★ Companheiro do aperto de `GRANDEZA_USD` em `precoParaguai.ts`. Aquele
 * barra na entrada; este limpa o que já entrou — e a captação não reabre
 * anúncio que está no livro `fb_vistos`, então sem este passe eles ficariam
 * publicados para sempre.
 *
 * ★★ O CRITÉRIO É EXATAMENTE O DA REGRA NOVA, aplicado ao dado gravado:
 * preço em dólar cuja moeda foi decidida SÓ pela grandeza, fora da faixa
 * 1.500–250.000. Relatado pelo Gustavo em 15/10/2026 e confirmado na base —
 * Ford Ecosport 2017 a "USD 500", Mitsubishi Galant 1998 a "USD 100.000",
 * Hyundai Elantra 1995 a "USD 94.683".
 *
 * ⚠️⚠️ NÃO MEXE em preço decidido por SÍMBOLO nem por PALAVRA na descrição.
 * Esses são sinais fortes: o anunciante escreveu a moeda. Se um deles estiver
 * errado, o erro é do anúncio e não da nossa leitura — e corrigir por cima
 * seria inventar.
 *
 * ⚠️ `status = rejeitada` e não apagar: o registro fica revisável, igual ao
 * que já se faz com reanúncio e com o que não é carro.
 *
 * ⚠️ E zera a leitura no LIVRO: enquanto a observação tiver modelo, aquele
 * preço adivinhado segue pesando na mediana — que é o produto.
 *
 * Uso: npx tsx src/limparEscalaAmbiguaPY.ts [--aplicar]
 */
const APLICAR = process.argv.includes("--aplicar");
const PISO = 1_500;
const TETO = 250_000;

interface Linha {
  id: string;
  link_origem: string | null;
  veiculo: string | null;
  veiculo_bruto: string | null;
  preco: number | null;
  moeda: string | null;
  status: string | null;
  atributos_olx: Record<string, { value?: string }> | null;
}

async function main() {
  const linhas: Linha[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase
      .from("opportunities")
      .select("id, link_origem, veiculo, veiculo_bruto, preco, moeda, status, atributos_olx")
      .eq("pais", "PY")
      .eq("moeda", "USD")
      .not("preco", "is", null)
      .order("id", { ascending: true })
      .range(de, de + 999);
    if (error) throw new Error(error.message);
    linhas.push(...((data ?? []) as Linha[]));
    if (!data || data.length < 1000) break;
  }

  const porGrandeza = linhas.filter(
    (l) => String(l.atributos_olx?.confianca_moeda?.value ?? "") === "grandeza"
  );
  const alvos = porGrandeza.filter((l) => Number(l.preco) < PISO || Number(l.preco) > TETO);

  console.log(
    `${linhas.length} em dólar · ${porGrandeza.length} decididos só pela grandeza · ` +
      `${alvos.length} fora da faixa ${PISO.toLocaleString("es-PY")}–${TETO.toLocaleString("es-PY")}` +
      `${APLICAR ? "" : "  (ENSAIO — nada gravado)"}\n`
  );

  for (const l of alvos.slice(0, 25)) {
    console.log(
      `  ${String(Number(l.preco).toLocaleString("es-PY")).padStart(11)}  ${String(l.status).padEnd(9)} ${String(l.veiculo_bruto || l.veiculo).slice(0, 46)}`
    );
  }
  if (alvos.length > 25) console.log(`  … e mais ${alvos.length - 25}`);

  if (!APLICAR || !alvos.length) {
    if (!APLICAR) console.log("\n(seco — use --aplicar para gravar.)");
    return;
  }

  let ok = 0;
  const itemIds: string[] = [];
  for (const l of alvos) {
    const { error } = await supabase.from("opportunities").update({ status: "rejeitada" }).eq("id", l.id);
    if (error) {
      console.log(`  ✗ ${l.id}: ${error.message.slice(0, 55)}`);
      continue;
    }
    ok++;
    const item = String(l.link_origem ?? "").match(/item\/(\d+)/)?.[1];
    if (item) itemIds.push(item);
  }

  let obs = 0;
  for (let i = 0; i < itemIds.length; i += 50) {
    const { data, error } = await supabase
      .from("py_observacoes_preco")
      .update({ modelo: null, geracao: null })
      .in("item_id", itemIds.slice(i, i + 50))
      .select("id");
    if (!error) obs += (data ?? []).length;
  }

  console.log(`\n✓ ${ok} tirados da vitrine (escala ambígua)`);
  console.log(`  ${obs} observação(ões) deixaram de pesar na mediana`);
}

main().catch((e) => {
  console.error("falhou:", (e as Error).message);
  process.exitCode = 1;
});
