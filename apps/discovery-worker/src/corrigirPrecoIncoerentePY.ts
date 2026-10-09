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
const FATOR = Number(process.env.PY_FATOR ?? 5);

async function main() {
  const { data, error } = await supabase
    .from("opportunities")
    .select("id, veiculo, modelo, ano, preco, moeda, descricao")
    .eq("pais", "PY")
    .not("preco", "is", null)
    .limit(5000);
  if (error) throw new Error(error.message);
  const linhas = data ?? [];

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
  let semArbitro = 0, campoVenceu = 0;

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

    trocas.push({ id: String(o.id), veiculo: String(o.veiculo), de: atual, para: d.valor, moeda: String(o.moeda), razao, ref });
  }

  console.log(`${linhas.length} anúncios · ${trocas.length} em que a DESCRIÇÃO está mais perto da referência`);
  console.log(`  ${campoVenceu} em que o CAMPO venceu (a descrição seria pior)`);
  console.log(`  ${semArbitro} sem referência no modelo — NÃO mexidos, por falta de árbitro\n`);
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
