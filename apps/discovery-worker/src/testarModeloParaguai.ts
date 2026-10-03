/**
 * Afere o normalizador de modelo contra a base REAL — nao contra exemplo
 * inventado. Roda com: npx tsx src/testarModeloParaguai.ts
 *
 * ⚠️ O numero que importa nao e so a cobertura: e a lista dos NAO RECONHECIDOS,
 * que e de onde sai a proxima rodada de dicionario. Chutar modelo contamina a
 * mediana, entao nao reconhecer e o comportamento certo, nao a falha.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { normalizarVeiculoPY } from "./modeloParaguai.js";

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const { data } = await sb.from("opportunities").select("veiculo, ano, preco, moeda").eq("pais", "PY").limit(500);
const linhas = data ?? [];
let ok = 0; const naoReconhecidos: string[] = []; const grupos = new Map<string, number>();
for (const l of linhas) {
  const r = normalizarVeiculoPY(l.veiculo ?? "");
  if (r.chaveAgrupamento) {
    ok++;
    const g = `${r.chaveAgrupamento}|${r.ano ?? "?"}`;
    grupos.set(g, (grupos.get(g) ?? 0) + 1);
  } else naoReconhecidos.push(String(l.veiculo).slice(0, 56));
}
console.log(`reconhecidos: ${ok}/${linhas.length}  (${Math.round(ok/linhas.length*100)}%)`);
console.log("\n=== AMOSTRA do que saiu ===");
for (const l of linhas.slice(0, 14)) {
  const r = normalizarVeiculoPY(l.veiculo ?? "");
  console.log(`  ${String(l.veiculo).slice(0,46).padEnd(46)} → ${String(r.marca ?? "?").padEnd(14)} ${String(r.modelo ?? "— NÃO RECONHECIDO").padEnd(18)} ${r.ano ?? "?"}`);
}
console.log("\n=== GRUPOS com 3+ (o que vira linha da tabela) ===");
[...grupos.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).forEach(([g, n]) => console.log(`  ${g.padEnd(34)} n=${n}`));
console.log(`\n=== NÃO reconhecidos (${naoReconhecidos.length}) ===`);
naoReconhecidos.slice(0, 20).forEach((v) => console.log("  " + v));
