import "dotenv/config";
import { supabase } from "./supabaseClient.js";
import { calcularTabela, type ObservacaoLivro, type LinhaTabela } from "./calcularTabelaPY.js";

/**
 * PUBLICA A TABELA DE REFERÊNCIA DO MÊS.
 *
 * ★★★ É o passo que faltava para o selo existir. Até aqui a tabela era impressa
 * no terminal e morria ali; o site nunca a viu. Agora ela vira linha em
 * `py_tabela_referencia`, datada pelo mês — e o selo *"3% por debajo de la
 * tabla AutoRadarPY"* passa a ter de onde sair.
 *
 * ★★ DATADA POR MÊS, como a FIPE: recalcular escreve só o mês corrente, e os
 * meses anteriores ficam de pé como registro. *"Não podemos nunca desperdiçar
 * os preços... observável anos depois"*.
 *
 * Uso:
 *   npx tsx src/publicarTabelaPY.ts            → só calcula e imprime (seco)
 *   npx tsx src/publicarTabelaPY.ts --gravar   → calcula, imprime e GRAVA
 *
 * ⚠️ O padrão é SECO de propósito. Esta é a tabela que o site publica: rodar
 * por engano e sobrescrever o mês com um cálculo de teste é o tipo de erro que
 * só se descobre depois. Gravar tem que ser um ato declarado.
 */

const GRAVAR = process.argv.includes("--gravar");

/** O mês corrente como `date` (dia 1) — mesma unidade do livro de observações. */
function mesCorrente(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * ⚠️ O livro não guarda MARCA (ver migration 0092): ele nasceu para o preço.
 * Mas a página da tabela é Marca → Modelo → Ano, então a marca precisa vir de
 * algum lugar. Vem de `opportunities`, pelo modelo — e pela marca MAIS COMUM,
 * não pela primeira encontrada: um normalizador errado numa linha solta não
 * pode rebatizar o modelo inteiro.
 */
async function mapaDeMarcas(): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("opportunities")
    .select("marca, modelo")
    .eq("pais", "PY")
    .not("modelo", "is", null)
    .not("marca", "is", null)
    .limit(5000);
  if (error) throw new Error(`marcas: ${error.message}`);

  const contagem = new Map<string, Map<string, number>>();
  for (const l of (data ?? []) as { marca: string; modelo: string }[]) {
    const k = String(l.modelo).toLowerCase().trim();
    const m = contagem.get(k) ?? new Map<string, number>();
    m.set(l.marca, (m.get(l.marca) ?? 0) + 1);
    contagem.set(k, m);
  }
  const mapa = new Map<string, string>();
  for (const [modelo, marcas] of contagem) {
    const vencedora = [...marcas.entries()].sort((a, b) => b[1] - a[1])[0];
    if (vencedora) mapa.set(modelo, vencedora[0]);
  }
  return mapa;
}

/** Lê o livro de observações do mês, paginando — pode passar de 1.000 linhas. */
async function lerLivro(mes: string): Promise<ObservacaoLivro[]> {
  const tudo: ObservacaoLivro[] = [];
  const PAGINA = 1000;
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await supabase
      .from("py_observacoes_preco")
      .select("modelo, geracao, ano, preco, moeda, cidade")
      .eq("mes", mes)
      .range(de, de + PAGINA - 1);
    if (error) throw new Error(`livro: ${error.message}`);
    const lote = (data ?? []) as ObservacaoLivro[];
    tudo.push(...lote);
    if (lote.length < PAGINA) break;
  }
  return tudo;
}

function imprimir(linhas: LinhaTabela[]) {
  console.log("=== A TABELA ===");
  console.log("  modelo              agrupamento   n   mediana            faixa do miolo");
  for (const r of linhas) {
    const marca =
      r.escopo === "geracao"
        ? r.intervaloAnos ? `geração ${r.intervaloAnos}` : "geração"
        : r.anosAgrupados ? `anos ${r.anosAgrupados}` : "ano";
    const infl = r.anuncios > r.n ? `  ⚠️ ${r.anuncios} anúncios → ${r.n} ofertas` : "";
    const forca = r.confianca === "boa" ? "" : " ·fraca";
    console.log(
      `  ${r.modelo.slice(0, 18).padEnd(18)} ${`${r.chave} (${marca})`.padEnd(14)} ${String(r.n).padStart(2)}  ` +
        `${r.mediana.toLocaleString("es-PY").padStart(13)} ${r.moeda}  ${r.q1.toLocaleString("es-PY")}–${r.q3.toLocaleString("es-PY")}${forca}${infl}`,
    );
  }
}

