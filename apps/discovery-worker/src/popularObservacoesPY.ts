import "dotenv/config";
import { supabase } from "./supabaseClient.js";
import { geracaoDoAno } from "./geracoesPY.js";
import { precoImplausivel } from "./limitePrecoPY.js";

/**
 * POPULA O LIVRO DE OBSERVAÇÕES com o que a base já tem.
 *
 * ★★ Gustavo (09/10/2026): *"não podemos nunca desperdiçar os preços... criar
 * uma forma de excluir o anúncio vencido mas seu histórico modelo/preço ser
 * preservado e utilizável por muito tempo, como faz a tabela FIPE. Esse
 * comportamento poderá ser observável anos depois."*
 *
 * ⚠️ A analogia com a FIPE é exata no que ela tem de mais valioso: ela não vale
 * por saber o preço de hoje — vale por saber COMO o preço chegou até hoje. A
 * série é o produto; o anúncio é só a fonte.
 *
 * ⚠️⚠️ E a urgência é medida: no backfill de fotos de 09/10, de 159 anúncios
 * revisitados **90 já não existiam** no Facebook. 57% num dia. Cada anúncio que
 * some leva a observação junto, se ela não estiver em lugar seguro.
 *
 * ═══ O QUE ENTRA E O QUE NÃO ENTRA ═══
 *
 * ⚠️ Preço que o raio acusa como implausível NÃO vira observação. A série é
 * para durar anos; sujeira que entra nela contamina para sempre, e daqui a dois
 * anos ninguém vai lembrar que aquele "BMW M4 a ₲5,1M" era isca.
 *
 * ⚠️ `ano_suspeito` também fica fora — mesma razão do cálculo da mediana: ano
 * que não cabe na produção do modelo ancora uma linha que não existe.
 *
 * ★ Reexecutável: `unique (item_id, mes)` deixa rodar quantas vezes quiser sem
 * duplicar. O que já está lá, fica — observação é fato datado, não se corrige
 * depois.
 */
const LOTE = 500;

/**
 * ★★ NADA ANTES DE OUTUBRO DE 2026 ENTRA NA SÉRIE.
 *
 * ⚠️ Não é recorte arbitrário: até 07/10 a captação lia os ~13 primeiros ids
 * da página, e em 08/10 descobrimos que esses primeiros são SUGESTÃO do
 * Facebook, não resultado de busca — o resultado filtrado só aparece depois
 * da rolagem. Setembro não registrou o mercado; registrou o painel de
 * recomendação.
 *
 * O estrago aparecia na própria série: Vitz XP90 a ₲15,0M em setembro (n=3)
 * contra ₲41,3M em outubro (n=28). Leria como alta de 175% num mês, e seria
 * mentira gravada numa tabela que dura anos.
 *
 * ⚠️ Os ANÚNCIOS de setembro continuam na base — decisão do Gustavo, e está
 * certa: eles são estoque real que existiu. O que não entra é a OBSERVAÇÃO,
 * porque ela afirma algo sobre o MERCADO que o método daquela época não era
 * capaz de afirmar.
 *
 * ★ Remover este corte quando a série tiver anos seria tentador e errado: o
 * viés não some com o tempo, fica no primeiro ponto da curva para sempre.
 */
const INICIO_SERIE = "2026-10-01";

async function main() {
  const { data, error } = await supabase
    .from("opportunities")
    .select("link_origem, modelo, geracao, ano, ano_suspeito, preco, moeda, cidade, data_captura, atributos_olx")
    .eq("pais", "PY")
    .not("preco", "is", null)
    .limit(10000);
  if (error) throw new Error(error.message);
  const linhas = data ?? [];

  let semId = 0, implausiveis = 0, anoSuspeito = 0, antesDaSerie = 0;
  const obs: Record<string, unknown>[] = [];

  for (const o of linhas) {
    const id = String(o.link_origem ?? "").match(/item\/(\d+)/)?.[1];
    if (!id) { semId++; continue; }
    if (o.ano_suspeito) { anoSuspeito++; continue; }
    if (precoImplausivel(Number(o.preco), o.ano == null ? null : Number(o.ano), String(o.moeda))) {
      implausiveis++;
      continue;
    }
    if (String(o.data_captura) < INICIO_SERIE) { antesDaSerie++; continue; }
    const d = new Date(String(o.data_captura));
    const mes = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
    const modelo = o.modelo ? String(o.modelo).toLowerCase() : null;
    obs.push({
      item_id: id,
      mes,
      modelo,
      // ⚠️ Recalcula a geração em vez de copiar a coluna: o dicionário cresce, e
      // uma observação gravada hoje com o dicionário de ontem fica velha de
      // nascença.
      geracao: geracaoDoAno(modelo, o.ano == null ? null : Number(o.ano))?.codigo ?? null,
      ano: o.ano == null ? null : Number(o.ano),
      preco: Number(o.preco),
      moeda: String(o.moeda),
      cidade: o.cidade,
      confianca: (o.atributos_olx as { confianca_moeda?: { value?: string } } | null)?.confianca_moeda?.value ?? null,
    });
  }

  console.log(`${linhas.length} anúncios com preço`);
  console.log(`  ${obs.length} viram observação`);
  console.log(`  ${implausiveis} fora pelo raio · ${anoSuspeito} ano suspeito · ${semId} sem id · ${antesDaSerie} antes de ${INICIO_SERIE}\n`);

  let gravadas = 0;
  for (let i = 0; i < obs.length; i += LOTE) {
    const fatia = obs.slice(i, i + LOTE);
    // ⚠️ ignoreDuplicates: a observação é imutável. Rodar de novo não reescreve
    // o que já está lá — reescrever seria reescrever a história.
    const { error: e } = await supabase
      .from("py_observacoes_preco")
      .upsert(fatia, { onConflict: "item_id,mes", ignoreDuplicates: true });
    if (e) { console.log(`  ✗ lote ${i}: ${e.message.slice(0, 60)}`); continue; }
    gravadas += fatia.length;
    console.log(`  ${gravadas}/${obs.length}`);
  }

  const { count } = await supabase
    .from("py_observacoes_preco")
    .select("id", { count: "exact", head: true });
  console.log(`\n★ livro de observações: ${count} linha(s)`);

  // ★ A série, que é o produto. Hoje com um mês só — e é justamente por isso
  // que ela precisa começar agora.
  const { data: serie } = await supabase
    .from("py_observacoes_preco")
    .select("mes")
    .order("mes", { ascending: true });
  const meses = [...new Set((serie ?? []).map((s) => String(s.mes)))];
  console.log(`  meses cobertos: ${meses.join(", ") || "—"}`);
}

main().catch((e) => { console.error("falhou:", e.message); process.exitCode = 1; });
