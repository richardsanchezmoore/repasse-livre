import "dotenv/config";
import { supabase } from "./supabaseClient.js";
import { calcularReferencia, posicaoNaReferencia, type Observacao } from "./referenciaPrecoPY.js";

const { data } = await supabase.from("opportunities")
  .select("marca, modelo, ano, preco, moeda, cidade")
  .eq("pais","PY").eq("status","aprovada").not("modelo","is",null).limit(2000);

const grupos = new Map<string, Observacao[]>();
const rotulo = new Map<string, { m: string; a: number | null; moeda: string }>();
for (const o of data ?? []) {
  const k = `${o.marca} ${o.modelo}|${o.ano ?? ""}|${o.moeda}`;
  if (!grupos.has(k)) { grupos.set(k, []); rotulo.set(k, { m: `${o.marca} ${o.modelo}`, a: o.ano ? Number(o.ano) : null, moeda: String(o.moeda) }); }
  grupos.get(k)!.push({ preco: Number(o.preco), moeda: String(o.moeda), cidade: o.cidade as string | null });
}

const refs = [...grupos.entries()]
  .map(([k, obs]) => { const r = rotulo.get(k)!; return calcularReferencia(r.m, r.a, r.moeda, obs); })
  .filter((r): r is NonNullable<typeof r> => r !== null);

const boas = refs.filter(r => r.confianca === "boa");
const fracas = refs.filter(r => r.confianca === "fraca");
const insuf = refs.filter(r => r.confianca === "insuficiente");

console.log(`${refs.length} grupos (modelo+ano+moeda)`);
console.log(`  confiança BOA (n>=5):        ${boas.length}`);
console.log(`  confiança FRACA (n=3 ou 4):  ${fracas.length}`);
console.log(`  insuficiente (n<3):          ${insuf.length}`);

const publicaveis = [...boas, ...fracas].sort((a,b)=>b.n-a.n);
console.log(`\n=== AS LINHAS DA TABELA (${publicaveis.length}) ===`);
for (const r of publicaveis) {
  const infl = r.anuncios > r.n ? `  ⚠️ ${r.anuncios} anúncios → ${r.n} ofertas` : "";
  console.log(`  ${`${r.modelo} ${r.ano ?? "?"}`.padEnd(26)} n=${r.n}  mediana ${r.mediana.toLocaleString("es-PY").padStart(12)} ${r.moeda}   faixa ${r.q1.toLocaleString("es-PY")}–${r.q3.toLocaleString("es-PY")}${infl}`);
}

const comReanuncio = refs.filter(r => r.anuncios > r.n);
console.log(`\n⚠️ ${comReanuncio.length} grupos tinham oferta repetida — o n caiu de ${comReanuncio.reduce((a,r)=>a+r.anuncios,0)} anúncios para ${comReanuncio.reduce((a,r)=>a+r.n,0)} ofertas`);
