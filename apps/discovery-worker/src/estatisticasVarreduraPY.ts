import "dotenv/config";
import { supabase } from "./supabaseClient.js";
import { CATALOGO_JDM } from "./catalogoJdmParaguai.js";

/**
 * ESTAMOS SENDO INDUZIDOS PARA DETERMINADOS MODELOS?
 *
 * ★ A PERGUNTA (Gustavo, 07/10/2026): *"agora é observar se não estamos sendo
 * induzidos só para determinados modelos olhando estatísticas a cada varredura"*.
 *
 * ⚠️⚠️ A MEDIDA ÓBVIA ENGANA. Concentração (top-5 dominando a captação) sobe
 * sozinha com o tempo mesmo sem indução nenhuma: a primeira varredura de uma
 * praça puxa o backlog inteiro e as seguintes só pegam o que chegou — e o que
 * chega é dominado pelos modelos de maior giro. Ler isso como "o Facebook está
 * nos estreitando" seria confundir SATURAÇÃO com INDUÇÃO, e os dois produzem a
 * mesma curva.
 *
 * ★ O DISCRIMINADOR é o catálogo JDM. Ele é a lista do que EXISTE na praça,
 * levantada por conhecimento de mercado — independente do que o Facebook resolve
 * nos mostrar. Daí:
 *
 *   · modelo catalogado que NUNCA apareceu     → buraco de cobertura (suspeito)
 *   · modelo que aparecia e PAROU de aparecer  → ★ a assinatura da indução
 *   · modelo novo surgindo a cada varredura    → cobertura viva, sem estreitamento
 *
 * ⚠️ "Nunca apareceu" sozinho NÃO prova indução: o modelo pode ser raro de
 * verdade, e o catálogo tem palpite de raridade justamente porque alguns são. O
 * sinal forte é o SEGUNDO — o que sumiu depois de ter aparecido.
 */

const NOMES_CANONICOS = CATALOGO_JDM.map((m) => m.nomes[0]);

interface Linha { modelo: string | null; data_captura: string }

const dia = (iso: string) => String(iso).slice(0, 10);

async function main() {
  const { data, error } = await supabase
    .from("opportunities")
    .select("modelo, data_captura")
    .eq("pais", "PY")
    .order("data_captura", { ascending: true });
  if (error) throw new Error(error.message);
  const linhas = (data ?? []) as Linha[];
  const comModelo = linhas.filter((l) => l.modelo);

  console.log(`${linhas.length} anúncios PY · ${comModelo.length} com modelo normalizado\n`);

  // ─── 1) concentração por dia (contexto, NÃO veredito) ───
  const porDia = new Map<string, string[]>();
  for (const l of comModelo) {
    const d = dia(l.data_captura);
    (porDia.get(d) ?? porDia.set(d, []).get(d)!).push(l.modelo!.toLowerCase());
  }

  console.log("=== por varredura: concentração e modelos inéditos ===");
  console.log("  dia         n   modelos  top5%   inéditos");
  const jaVistos = new Set<string>();
  for (const [d, mods] of [...porDia.entries()].sort()) {
    const conta = new Map<string, number>();
    for (const m of mods) conta.set(m, (conta.get(m) ?? 0) + 1);
    const top5 = [...conta.values()].sort((a, b) => b - a).slice(0, 5).reduce((a, b) => a + b, 0);
    const ineditos = [...conta.keys()].filter((m) => !jaVistos.has(m));
    ineditos.forEach((m) => jaVistos.add(m));
    console.log(
      `  ${d}  ${String(mods.length).padStart(3)}   ${String(conta.size).padStart(5)}   ${((top5 / mods.length) * 100).toFixed(0).padStart(3)}%   ${String(ineditos.length).padStart(3)}  ${ineditos.slice(0, 5).join(", ").slice(0, 46)}`,
    );
  }

  // ─── 2) ★ O SINAL FORTE: modelo que aparecia e parou ───
  const dias = [...porDia.keys()].sort();
  if (dias.length >= 3) {
    const corte = Math.floor(dias.length / 2);
    const antes = new Set(dias.slice(0, corte).flatMap((d) => porDia.get(d)!));
    const depois = new Set(dias.slice(corte).flatMap((d) => porDia.get(d)!));
    const sumiram = [...antes].filter((m) => !depois.has(m));
    const surgiram = [...depois].filter((m) => !antes.has(m));
    console.log(`\n=== ★ ASSINATURA DA INDUÇÃO (metade inicial vs final) ===`);
    console.log(`  sumiram: ${sumiram.length}  ${sumiram.slice(0, 12).join(", ")}`);
    console.log(`  surgiram: ${surgiram.length}  ${surgiram.slice(0, 12).join(", ")}`);
    console.log(
      surgiram.length >= sumiram.length
        ? "  → cobertura VIVA: entra mais modelo novo do que some. Não parece estreitamento."
        : "  ⚠️ mais modelo SUMINDO do que entrando — olhar de perto, pode ser indução.",
    );
  }

  // ─── 3) buraco de cobertura contra o catálogo ───
  const vistos = new Set([...jaVistos].map((m) => m.toLowerCase()));
  const nunca = NOMES_CANONICOS.filter(
    (n) => ![...vistos].some((v) => v.includes(n) || n.includes(v)),
  );
  console.log(`\n=== catálogo JDM: ${NOMES_CANONICOS.length} modelos, ${NOMES_CANONICOS.length - nunca.length} já vistos ===`);
  console.log(`  ⚠️ NUNCA apareceram (${nunca.length}): ${nunca.join(", ")}`);
  console.log(`\n  ⚠️ "nunca apareceu" NÃO prova indução sozinho — parte desses é raro de`);
  console.log(`  verdade. Serve como lista de vigia: se um deles aparecer depois de`);
  console.log(`  mexermos em faixa/autoload, era cobertura nossa que faltava, não raridade.`);
}

main().catch((e) => { console.error("falhou:", e.message); process.exitCode = 1; });
