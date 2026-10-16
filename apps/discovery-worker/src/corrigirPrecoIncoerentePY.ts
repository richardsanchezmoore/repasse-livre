import "dotenv/config";
import { supabase } from "./supabaseClient.js";
import { precoDeclarado } from "./precoParaguai.js";
import { geracaoDoAno } from "./geracoesPY.js";

/**
 * ★★★ O "RAIO LIMITADOR" — ideia do Gustavo, 09/10/2026.
 *
 * *"isso nos leva a fazer um backfill nos preços seguindo nosso livro de
 * ofertas, que se temos devemos criar... facilmente conseguimos pesquisar a
 * média de preço de uma Toyota Prado 2018 no Paraguai e isso virar um raio
 * limitador em nossas descobertas e descartes"*.
 *
 * ⚠️ E a simulação em seco provou que ele é NECESSÁRIO, não opcional. Sem
 * limitador, "a descrição vence o campo" é regra ingênua: ela queria trocar um
 * Vitz 2009 de ₲42M para ₲8M e um Sportage 2012 de ₲80M para ₲8M — nos dois,
 * o CAMPO é que estava certo.
 *
 * ★ O limitador já existe e é NOSSO: a mediana por modelo+geração. Vitz XP90
 * mediana ₲39M diz que ₲42M é carro e ₲8M não é. Pesquisa externa serve para
 * semear os modelos que ainda não têm massa, mas para os que têm, a nossa
 * própria tabela arbitra — e melhora sozinha conforme a base cresce.
 *
 * ⚠️ POR ISSO O ÁRBITRO NÃO É "quem vem da descrição", É "quem está mais perto
 * da referência". Quando não há referência para o modelo, NÃO MEXE: trocar sem
 * árbitro é jogar moeda com o dado do Gustavo.
 */
