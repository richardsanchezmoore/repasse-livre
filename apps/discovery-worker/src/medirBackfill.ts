import "dotenv/config";
import { supabase } from "./supabaseClient.js";
import { normalizarVeiculoPY } from "./modeloParaguai.js";
import { conferirAnoModelo } from "./anoModeloPY.js";

const { data } = await supabase.from("opportunities")
  .select("id, veiculo, ano, preco, moeda, fonte").eq("pais", "PY").limit(500);
const linhas = data ?? [];

let reconhecidos = 0, mudariam = 0, avisosAno = 0;
const grupos = new Map<string, number>();
const exemplos: string[] = [];

for (const o of linhas) {
  const v = normalizarVeiculoPY(String(o.veiculo ?? ""));
  if (!v.chaveAgrupamento) continue;
  reconhecidos++;
  const normalizado = [v.marca, v.modelo, v.ano].filter(Boolean).join(" ");
  if (normalizado.toLowerCase() !== String(o.veiculo ?? "").toLowerCase().trim()) {
    mudariam++;
    if (exemplos.length < 10) exemplos.push(`${String(o.veiculo).slice(0, 42).padEnd(42)} → ${normalizado}`);
  }
  const g = `${v.chaveAgrupamento}|${v.ano ?? "?"}`;
  grupos.set(g, (grupos.get(g) ?? 0) + 1);
  const c = conferirAnoModelo(v.modelo?.toLowerCase() ?? null, v.ano);
  if (!c.ok && c.problema !== "ano_ausente" && c.problema !== "modelo_sem_faixa") avisosAno++;
}

console.log(`${linhas.length} anúncios PY na base`);
console.log(`  reconhecidos pelo catálogo: ${reconhecidos} (${Math.round(reconhecidos / linhas.length * 100)}%)`);
console.log(`  teriam o nome CORRIGIDO:    ${mudariam}`);
console.log(`  avisos de ano:              ${avisosAno}`);
console.log(`\n=== GRUPOS com 3+ (as linhas que a tabela de preço teria) ===`);
const bons = [...grupos.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]);
bons.slice(0, 12).forEach(([g, n]) => console.log(`  ${g.padEnd(34)} n=${n}`));
console.log(`  (${bons.length} grupos com 3 ou mais)`);
console.log(`\n=== exemplos do que seria corrigido ===`);
exemplos.forEach((e) => console.log("  " + e));
