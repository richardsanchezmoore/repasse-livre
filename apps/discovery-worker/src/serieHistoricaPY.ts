import "dotenv/config";
import { supabase } from "./supabaseClient.js";

/**
 * O COMPORTAMENTO DO PREÇO ao longo dos meses — o que a FIPE tem e um
 * classificado não tem.
 *
 * ★ Gustavo (09/10/2026): *"esse é o maior ouro, o comportamento do preço...
 * poderá ser observável anos depois, como é a tabela FIPE hoje"*.
 *
 * ⚠️ Com dois meses isto ainda não mostra tendência nenhuma — e não deveria
 * fingir que mostra. O que ele mostra é a FORMA do ativo: quantas observações
 * por mês, quantos modelos com série, e a mediana de cada um no tempo. A
 * utilidade chega sozinha, mês a mês.
 *
 * ⚠️⚠️ E a mediana aqui é calculada SOBRE AS OBSERVAÇÕES, não sobre os anúncios
 * vivos. É essa a diferença: um Vitz que apareceu em setembro e já saiu do ar
 * continua pesando em setembro, para sempre. Na tabela de hoje ele sumiria.
 */
const mediana = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b);
  if (!s.length) return 0;
  const i = Math.floor(s.length / 2);
  return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2;
};

const milhoes = (n: number, moeda: string) =>
  moeda === "USD" ? `US$ ${Math.round(n).toLocaleString("es-PY")}` : `${(n / 1e6).toFixed(1)}M`;

async function main() {
  const { data, error } = await supabase
    .from("py_observacoes_preco")
    .select("mes, modelo, geracao, ano, preco, moeda, confianca")
    .limit(50000);
  if (error) throw new Error(error.message);
  const obs = data ?? [];

  const meses = [...new Set(obs.map((o) => String(o.mes).slice(0, 7)))].sort();
  console.log(`★ LIVRO DE OBSERVAÇÕES — ${obs.length} registro(s) em ${meses.length} mês(es)\n`);

  console.log("=== por mês ===");
  for (const m of meses) {
    const doMes = obs.filter((o) => String(o.mes).startsWith(m));
    const modelos = new Set(doMes.map((o) => o.modelo).filter(Boolean)).size;
    console.log(`  ${m}   ${String(doMes.length).padStart(5)} observações · ${modelos} modelos distintos`);
  }

  console.log("\n=== confiança da leitura (o que a série aceita) ===");
  const porConf = new Map<string, number>();
  for (const o of obs) porConf.set(String(o.confianca ?? "—"), (porConf.get(String(o.confianca ?? "—")) ?? 0) + 1);
  for (const [k, v] of [...porConf.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(26)} ${String(v).padStart(5)}  (${((v / obs.length) * 100).toFixed(0)}%)`);
  }

  // ★ A série por modelo+geração. Com dois meses é só o ponto de partida.
  console.log("\n=== a série, por modelo+geração (3+ observações no mês) ===");
  const chaves = new Map<string, Map<string, number[]>>();
  for (const o of obs) {
    if (!o.modelo) continue;
    const k = `${o.modelo}${o.geracao ? ` ${o.geracao}` : ` ${o.ano ?? "?"}`}|${o.moeda}`;
    const m = String(o.mes).slice(0, 7);
    if (!chaves.has(k)) chaves.set(k, new Map());
    const porMes = chaves.get(k)!;
    porMes.set(m, [...(porMes.get(m) ?? []), Number(o.preco)]);
  }

  const linhas = [...chaves.entries()]
    .map(([k, porMes]) => {
      const pontos = meses.map((m) => {
        const v = porMes.get(m) ?? [];
        return v.length >= 3 ? { m, med: mediana(v), n: v.length } : null;
      });
      return { k, pontos, total: [...porMes.values()].reduce((a, v) => a + v.length, 0) };
    })
    .filter((l) => l.pontos.some(Boolean))
    .sort((a, b) => b.total - a.total);

  console.log(`  modelo                    ${meses.map((m) => m.padEnd(16)).join("")}`);
  for (const l of linhas.slice(0, 20)) {
    const [nome, moeda] = l.k.split("|");
    const celulas = l.pontos.map((p) => (p ? `${milhoes(p.med, moeda)} (n=${p.n})`.padEnd(16) : "—".padEnd(16)));
    console.log(`  ${nome.slice(0, 24).padEnd(24)}  ${celulas.join("")}`);
  }

  if (meses.length < 3) {
    console.log("\n  ⚠️ Com menos de três meses não há tendência para ler — e seria desonesto");
    console.log("     desenhar uma. O que importa agora é que a série EXISTE e está sendo");
    console.log("     alimentada; a leitura vem sozinha, mês a mês.");
  }
}

main().catch((e) => { console.error("falhou:", e.message); process.exitCode = 1; });