async function gravar(mes: string, linhas: LinhaTabela[]) {
  const registros = linhas.map((r) => ({
    mes,
    marca: r.marca ?? null,
    modelo: r.modelo,
    escopo: r.escopo,
    chave: r.chave,
    moeda: r.moeda,
    anos_agrupados: r.anosAgrupados ?? null,
    intervalo_anos: r.intervaloAnos ?? null,
    n: r.n,
    anuncios: r.anuncios,
    mediana: r.mediana,
    q1: r.q1,
    q3: r.q3,
    minimo: r.min,
    maximo: r.max,
    confianca: r.confianca,
    calculado_em: new Date().toISOString(),
  }));

  // ⚠️ Em lotes: um upsert de centenas de linhas numa tacada já nos deu timeout
  // no PostgREST, e aqui falhar no meio deixaria a tabela do mês pela metade.
  const LOTE = 200;
  for (let i = 0; i < registros.length; i += LOTE) {
    const { error } = await supabase
      .from("py_tabela_referencia")
      .upsert(registros.slice(i, i + LOTE), { onConflict: "mes,modelo,escopo,chave,moeda" });
    if (error) throw new Error(`gravar: ${error.message}`);
  }

  // ⚠️⚠️ LIMPA O QUE SAIU DA TABELA NESTE MÊS. Sem isto, uma linha que deixou
  // de ser publicável (o dado piorou, ou a regra ficou mais exigente) ficaria
  // no ar para sempre, com o número velho — e o site mostraria uma referência
  // que o cálculo atual já não sustenta.
  //
  // ⚠️ Só dentro do mês corrente: mês anterior é registro histórico e não se
  // mexe. E só DEPOIS do upsert, para a tabela nunca ficar vazia no meio.
  const vivas = new Set(linhas.map((r) => `${r.modelo}|${r.escopo}|${r.chave}|${r.moeda}`));
  const { data: existentes, error: erroLer } = await supabase
    .from("py_tabela_referencia")
    .select("id, modelo, escopo, chave, moeda")
    .eq("mes", mes);
  if (erroLer) throw new Error(`conferir: ${erroLer.message}`);

  const orfas = (existentes ?? [])
    .filter((l) => !vivas.has(`${l.modelo}|${l.escopo}|${l.chave}|${l.moeda}`))
    .map((l) => l.id as number);
  if (orfas.length) {
    const { error } = await supabase.from("py_tabela_referencia").delete().in("id", orfas);
    if (error) throw new Error(`limpar: ${error.message}`);
    console.log(`  ${orfas.length} linha(s) que deixaram de ser publicáveis foram removidas do mês`);
  }
}

async function main() {
  const mes = mesCorrente();
  const [livro, marcas] = await Promise.all([lerLivro(mes), mapaDeMarcas()]);
  console.log(`livro de ${mes}: ${livro.length} observações · ${marcas.size} modelos com marca conhecida\n`);

  const r = calcularTabela(livro, marcas);
  if (r.descartadosPorAno) {
    console.log(`${r.descartadosPorAno} observação(ões) fora do cálculo por ano implausível (seguem na listagem)\n`);
  }
  if (r.anosAgrupadosPorPava) {
    console.log(`★ ${r.anosAgrupadosPorPava} linha(s) de ano agrupada(s) por não se separarem na amostra`);
    console.log(`   (recebem a média ponderada pelo n — a tabela não inverte e nenhuma linha se perde)\n`);
  }
  console.log(`${r.grupos} grupos · ${r.linhas.length} publicáveis (3+ ofertas) · ${r.linhas.filter((l) => l.confianca === "boa").length} com confiança BOA (5+)\n`);

  imprimir(r.linhas);

  const pct = r.total ? ((r.anunciosCobertos / r.total) * 100).toFixed(0) : "0";
  console.log(`\n★ ${r.anunciosCobertos} de ${r.total} observações caem numa linha publicável (${pct}%)`);

  if (!GRAVAR) {
    console.log("\n(seco — nada foi gravado. Use --gravar para publicar.)");
    return;
  }
  await gravar(mes, r.linhas);
  console.log(`\n✓ tabela de ${mes} publicada: ${r.linhas.length} linha(s)`);
}

main().catch((e) => {
  console.error("falhou:", e.message);
  process.exitCode = 1;
});