/** O mês da tabela publicada, no mesmo formato do worker. */
function mesCorrente(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

const mediana = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

/** Quão longe, em vezes, um preço está da referência. 1 = em cima. */
const distancia = (preco: number, ref: number) => Math.max(preco, ref) / Math.min(preco, ref);

/**
 * CORRIGE O PREÇO QUANDO A DESCRIÇÃO DESMENTE O CAMPO — sem tocar no Facebook.
 *
 * ★ Achado pelo Gustavo em 09/10/2026, olhando o site: um Land Cruiser Prado
 * 2018 publicado a **USD 1.234**, com a descrição dizendo *"Precio; 85.000
 * dólares"*. Ele perguntou se a gente tinha captado por causa da descrição —
 * não: o campo trouxe 1234 (isca de dígitos em sequência), o leitor aceitou
 * porque 1.234 cabe na faixa de dólar, e a descrição nunca foi lida para preço.
 *
 * ★★ E ISTO NÃO PRECISA DE RASPAGEM: as descrições já estão no banco. É puro
 * recálculo — custo zero de exposição da conta, que é o recurso escasso aqui.
 *
 * ⚠️ MESMA MOEDA, 5× DE DISTÂNCIA. Duas leituras do mesmo carro divergem por
 * câmbio, desconto ou typo, mas não por cinco vezes; acima disso uma é isca.
 * Moeda diferente exigiria cotação, e chutar conversão criaria erro novo para
 * consertar um velho.
 *
 * ⚠️ Roda em SECO por padrão. `PY_APLICAR=1` para gravar — e o seco imprime
 * cada troca, porque mexer em preço de anúncio publicado não é coisa de fazer
 * às cegas.
 */
const APLICAR = process.env.PY_APLICAR === "1";

/**
 * ⚠️⚠️ O LIMIAR CAIU DE 5× PARA 1,5× — e isto é conserto de um caso real.
 *
 * Gustavo, 15/10/2026, com o anúncio na tela: "Toyota Vitz 2014" publicado a
 * ₲20.000.000, com a descrição dizendo *"por solo Gs 52.000.000"*. A razão é
 * 2,6× — passava longe do portão de 5× e o campo vencia sem nem chegar ao
 * árbitro. A mediana da tabela para Vitz 2014 é ₲60 milhões: ₲52M é o carro,
 * ₲20M é a entrada.
 *
 * ★★ E o portão alto era uma precaução que o ÁRBITRO JÁ TORNA DESNECESSÁRIA.
 * Ele existia de quando "a descrição vence o campo" era a regra, e aí um
 * limiar frouxo trocaria preço bom por lixo. Hoje quem decide é a distância à
 * referência — e se a descrição estiver pior, o campo fica. O portão só
 * precisa ser alto o bastante para não gastar trabalho com divergência de
 * desconto ("precio contado 11.890.000 / precio crédito 11.590.000", 1,03×).
 */
const FATOR = Number(process.env.PY_FATOR ?? 1.5);

async function main() {
  // ⚠️⚠️ PAGINA DE 1.000 EM 1.000. Estava `.limit(5000)`, que NAO vence o teto
  // do PostgREST: ele devolve 1.000 em silencio. Com 7 mil anuncios na base, o
  // corretor olhava um setimo dela e dizia que tinha terminado.
  const linhas: any[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase
      .from("opportunities")
      .select("id, veiculo, modelo, ano, preco, moeda, descricao")
      .eq("pais", "PY")
      .not("preco", "is", null)
      .order("id", { ascending: true })
      .range(de, de + 999);
    if (error) throw new Error(error.message);
    linhas.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  // ─── 1) a referência, montada do que já temos ───
  //
  // ⚠️ Por modelo+geração e por modelo+ano. Nenhuma das duas é tratada como
  // verdade absoluta: servem só para dizer qual de DOIS candidatos é mais
  // plausível, que é uma pergunta muito mais fácil que "qual é o preço certo".
  const porChave = new Map<string, number[]>();
  for (const o of linhas) {
    if (!o.modelo || !o.preco) continue;
    const m = String(o.modelo).toLowerCase();
    const g = geracaoDoAno(m, o.ano == null ? null : Number(o.ano));
    const p = Number(o.preco);
    const add = (k: string) => porChave.set(k, [...(porChave.get(k) ?? []), p]);
    if (g) add(`${m}|${g.codigo}|${o.moeda}`);
    if (o.ano) add(`${m}|${o.ano}|${o.moeda}`);
  }
  /**
   * ★★★ O ÁRBITRO PREFERENCIAL É A TABELA PUBLICADA, não a média crua.
   *
   * ⚠️ A referência montada aqui a partir dos próprios preços tem um defeito
   * de nascença: ela inclui os preços errados que deveria julgar. Num modelo
   * onde metade dos anúncios é entrada de financiamento, a "mediana" puxa para
   * baixo e absolve o erro.
   *
   * ★ A `py_tabela_referencia` não tem esse problema: ela já passou por corte
   * de outliers, exige n mínimo e carrega `confianca`. É o instrumento que o
   * produto inteiro existe para construir — usar outra coisa como árbitro,
   * tendo ela, seria desperdiçar o ativo.
   *
   * ⚠️ A média crua FICA como segunda opção: a tabela só cobre os modelos com
   * massa, e para o resto é melhor um árbitro imperfeito que árbitro nenhum.
   * Quando nem uma nem outra existe, NÃO MEXE — trocar sem árbitro é jogar
   * moeda com o preço de um anúncio publicado.
   */
  const { data: tabela } = await supabase
    .from("py_tabela_referencia")
    .select("modelo, escopo, chave, moeda, mediana, confianca")
    .eq("mes", mesCorrente())
    .eq("confianca", "boa")
    .limit(1000);

  const porTabela = new Map<string, number>();
  for (const l of tabela ?? []) {
    porTabela.set(`${String(l.modelo).toLowerCase()}|${l.chave}|${l.moeda}`, Number(l.mediana));
  }

  const refDaTabela = (modelo: string | null, ano: unknown, moeda: unknown): number | null => {
    if (!modelo) return null;
    // ★ A tabela publicada vence a média crua — ver o bloco acima.
    const daTabela = refDaTabela(modelo, ano, moeda);
    if (daTabela) return daTabela;
    const m = String(modelo).toLowerCase();
    const g = geracaoDoAno(m, ano == null ? null : Number(ano));
    // ⚠️ Ano antes de geração: é a referência mais estreita e portanto a mais
    // confiável para arbitrar um anúncio individual.
    for (const chave of [ano ? String(ano) : null, g ? g.codigo : null]) {
      if (!chave) continue;
      const v = porTabela.get(`${m}|${chave}|${moeda}`);
      if (v) return v;
    }
    return null;
  };

  const refDe = (modelo: string | null, ano: unknown, moeda: unknown): number | null => {
    if (!modelo) return null;
    const m = String(modelo).toLowerCase();
    const g = geracaoDoAno(m, ano == null ? null : Number(ano));
    for (const k of [g ? `${m}|${g.codigo}|${moeda}` : null, ano ? `${m}|${ano}|${moeda}` : null]) {
      if (!k) continue;
      const v = porChave.get(k);
      // ⚠️ 4+ preços para a referência arbitrar. Com 2 ou 3, a própria
      // referência pode estar contaminada pelo erro que ela deveria julgar.
      if (v && v.length >= 4) return mediana(v);
    }
    return null;
  };

  const trocas: { id: string; veiculo: string; de: number; para: number; moeda: string; razao: number; ref: number }[] = [];
  let semArbitro = 0, campoVenceu = 0, foraDeOrdem = 0;

  for (const o of linhas) {
    if (!o.descricao) continue;
    const d = precoDeclarado(String(o.descricao));
    if (!d?.ok || d.moeda !== o.moeda) continue;
    const atual = Number(o.preco);
    const razao = Math.max(d.valor, atual) / Math.min(d.valor, atual);
    if (razao <= FATOR) continue;

    const ref = refDe(o.modelo as string | null, o.ano, o.moeda);
    if (!ref) { semArbitro++; continue; }

    // ★ Vence quem está mais perto da referência — não quem veio da descrição.
    if (distancia(d.valor, ref) >= distancia(atual, ref)) { campoVenceu++; continue; }

    /**
     * ⚠️⚠️ O VENCEDOR AINDA PRECISA SER PLAUSIVEL — e esta guarda faltava.
     *
     * O arbitro responde "qual das duas esta mais perto", nao "alguma das
     * duas presta". Medido em 15/10/2026: um Jetour X90 2024 ia de ₲6,8M para
     * ₲16,99M com referencia de ₲110 MILHOES, e uma Hilux 2024 de ₲8M para
     * ₲25,5M com referencia de ₲290 milhoes. Nos dois casos AS DUAS leituras
     * sao entrada de financiamento; trocar uma pela outra nao conserta nada e
     * ainda da aparencia de corrigido a um anuncio que segue errado.
     *
     * ★ 2x e folgado de proposito: a referencia e mediana de mercado, e carro
     * com pouca rodagem ou versao cheia legitimamente foge dela. O que a
     * guarda barra e a ordem de grandeza, que e onde mora o erro.
     */
    if (distancia(d.valor, ref) > 2) { foraDeOrdem++; continue; }

    trocas.push({ id: String(o.id), veiculo: String(o.veiculo), de: atual, para: d.valor, moeda: String(o.moeda), razao, ref });
  }

  console.log(`${linhas.length} anúncios · ${trocas.length} em que a DESCRIÇÃO está mais perto da referência`);
  console.log(`  ${campoVenceu} em que o CAMPO venceu (a descrição seria pior)`);
  console.log(`  ${semArbitro} sem referência no modelo — NÃO mexidos, por falta de árbitro\n`);
  console.log(`  ${foraDeOrdem} em que AS DUAS leituras estão longe da referência — NÃO mexidos`);
  for (const t of trocas.slice(0, 40)) {
    console.log(
      `  ${t.veiculo.slice(0, 32).padEnd(32)} ${t.moeda} ${t.de.toLocaleString("es-PY").padStart(12)} → ${t.para.toLocaleString("es-PY").padStart(12)}   ref ${t.ref.toLocaleString("es-PY")}`,
    );
  }
  if (trocas.length > 40) console.log(`  … e mais ${trocas.length - 40}`);

  if (!APLICAR) {
    console.log(`\n⚠️ SECO. Nada foi gravado. Para aplicar:  PY_APLICAR=1`);
    return;
  }

  let feitas = 0;
  for (const t of trocas) {
    const { error: e } = await supabase
      .from("opportunities")
      .update({ preco: t.para })
      .eq("id", t.id);
    if (e) { console.log(`  ✗ ${t.id}: ${e.message.slice(0, 50)}`); continue; }
    feitas++;
  }
  console.log(`\n★ ${feitas} preço(s) corrigido(s).`);
}

main().catch((e) => { console.error("falhou:", e.message); process.exitCode = 1; });
